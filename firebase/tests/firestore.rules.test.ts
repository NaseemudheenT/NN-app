import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails, assertSucceeds, initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  Timestamp, collection, deleteDoc, doc, getDoc, getDocs, setDoc, updateDoc,
} from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * These tests are the proof that NN's authorisation actually works. They run
 * against the real Firestore emulator evaluating the real rules file — not a
 * simulation of it.
 *
 * The single most important test in the whole repository is
 * "another signed-in user cannot read the founder's data". Everything else in
 * NN assumes that holds.
 */

const OWNER = "founder-uid";
const INTRUDER = "someone-else-uid";

let env: RulesTestEnvironment;

/** A document that satisfies the metadata contract the rules require. */
function validDoc(extra: Record<string, unknown> = {}) {
  const now = Timestamp.fromMillis(1_700_000_000_000);
  return { createdAt: now, updatedAt: now, schemaVersion: 1, ...extra };
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "nn-rules-test",
    firestore: {
      rules: readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8"),
    },
  });
});

afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearFirestore(); });

const asOwner = () => env.authenticatedContext(OWNER, { nnOwner: true }).firestore();
const asIntruder = () => env.authenticatedContext(INTRUDER, { nnOwner: true }).firestore();
const asNonPasskey = () => env.authenticatedContext(OWNER).firestore();
const asStranger = () => env.unauthenticatedContext().firestore();

/* ─────────────────────────── the boundary ────────────────────────────── */

describe("ownership boundary", () => {
  it("lets the owner create and read his own record", async () => {
    const db = asOwner();
    await assertSucceeds(setDoc(doc(db, `users/${OWNER}/notes/n1`), validDoc({ title: "Exam plan" })));
    await assertSucceeds(getDoc(doc(db, `users/${OWNER}/notes/n1`)));
  });

  it("DENIES another signed-in user reading the founder's data", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `users/${OWNER}/notes/n1`), validDoc({ title: "Private" }));
    });
    await assertFails(getDoc(doc(asIntruder(), `users/${OWNER}/notes/n1`)));
  });

  it("DENIES another signed-in user writing into the founder's data", async () => {
    await assertFails(setDoc(doc(asIntruder(), `users/${OWNER}/notes/n2`), validDoc()));
  });

  it("DENIES another signed-in user listing the founder's collections", async () => {
    await assertFails(getDocs(collection(asIntruder(), `users/${OWNER}/notes`)));
  });

  it("DENIES a Firebase-authenticated user without the verified passkey owner claim", async () => {
    await assertFails(getDoc(doc(asNonPasskey(), `users/${OWNER}/notes/private`)));
    await assertFails(setDoc(doc(asNonPasskey(), `users/${OWNER}/notes/private`), validDoc()));
  });

  it("DENIES an unauthenticated request entirely", async () => {
    const db = asStranger();
    await assertFails(getDoc(doc(db, `users/${OWNER}/notes/n1`)));
    await assertFails(setDoc(doc(db, `users/${OWNER}/notes/n3`), validDoc()));
  });

  it("denies any path outside users/ and reference/", async () => {
    await assertFails(setDoc(doc(asOwner(), "random/doc"), validDoc()));
    await assertFails(getDoc(doc(asOwner(), "configuration/secrets")));
  });

  it("protects a collection nobody has written rules for yet", async () => {
    // An application invented next year is protected the moment it exists.
    await assertSucceeds(setDoc(doc(asOwner(), `users/${OWNER}/some_future_app/x`), validDoc()));
    await assertFails(setDoc(doc(asIntruder(), `users/${OWNER}/some_future_app/x`), validDoc()));
  });
});

/* ──────────────────── documents the server alone owns ─────────────────── */

