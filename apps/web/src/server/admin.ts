import "server-only";

import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * The trusted server side of NN.
 *
 * The Admin SDK bypasses security rules entirely, which is exactly why it is
 * confined to this module and the route handlers that import it. It must
 * never be reachable from the browser; `server-only` makes that a build
 * error rather than a code review.
 *
 * Against the emulators no credential is needed at all, so the whole of
 * Phase 3 can be built and tested at zero cost on the Spark plan.
 */

interface AdminServices {
  app: App;
  auth: Auth;
  db: Firestore;
}

let services: AdminServices | null = null;

export class AdminConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminConfigError";
  }
}

export function usingEmulators(): boolean {
  return (
    process.env.FIREBASE_AUTH_EMULATOR_HOST !== undefined ||
    process.env.FIRESTORE_EMULATOR_HOST !== undefined
  );
}

/**
 * Whether this deployment has what the server needs to reach Firebase.
 *
 * A boolean rather than a throw, so a route can decide how to answer an
 * unconfigured deployment instead of crashing into a 500. It deliberately
 * repeats getAdmin's conditions rather than calling it: asking the question
 * must never have the side effect of initialising the SDK.
 */
export function adminConfigured(): boolean {
  if (services !== null || getApps().length > 0) return true;

  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT;
  if (projectId === undefined || projectId.length === 0) return false;
  if (usingEmulators()) return true;

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw === undefined || raw.trim().length === 0) return false;
  try {
    const parsed = JSON.parse(raw) as {
      project_id?: string; client_email?: string; private_key?: string;
    };
    return (
      parsed.project_id !== undefined &&
      parsed.client_email !== undefined &&
      parsed.private_key !== undefined
    );
  } catch {
    return false;
  }
}

export function getAdmin(): AdminServices {
  if (services !== null) return services;

  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? process.env.GCLOUD_PROJECT;
  if (projectId === undefined || projectId.length === 0) {
    throw new AdminConfigError(
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set. The server cannot reach Firebase.",
    );
  }

  let app: App;
  if (getApps().length > 0) {
    app = getApp();
  } else if (usingEmulators()) {
    // Against the emulators the SDK still resolves Application Default
    // Credentials, which on a laptop means probing the GCP metadata server
    // and waiting ~13 seconds for it to time out before falling through.
    // Pointing the probe at a closed local port makes it fail in
    // milliseconds instead. A fabricated credential object does NOT work
    // here: the Firestore client rejects anything that is not a recognised
    // certificate or compute credential.
    if (process.env.GCE_METADATA_HOST === undefined) {
      process.env.GCE_METADATA_HOST = "127.0.0.1:1";
    }
    app = initializeApp({ projectId });
  } else {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (raw === undefined || raw.trim().length === 0) {
      throw new AdminConfigError(
        "FIREBASE_SERVICE_ACCOUNT is not set. It is required outside the emulators. " +
          "Store the service-account JSON there, never in the repository.",
      );
    }
    let parsed: { project_id?: string; client_email?: string; private_key?: string };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      throw new AdminConfigError("FIREBASE_SERVICE_ACCOUNT is not valid JSON.");
    }
    if (
      parsed.project_id === undefined || parsed.client_email === undefined ||
      parsed.private_key === undefined
    ) {
      throw new AdminConfigError(
        "FIREBASE_SERVICE_ACCOUNT is missing project_id, client_email or private_key.",
      );
    }
    app = initializeApp({
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        // Newlines survive an .env round trip as the two characters \n.
        privateKey: parsed.private_key.replace(/\\n/g, "\n"),
      }),
      projectId: parsed.project_id,
    });
  }

  services = { app, auth: getAuth(app), db: getFirestore(app) };
  return services;
}

export function resetAdminForTesting(): void {
  services = null;
}
