# NN — Installing on your devices

**Status:** `VERIFIED` locally — manifest, icons, meta tags and offline page all
confirmed served and valid. **Not yet installable from your phone**, because
that needs NN reachable at an HTTPS address, which is a deployment step.

---

## How this works, in plain terms

NN is a **Progressive Web App**. That means it installs to your home screen
from a web address — no App Store, no review, no listing, nothing public.

When you install it, NN gets its own icon, opens **full-screen with no browser
bar**, and shows its own splash screen. It behaves like any other app on your
phone.

**A URL existing does not mean anyone can see your life.** Three independent
locks, all enforced on Google's servers:

1. **Passkey authentication** — only a passkey registered on your own devices
   can sign in. There is no password to guess or leak.
2. **Firestore Security Rules** — default-deny; every record readable only by
   your authenticated account. Proven by 88 tests.
3. **Firebase App Check** — rejects any client that is not the genuine NN app.

A stranger who typed the exact address would see a locked door.

---

## What is built and verified

| | |
|---|---|
| Web app manifest | ✅ `standalone` display, correct colours, 3 icons, one ORIN shortcut |
| Icon 512×512 | ✅ real PNG, generated from the locked mark |
| Apple touch icon 180×180 | ✅ real PNG, margined for iOS's squircle mask |
| Android maskable icon | ✅ real PNG, mark inside the 80% safe zone |
| `apple-mobile-web-app-capable` | ✅ present — full-screen on older iOS |
| `mobile-web-app-capable` | ✅ present — the modern standardised name |
| Service worker | ✅ registered in production only; never caches `/api` |
| Offline page | ✅ shown instead of a browser error |

Icons are **generated from `NN_MARK_PATH`**, never stored as separate files,
so the home-screen icon can never drift from the approved logo.

---

## Installing — once NN is deployed

### iPhone / iPad
1. Open the NN address in **Safari** (this does not work in Chrome on iOS).
2. Tap the **Share** button.
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**.

The NN icon appears on your home screen. Tapping it opens NN full-screen.

### Android
Open in Chrome. A **Install app** prompt appears, or use ⋮ → **Install app**.

### Mac / Windows desktop
Open in Chrome or Edge. Click the install icon in the address bar, or
⋮ → **Cast, save and share** → **Install page as app**.

---

## What is still needed

**A deployment.** NN currently runs only on `localhost`, and a phone cannot
install from that.

Deploying needs **Firebase App Hosting**, which requires the **Blaze** plan.
Realistic cost for one person: effectively **$0** — see `COST_ESTIMATE.md`.
That is a founder decision and has not been taken.

Until then everything above is verified locally and ready.

## Honest limitations

- **iOS gives a PWA roughly 50 MB of storage** and may evict it if the app is
  unused for weeks. NN keeps data on the server, so nothing is lost — it
  simply re-fetches.
- **Push notifications on iOS require 16.4+** and only work once installed to
  the home screen, not from a Safari tab.
- The service worker caches **only the shell**. Personal data always comes
  from the server, so you never see a stale balance or an out-of-date exam date.
