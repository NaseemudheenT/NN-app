# NN — Authentication

**Status:** `VERIFIED` — the full passkey ceremony has been executed in a real
browser against real emulators. 10 end-to-end tests pass.

---

## 1. Why NN implements WebAuthn itself

Firebase Authentication has **no released passkey support**. It sits on an
unpublished preview branch of the web SDK; the CLI added a *mock* passkey to
the Auth emulator in 15.21.0, but there is no production SDK behind it.
Building on that would be building on something that does not exist.

So NN implements WebAuthn directly and exchanges a verified assertion for a
Firebase custom token, which **is** supported and free on Spark.

### The Blaze question, answered

| Approach | Needs | Cost |
|---|---|---|
| WebAuthn verified in Cloud Functions | Blaze | ❌ not approved |
| **WebAuthn verified in Next.js route handlers** | Admin SDK, free on Spark | ✅ **$0** |

Route handlers do the same job as a Cloud Function here. The only thing lost
is Firebase-managed hosting of that endpoint, which is a Phase 13 deployment
decision, not an authentication one.

---

## 2. The flow

```
Sign in
  browser  POST /api/auth/signin/options   → ticket + challenge
  device   platform authenticator verifies the founder (biometric or PIN)
  browser  POST /api/auth/signin/verify    → assertion
  server   verifies signature, origin, RP ID, user verification, counter
  server   mints a Firebase custom token
  browser  signInWithCustomToken → Firebase session
           ↓
  every owner-scoped Firestore and Storage rule from Phase 2 now applies
```

**NN never receives biometric data.** The device performs the check locally
and returns a public key and a signature counter. The fingerprint drawn on the
sign-in screen is a symbol, and the screen says so.

---

## 3. First-owner bootstrap

The dangerous moment is the first registration: before an owner exists, any
request reaching the server could claim the account.

```
NN unclaimed  → registration requires NN_BOOTSTRAP_SECRET (≥ 24 characters)
NN claimed    → only the signed-in owner may add another passkey
```

**The bootstrap path closes permanently once NN has an owner.** A leaked
secret afterwards is not a back door — this is asserted by test.

Generate one:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Put it in `apps/web/.env.local` as `NN_BOOTSTRAP_SECRET`. Never commit it.
Once NN is claimed you may safely blank it.

A race between two simultaneous bootstrap requests is closed by a Firestore
transaction in `claimOwner`, and ownership is re-checked at commit time rather
than only when the options were issued.

---

## 4. Defences in the implementation

| Threat | Defence |
|---|---|
| Replayed assertion | challenges are consumed destructively inside a transaction; a second attempt finds nothing |
| Stale challenge | five-minute TTL, checked after consumption |
| Challenge reuse across ceremonies | purpose is bound to the record; a registration challenge cannot sign in |
| Verifying against the wrong account | the uid travels with the challenge, not with the request |
| Cloned authenticator | signature counter must advance when it is non-zero |
| Phishing origin | exact origin and RP ID matching, validated at startup |
| Account enumeration | one generic "Sign-in failed." for every failure path |
| Probing whether NN is claimed | `/signin/options` returns the same shape either way |
| Timing attack on the secret | constant-time comparison |
| Weak bootstrap secret | refused below 24 characters |
| Locking the founder out | the last remaining passkey cannot be removed |
| Session never ending | absolute 30-day and idle 14-day limits on top of Firebase's silent refresh |
| Stolen session after sign-out | `revokeRefreshTokens` + `verifyIdToken(token, true)` ends it on every device |

---

## 5. Recovery

**Today:** register a second passkey on another device from Profile. Two
devices is the supported recovery path, and removing your only passkey is
refused.

**If every passkey is lost:** the owner document in Firestore must be reset by
someone with Admin SDK access, then NN re-claimed with a fresh bootstrap
secret. This is deliberately manual — an automated reset would be the weakest
link in the whole system.

A recovery-code mechanism is **not implemented**. It is recorded in the gap
analysis rather than described as if it existed.

---

## 6. Real-browser verification

**Environment:** Google Chrome **150.0.7871.125**, macOS 12.7.6, Intel x86_64,
driven by Playwright against a CDP **virtual authenticator**
(`ctap2`, `internal` transport, resident key, user verification). Backed by
real Firestore and Auth emulators. These are not mocks — Chrome's own WebAuthn
implementation performs the ceremony against NN's real route handlers.

| Test | Result |
|---|---|
| An unclaimed NN offers to be claimed, not signed into | ✅ |
| A wrong bootstrap secret is refused and NN stays unclaimed | ✅ |
| An unauthenticated visitor is redirected away from `/workspace` | ✅ |
| **Claims NN with a real passkey and signs in** | ✅ |
| Once claimed, the sign-in screen changes and hides the secret field | ✅ |
| **The bootstrap secret stops working after claiming** (401) | ✅ |
| **A challenge cannot be replayed** — the second attempt reports expired | ✅ |
| An unknown credential is refused with a generic message | ✅ |
| Malformed input is rejected with 4xx, never 5xx | ✅ |
| **Rate limiting engages** and returns `Retry-After` | ✅ |

Run them: `pnpm --filter @nn/web test:e2e`

### Browser compatibility

| Browser | Status |
|---|---|
| Chrome 150 / macOS 12 | ✅ verified end to end |
| Safari, Firefox, Edge, iOS, Android | ⚠️ **not yet tested.** The implementation uses only standard WebAuthn with no Chrome-specific behaviour, but that is reasoning, not evidence |

Playwright no longer ships a Chromium build for Intel macOS 12, so the suite
drives the installed system Chrome via `channel: "chrome"`. WebKit and Firefox
engines cannot be downloaded on this host at all, which is why they are
untested rather than merely unverified.

## 7. Defects found and fixed during verification

| Defect | Impact | Fix |
|---|---|---|
| **The idle timeout was dead.** `onIdTokenChanged` fires on Firebase's silent hourly refresh, and the handler bumped `lastActiveAt` each time — so a tab left open could never go idle | the 14-day idle limit never fired | only real user activity advances `lastActiveAt`; a refresh leaves the session untouched |
| **Sign-in scanned every credential document.** A `collectionGroup` read filtered in memory | O(n) Firestore reads per sign-in attempt, including failed ones; a cost line that grows | a root-level `credential_index` written in the same transaction as the credential — two reads, always |
| **No rate limiting** | auth endpoints could be hammered | Firestore fixed-window limiter on all six routes; tightest on `register-options` (5/min), where a bootstrap secret could be guessed |
| **13.4-second first request.** The Admin SDK probed the GCP metadata server for credentials and waited for it to time out | every cold route unusable in development | the metadata probe is pointed at a closed local port under emulators — 13.4s → 0.07s, verified by measuring the response body as well as the latency |

A fabricated credential object was tried first and **rejected** — the Firestore
client only accepts a recognised certificate or compute credential. Recorded
here so the same dead end is not tried again.
