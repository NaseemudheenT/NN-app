/**
 * WebAuthn challenges.
 *
 * A challenge must be unguessable, used once and short-lived. Replaying one
 * is the main way a captured assertion becomes a sign-in, so consumption is
 * destructive by design: reading a challenge removes it.
 */

export const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export interface ChallengeRecord {
  challenge: string;
  purpose: "registration" | "authentication";
  createdAt: number;
  expiresAt: number;
}

export interface ChallengeStore {
  put(key: string, record: ChallengeRecord): Promise<void>;
  /** Returns the record and deletes it. A second call must return null. */
  take(key: string): Promise<ChallengeRecord | null>;
}

export function makeRecord(
  challenge: string,
  purpose: ChallengeRecord["purpose"],
  now: number,
  ttlMs: number = CHALLENGE_TTL_MS,
): ChallengeRecord {
  return { challenge, purpose, createdAt: now, expiresAt: now + ttlMs };
}

export function isUsable(
  record: ChallengeRecord | null,
  purpose: ChallengeRecord["purpose"],
  now: number,
): record is ChallengeRecord {
  if (record === null) return false;
  if (record.purpose !== purpose) return false;
  return now < record.expiresAt;
}

/**
 * In-memory store for local development and tests. Not suitable for more than
 * one server process — production uses the Firestore-backed store instead.
 */
export class MemoryChallengeStore implements ChallengeStore {
  readonly #map = new Map<string, ChallengeRecord>();

  async put(key: string, record: ChallengeRecord): Promise<void> {
    this.#map.set(key, record);
  }

  async take(key: string): Promise<ChallengeRecord | null> {
    const found = this.#map.get(key) ?? null;
    this.#map.delete(key); // single use, even if expired or the wrong purpose
    return found;
  }

  get size(): number { return this.#map.size; }
}
