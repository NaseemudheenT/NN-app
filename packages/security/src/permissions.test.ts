import { describe, expect, it } from "vitest";
import { ALWAYS_CONFIRM, decide, isSensitive, type PermissionGrant } from "./permissions";

const grant = (over: Partial<PermissionGrant> = {}): PermissionGrant => ({
  scope: "notes.write", tier: "modify",
  grantedAt: "2026-01-01T00:00:00Z", expiresAt: null, revoked: false, ...over,
});

describe("permission decisions", () => {
  it("lets routine authorised work run without interrupting the founder", () => {
    const d = decide("update_note", "notes.write", [grant()]);
    expect(d.allowed).toBe(true);
    expect(d.approval).toBe("none");
  });

  it("fails closed when no grant exists", () => {
    const d = decide("update_note", "notes.write", []);
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/No grant/);
  });

  it("fails closed on a revoked grant", () => {
    expect(decide("update_note", "notes.write", [grant({ revoked: true })]).allowed).toBe(false);
  });

  it("fails closed on an expired grant", () => {
    const d = decide("update_note", "notes.write",
      [grant({ expiresAt: "2026-01-02T00:00:00Z" })], new Date("2026-06-01T00:00:00Z"));
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/expired/);
  });

  it("honours a grant that has not yet expired", () => {
    const d = decide("update_note", "notes.write",
      [grant({ expiresAt: "2027-01-01T00:00:00Z" })], new Date("2026-06-01T00:00:00Z"));
    expect(d.allowed).toBe(true);
  });

  it("escalates a sensitive action even under a broad grant", () => {
    // The crucial case: a wide 'modify' grant must not become a licence to
    // send email on the founder's behalf.
    const d = decide("send_email", "mail.write", [grant({ scope: "mail.write", tier: "modify" })]);
    expect(d.allowed).toBe(true);
    expect(d.approval).toBe("confirm");
    expect(d.reason).toMatch(/always requires explicit approval/);
  });

  it("demands re-authentication for a security-tier action", () => {
    const d = decide("change_security_setting", "security.write",
      [grant({ scope: "security.write", tier: "security" })]);
    expect(d.approval).toBe("reauthenticate");
  });

  it.each(ALWAYS_CONFIRM)("never lets %s run silently", (action) => {
    const d = decide(action, "any.scope", [grant({ scope: "any.scope", tier: "modify" })]);
    expect(d.approval).not.toBe("none");
  });

  it("recognises the sensitive action list", () => {
    expect(isSensitive("transfer_money")).toBe(true);
    expect(isSensitive("read_note")).toBe(false);
  });
});

/* ──────────────────────────── rate limiting ──────────────────────────── */

import { AUTH_LIMITS, clientKey, decideRateLimit, windowStart } from "./ratelimit";

describe("rate limiting", () => {
  const rule = { windowMs: 60_000, max: 5 };
  const now = 1_800_000_030_000; // 30s into a window

  it("allows requests up to the limit and refuses the one after", () => {
    expect(decideRateLimit(rule, 5, now).allowed).toBe(true);
    expect(decideRateLimit(rule, 6, now).allowed).toBe(false);
  });

  it("reports how long until the window resets", () => {
    expect(decideRateLimit(rule, 1, now).resetInMs).toBe(30_000);
  });

  it("never reports negative remaining", () => {
    expect(decideRateLimit(rule, 99, now).remaining).toBe(0);
  });

  it("buckets timestamps into stable windows", () => {
    expect(windowStart(now, 60_000)).toBe(1_800_000_000_000);
    expect(windowStart(now + 29_999, 60_000)).toBe(1_800_000_000_000);
    expect(windowStart(now + 30_000, 60_000)).toBe(1_800_000_060_000);
  });

  it("holds the guessable endpoints tightest", () => {
    // register-options is where a bootstrap secret could be guessed.
    expect(AUTH_LIMITS["register-options"].max).toBeLessThanOrEqual(5);
    expect(AUTH_LIMITS["signin-verify"].max).toBeLessThanOrEqual(10);
  });

  it("derives a key from forwarded headers and degrades safely", () => {
    const h = (v: Record<string, string>) => ({ get: (n: string) => v[n] ?? null });
    expect(clientKey(h({ "x-forwarded-for": "203.0.113.5, 10.0.0.1" }))).toBe("203.0.113.5");
    expect(clientKey(h({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientKey(h({}))).toBe("unknown");
  });

  it("truncates an absurdly long header rather than keying on it", () => {
    const h = { get: (n: string) => (n === "x-forwarded-for" ? "a".repeat(5000) : null) };
    expect(clientKey(h).length).toBe(64);
  });
});
