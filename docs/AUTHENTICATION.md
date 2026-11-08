# NN — Authentication

**Status:** passkey registration, sign-in, session policy and sign-out are
implemented and unit-tested. **Not yet exercised against a real browser
authenticator** — that is the remaining verification step.

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

## 6. What has and has not been verified

| | |
|---|---|
| Owner bootstrap logic | ✅ 30 unit tests, every branch |
| Session expiry, idle, revocation, clock skew | ✅ unit tested |
| Relying-party configuration validation | ✅ unit tested |
| Challenge single-use and expiry | ✅ unit tested |
| Routes compile and build | ✅ |
| **End-to-end with a real authenticator** | ❌ **not yet done** |
| Emulator integration test of the full ceremony | ❌ not yet done |

**No claim is made that passkey sign-in works end to end until it has been
performed in a real browser.** That is the next verification step.
