# NN APP — Firebase Architecture

Status as of 2026-11-08. Firebase is the mandatory primary backend. No SQL database is used.

## Projects

| Environment | Project ID | Project number | Plan | Status |
|---|---|---|---|---|
| Development | `nn-os-dev` | 607545263036 | Spark (free) | `VERIFIED` created |
| Production | `nn-os-prod` | 62302820912 | Spark (free) | `VERIFIED` created |

Local aliases are in `.firebaserc`. **The default alias is `dev`** so no command can accidentally
target production. Switch deliberately with `firebase use prod`.

> `the-zap-e7583` (Renew) is a separate, unrelated project on the same Google account.
> It is never referenced by NN and must not be modified.

## Service mapping

| Requirement | Firebase service | Status |
|---|---|---|
| Primary database | Cloud Firestore | `NOT IMPLEMENTED` |
| Authentication | Firebase Authentication + WebAuthn passkeys | `NOT IMPLEMENTED` |
| Files and media | Cloud Storage for Firebase | `NOT IMPLEMENTED` |
| Server-side logic | Cloud Functions for Firebase | `BLOCKED` — requires Blaze |
| Web hosting | Firebase App Hosting | `BLOCKED` — requires Blaze |
| Notifications | Firebase Cloud Messaging | `NOT IMPLEMENTED` |
| Client attestation | Firebase App Check | `NOT IMPLEMENTED` |
| Scheduled work | Scheduled Functions + Cloud Scheduler | `BLOCKED` — requires Blaze |
| Queued background work | Cloud Tasks | `BLOCKED` — requires Blaze |
| Local development | Firebase Emulator Suite | `BLOCKED` — Java runtime not installed |

## Security posture today

`firebase/firestore.rules` and `firebase/storage.rules` are **default-deny**. Nothing can be read
or written by anyone. This is deliberate: the rules are written properly in Phase 2 alongside
their emulator tests, and until then the safest possible state is closed.

App Check is **not** a substitute for authentication or authorisation. It attests that a request
came from a genuine NN client; it says nothing about who the user is or what they may access.
Ownership is enforced by Security Rules against the authenticated UID, server-side.

## Billing — not enabled

Both projects are on the free Spark plan. No billing account is attached.

Cloud Functions, App Hosting, Cloud Tasks and Cloud Scheduler all require the Blaze
pay-as-you-go plan. NN needs them, so Blaze will eventually be required — but
`docs/COST_ESTIMATE.md` must be produced and approved by the founder first. Nothing will be
upgraded without that explicit approval.

## Passkeys — to be verified, not assumed

The specification requires passkey-first authentication. Firebase Authentication's own passkey
support must be verified against current documentation in Phase 2 before the approach is chosen.
If it does not cover the required flow, a custom WebAuthn implementation will be built with
server-side challenge generation, origin validation, replay protection and credential management,
integrated with Firebase Auth via custom tokens.

**No passkey-only login will be promised until it works end to end.** NN will not collect or
store raw biometric data under any implementation — biometrics stay inside the platform
authenticator.
