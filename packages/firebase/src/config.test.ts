import { describe, expect, it } from "vitest";
import { FirebaseConfigError, isConfigured, readConfig } from "./config";

const complete = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "nn-os-dev.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "nn-os-dev",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "nn-os-dev.appspot.com",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:abc",
};

describe("configuration", () => {
  it("reads a complete environment", () => {
    const c = readConfig(complete);
    expect(c.firebase.projectId).toBe("nn-os-dev");
    expect(c.appCheckSiteKey).toBeNull();
    expect(c.useEmulators).toBe(false);
  });

  it("names every missing variable rather than failing vaguely", () => {
    const { NEXT_PUBLIC_FIREBASE_API_KEY: _a, NEXT_PUBLIC_FIREBASE_APP_ID: _b, ...partial } = complete;
    try {
      readConfig(partial);
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(FirebaseConfigError);
      expect((e as FirebaseConfigError).missing).toEqual([
        "NEXT_PUBLIC_FIREBASE_API_KEY", "NEXT_PUBLIC_FIREBASE_APP_ID",
      ]);
    }
  });

  it("treats a blank value as missing", () => {
    expect(() => readConfig({ ...complete, NEXT_PUBLIC_FIREBASE_API_KEY: "   " }))
      .toThrow(FirebaseConfigError);
  });

  it("reports configuration status without throwing", () => {
    expect(isConfigured(complete)).toBe(true);
    expect(isConfigured({})).toBe(false);
  });

  it("enables emulators only on an exact opt-in", () => {
    expect(readConfig({ ...complete, NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true" }).useEmulators).toBe(true);
    expect(readConfig({ ...complete, NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "yes" }).useEmulators).toBe(false);
  });
});
