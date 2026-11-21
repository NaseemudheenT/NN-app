import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* `server-only` exists to throw if a server module is ever pulled into a
   client bundle. Under the jsdom test environment it resolves to that throwing
   entry, so it is stubbed here — the guarantee it provides is enforced by the
   bundler at build time, not by this test. */
vi.mock("server-only", () => ({}));

/* firebase-admin is replaced so the question "is this deployment configured?"
   can be asked without initialising anything. `getApps` returning empty is the
   cold-start case every serverless invocation begins in. */
vi.mock("firebase-admin/app", () => ({
  getApps: () => [],
  getApp: () => ({}),
  initializeApp: () => ({}),
  cert: () => ({}),
}));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({}) }));
vi.mock("firebase-admin/firestore", () => ({ getFirestore: () => ({}) }));

const { requireServerCredentials } = await import("./credentials");
const { adminConfigured } = await import("../admin");

const SERVICE_ACCOUNT = JSON.stringify({
  project_id: "nn-os-dev",
  client_email: "nn@nn-os-dev.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nnot-a-real-key\n-----END PRIVATE KEY-----\n",
});

const KEYS = [
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID", "GCLOUD_PROJECT", "FIREBASE_SERVICE_ACCOUNT",
  "FIREBASE_AUTH_EMULATOR_HOST", "FIRESTORE_EMULATOR_HOST",
] as const;

let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

describe("adminConfigured", () => {
  it("is false with no project at all", () => {
    expect(adminConfigured()).toBe(false);
  });

  it("is false with a project but no service account", () => {
    // This is exactly the state the live deployment was in, and the state
    // that used to produce an unhandled 500 from every auth route.
    process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] = "nn-os-dev";
    expect(adminConfigured()).toBe(false);
  });

  it("is false for a service account that is present but blank", () => {
    process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] = "nn-os-dev";
    process.env["FIREBASE_SERVICE_ACCOUNT"] = "   ";
    expect(adminConfigured()).toBe(false);
  });

  it("is false for a service account that is not valid JSON", () => {
    process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] = "nn-os-dev";
    process.env["FIREBASE_SERVICE_ACCOUNT"] = "{not json";
    expect(adminConfigured()).toBe(false);
  });

  it("is false for a service account missing its private key", () => {
    process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] = "nn-os-dev";
    process.env["FIREBASE_SERVICE_ACCOUNT"] = JSON.stringify({
      project_id: "nn-os-dev", client_email: "nn@example.com",
    });
    expect(adminConfigured()).toBe(false);
  });

  it("is true with a project and a complete service account", () => {
    process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] = "nn-os-dev";
    process.env["FIREBASE_SERVICE_ACCOUNT"] = SERVICE_ACCOUNT;
    expect(adminConfigured()).toBe(true);
  });

  it("is true against the emulators, which need no service account", () => {
    process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] = "nn-os-dev";
    process.env["FIRESTORE_EMULATOR_HOST"] = "127.0.0.1:8080";
    expect(adminConfigured()).toBe(true);
  });

  it("never throws, whatever it is given — that is the whole point of it", () => {
    process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] = "nn-os-dev";
    for (const value of ["", "   ", "{", "null", "[]", '"a string"', "{}"]) {
      process.env["FIREBASE_SERVICE_ACCOUNT"] = value;
      expect(() => adminConfigured()).not.toThrow();
    }
  });
});

describe("requireServerCredentials", () => {
  it("refuses with 503 and says why, in words a person can act on", async () => {
    process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] = "nn-os-dev";
    const refusal = requireServerCredentials();
    expect(refusal).not.toBeNull();
    expect(refusal!.status).toBe(503);

    const body = (await refusal!.json()) as { error: string; configured: boolean };
    expect(body.configured).toBe(false);
    expect(body.error).toMatch(/cannot verify a passkey/i);
  });

  it("does not disclose which variable is missing", async () => {
    process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] = "nn-os-dev";
    const body = (await requireServerCredentials()!.json()) as { error: string };
    // An anonymous caller learns that sign-in is unavailable, nothing more.
    expect(body.error).not.toMatch(/FIREBASE_SERVICE_ACCOUNT|GCLOUD|env/i);
  });

  it("lets a configured deployment straight through", () => {
    process.env["NEXT_PUBLIC_FIREBASE_PROJECT_ID"] = "nn-os-dev";
    process.env["FIREBASE_SERVICE_ACCOUNT"] = SERVICE_ACCOUNT;
    expect(requireServerCredentials()).toBeNull();
  });
});
