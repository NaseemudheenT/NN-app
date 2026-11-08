# Deploying NN to Vercel

NN needs a host that runs a Node server. Its passkey sign-in lives in Next.js
route handlers (`/api/auth/*`), chosen specifically so NN never needs Firebase
Blaze. Firebase Hosting on the free Spark plan serves static files only, so it
cannot run those routes — Vercel's free tier can, and it is what Next.js is
built for.

**Nothing here enables Firebase billing. `nn-os-dev` stays on Spark and
`nn-os-prod` stays untouched.**

---

## Why iPhone needs this at all

Android will add NN to the home screen from a plain local address. **iOS will
not: Safari only offers "Add to Home Screen" as an installable app over
HTTPS.** That is the whole reason NN has to be hosted before it can live on
your iPhone home screen.

---

## 1. Create the Vercel project

1. Sign in at vercel.com with the **GitHub account that owns `NN-app`**
   (`NaseemudheenT`). Vercel's free Hobby tier is enough; do not add a payment
   method.
2. **Add New → Project**, and import `NaseemudheenT/NN-app`.
3. Vercel will offer to make it public. **It stays private.** A Vercel
   deployment URL is unlisted but reachable by anyone who has the link — see
   §5 for locking it down.
4. Set **Root Directory** to `apps/web`. Leave "Include files outside the root
   directory" **on**: NN is a pnpm workspace and the build needs
   `packages/*`.
5. Framework preset: **Next.js**. Build and install commands: leave as
   detected. Vercel runs `pnpm install` at the repository root and finds the
   workspace on its own.

**Do not deploy yet.** The environment variables come first, or the first
build will fail at startup validation — which is the config check doing its
job.

---

## 2. Environment variables

Add these in **Project → Settings → Environment Variables**, for the
**Production** environment. Names and meanings are exactly those in
`.env.example`; nothing new is invented here.

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | from `nn-os-dev` | safe in the browser by design |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | from `nn-os-dev` | |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `nn-os-dev` | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | from `nn-os-dev` | |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | from `nn-os-dev` | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | from `nn-os-dev` | |
| `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` | `false` | **must be false.** There are no emulators in the cloud |
| `WEBAUTHN_RP_ID` | your domain, bare | e.g. `nn-app.vercel.app` — no scheme, no port |
| `WEBAUTHN_RP_NAME` | `NN` | what the passkey prompt calls it |
| `WEBAUTHN_ORIGIN` | `https://<your domain>` | must match exactly, scheme included |
| `NN_BOOTSTRAP_SECRET` | a fresh 32-byte secret | see below |
| `FIREBASE_SERVICE_ACCOUNT` | the whole service-account JSON, one line | **a real secret** |

Get the Firebase values with:

```bash
firebase apps:sdkconfig WEB --project nn-os-dev
```

Generate a fresh bootstrap secret — do not reuse your local one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

The service-account JSON comes from Firebase Console → Project settings →
Service accounts → Generate new private key. Paste the file's entire contents
as the value. It never goes in the repository.

---

## 3. The passkey detail that surprises everyone

A passkey is bound to its **relying-party ID**, which is the domain. A passkey
you created against `localhost` **will not work on `nn-app.vercel.app`**, and
vice versa. This is WebAuthn working correctly, not a bug: it is exactly what
stops a phishing site from replaying your credential.

So after the first deploy you will **claim NN again on the new domain**, using
the bootstrap secret from §2, and register a passkey from the device you want
to sign in with. Your local passkey keeps working locally.

If you later add a custom domain, `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN` must
change with it, and passkeys registered on the old domain stop working.

---

## 4. Firebase must be told about the new domain

Firebase Authentication rejects sign-in from unknown origins.

Firebase Console → Authentication → Settings → **Authorised domains** → Add
your Vercel domain. Without this, sign-in fails after the passkey succeeds,
which looks like a passkey problem and is not.

---

## 5. Keeping it private

NN is single-owner. The deployment URL should not be guessable or indexed.

- NN already sends `robots: noindex, nofollow, nocache` from
  `apps/web/src/app/layout.tsx`, so search engines will not list it.
- Every page that matters is behind the owner guard; the Firestore rules are
  owner-scoped and refuse everyone else regardless of what the UI does.
- Vercel's **Deployment Protection** (Settings → Deployment Protection) can
  additionally require your Vercel login before the site loads at all. On the
  free tier this covers preview deployments; consider enabling it.

---

## 6. Add NN to your home screen

**iPhone (Safari — it must be Safari, not Chrome):**
1. Open `https://<your domain>`.
2. Share button → **Add to Home Screen** → Add.
3. NN launches full-screen with no browser chrome: `layout.tsx` sets
   `appleWebApp.capable` and the legacy `apple-mobile-web-app-capable`, so
   older iOS versions honour it too.

**Android (Chrome):**
1. Open `https://<your domain>`.
2. Menu → **Install app** (or the install prompt in the address bar).

The icons are generated at build time from the locked mark in
`NN_MARK_PATH`, so the home-screen icon can never drift from the brand.

---

## 7. What is still not possible

Hosting NN does **not** unlock:

- **Cloud Functions** — still Blaze-only, still not approved.
- **Firebase Cloud Storage** — Spark cannot provision a bucket, so file upload
  stays unavailable.
- **Push notifications** — need FCM and a service worker push subscription;
  not built.
- **REN** — has no model provider credentials and is switched off by design.

None of these block installing NN on your phone.
