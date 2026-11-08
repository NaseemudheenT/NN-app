import { defineConfig, devices } from "@playwright/test";

const PORT = 3210;
const ORIGIN = `http://localhost:${PORT}`;

/**
 * End-to-end tests for NN.
 *
 * Runs against the system Chrome rather than a downloaded Chromium: Playwright
 * no longer ships a Chromium build for Intel macOS 12, but it drives an
 * installed Chrome perfectly well, and CDP's virtual authenticator works
 * there — which is what makes real passkey testing possible at all.
 *
 * The whole suite is wrapped by `firebase emulators:exec`, so the server it
 * talks to is backed by real Firestore and Auth emulators. Nothing touches a
 * live project.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,       // one emulator, one owner — tests share state
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  // Generous: the dev server compiles each route on first hit, which can take
  // ten seconds or more on this machine. Production builds are far faster.
  timeout: 120_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: ORIGIN,
    trace: "retain-on-failure",
    ...devices["Desktop Chrome"],
    channel: "chrome",
  },
  webServer: {
    command: `./node_modules/.bin/next dev -p ${PORT}`,
    url: ORIGIN,
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      // Passed explicitly rather than relying on inheritance from
      // `firebase emulators:exec`: without these the Admin SDK tries to reach
      // real Firebase, has no credential, and every route fails.
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
      FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
      // The emulators accept any project-shaped config; no real credential.
      NEXT_PUBLIC_FIREBASE_API_KEY: "emulator-api-key",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "nn-os-dev.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "nn-os-dev",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "nn-os-dev.appspot.com",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "607545263036",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:607545263036:web:e2e",
      NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
      WEBAUTHN_RP_ID: "localhost",
      WEBAUTHN_RP_NAME: "NN",
      WEBAUTHN_ORIGIN: ORIGIN,
      // A test-only value. The founder's real secret never appears here and
      // never leaves their own .env.local.
      NN_BOOTSTRAP_SECRET: "e2e-only-bootstrap-secret-not-a-real-one",
    },
  },
});
