import { describe, expect, it } from "vitest";
import {
  evaluateCredentialRemoval, evaluateRegistration, secretsMatch,
  MIN_BOOTSTRAP_SECRET_LENGTH, type OwnerRecord,
} from "./owner";
import {
  evaluateSession, requiresReauthentication,
  SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, type SessionState,
} from "./session";
import { readRelyingParty, WebAuthnConfigError } from "./webauthn";
import { MemoryChallengeStore, isUsable, makeRecord } from "./challenge";

const SECRET = "a".repeat(MIN_BOOTSTRAP_SECRET_LENGTH);
const owner: OwnerRecord = { uid: "owner-1", claimedAt: "2026-11-08T00:00:00Z", credentialCount: 2 };

/* ───────────────────── first-owner bootstrap ──────────────────────────── */

describe("owner bootstrap", () => {
  it("lets the first registration claim NN with the correct secret", () => {
    const r = evaluateRegistration({
      owner: null, presentedSecret: SECRET, configuredSecret: SECRET, authenticatedUid: null,
    });
    expect(r).toEqual({ allowed: true, mode: "bootstrap" });
  });

  it("REFUSES an arbitrary user claiming an unowned NN", () => {
    const r = evaluateRegistration({
      owner: null, presentedSecret: null, configuredSecret: SECRET, authenticatedUid: null,
    });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.status).toBe(401);
  });

  it("refuses a wrong secret", () => {
    const r = evaluateRegistration({
      owner: null, presentedSecret: "b".repeat(MIN_BOOTSTRAP_SECRET_LENGTH),
      configuredSecret: SECRET, authenticatedUid: null,
    });
    expect(r.allowed).toBe(false);
  });

  it("refuses to bootstrap at all when no secret is configured", () => {
    const r = evaluateRegistration({
      owner: null, presentedSecret: "anything", configuredSecret: null, authenticatedUid: null,
    });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.status).toBe(503);
  });

  it("refuses a bootstrap secret that is too short to be safe", () => {
    const weak = "short";
    const r = evaluateRegistration({
      owner: null, presentedSecret: weak, configuredSecret: weak, authenticatedUid: null,
    });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.status).toBe(503);
  });

  it("CLOSES the bootstrap path permanently once NN has an owner", () => {
    // The critical property: a leaked bootstrap secret must not be a back door.
    const r = evaluateRegistration({
      owner, presentedSecret: SECRET, configuredSecret: SECRET, authenticatedUid: null,
    });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.status).toBe(401);
  });

  it("refuses a different signed-in user adding a passkey", () => {
    const r = evaluateRegistration({
      owner, presentedSecret: null, configuredSecret: SECRET, authenticatedUid: "someone-else",
    });
    expect(r.allowed).toBe(false);
    if (!r.allowed) expect(r.status).toBe(403);
  });

  it("lets the signed-in owner add another passkey", () => {
    const r = evaluateRegistration({
      owner, presentedSecret: null, configuredSecret: SECRET, authenticatedUid: owner.uid,
    });
    expect(r).toEqual({ allowed: true, mode: "add-credential", uid: owner.uid });
  });
});

describe("secret comparison", () => {
  it("matches identical secrets and rejects others", () => {
    expect(secretsMatch("abc123", "abc123")).toBe(true);
    expect(secretsMatch("abc123", "abc124")).toBe(false);
    expect(secretsMatch("abc", "abcd")).toBe(false);
    expect(secretsMatch("", "")).toBe(true);
  });
});

describe("passkey removal", () => {
  it("refuses to remove the last passkey, which would lock the owner out", () => {
    const r = evaluateCredentialRemoval({ ...owner, credentialCount: 1 }, owner.uid);
    expect(r.allowed).toBe(false);
    expect(r.reason).toMatch(/only passkey/i);
  });

  it("allows removal when another passkey remains", () => {
    expect(evaluateCredentialRemoval(owner, owner.uid).allowed).toBe(true);
  });

  it("refuses removal by anyone but the owner", () => {
    expect(evaluateCredentialRemoval(owner, "intruder").allowed).toBe(false);
    expect(evaluateCredentialRemoval(owner, null).allowed).toBe(false);
  });
});

/* ────────────────────────── sessions ──────────────────────────────────── */