describe("server-authored collections", () => {
  const SERVER_ONLY = [
    "audit_logs", "security_events", "permissions", "summaries",
    "backups", "tool_executions", "credentials", "system_health", "job_runs",
  ];

  it.each(SERVER_ONLY)("the owner cannot write to %s", async (name) => {
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/${name}/x`), validDoc()));
  });

  it.each(SERVER_ONLY)("the owner can still read %s", async (name) => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `users/${OWNER}/${name}/x`), validDoc());
    });
    await assertSucceeds(getDoc(doc(asOwner(), `users/${OWNER}/${name}/x`)));
  });

  it("the owner cannot tamper with an existing audit record", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `users/${OWNER}/audit_logs/a1`), validDoc({ action: "delete" }));
    });
    await assertFails(updateDoc(doc(asOwner(), `users/${OWNER}/audit_logs/a1`), { action: "read" }));
    await assertFails(deleteDoc(doc(asOwner(), `users/${OWNER}/audit_logs/a1`)));
  });

  it("REN cannot widen its own permissions from the client", async () => {
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/permissions/send_email`), validDoc({ granted: true })));
  });

  it("lets the owner delete a passkey but never create or alter one", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `users/${OWNER}/credentials/c1`), validDoc({ counter: 5 }));
    });
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/credentials/c2`), validDoc()));
    await assertFails(updateDoc(doc(asOwner(), `users/${OWNER}/credentials/c1`), { counter: 0 }));
    await assertSucceeds(deleteDoc(doc(asOwner(), `users/${OWNER}/credentials/c1`)));
  });
});

/* ───────────────────────── document validity ──────────────────────────── */

describe("document validity", () => {
  it("rejects a document with no provenance metadata", async () => {
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/tasks/t1`), { title: "no meta" }));
  });

  it("rejects a non-timestamp createdAt", async () => {
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/tasks/t2`),
      { createdAt: "yesterday", updatedAt: Timestamp.now(), schemaVersion: 1 }));
  });

  it("rejects a missing or invalid schemaVersion", async () => {
    const now = Timestamp.now();
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/tasks/t3`), { createdAt: now, updatedAt: now }));
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/tasks/t4`),
      { createdAt: now, updatedAt: now, schemaVersion: 0 }));
  });

  it("refuses to let createdAt be rewritten", async () => {
    const db = asOwner();
    await assertSucceeds(setDoc(doc(db, `users/${OWNER}/tasks/t5`), validDoc()));
    await assertFails(updateDoc(doc(db, `users/${OWNER}/tasks/t5`), {
      createdAt: Timestamp.fromMillis(1), updatedAt: Timestamp.now(),
    }));
  });

  it("refuses to let updatedAt move backwards", async () => {
    const db = asOwner();
    await assertSucceeds(setDoc(doc(db, `users/${OWNER}/tasks/t6`), validDoc()));
    await assertFails(updateDoc(doc(db, `users/${OWNER}/tasks/t6`), {
      updatedAt: Timestamp.fromMillis(1_000),
    }));
  });

  it("rejects an absurdly wide document", async () => {
    const fat: Record<string, unknown> = {};
    for (let i = 0; i < 200; i += 1) fat[`f${i}`] = i;
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/tasks/t7`), validDoc(fat)));
  });
});

/* ───────────────── memory honesty: guess vs. fact ─────────────────────── */

describe("memory provenance", () => {
  it("accepts a memory the founder stated himself", async () => {
    await assertSucceeds(setDoc(doc(asOwner(), `users/${OWNER}/memories/m1`),
      validDoc({ source: "stated", content: "My exam is on Friday" })));
  });

  it("REFUSES a client-written memory claiming to be inferred or imported", async () => {
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/memories/m2`),
      validDoc({ source: "inferred", content: "He probably likes mornings" })));
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/memories/m3`),
      validDoc({ source: "imported" })));
  });

  it("refuses to let a stated memory be downgraded by an update", async () => {
    const db = asOwner();
    await assertSucceeds(setDoc(doc(db, `users/${OWNER}/memories/m4`), validDoc({ source: "stated" })));
    await assertFails(updateDoc(doc(db, `users/${OWNER}/memories/m4`), {
      source: "inferred", updatedAt: Timestamp.now(),
    }));
  });
});

/* ────────────────────── append-only history ───────────────────────────── */

describe("append-only subcollections", () => {
  it("keeps note version history immutable", async () => {
    const db = asOwner();
    const path = `users/${OWNER}/notes/n9/versions/v1`;
    await assertSucceeds(setDoc(doc(db, `users/${OWNER}/notes/n9`), validDoc()));
    await assertSucceeds(setDoc(doc(db, path), validDoc({ body: "first draft" })));
    await assertFails(updateDoc(doc(db, path), { body: "rewritten", updatedAt: Timestamp.now() }));
    await assertFails(deleteDoc(doc(db, path)));
  });

  it("allows ordinary subcollections to be edited", async () => {
    const db = asOwner();
    const path = `users/${OWNER}/projects/p1/attachments/a1`;
    await assertSucceeds(setDoc(doc(db, `users/${OWNER}/projects/p1`), validDoc()));
    await assertSucceeds(setDoc(doc(db, path), validDoc()));
    await assertSucceeds(updateDoc(doc(db, path), { updatedAt: Timestamp.now() }));
    await assertSucceeds(deleteDoc(doc(db, path)));
  });

  it("denies another user reaching into a subcollection", async () => {
    await assertFails(getDoc(doc(asIntruder(), `users/${OWNER}/notes/n9/versions/v1`)));
  });
});

/* ─────────────────────── the owner record itself ──────────────────────── */

describe("the owner record", () => {
  it("can be created and updated by its owner", async () => {
    const db = asOwner();
    await assertSucceeds(setDoc(doc(db, `users/${OWNER}`), validDoc({ displayName: "Naseemudheen" })));
    await assertSucceeds(updateDoc(doc(db, `users/${OWNER}`), {
      displayName: "Naseem", updatedAt: Timestamp.now(),
    }));
  });

  it("can never be deleted — that would orphan every subcollection", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), `users/${OWNER}`), validDoc());
    });
    await assertFails(deleteDoc(doc(asOwner(), `users/${OWNER}`)));
  });

  it("cannot be created by anyone else", async () => {
    await assertFails(setDoc(doc(asIntruder(), `users/${OWNER}`), validDoc()));
  });
});

