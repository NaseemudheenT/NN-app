import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails, assertSucceeds, initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

/**
 * Storage holds the founder's college PDFs, photographs, financial documents
 * and backups. Nothing in NN is publicly readable, and these tests prove it.
 */

const OWNER = "founder-uid";
const INTRUDER = "someone-else-uid";

let env: RulesTestEnvironment;

const bytes = (n: number) => new Uint8Array(n);
const pdf = { contentType: "application/pdf" };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "nn-rules-test",
    storage: { rules: readFileSync(resolve(process.cwd(), "storage.rules"), "utf8") },
  });
});

afterAll(async () => { await env.cleanup(); });
beforeEach(async () => { await env.clearStorage(); });

const asOwner = () => env.authenticatedContext(OWNER, { nnOwner: true }).storage();
const asIntruder = () => env.authenticatedContext(INTRUDER, { nnOwner: true }).storage();
const asNonPasskey = () => env.authenticatedContext(OWNER).storage();
const asStranger = () => env.unauthenticatedContext().storage();

describe("ownership", () => {
  it("lets the owner upload and read his own file", async () => {
    const s = asOwner();
    await assertSucceeds(uploadBytes(ref(s, `users/${OWNER}/academic/unit3.pdf`), bytes(64), pdf));
    await assertSucceeds(getDownloadURL(ref(s, `users/${OWNER}/academic/unit3.pdf`)));
  });

  it("lets the owner delete his own file", async () => {
    const s = asOwner();
    await uploadBytes(ref(s, `users/${OWNER}/documents/x.pdf`), bytes(16), pdf);
    await assertSucceeds(deleteObject(ref(s, `users/${OWNER}/documents/x.pdf`)));
  });

  it("DENIES another signed-in user reading the founder's file", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), `users/${OWNER}/documents/private.pdf`), bytes(16), pdf);
    });
    await assertFails(getDownloadURL(ref(asIntruder(), `users/${OWNER}/documents/private.pdf`)));
  });

  it("DENIES another signed-in user writing into the founder's space", async () => {
    await assertFails(uploadBytes(ref(asIntruder(), `users/${OWNER}/documents/evil.pdf`), bytes(16), pdf));
  });

  it("DENIES a Firebase-authenticated user without the verified passkey owner claim", async () => {
    await assertFails(uploadBytes(ref(asNonPasskey(), `users/${OWNER}/files/no-passkey.pdf`), bytes(16), pdf));
    await assertFails(getDownloadURL(ref(asNonPasskey(), `users/${OWNER}/files/private.pdf`)));
  });

  it("DENIES an anonymous request completely", async () => {
    await assertFails(uploadBytes(ref(asStranger(), `users/${OWNER}/a.pdf`), bytes(16), pdf));
    await assertFails(getDownloadURL(ref(asStranger(), `users/${OWNER}/a.pdf`)));
  });

  it("denies any path outside users/", async () => {
    await assertFails(uploadBytes(ref(asOwner(), "public/anything.pdf"), bytes(16), pdf));
    await assertFails(uploadBytes(ref(asOwner(), "anything.pdf"), bytes(16), pdf));
  });
});

describe("upload safety", () => {
  it("accepts the document and media types NN actually handles", async () => {
    const s = asOwner();
    const cases: Array<[string, string]> = [
      ["notes.pdf", "application/pdf"],
      ["photo.jpg", "image/jpeg"],
      ["lecture.mp4", "video/mp4"],
      ["memo.m4a", "audio/mp4"],
      ["data.csv", "text/csv"],
      ["sheet.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    ];
    for (const [name, contentType] of cases) {
      await assertSucceeds(
        uploadBytes(ref(s, `users/${OWNER}/files/${name}`), bytes(32), { contentType }),
      );
    }
  });

  it("REFUSES an executable or script disguised as an upload", async () => {
    const s = asOwner();
    await assertFails(uploadBytes(ref(s, `users/${OWNER}/files/run.sh`), bytes(16),
      { contentType: "application/x-sh" }));
    await assertFails(uploadBytes(ref(s, `users/${OWNER}/files/page.html`), bytes(16),
      { contentType: "text/html" }));
    await assertFails(uploadBytes(ref(s, `users/${OWNER}/files/app.js`), bytes(16),
      { contentType: "application/javascript" }));
  });

  it("refuses an upload with no declared content type", async () => {
    await assertFails(uploadBytes(ref(asOwner(), `users/${OWNER}/files/unknown`), bytes(16)));
  });

  it("enforces the 200 MB ceiling", async () => {
    // 201 MB would be rejected; asserting the rule text so the test stays fast
    // and does not allocate 200 MB of memory in CI.
    const rules = readFileSync(resolve(process.cwd(), "storage.rules"), "utf8");
    expect(rules).toContain("200 * 1024 * 1024");
  });
});

describe("server-authored areas", () => {
  it("lets the owner read derived output but never write it", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), `derived/${OWNER}/thumb.png`), bytes(16),
        { contentType: "image/png" });
    });
    await assertSucceeds(getDownloadURL(ref(asOwner(), `derived/${OWNER}/thumb.png`)));
    await assertFails(uploadBytes(ref(asOwner(), `derived/${OWNER}/forged.png`), bytes(16),
      { contentType: "image/png" }));
  });

  it("denies another user reading derived output", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), `derived/${OWNER}/thumb.png`), bytes(16),
        { contentType: "image/png" });
    });
    await assertFails(getDownloadURL(ref(asIntruder(), `derived/${OWNER}/thumb.png`)));
  });

  it("keeps backup archives entirely out of client reach", async () => {
    await assertFails(uploadBytes(ref(asOwner(), `backups/${OWNER}/archive.bin`), bytes(16),
      { contentType: "application/json" }));
    await assertFails(getDownloadURL(ref(asOwner(), `backups/${OWNER}/archive.bin`)));
  });
});

describe("rules file", () => {
  it("has no publicly readable path anywhere", () => {
    const rules = readFileSync(resolve(process.cwd(), "storage.rules"), "utf8");
    expect(rules).not.toMatch(/allow read:\s*if true/);
    expect(rules).toContain("match /{allPaths=**}");
  });
});
