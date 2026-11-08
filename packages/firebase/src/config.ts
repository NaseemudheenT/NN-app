/**
 * Firebase client configuration, read from the environment and validated once
 * at startup rather than failing later with an unhelpful SDK error.
 *
 * Only NEXT_PUBLIC_ values appear here. These are safe in the browser by
 * design — a Firebase web API key identifies the project, it does not grant
 * access. Access is decided entirely by Authentication and Security Rules.
 * Private credentials (AI providers, OAuth secrets, the Admin SDK) must never
 * appear in this file or any file it imports.
 */

export interface NNFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface NNRuntimeConfig {
  firebase: NNFirebaseConfig;
  /** reCAPTCHA Enterprise site key for App Check. Absent disables App Check. */
  appCheckSiteKey: string | null;
  /** Local emulator mode. Never true in a deployed build. */
  useEmulators: boolean;
}

const REQUIRED = {
  apiKey: "NEXT_PUBLIC_FIREBASE_API_KEY",
  authDomain: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  storageBucket: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "NEXT_PUBLIC_FIREBASE_APP_ID",
} as const satisfies Record<keyof NNFirebaseConfig, string>;

export class FirebaseConfigError extends Error {
  readonly missing: readonly string[];
  constructor(missing: readonly string[]) {
    super(
      `Firebase is not configured. Missing environment variable${missing.length > 1 ? "s" : ""}: ` +
        `${missing.join(", ")}. Copy .env.example to .env.local and fill it in.`,
    );
    this.name = "FirebaseConfigError";
    this.missing = missing;
  }
}

/**
 * Reads configuration from a plain record so it can be unit-tested without
 * mutating process.env.
 */
export function readConfig(env: Record<string, string | undefined>): NNRuntimeConfig {
  const missing: string[] = [];
  const firebase = {} as NNFirebaseConfig;

  for (const [field, name] of Object.entries(REQUIRED) as Array<[keyof NNFirebaseConfig, string]>) {
    const value = env[name];
    if (value === undefined || value.trim().length === 0) missing.push(name);
    else firebase[field] = value.trim();
  }

  if (missing.length > 0) throw new FirebaseConfigError(missing);

  const siteKey = env["NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY"]?.trim();

  return {
    firebase,
    appCheckSiteKey: siteKey !== undefined && siteKey.length > 0 ? siteKey : null,
    useEmulators: env["NEXT_PUBLIC_USE_FIREBASE_EMULATORS"] === "true",
  };
}

/** True when configuration is present, without throwing. Lets NN render a
 *  clear "needs configuration" state instead of a crash. */
export function isConfigured(env: Record<string, string | undefined>): boolean {
  return Object.values(REQUIRED).every((name) => {
    const v = env[name];
    return v !== undefined && v.trim().length > 0;
  });
}

/** Emulator ports. Must match firebase.json. */
export const EMULATOR_PORTS = {
  auth: 9099,
  firestore: 8080,
  storage: 9199,
  functions: 5001,
} as const;
