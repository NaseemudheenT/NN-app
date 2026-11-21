import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* `server-only` throws under jsdom by design — it exists to stop a server
   module reaching a client bundle, and that guarantee is enforced by the
   bundler at build time, not here. */
vi.mock("server-only", () => ({}));
import {
  DEFAULT_OWNER_UID, defaultOwner, defaultRecoveryConfigured, defaultRecoveryRecord,
} from "./default-owner";

/**
 * NN's own password, as a property of the deployment.
 *
 * The founder has been locked out twice, and neither time was the credential
 * wrong — it was something around it. A password that works only while a
 * particular Firestore document exists carries a second, invisible
 * dependency. These pin the fallback that removes it, and the limits on what
 * the fallback is allowed to be.
 */

const RECORD = JSON.stringify({
  schemaVersion: 1, algorithm: "scrypt",
  salt: "c2FsdA==", hash: "aGFzaA==",
  N: 65536, r: 8, p: 1, keyLength: 64,
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z",
  failures: 0, lockedUntil: null,
});

const set = (value?: string) => {
  if (value === undefined) delete process.env.NN_OWNER_RECOVERY;
  else process.env.NN_OWNER_RECOVERY = value;
};

beforeEach(() => set(undefined));
afterEach(() => { set(undefined); vi.restoreAllMocks(); });

describe("the password NN was deployed with", () => {
  it("is absent until it is configured", () => {
    expect(defaultRecoveryConfigured()).toBe(false);
    expect(defaultRecoveryRecord()).toBeNull();
    expect(defaultOwner()).toBeNull();
  });

  it("is read from configuration, never from the database", () => {
    set(RECORD);
    expect(defaultRecoveryConfigured()).toBe(true);
    expect(defaultRecoveryRecord()).toMatchObject({ algorithm: "scrypt", N: 65536, keyLength: 64 });
  });

  it("brings an owner with it, so a fresh deployment has someone to be", () => {
    set(RECORD);
    expect(defaultOwner()).toMatchObject({ uid: DEFAULT_OWNER_UID });
  });

  it("never carries a lockout it has nowhere to write back", () => {
    // Configuration is read-only, so a failure count read from it would be
    // one an attacker could reset by waiting for the next cold start. The
    // per-caller rate limit is what guards this path.
    set(JSON.stringify({ ...JSON.parse(RECORD), failures: 99, lockedUntil: "2099-01-01T00:00:00.000Z" }));
    expect(defaultRecoveryRecord()).toMatchObject({ failures: 0, lockedUntil: null });
  });

  it("ignores a malformed value rather than throwing on every sign-in", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    set("not json at all");
    expect(defaultRecoveryRecord()).toBeNull();
    set(JSON.stringify({ algorithm: "md5", salt: "x", hash: "y" }));
    expect(defaultRecoveryRecord()).toBeNull();
    expect(logged).toHaveBeenCalled();
  });

  it("says nothing about the value when it complains about it", () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    set("totally-bogus-but-secret-looking");
    defaultRecoveryRecord();
    for (const call of logged.mock.calls) {
      expect(call.join(" ")).not.toContain("totally-bogus");
    }
  });

  it("refuses anything that is not scrypt", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    set(JSON.stringify({ ...JSON.parse(RECORD), algorithm: "plaintext" }));
    expect(defaultRecoveryRecord()).toBeNull();
  });

  it("holds a hash and a salt, never a password", () => {
    set(RECORD);
    const record = defaultRecoveryRecord();
    expect(record).not.toBeNull();
    expect(Object.keys(record!)).not.toContain("password");
    expect(JSON.stringify(record)).not.toMatch(/password/i);
  });
});