describe("session policy", () => {
  const now = 1_800_000_000_000;
  const fresh: SessionState = {
    startedAt: now - 1000, lastActiveAt: now - 1000,
    lastAuthenticatedAt: now - 1000, revoked: false,
  };

  it("accepts a fresh session", () => {
    expect(evaluateSession(fresh, now)).toEqual({ valid: true });
  });

  it("rejects a revoked session immediately", () => {
    expect(evaluateSession({ ...fresh, revoked: true }, now))
      .toEqual({ valid: false, reason: "revoked" });
  });

  it("rejects a session past its absolute lifetime even if active", () => {
    const s: SessionState = {
      ...fresh, startedAt: now - SESSION_ABSOLUTE_MS - 1, lastActiveAt: now - 10,
    };
    expect(evaluateSession(s, now)).toEqual({ valid: false, reason: "expired" });
  });

  it("rejects an idle session", () => {
    const s: SessionState = { ...fresh, lastActiveAt: now - SESSION_IDLE_MS - 1 };
    expect(evaluateSession(s, now)).toEqual({ valid: false, reason: "idle" });
  });

  it("rejects timestamps from the future rather than trusting a skewed clock", () => {
    expect(evaluateSession({ ...fresh, startedAt: now + 60_000 }, now))
      .toEqual({ valid: false, reason: "future" });
    expect(evaluateSession({ ...fresh, lastActiveAt: now + 60_000 }, now))
      .toEqual({ valid: false, reason: "future" });
  });

  it("honours tighter custom limits", () => {
    const s: SessionState = { ...fresh, lastActiveAt: now - 2000 };
    expect(evaluateSession(s, now, { idleMs: 1000 })).toEqual({ valid: false, reason: "idle" });
  });

  it("requires re-authentication for a stale security change", () => {
    expect(requiresReauthentication({ lastAuthenticatedAt: now - 1000 }, now)).toBe(false);
    expect(requiresReauthentication({ lastAuthenticatedAt: now - 10 * 60_000 }, now)).toBe(true);
  });
});

/* ──────────────────── relying party configuration ─────────────────────── */

describe("relying party configuration", () => {
  it("reads a valid local configuration", () => {
    const rp = readRelyingParty({
      WEBAUTHN_RP_ID: "localhost", WEBAUTHN_RP_NAME: "NN",
      WEBAUTHN_ORIGIN: "http://localhost:3000",
    });
    expect(rp).toEqual({ id: "localhost", name: "NN", origins: ["http://localhost:3000"] });
  });

  it("accepts several origins", () => {
    const rp = readRelyingParty({
      WEBAUTHN_RP_ID: "nn.example.com",
      WEBAUTHN_ORIGIN: "https://nn.example.com, https://app.nn.example.com",
    });
    expect(rp.origins).toHaveLength(2);
  });

  it("rejects an rpID carrying a scheme or port — a silent passkey killer", () => {
    expect(() => readRelyingParty({
      WEBAUTHN_RP_ID: "http://localhost", WEBAUTHN_ORIGIN: "http://localhost:3000",
    })).toThrow(WebAuthnConfigError);
    expect(() => readRelyingParty({
      WEBAUTHN_RP_ID: "localhost:3000", WEBAUTHN_ORIGIN: "http://localhost:3000",
    })).toThrow(WebAuthnConfigError);
  });

  it("rejects an origin outside the relying party domain", () => {
    expect(() => readRelyingParty({
      WEBAUTHN_RP_ID: "nn.example.com", WEBAUTHN_ORIGIN: "https://evil.test",
    })).toThrow(/not within/);
  });

  it("rejects an origin with no scheme", () => {
    expect(() => readRelyingParty({
      WEBAUTHN_RP_ID: "localhost", WEBAUTHN_ORIGIN: "localhost:3000",
    })).toThrow(/scheme/);
  });

  it("refuses to run unconfigured", () => {
    expect(() => readRelyingParty({})).toThrow(WebAuthnConfigError);
    expect(() => readRelyingParty({ WEBAUTHN_RP_ID: "localhost" })).toThrow(/WEBAUTHN_ORIGIN/);
  });
});

/* ───────────────────────── challenges ─────────────────────────────────── */

describe("challenges", () => {
  const now = 1_800_000_000_000;

  it("is usable before expiry and not after", () => {
    const rec = makeRecord("abc", "authentication", now, 1000);
    expect(isUsable(rec, "authentication", now)).toBe(true);
    expect(isUsable(rec, "authentication", now + 1001)).toBe(false);
  });

  it("cannot be used for a different purpose than it was issued for", () => {
    const rec = makeRecord("abc", "registration", now);
    expect(isUsable(rec, "authentication", now)).toBe(false);
  });

  it("treats a missing challenge as unusable", () => {
    expect(isUsable(null, "authentication", now)).toBe(false);
  });

  it("CONSUMES a challenge so it can never be replayed", async () => {
    const store = new MemoryChallengeStore();
    await store.put("k", makeRecord("abc", "authentication", now));
    expect(await store.take("k")).not.toBeNull();
    expect(await store.take("k")).toBeNull();   // the replay attempt
    expect(store.size).toBe(0);
  });

  it("consumes an expired challenge too, leaving nothing behind", async () => {
    const store = new MemoryChallengeStore();
    await store.put("k", makeRecord("abc", "authentication", now, -1));
    const taken = await store.take("k");
    expect(isUsable(taken, "authentication", now)).toBe(false);
    expect(store.size).toBe(0);
  });
});
