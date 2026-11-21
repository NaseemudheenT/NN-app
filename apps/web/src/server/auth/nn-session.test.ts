import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, SessionSecretMissing,
  clearedCookie, issueSession, readSession, sessionCookie, sessionFromCookieHeader,
} = await import("./nn-session");

/**
 * NN's own session.
 *
 * It exists because Firebase Authentication was never provisioned on this
 * project and cannot be without billing — so the founder's correct password
 * was verified and then thrown away at the last step, every time. These pin
 * the properties that make replacing it safe rather than merely convenient.
 */

const KEY = "a-test-secret-that-is-certainly-long-enough-32";
const env = { NN_SESSION_SECRET: KEY } as unknown as NodeJS.ProcessEnv;
const at = (seconds: number) => new Date(seconds * 1000);

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("minting and reading", () => {
  it("round-trips the owner", () => {
    const token = issueSession("owner-1", "password", at(1_000), env);
    expect(readSession(token, at(1_100), env)).toMatchObject({
      uid: "owner-1", via: "password",
    });
  });

  it("expires, and is refused after it does", () => {
    const token = issueSession("owner-1", "password", at(1_000), env);
    const justBefore = at(1_000 + SESSION_MAX_AGE_SECONDS - 1);
    const justAfter = at(1_000 + SESSION_MAX_AGE_SECONDS + 1);
    expect(readSession(token, justBefore, env)).not.toBeNull();
    expect(readSession(token, justAfter, env)).toBeNull();
  });

  it("refuses a token signed with a different secret", () => {
    const token = issueSession("owner-1", "password", at(1_000), env);
    const other = { NN_SESSION_SECRET: "a-completely-different-secret-also-32ch" } as unknown as NodeJS.ProcessEnv;
    expect(readSession(token, at(1_100), other)).toBeNull();
  });

  it("refuses a token whose payload was edited", () => {
    // The whole point: the uid must not be something the browser can choose.
    const token = issueSession("owner-1", "password", at(1_000), env);
    const [version, body, mac] = token.split(".");
    const forged = Buffer.from(JSON.stringify({
      uid: "somebody-else", issuedAt: 1_000,
      expiresAt: 1_000 + SESSION_MAX_AGE_SECONDS, via: "password",
    })).toString("base64url");
    expect(readSession(`${version}.${forged}.${mac}`, at(1_100), env)).toBeNull();
    expect(readSession(`${version}.${body}.${mac}`, at(1_100), env)).not.toBeNull();
  });

  it("refuses an unsigned or truncated token", () => {
    for (const bad of ["", "nonsense", "nn1.only-two", "a.b.c.d", "nn1..", "nn9.x.y"]) {
      expect(readSession(bad, at(1_100), env), bad).toBeNull();
    }
    expect(readSession(null, at(1_100), env)).toBeNull();
    expect(readSession(undefined, at(1_100), env)).toBeNull();
  });

  it("will not sign anything without a real secret", () => {
    const none = {} as NodeJS.ProcessEnv;
    expect(() => issueSession("owner-1", "password", at(1_000), none))
      .toThrow(SessionSecretMissing);
    // A short secret is not a secret.
    const weak = { NN_SESSION_SECRET: "tooshort" } as unknown as NodeJS.ProcessEnv;
    expect(() => issueSession("owner-1", "password", at(1_000), weak))
      .toThrow(SessionSecretMissing);
  });

  it("reads nothing when the deployment has no secret, rather than trusting", () => {
    const token = issueSession("owner-1", "password", at(1_000), env);
    expect(readSession(token, at(1_100), {} as NodeJS.ProcessEnv)).toBeNull();
  });

  it("mints a different string each time, even in the same second", () => {
    const a = issueSession("owner-1", "password", at(1_000), env);
    const b = issueSession("owner-1", "password", at(1_000), env);
    expect(a).not.toBe(b);
    expect(readSession(a, at(1_100), env)?.uid).toBe("owner-1");
    expect(readSession(b, at(1_100), env)?.uid).toBe("owner-1");
  });

  it("records which credential opened it, without that granting anything", () => {
    expect(readSession(issueSession("o", "passkey", at(1_000), env), at(1_100), env)?.via)
      .toBe("passkey");
    // An unknown value collapses to the weaker of the two rather than being
    // carried through as whatever the payload claimed.
    expect(readSession(issueSession("o", "password", at(1_000), env), at(1_100), env)?.via)
      .toBe("password");
  });
});

describe("the cookie", () => {
  it("is closed to script, to other sites, and to plain http", () => {
    const header = sessionCookie("nn1.x.y");
    expect(header).toContain("HttpOnly");
    expect(header).toContain("Secure");
    expect(header).toContain("SameSite=Lax");
    expect(header).toContain(`Max-Age=${SESSION_MAX_AGE_SECONDS}`);
  });

  it("clears by expiring, not by being absent", () => {
    expect(clearedCookie()).toContain("Max-Age=0");
    expect(clearedCookie()).toContain("HttpOnly");
  });

  it("is found among other cookies", () => {
    expect(sessionFromCookieHeader(`a=1; ${SESSION_COOKIE}=nn1.x.y; b=2`)).toBe("nn1.x.y");
    expect(sessionFromCookieHeader("a=1; b=2")).toBeNull();
    expect(sessionFromCookieHeader(null)).toBeNull();
  });

  it("keeps a value containing '=' intact", () => {
    // base64url has no '=', but a future encoding might, and silently
    // truncating a session is a bug that looks like a random sign-out.
    expect(sessionFromCookieHeader(`${SESSION_COOKIE}=aa=bb=cc`)).toBe("aa=bb=cc");
  });
});
