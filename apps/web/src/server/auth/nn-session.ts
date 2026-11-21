import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * NN's own session, owned end to end.
 *
 * Firebase Authentication has never been provisioned on this project, the
 * API that would provision it answers `BILLING_NOT_ENABLED`, and Blaze is
 * forbidden — so `signInWithCustomToken` has nothing to exchange a token
 * with and every sign-in ends in `auth/configuration-not-found`. NN verified
 * the founder's password correctly every single time and still could not let
 * them in, because the last step belonged to a service that does not exist.
 *
 * So the session stops being Firebase's and becomes NN's. The password is
 * checked here, the session is signed here, and nothing in the path depends
 * on a service NN cannot switch on.
 *
 * **What this changes about security, said plainly.** Authorisation used to
 * live entirely in the Firestore rules, keyed to a Firebase uid. A session
 * NN signs itself cannot satisfy those rules, so owner scoping moves to the
 * server routes that read and write on the founder's behalf — the Admin SDK
 * runs there, and every path takes its uid from this cookie rather than from
 * anything the browser sent. The rules stay exactly as they are and keep
 * refusing every direct client read, which is now simply a second lock on a
 * door nobody walks through.
 *
 * The token is deliberately boring: a payload and an HMAC, no JWT library,
 * no algorithm negotiation. `alg: none` and confused-deputy bugs come from
 * parsers that take the attacker's word for how to verify.
 */

const VERSION = "nn1";
/** Fourteen days. Long enough to be a device you own, short enough to lapse. */
export const SESSION_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;
export const SESSION_COOKIE = "nn_session";

export class SessionSecretMissing extends Error {
  constructor() {
    super("NN_SESSION_SECRET is not set, so NN cannot sign a session.");
    this.name = "SessionSecretMissing";
  }
}

/**
 * The signing secret.
 *
 * Required, never derived from something else and never defaulted. A session
 * secret with a fallback is a session secret every deployment shares.
 */
function secret(env: NodeJS.ProcessEnv = process.env): string {
  const value = (env["NN_SESSION_SECRET"] ?? "").trim();
  if (value.length < 32) throw new SessionSecretMissing();
  return value;
}

const b64 = (input: Buffer | string) =>
  Buffer.from(input).toString("base64url");

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

export interface SessionClaims {
  uid: string;
  /** Seconds since the epoch. */
  issuedAt: number;
  expiresAt: number;
  /** Which credential opened this session. Audit only; never a permission. */
  via: "password" | "passkey";
}

/** Mints a signed session string. */
export function issueSession(
  uid: string,
  via: SessionClaims["via"],
  now: Date = new Date(),
  env: NodeJS.ProcessEnv = process.env,
): string {
  const issuedAt = Math.floor(now.getTime() / 1000);
  const claims: SessionClaims = {
    uid,
    issuedAt,
    expiresAt: issuedAt + SESSION_MAX_AGE_SECONDS,
    via,
  };
  // A nonce so two sessions minted in the same second are not the same
  // string, which keeps one leaking from invalidating the comparison of
  // another.
  const body = b64(JSON.stringify({ ...claims, n: randomBytes(9).toString("base64url") }));
  return `${VERSION}.${body}.${sign(`${VERSION}.${body}`, secret(env))}`;
}

/**
 * Reads a session, or returns null.
 *
 * Every failure returns null rather than throwing or explaining: a caller
 * presenting a bad token learns only that it did not work. The signature is
 * compared in constant time, and the expiry is checked *after* the signature
 * so an unsigned token cannot be probed for whether a uid is current.
 */
export function readSession(
  token: string | undefined | null,
  now: Date = new Date(),
  env: NodeJS.ProcessEnv = process.env,
): SessionClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [version, body, mac] = parts as [string, string, string];
  if (version !== VERSION) return null;

  let expected: string;
  try {
    expected = sign(`${version}.${body}`, secret(env));
  } catch {
    return null;   // no secret configured: nothing can be trusted
  }

  const presented = Buffer.from(mac);
  const computed = Buffer.from(expected);
  if (presented.length !== computed.length) return null;
  if (!timingSafeEqual(presented, computed)) return null;

  let claims: SessionClaims;
  try {
    claims = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionClaims;
  } catch {
    return null;
  }

  if (typeof claims.uid !== "string" || claims.uid.length === 0) return null;
  if (typeof claims.expiresAt !== "number") return null;
  if (claims.expiresAt * 1000 <= now.getTime()) return null;

  return {
    uid: claims.uid,
    issuedAt: claims.issuedAt,
    expiresAt: claims.expiresAt,
    via: claims.via === "passkey" ? "passkey" : "password",
  };
}

/** The Set-Cookie value for a fresh session. */
export function sessionCookie(token: string): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    // The browser must never hand this to script: an XSS that can read the
    // session is an XSS that keeps it.
    "HttpOnly",
    "Secure",
    // Lax, not Strict: Strict drops the cookie on the first navigation back
    // into NN from anywhere else, which reads to the founder as being
    // signed out at random. Lax still refuses cross-site POSTs.
    "SameSite=Lax",
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ].join("; ");
}

/** The Set-Cookie value that ends a session. */
export function clearedCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

/** Pulls the raw session string out of a Cookie header. */
export function sessionFromCookieHeader(header: string | null): string | null {
  if (!header) return null;
  for (const piece of header.split(";")) {
    const [name, ...rest] = piece.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=") || null;
  }
  return null;
}
