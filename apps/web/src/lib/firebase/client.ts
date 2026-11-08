"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck,
} from "firebase/app-check";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
  initializeFirestore, connectFirestoreEmulator, persistentLocalCache,
  persistentMultipleTabManager, type Firestore,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";
import { EMULATOR_PORTS, isConfigured, readConfig } from "@nn/firebase";

/**
 * The browser's connection to Firebase.
 *
 * Initialised lazily and exactly once. NN must stay usable when Firebase is
 * not configured yet — so nothing here throws on import, and callers get a
 * clear "not configured" signal instead of a crash.
 */

interface Services {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
  appCheck: AppCheck | null;
}

let services: Services | null = null;
let emulatorsConnected = false;

export function firebaseAvailable(): boolean {
  return isConfigured(publicEnv());
}

/**
 * Next.js inlines NEXT_PUBLIC_ variables at build time, so they must be
 * referenced by their full literal name — a dynamic lookup on process.env
 * would be replaced with undefined.
 */
function publicEnv(): Record<string, string | undefined> {
  return {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY: process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY,
    NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN: process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN,
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS,
  };
}

export function getFirebase(): Services {
  if (services !== null) return services;

  const env = publicEnv();
  const config = readConfig(env); // throws FirebaseConfigError, naming what is missing

  const app = getApps().length > 0 ? getApp() : initializeApp(config.firebase);

  // Offline persistence is a cost control as much as a UX one: a repeated
  // read served from the local cache is a read Firestore never bills for.
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });

  const auth = getAuth(app);
  const storage = getStorage(app);

  let appCheck: AppCheck | null = null;
  if (config.useEmulators) {
    if (!emulatorsConnected) {
      connectAuthEmulator(auth, `http://127.0.0.1:${EMULATOR_PORTS.auth}`, { disableWarnings: true });
      connectFirestoreEmulator(db, "127.0.0.1", EMULATOR_PORTS.firestore);
      connectStorageEmulator(storage, "127.0.0.1", EMULATOR_PORTS.storage);
      emulatorsConnected = true;
    }
  } else if (config.appCheckSiteKey !== null) {
    // App Check attests that a request came from the genuine NN client. It is
    // not authentication and not authorisation; enforcement stays off in the
    // console until real traffic has been observed.
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(config.appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }

  services = { app, auth, db, storage, appCheck };
  return services;
}

/** For tests and hot reload. */
export function resetFirebaseForTesting(): void {
  services = null;
  emulatorsConnected = false;
}