/* ───────────────────────── shared reference data ──────────────────────── */

describe("reference library", () => {
  it("is readable when signed in and never writable", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "reference/formulas"), { verified: true });
    });
    await assertSucceeds(getDoc(doc(asOwner(), "reference/formulas")));
    await assertFails(setDoc(doc(asOwner(), "reference/formulas"), { verified: false }));
  });

  it("is not readable by an anonymous request", async () => {
    await assertFails(getDoc(doc(asStranger(), "reference/formulas")));
  });
});

describe("rules file", () => {
  it("opens with an explicit default-deny posture", () => {
    const rules = readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8");
    expect(rules).toContain("match /{document=**}");
    expect(rules).toMatch(/allow read, write: if false/);
  });
});

/* ───────────────── sensitive fields and privilege escalation ──────────── */

describe("sensitive fields", () => {
  const CREDENTIAL_FIELDS = [
    "accessToken", "refreshToken", "idToken", "apiKey", "apiSecret",
    "clientSecret", "privateKey", "password", "secret", "sessionToken",
  ];

  it.each(CREDENTIAL_FIELDS)("refuses a client write containing %s", async (field) => {
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/integrations/google`),
      validDoc({ [field]: "value-that-must-never-be-stored" })));
  });

  it("refuses a credential smuggled into any application collection", async () => {
    // Not just integrations — a token must not reach Firestore anywhere.
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/notes/leak`),
      validDoc({ body: "reminder", apiKey: "sk-live-123" })));
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/projects/p/attachments/a`),
      validDoc({ accessToken: "x" })));
  });

  it("refuses to let a credential be added by a later update", async () => {
    const db = asOwner();
    await assertSucceeds(setDoc(doc(db, `users/${OWNER}/integrations/github`), validDoc({ status: "connected" })));
    await assertFails(updateDoc(doc(db, `users/${OWNER}/integrations/github`), {
      refreshToken: "ghr_secret", updatedAt: Timestamp.now(),
    }));
  });

  it("still allows a harmless reference to a secret stored elsewhere", async () => {
    // The pattern NN actually uses: the token lives in Secret Manager and
    // Firestore holds only its identifier.
    await assertSucceeds(setDoc(doc(asOwner(), `users/${OWNER}/integrations/gmail`),
      validDoc({ status: "connected", secretRef: "projects/nn-os-dev/secrets/gmail-oauth" })));
  });
});

describe("privilege escalation", () => {
  const PRIVILEGE_FIELDS = [
    "permissions", "grantedScopes", "scopes", "role", "roles",
    "isAdmin", "admin", "tier", "approvedBy",
  ];

  it.each(PRIVILEGE_FIELDS)("refuses a client asserting %s", async (field) => {
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/apps/nn-mail`),
      validDoc({ [field]: "anything" })));
  });

  it("refuses an app install record granting itself scopes", async () => {
    // Without this an installable app could widen its own access simply by
    // writing its own registry entry.
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/apps/generated-app`),
      validDoc({ name: "Habit Tracker", permissions: ["mail.send", "finance.write"] })));
    await assertSucceeds(setDoc(doc(asOwner(), `users/${OWNER}/apps/generated-app`),
      validDoc({ name: "Habit Tracker", installed: true, pinned: false })));
  });

  it("refuses a document claiming to belong to someone else", async () => {
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/notes/forged`),
      validDoc({ ownerUid: INTRUDER })));
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/notes/forged2`),
      validDoc({ userId: INTRUDER })));
  });

  it("allows an owner field that honestly matches the path", async () => {
    await assertSucceeds(setDoc(doc(asOwner(), `users/${OWNER}/notes/honest`),
      validDoc({ ownerUid: OWNER })));
  });

  it("cannot reach a server-only collection through a subcollection", async () => {
    // The escalation path worth checking: nesting under a protected parent.
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/permissions/mail/sub/x`), validDoc()));
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/audit_logs/a1/sub/x`), validDoc()));
    await assertFails(setDoc(doc(asOwner(), `users/${OWNER}/credentials/c1/sub/x`), validDoc()));
  });

  it("cannot escalate into another user through a subcollection", async () => {
    await assertFails(setDoc(doc(asIntruder(), `users/${OWNER}/notes/n1/versions/v1`), validDoc()));
  });

  it("cannot write the owner record of another user", async () => {
    await assertFails(setDoc(doc(asOwner(), `users/${INTRUDER}`), validDoc()));
    await assertFails(setDoc(doc(asOwner(), `users/${INTRUDER}/notes/x`), validDoc()));
  });
});
