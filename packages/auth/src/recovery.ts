import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import {
  RECOVERY_SCRYPT, assessRecoveryPassword, lockoutMs, type RecoveryRecord,
} from "./recovery-policy";

const scrypt = promisify(scryptCallback) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Hashing the recovery password, and checking it.
 *
 * Server only. `node:crypto` cannot be bundled for a browser, and this file
 * being reachable from a client component is what broke the build the first
 * time it existed — so the policy half it validates against lives in
 * `recovery-policy.ts`, which is pure and safe anywhere.
 *
 * scrypt at N = 2^16 costs about 64 MB of memory and a measurable fraction of
 * a second per attempt, for anyone, including somebody holding a copy of the
 * database. That memory-hardness is the point: a GPU farm gains far less
 * against scrypt than against a fast hash.
 */

export async function createRecoveryRecord(
  password: string, now: Date,
): Promise<RecoveryRecord> {
  const strength = assessRecoveryPassword(password);
  if (!strength.ok) throw new Error(strength.reason);

  const salt = randomBytes(32);
  const derived = await scrypt(password, salt, RECOVERY_SCRYPT.keyLength, RECOVERY_SCRYPT);
  const at = now.toISOString();
  return {
    schemaVersion: 1,
    algorithm: "scrypt",
    salt: salt.toString("base64"),
    hash: derived.toString("base64"),
    N: RECOVERY_SCRYPT.N,
    r: RECOVERY_SCRYPT.r,
    p: RECOVERY_SCRYPT.p,
    keyLength: RECOVERY_SCRYPT.keyLength,
    createdAt: at,
    updatedAt: at,
    failures: 0,
    lockedUntil: null,
  };
}

export type RecoveryVerdict =
  | { ok: true; record: RecoveryRecord }
  | { ok: false; reason: string; retryAfterMs: number; record: RecoveryRecord };

/**
 * Check a password against the record, and return the record as it should now
 * be stored.
 *
 * The caller writes the returned record back. That is deliberate: the failure
 * count and the lockout are part of the credential, not a side effect, and a
 * verification that does not persist its own result is a verification an
 * attacker can replay for free.
 *
 * The lockout is checked *before* any hashing, so a locked-out attacker
 * cannot even make NN spend the 64 MB.
 */
export async function verifyRecoveryPassword(
  record: RecoveryRecord, password: string, now: Date,
): Promise<RecoveryVerdict> {
  if (record.algorithm !== "scrypt") {
    return {
      ok: false, record, retryAfterMs: 0,
      reason: `Unsupported recovery algorithm: ${record.algorithm}.`,
    };
  }

  if (record.lockedUntil !== null) {
    const until = Date.parse(record.lockedUntil);
    if (Number.isFinite(until) && until > now.getTime()) {
      return {
        ok: false, record, retryAfterMs: until - now.getTime(),
        reason: "Too many attempts. Recovery is locked for now.",
      };
    }
  }

  const derived = await scrypt(password, Buffer.from(record.salt, "base64"), record.keyLength, {
    N: record.N, r: record.r, p: record.p, maxmem: RECOVERY_SCRYPT.maxmem,
  });
  // Copied into plain views of the same length before the comparison, for two
  // reasons: `timingSafeEqual` throws on a length mismatch — and the throw
  // itself would be the side channel — and a Buffer's own type does not
  // satisfy it across Node versions.
  const stored = Uint8Array.from(Buffer.from(record.hash, "base64"));
  const computed = Uint8Array.from(derived);
  const matched = stored.length === computed.length && timingSafeEqual(stored, computed);

  if (matched) {
    return {
      ok: true,
      record: { ...record, failures: 0, lockedUntil: null, updatedAt: now.toISOString() },
    };
  }

  const failures = record.failures + 1;
  const wait = lockoutMs(failures);
  return {
    ok: false,
    retryAfterMs: wait,
    reason: wait > 0
      ? "That is not the recovery password. Too many attempts — recovery is locked for now."
      : "That is not the recovery password.",
    record: {
      ...record,
      failures,
      lockedUntil: wait > 0 ? new Date(now.getTime() + wait).toISOString() : null,
      updatedAt: now.toISOString(),
    },
  };
}
