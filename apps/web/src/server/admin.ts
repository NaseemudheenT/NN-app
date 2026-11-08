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
    // The emulators accept any project id and no credential.
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
