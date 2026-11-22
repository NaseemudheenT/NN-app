import { describe, expect, it } from "vitest";
import {
  MIN_RECOVERY_ENTROPY_BITS, MIN_RECOVERY_LENGTH, assessRecoveryPassword,
  entropyBits, lockoutMs,
} from "./recovery-policy";
import { createRecoveryRecord, verifyRecoveryPassword } from "./recovery";

/**
 * The way back into NN.
 *
 * These run real scrypt at the real parameters, which is why there are not
 * hundreds of them: each hash is deliberately expensive. The ones that are
 * here are the ones that would let someone in if they were wrong.
 */

const NOW = new Date("2026-11-17T10:00:00.000Z");
const GOOD = "harbour-lantern-thistle-49!";

describe("recovery password strength", () => {
  it("refuses anything short, however clever", () => {
    const verdict = assessRecoveryPassword("Tr0ub4dor&3");
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toContain(String(MIN_RECOVERY_LENGTH));
  });

  it("refuses a long password made of almost nothing", () => {
    // Thirty characters and four distinct symbols. Length is not variety, and
    // a composition rule would have waved this through.
    const verdict = assessRecoveryPassword("aaaaaaaaaaAAAAAAAAAA1111111111");
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.bits).toBeLessThan(MIN_RECOVERY_ENTROPY_BITS);
  });

  it("refuses alphabet and keyboard runs", () => {
    expect(entropyBits("abcdefghijklmnopqrst")).toBeLessThan(
      entropyBits("kqxwmfzjvtbrhdnpslgc"),
    );
    expect(assessRecoveryPassword("qwertyuiopasdfghjkl1").ok).toBe(false);
  });

  it("accepts a long phrase of unrelated words", () => {
    const verdict = assessRecoveryPassword(GOOD);
    expect(verdict.ok).toBe(true);
    if (verdict.ok) expect(verdict.bits).toBeGreaterThanOrEqual(MIN_RECOVERY_ENTROPY_BITS);
  });

  it("refuses a password that begins or ends with a space", () => {
    // The founder would never be able to type it back reliably, and a
    // credential you cannot retype is a lockout with extra steps.
    expect(assessRecoveryPassword(` ${GOOD}`).ok).toBe(false);
    expect(assessRecoveryPassword(`${GOOD} `).ok).toBe(false);
  });
});

describe("the stored record", () => {
  it("never contains the password", async () => {
    const record = await createRecoveryRecord(GOOD, NOW);
    const serialised = JSON.stringify(record);
    expect(serialised).not.toContain(GOOD);
    expect(serialised).not.toContain("harbour");
    expect(record.algorithm).toBe("scrypt");
    expect(record.N).toBe(65_536);
  });

  it("salts every record separately", async () => {
    const [a, b] = await Promise.all([
      createRecoveryRecord(GOOD, NOW),
      createRecoveryRecord(GOOD, NOW),
    ]);
    // Same password, different salt, so the hashes must differ. Without this
    // a leaked database would show at a glance which accounts share one.
    expect(a.salt).not.toBe(b.salt);
    expect(a.hash).not.toBe(b.hash);
  });

  it("refuses to be created from a weak password at all", async () => {
    await expect(createRecoveryRecord("short", NOW)).rejects.toThrow(/at least/);
  });
});

describe("verifying", () => {
  it("accepts the right password and clears the failure count", async () => {
    const created = await createRecoveryRecord(GOOD, NOW);
    const record = { ...created, failures: 3 };
    const verdict = await verifyRecoveryPassword(record, GOOD, NOW);
    expect(verdict.ok).toBe(true);
    expect(verdict.record.failures).toBe(0);
    expect(verdict.record.lockedUntil).toBeNull();
  });

  it("refuses the wrong password and counts it", async () => {
    const record = await createRecoveryRecord(GOOD, NOW);
    const verdict = await verifyRecoveryPassword(record, `${GOOD}x`, NOW);
    expect(verdict.ok).toBe(false);
    expect(verdict.record.failures).toBe(1);
  });

  it("locks out after five failures, and doubles from there", async () => {
    expect(lockoutMs(4)).toBe(0);
    expect(lockoutMs(5)).toBe(15 * 60_000);
    expect(lockoutMs(6)).toBe(30 * 60_000);
    expect(lockoutMs(7)).toBe(60 * 60_000);
    // Capped, so a lockout can never become a permanent self-inflicted
    // denial of service against the founder.
    expect(lockoutMs(99)).toBe(24 * 60 * 60_000);
  });

  it("writes the lockout into the record the caller must persist", async () => {
    const created = await createRecoveryRecord(GOOD, NOW);
    const verdict = await verifyRecoveryPassword({ ...created, failures: 4 }, "wrong", NOW);
    expect(verdict.ok).toBe(false);
    expect(verdict.record.failures).toBe(5);
    expect(verdict.record.lockedUntil).toBe(new Date(NOW.getTime() + 15 * 60_000).toISOString());
  });

  it("refuses while locked out, without even hashing", async () => {
    // The point of checking the lockout first: an attacker who has tripped it
    // cannot make NN spend 64 MB of memory per guess to tell them so.
    const created = await createRecoveryRecord(GOOD, NOW);
    const locked = {
      ...created,
      failures: 6,
      lockedUntil: new Date(NOW.getTime() + 60_000).toISOString(),
    };
    const started = Date.now();
    const verdict = await verifyRecoveryPassword(locked, GOOD, NOW);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.retryAfterMs).toBeGreaterThan(0);
    // Unhashed means fast. A real scrypt at these parameters takes far longer.
    expect(Date.now() - started).toBeLessThan(80);
  });

  it("lets the right password through once the lockout has passed", async () => {
    const created = await createRecoveryRecord(GOOD, NOW);
    const expired = {
      ...created,
      failures: 6,
      lockedUntil: new Date(NOW.getTime() - 1_000).toISOString(),
    };
    const verdict = await verifyRecoveryPassword(expired, GOOD, NOW);
    expect(verdict.ok).toBe(true);
  });

  it("refuses an algorithm it does not know rather than guessing", async () => {
    const created = await createRecoveryRecord(GOOD, NOW);
    const verdict = await verifyRecoveryPassword(
      { ...created, algorithm: "md5" as unknown as "scrypt" }, GOOD, NOW,
    );
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/Unsupported/);
  });

  it("does not throw when the stored hash is the wrong length", async () => {
    // timingSafeEqual throws on a length mismatch, and a throw here would be
    // both a crash and a side channel. The length is checked first.
    const created = await createRecoveryRecord(GOOD, NOW);
    const truncated = { ...created, hash: created.hash.slice(0, 20) };
    const verdict = await verifyRecoveryPassword(truncated, GOOD, NOW);
    expect(verdict.ok).toBe(false);
  });
});
