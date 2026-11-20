"use client";

import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import type {
  PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON,
} from "@nn/auth";
import { signInWithCustomToken } from "firebase/auth";
import { getFirebase } from "@/lib/firebase";

/**
 * The browser half of the passkey ceremony.
 *
 * The private key never leaves the device's secure hardware, and NN never
 * receives a fingerprint or a face — the platform authenticator performs the
 * biometric check and returns only a signed assertion.
 */

export class PasskeyError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "PasskeyError";
    this.status = status;
  }
}

/** True when this browser can do platform passkeys at all. */
export function passkeysSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.PublicKeyCredential === "function" &&
    typeof navigator.credentials?.create === "function"
  );
}

async function post<T>(url: string, body: unknown, idToken?: string): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(idToken !== undefined ? { Authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new PasskeyError(data.error ?? "Request failed.", res.status);
  return data as T;
}

export interface AuthStatus {
  claimed: boolean;
  bootstrapReady: boolean;
  /** A password sign-in exists. */
  hasPassword?: boolean;
  /** False when the deployment has no server credentials at all. */
  configured: boolean;
}

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch("/api/auth/status", { cache: "no-store" });
  // 503 is NN answering, not NN being unreachable: the deployment is missing
  // its server credentials. Treating it as a network failure sent the founder
  // hunting for a connection problem that did not exist.
  if (res.status === 503) {
    return { claimed: false, bootstrapReady: false, configured: false };
  }
  if (!res.ok) throw new PasskeyError("Could not reach NN.", res.status);
  const status = (await res.json()) as Partial<AuthStatus>;
  return {
    claimed: status.claimed === true,
    bootstrapReady: status.bootstrapReady === true,
    configured: status.configured !== false,
    // Carried through, not re-derived. Rebuilding this object and forgetting
    // this one field locked the founder out of their own environment for two
    // days: the server said a password existed, the door never offered it,
    // and the only button left on the screen was one the server could no
    // longer accept. Every field the server sends is read here, and
    // `hasPassword` is covered by a test for exactly that reason.
    hasPassword: status.hasPassword === true,
  };
}

/**
 * Registers a passkey — either claiming an unowned NN with the bootstrap
 * secret, or adding a device to an already-claimed one.
 */
export async function registerPasskey(opts: {
  bootstrapSecret?: string;
  label?: string;
  idToken?: string;
}): Promise<void> {
  if (!passkeysSupported()) {
    throw new PasskeyError("This browser does not support passkeys.");
  }

  const { ticket, options } = await post<{ ticket: string; options: PublicKeyCredentialCreationOptionsJSON }>(
    "/api/auth/register/options",
    opts.bootstrapSecret !== undefined ? { bootstrapSecret: opts.bootstrapSecret } : {},
    opts.idToken,
  );

  let response;
  try {
    response = await startRegistration({ optionsJSON: options });
  } catch (e) {
    // A cancelled prompt is a normal user action, not a system failure.
    if (e instanceof Error && e.name === "NotAllowedError") {
      throw new PasskeyError("Passkey setup was cancelled.");
    }
    throw new PasskeyError(e instanceof Error ? e.message : "Passkey setup failed.");
  }

  await post("/api/auth/register/verify", {
    ticket, response, label: opts.label ?? "This device",
  }, opts.idToken);
}

/** Signs in with a passkey and establishes the Firebase session. */
export async function signInWithPasskey(): Promise<void> {
  if (!passkeysSupported()) {
    throw new PasskeyError("This browser does not support passkeys.");
  }

  const { ticket, options } = await post<{ ticket: string; options: PublicKeyCredentialRequestOptionsJSON }>(
    "/api/auth/signin/options", {},
  );

  let response;
  try {
    response = await startAuthentication({ optionsJSON: options });
  } catch (e) {
    if (e instanceof Error && e.name === "NotAllowedError") {
      throw new PasskeyError("Sign-in was cancelled.");
    }
    throw new PasskeyError(e instanceof Error ? e.message : "Sign-in failed.");
  }

  const { customToken } = await post<{ customToken: string }>(
    "/api/auth/signin/verify", { ticket, response },
  );

  // NN's own session is set by the route; the Firebase one is taken when the
  // project can give it.
  await signInToFirebase(customToken);
}

/* ------------------------------------------------------------- recovery -- */

/**
 * Signs in with the recovery password.
 *
 * The way back in when the passkey cannot be used — a lost device, a wiped
 * phone, an authenticator that will not answer. It ends in the same place a
 * passkey does: a Firebase custom token exchanged for a real session, with
 * the same owner-scoped rules. It grants nothing extra.
 *
 * The server answers every failure identically, so nothing here can tell the
 * founder *why* it failed beyond "it did" — that is deliberate, and the
 * reason the error text is the same for a wrong password and a lockout.
 */
export async function signInWithRecoveryPassword(password: string): Promise<string> {
  const { customToken, advice } = await post<{ customToken: string | null; advice: string }>(
    "/api/auth/recovery/verify", { password },
  );
  /*
   * By the time this resolves the founder is already signed in: the route
   * set NN's own session cookie before it answered. The Firebase session is
   * an *extra*, taken when the project has Authentication provisioned.
   *
   * It used to be required, and throwing here is precisely how a correct
   * password produced `auth/configuration-not-found` — NN had already
   * accepted them and then threw the acceptance away because a service it
   * does not own was absent.
   */
  await signInToFirebase(customToken);
  return advice;
}

/**
 * Takes the richer Firebase session when one is available.
 *
 * Never throws. A project without Authentication provisioned cannot give one
 * and must not be prevented from signing the founder in because of it.
 */
async function signInToFirebase(customToken: string | null): Promise<void> {
  if (customToken === null) return;
  try {
    await signInWithCustomToken(getFirebase().auth, customToken);
  } catch (error) {
    // Logged, not raised. NN's own session is what carries the founder.
    console.warn(
      "NN: Firebase would not take the session; continuing on NN's own.",
      (error as { code?: string })?.code ?? "",
    );
  }
}

/** Whether a recovery password exists, and when it last changed. */
export async function fetchRecoveryState(
  idToken?: string,
): Promise<{ configured: boolean; updatedAt: string | null }> {
  const response = await fetch("/api/auth/recovery/set", {
    headers: idToken !== undefined ? { authorization: `Bearer ${idToken}` } : {},
    cache: "no-store",
  });
  if (!response.ok) throw new PasskeyError("Could not read the recovery state.");
  return (await response.json()) as { configured: boolean; updatedAt: string | null };
}

/**
 * Sets or replaces the recovery password.
 *
 * Only works while already signed in with a passkey: the server checks the
 * session against the owner record, and the only person who may cut a second
 * key is somebody holding the first.
 */
export async function setRecoveryPassword(
  password: string, options: { idToken?: string; bootstrapSecret?: string } = {},
): Promise<number> {
  const { bits } = await post<{ ok: true; bits: number }>(
    "/api/auth/recovery/set",
    {
      password,
      ...(options.bootstrapSecret !== undefined
        ? { bootstrapSecret: options.bootstrapSecret } : {}),
    },
    options.idToken,
  );
  return bits;
}
