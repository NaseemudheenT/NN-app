/**
 * Who is allowed to become the owner of NN.
 *
 * NN is a single-owner environment. The dangerous moment is the very first
 * registration: before an owner exists, any request reaching the server could
 * claim the account. This module is the gate, kept as pure logic so every
 * branch can be tested without a network, a database or a browser.
 */

export interface OwnerRecord {
  uid: string;
  claimedAt: string;
  /** How many passkeys are currently registered to the owner. */
  credentialCount: number;
}

export type BootstrapOutcome =
  | { allowed: true; mode: "bootstrap" }
  | { allowed: true; mode: "add-credential"; uid: string }
  | { allowed: false; reason: string; status: 401 | 403 | 409 | 503 };

export interface RegistrationRequest {
  /** The current owner, or null if NN has never been claimed. */
  owner: OwnerRecord | null;
  /** The secret presented by the caller, if any. */
  presentedSecret: string | null;
  /** The configured bootstrap secret, or null if none is configured. */
  configuredSecret: string | null;
  /** The uid of the already-authenticated caller, if any. */
  authenticatedUid: string | null;
}

/** Constant-time string comparison, so a wrong secret cannot be found by timing. */
export function secretsMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** A bootstrap secret shorter than this is treated as unconfigured. */
export const MIN_BOOTSTRAP_SECRET_LENGTH = 24;

/**
 * Decides whether a passkey registration may proceed.
 *
 *   · NN unclaimed  → only with a correct, sufficiently long bootstrap secret
 *   · NN claimed    → only the signed-in owner may add another passkey
 *
 * Every other case is refused. There is deliberately no path by which an
 * unauthenticated caller can register against an existing owner.
 */
export function evaluateRegistration(req: RegistrationRequest): BootstrapOutcome {
  const { owner, presentedSecret, configuredSecret, authenticatedUid } = req;

  if (owner === null) {
    if (configuredSecret === null || configuredSecret.length < MIN_BOOTSTRAP_SECRET_LENGTH) {
      return {
        allowed: false,
        status: 503,
        reason:
          `NN has no owner yet and no usable bootstrap secret is configured. ` +
          `Set NN_BOOTSTRAP_SECRET to at least ${MIN_BOOTSTRAP_SECRET_LENGTH} characters.`,
      };
    }
    if (presentedSecret === null || !secretsMatch(presentedSecret, configuredSecret)) {
      return { allowed: false, status: 401, reason: "Invalid bootstrap secret." };
    }
    return { allowed: true, mode: "bootstrap" };
  }

  // NN already has an owner. A bootstrap secret is worthless from here on —
  // otherwise a leaked secret would be a permanent back door.
  if (authenticatedUid === null) {
    return { allowed: false, status: 401, reason: "Sign in to add another passkey." };
  }
  if (authenticatedUid !== owner.uid) {
    return { allowed: false, status: 403, reason: "Only the owner may register a passkey." };
  }
  return { allowed: true, mode: "add-credential", uid: owner.uid };
}

/**
 * Decides whether a passkey may be removed. Refuses to remove the last one,
 * which would lock the founder out of his own environment permanently.
 */
export function evaluateCredentialRemoval(
  owner: OwnerRecord | null,
  authenticatedUid: string | null,
): { allowed: boolean; reason: string } {
  if (owner === null) return { allowed: false, reason: "NN has no owner." };
  if (authenticatedUid !== owner.uid) return { allowed: false, reason: "Not the owner." };
  if (owner.credentialCount <= 1) {
    return {
      allowed: false,
      reason: "This is your only passkey. Register another device first, or you will be locked out.",
    };
  }
  return { allowed: true, reason: "" };
}
