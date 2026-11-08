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

export interface AuthStatus { claimed: boolean; bootstrapReady: boolean }

export async function fetchAuthStatus(): Promise<AuthStatus> {
  const res = await fetch("/api/auth/status", { cache: "no-store" });
  if (!res.ok) throw new PasskeyError("Could not reach NN.", res.status);
  return (await res.json()) as AuthStatus;
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

  // From here the Firebase session carries the identity, and every
  // owner-scoped security rule from Phase 2 applies.
  await signInWithCustomToken(getFirebase().auth, customToken);
}
