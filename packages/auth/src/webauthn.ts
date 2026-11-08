import {
  generateAuthenticationOptions, generateRegistrationOptions,
  verifyAuthenticationResponse, verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON, AuthenticatorTransport,
  PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

// Re-exported so route handlers can type their payloads without taking a
// direct dependency on the WebAuthn library.
export type {
  AuthenticationResponseJSON, RegistrationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/server";

/**
 * WebAuthn for NN.
 *
 * Firebase Authentication has no released passkey support — it sits on an
 * unpublished preview branch of the web SDK — so NN implements WebAuthn
 * itself and exchanges a verified assertion for a Firebase custom token.
 *
 * Deliberately NOT in a Cloud Function: that would require the Blaze plan.
 * These run in Next.js route handlers instead, which costs nothing.
 *
 * NN never sees a fingerprint or a face. The platform authenticator performs
 * the biometric check locally and returns only a public key and a signature
 * counter.
 */

export interface RelyingParty {
  /** Registrable domain, e.g. "localhost" or "nn.example.com". No scheme, no port. */
  id: string;
  name: string;
  /** Exact origin(s) the browser will report, including scheme and port. */
  origins: readonly string[];
}

/** The transports WebAuthn defines. Anything else is discarded on the way in. */
export const KNOWN_TRANSPORTS = [
  "ble", "hybrid", "internal", "nfc", "usb",
] as const satisfies readonly AuthenticatorTransport[];

/**
 * The library hands back plain strings, so unknown values are filtered out
 * rather than cast away. A transport NN does not recognise is simply not
 * stored; it only ever affects which authenticator hint the browser shows.
 */
function narrowTransports(values: readonly string[] | undefined): AuthenticatorTransport[] | undefined {
  if (values === undefined) return undefined;
  const known = values.filter(
    (v): v is AuthenticatorTransport => (KNOWN_TRANSPORTS as readonly string[]).includes(v),
  );
  return known.length > 0 ? known : undefined;
}

export interface StoredCredential {
  id: string;
  publicKey: Uint8Array<ArrayBuffer>;
  counter: number;
  transports?: readonly AuthenticatorTransport[];
}

export class WebAuthnConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebAuthnConfigError";
  }
}

export function readRelyingParty(env: Record<string, string | undefined>): RelyingParty {
  const id = env["WEBAUTHN_RP_ID"]?.trim();
  const name = env["WEBAUTHN_RP_NAME"]?.trim();
  const originList = env["WEBAUTHN_ORIGIN"]?.trim();

  if (id === undefined || id.length === 0) throw new WebAuthnConfigError("WEBAUTHN_RP_ID is not set.");
  if (originList === undefined || originList.length === 0) {
    throw new WebAuthnConfigError("WEBAUTHN_ORIGIN is not set.");
  }
  if (id.includes("://") || id.includes(":")) {
    throw new WebAuthnConfigError(
      `WEBAUTHN_RP_ID must be a bare domain with no scheme or port, got "${id}".`,
    );
  }

  const origins = originList.split(",").map((o) => o.trim()).filter((o) => o.length > 0);
  for (const origin of origins) {
    if (!/^https?:\/\//.test(origin)) {
      throw new WebAuthnConfigError(`WEBAUTHN_ORIGIN entries need a scheme, got "${origin}".`);
    }
    // A mismatch here is the difference between a working passkey and one that
    // silently fails in the browser, so it is checked at startup.
    const host = new URL(origin).hostname;
    if (host !== id && !host.endsWith(`.${id}`)) {
      throw new WebAuthnConfigError(
        `Origin "${origin}" is not within WEBAUTHN_RP_ID "${id}".`,
      );
    }
  }

  return { id, name: name !== undefined && name.length > 0 ? name : "NN", origins };
}

export async function buildRegistrationOptions(
  rp: RelyingParty,
  user: { id: string; name: string; displayName: string },
  existing: readonly StoredCredential[],
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  return generateRegistrationOptions({
    rpID: rp.id,
    rpName: rp.name,
    userID: new TextEncoder().encode(user.id),
    userName: user.name,
    userDisplayName: user.displayName,
    attestationType: "none",
    // Stops the founder accidentally registering the same device twice.
    excludeCredentials: existing.map((c) => ({
      id: c.id,
      ...(c.transports !== undefined ? { transports: [...c.transports] } : {}),
    })),
    authenticatorSelection: {
      residentKey: "required",      // a discoverable passkey — no username to type
      userVerification: "required", // biometric or device PIN, enforced by the platform
    },
  });
}

export async function confirmRegistration(
  rp: RelyingParty,
  response: RegistrationResponseJSON,
  expectedChallenge: string,
): Promise<StoredCredential> {
  const result = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: [...rp.origins],
    expectedRPID: rp.id,
    requireUserVerification: true,
  });

  if (!result.verified || result.registrationInfo === undefined) {
    throw new Error("Passkey registration could not be verified.");
  }

  const { credential } = result.registrationInfo;
  const transports = narrowTransports(credential.transports);
  return {
    id: credential.id,
    publicKey: credential.publicKey,
    counter: credential.counter,
    ...(transports !== undefined ? { transports } : {}),
  };
}

export async function buildAuthenticationOptions(
  rp: RelyingParty,
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  // allowCredentials is deliberately omitted: discoverable credentials let the
  // browser offer the right passkey without NN first revealing which ones exist.
  return generateAuthenticationOptions({
    rpID: rp.id,
    userVerification: "required",
  });
}

export interface AuthenticationResult {
  credentialId: string;
  newCounter: number;
}

export async function confirmAuthentication(
  rp: RelyingParty,
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  credential: StoredCredential,
): Promise<AuthenticationResult> {
  const result = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: [...rp.origins],
    expectedRPID: rp.id,
    requireUserVerification: true,
    credential: {
      id: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
      ...(credential.transports !== undefined ? { transports: [...credential.transports] } : {}),
    },
  });

  if (!result.verified) throw new Error("Passkey assertion could not be verified.");

  // A counter that fails to advance can indicate a cloned authenticator.
  // Platform passkeys legitimately report 0 forever, so only a genuine
  // regression above zero is treated as an attack.
  const { newCounter } = result.authenticationInfo;
  if (credential.counter > 0 && newCounter <= credential.counter) {
    throw new Error("Signature counter did not advance — possible cloned authenticator.");
  }

  return { credentialId: credential.id, newCounter };
}
