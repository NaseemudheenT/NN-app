/**
 * The rules a recovery password must satisfy.
 *
 * Deliberately separate from the hashing. This half is pure arithmetic over a
 * string and runs anywhere — the browser needs it to tell the founder whether
 * what they are typing is strong enough, before anything is sent. The other
 * half needs `node:crypto` and must never reach a client bundle; importing it
 * from a React component is what broke the build the first time this was
 * written, and the split is what makes that mistake impossible rather than
 * merely discouraged.
 */

/**
 * The way back in.
 *
 * NN is a passkey environment and that is the right default: a passkey cannot
 * be phished, reused or read off a screen. But the founder has exactly one
 * passkey on exactly one device, and NN deliberately refuses to delete the
 * last one — so a lost or wiped phone is a permanent lockout from a lifetime
 * of records. That is not a security property. That is a single point of
 * failure wearing a security property's clothes.
 *
 * So there is a recovery password. It is deliberately *not* a second way to
 * log in day to day, and the design says so in three ways:
 *
 * 1. **It costs real work to guess.** scrypt with N = 2^16 means about 64 MB
 *    of memory and a measurable fraction of a second per attempt, per guess,
 *    even for someone holding the database. A GPU farm does not help much:
 *    scrypt is memory-hard on purpose.
 * 2. **Guessing is rate-limited twice.** Once per caller by the usual limiter,
 *    and once globally by a lockout stored with the record itself — so
 *    rotating IP addresses buys an attacker nothing. The lockout doubles.
 * 3. **The password is never stored, logged or returned.** Only a salt, the
 *    scrypt parameters and the derived key. The founder's own password is not
 *    recoverable from NN, by NN, or by anyone who takes a copy of it.
 *
 * What this file does not claim: a password typed into a browser is weaker
 * than a passkey held in a secure element, and no amount of hashing changes
 * that. It is a recovery path, it is held to a much higher length and entropy
 * bar than a login password, and NN should ask the founder to register a
 * second passkey the moment they use it.
 */

export const RECOVERY_SCRYPT = {
  /** 2^16. ~64 MB of memory per attempt — memory-hard, so GPUs gain little. */
  N: 65_536,
  r: 8,
  p: 1,
  keyLength: 64,
  /** Node's default is 32 MB and would refuse the above outright. */
  maxmem: 160 * 1024 * 1024,
} as const;

/**
 * Sixteen, not eight.
 *
 * This is the one credential that outlives a lost device, so it is held to a
 * recovery-phrase standard rather than a password one.
 */
export const MIN_RECOVERY_LENGTH = 16;

/** Below this a password is guessable by someone who has the database. */
export const MIN_RECOVERY_ENTROPY_BITS = 60;

export interface RecoveryRecord {
  schemaVersion: 1;
  algorithm: "scrypt";
  /** base64. Unique per password, so two identical passwords hash differently. */
  salt: string;
  /** base64 of the derived key. Never the password. */
  hash: string;
  N: number;
  r: number;
  p: number;
  keyLength: number;
  createdAt: string;
  updatedAt: string;
  /** Consecutive failures. Reset by a success, never by time alone. */
  failures: number;
  /** ISO, or null. Set by the lockout and respected before any hashing. */
  lockedUntil: string | null;
}

/* -------------------------------------------------------------- strength -- */

export type Strength =
  | { ok: true; bits: number }
  | { ok: false; reason: string; bits: number };

const SEQUENCES = ["abcdefghijklmnopqrstuvwxyz", "0123456789", "qwertyuiop", "asdfghjkl"];

/**
 * How hard this password is to guess, in bits.
 *
 * Not a character-class rule. "Password1!" satisfies every composition rule
 * ever written and is worthless, while a long passphrase fails most of them
 * and is excellent. What actually matters is how much the password varies, so
 * the estimate is built from the alphabet it really uses and then *reduced*
 * for the things that make a long password weak: repeated characters, runs of
 * one character, and keyboard or alphabet sequences.
 */
export function entropyBits(password: string): number {
  if (password.length === 0) return 0;

  let classes = 0;
  if (/[a-z]/.test(password)) classes += 26;
  if (/[A-Z]/.test(password)) classes += 26;
  if (/[0-9]/.test(password)) classes += 10;
  if (/[^a-zA-Z0-9]/.test(password)) classes += 33;

  const distinct = new Set(password).size;
  // A 40-character password made of three letters is not a 40-character
  // password. Variety is capped by how many distinct symbols actually appear.
  const effectiveLength = Math.min(password.length, distinct * 3);
  let bits = effectiveLength * Math.log2(Math.max(classes, 2));

  // Runs: "aaaa" carries barely more than "a".
  const runs = password.match(/(.)\1{2,}/g) ?? [];
  for (const run of runs) bits -= (run.length - 1) * 2;

  // Sequences, forwards or backwards, in either case.
  const lower = password.toLowerCase();
  for (const sequence of SEQUENCES) {
    for (let i = 0; i + 4 <= sequence.length; i += 1) {
      const run = sequence.slice(i, i + 4);
      if (lower.includes(run) || lower.includes([...run].reverse().join(""))) bits -= 8;
    }
  }

  return Math.max(0, Math.round(bits));
}

export function assessRecoveryPassword(password: string): Strength {
  const bits = entropyBits(password);
  if (password.length < MIN_RECOVERY_LENGTH) {
    return {
      ok: false,
      bits,
      reason:
        `A recovery password must be at least ${MIN_RECOVERY_LENGTH} characters. ` +
        "It is the one credential that outlives a lost device.",
    };
  }
  if (password.trim() !== password) {
    return { ok: false, bits, reason: "A recovery password cannot begin or end with a space." };
  }
  if (bits < MIN_RECOVERY_ENTROPY_BITS) {
    return {
      ok: false,
      bits,
      reason:
        `This is too easy to guess — about ${bits} bits of variety, and NN needs ` +
        `at least ${MIN_RECOVERY_ENTROPY_BITS}. Length alone is not enough if the ` +
        "characters repeat or run in sequence. A long phrase of unrelated words works well.",
    };
  }
  return { ok: true, bits };
}

/** 15 minutes after the fifth failure, doubling, capped at a day. */
export function lockoutMs(failures: number): number {
  if (failures < 5) return 0;
  const doublings = Math.min(failures - 5, 7);
  return Math.min(15 * 60_000 * 2 ** doublings, 24 * 60 * 60_000);
}
