export {
  evaluateRegistration, evaluateCredentialRemoval, secretsMatch,
  MIN_BOOTSTRAP_SECRET_LENGTH,
} from "./owner";
export type { OwnerRecord, BootstrapOutcome, RegistrationRequest } from "./owner";

/*
 * This barrel must stay safe to import from a browser.
 *
 * `AuthProvider` is a client component and it imports from here, so anything
 * re-exported below is in the client bundle whether it is used or not.
 * Re-exporting the scrypt half of recovery broke the production build with
 * `UnhandledSchemeError: node:crypto` — webpack cannot bundle a Node builtin
 * for a browser, and it was right to refuse.
 *
 * So the policy — pure arithmetic over a string — lives here, and the hashing
 * is reachable only by naming `@nn/auth/recovery`, which only a route handler
 * ever does. The hazard is structural now rather than remembered.
 */
export {
  assessRecoveryPassword, entropyBits, lockoutMs,
  MIN_RECOVERY_LENGTH, MIN_RECOVERY_ENTROPY_BITS, RECOVERY_SCRYPT,
} from "./recovery-policy";
export type { RecoveryRecord, Strength } from "./recovery-policy";

export {
  evaluateSession, requiresReauthentication,
  SESSION_ABSOLUTE_MS, SESSION_IDLE_MS, REAUTH_WINDOW_MS,
} from "./session";
export type { SessionState, SessionVerdict } from "./session";

export {
  readRelyingParty, buildRegistrationOptions, confirmRegistration,
  buildAuthenticationOptions, confirmAuthentication, WebAuthnConfigError,
} from "./webauthn";
export type { RelyingParty, StoredCredential, AuthenticationResult } from "./webauthn";
export type {
  AuthenticationResponseJSON, RegistrationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON,
} from "./webauthn";

export {
  MemoryChallengeStore, makeRecord, isUsable, CHALLENGE_TTL_MS,
} from "./challenge";
export type { ChallengeStore, ChallengeRecord } from "./challenge";
