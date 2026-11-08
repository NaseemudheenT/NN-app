# NN APP — Security

**Status:** Phase 2 · authorisation boundary `VERIFIED` by test ·
authentication `NOT IMPLEMENTED` (Phase 3)

NN holds the founder's college work, finances, health records, private
journals and faith practice. Security here is implemented and tested, never
asserted. **No part of this document claims NN is secure** — it states what is
built, what is proven, and what is not yet there.

---

## 1. Where authorisation actually happens

**On Google's servers, in the security rules.** Not in React, not in a route
guard, not by hiding a button. A hidden button is a UX decision; the rules are
the boundary.

Every record the founder owns lives under `users/{uid}/…`. One ownership check
therefore protects all 34 applications — **including applications that have not
been written yet**. A test proves this: a collection named `some_future_app`,
which no rule mentions, is already readable only by its owner.

### Proven by test — 60 cases against the real emulator

| Property | Status |
|---|---|
| Owner can read and write his own records | ✅ |
| **Another signed-in user cannot read the founder's data** | ✅ |
| Another signed-in user cannot write, list or reach subcollections | ✅ |
| Anonymous requests are refused everywhere | ✅ |
| Paths outside `users/` and `reference/` are denied | ✅ |
| A collection with no rule written for it is still protected | ✅ |
| Audit logs, security events and permissions reject every client write | ✅ |
| An existing audit record cannot be altered or deleted | ✅ |
| ORIN cannot widen its own permissions from the client | ✅ |
| Passkeys can be deleted by the owner, never created or altered | ✅ |
| Documents without provenance metadata are rejected | ✅ |
| `createdAt` cannot be rewritten; `updatedAt` cannot move backwards | ✅ |
| A client cannot label a memory "inferred" or "imported" | ✅ |
| Note version history is append-only | ✅ |
| The owner record can never be deleted | ✅ |
| No publicly readable path exists in Storage | ✅ |
| Executables, HTML and scripts are refused at upload | ✅ |
| Derived output and backups are unreachable by any client | ✅ |

Run them: `pnpm test:rules`

---

## 2. A real hole these tests found

The first version of the Storage rules placed server-generated output at
`users/{uid}/_derived/` and denied client writes there.

**It did not work.** Storage rules are a *permissive union*: if any matching
rule allows a request, it is allowed. The owner's general
`users/{uid}/{allPaths=**}` write rule also matched `_derived/`, so the deny
had no effect and a client could have forged previews, OCR output and
thumbnails.

The fix was structural, not cosmetic: derived output moved to `derived/{uid}/`
and backups to `backups/{uid}/`, both **outside** the owner's writable subtree,
where the general rule cannot reach them.

This is recorded because it is the kind of mistake that reads as correct in
review and is only caught by execution.

---

## 3. Defence in depth

| Layer | What it does | What it does **not** do |
|---|---|---|
| **Authentication** | establishes who is asking | *Phase 3 — not built* |
| **Security Rules** | decide what they may touch | ✅ built and tested |
| **App Check** | attests the request came from the genuine NN client | **not authentication, not authorisation** — enforcement stays off until real traffic is observed |
| **Server-only writes** | Admin SDK bypasses rules, so denying all client writes makes a collection server-authored | ✅ built |
| **Permission tiers** | decide whether ORIN may act silently, must confirm, or must re-authenticate | ✅ built and tested |
| **Audit** | immutable record of every action | schema built; writers arrive with the applications |

### App Check, stated plainly

App Check tells us a request came from our app. It says nothing about *who* is
asking or *what* they may do. Treating it as a security control would be a
mistake, so the rules helper is named `appCheckOk()` and sits beside, never
instead of, the ownership check.

---

## 4. ORIN's limits, enforced in code

`@nn/security` holds the decision logic, and it is pessimistic by construction:

- An unknown scope, a revoked grant and an expired grant **all fail closed**
- Routine authorised work runs without re-asking — re-confirming work the
  founder already approved is friction, not safety
- **A sensitive action is escalated even under a broad grant.** A wide
  `modify` permission can never become a licence to send email
- Thirteen actions always stop and ask, and the list is a floor that
  configuration cannot lower: send message, send email, publish, purchase,
  transfer money, trade, permanent delete, share sensitive data, unlock a
  door, disable an alarm, grant a permission, change a security setting,
  connect an external account
- An automation cannot chain around any of it

---

## 5. Secrets

| Secret | Where it lives |
|---|---|
| AI provider keys | server-side only, never in a `NEXT_PUBLIC_` variable |
| OAuth tokens | Secret Manager, referenced by id from Firestore |
| Admin SDK credentials | Cloud Functions runtime only |
| Firebase web API key | safe in the browser — it identifies the project, it grants nothing |

`.gitignore` blocks `.env`, `*.pem`, `*.key` and any `*service-account*.json`.
`@nn/security`'s `redact()` strips credentials from structured logs by key name
*and* by value pattern, catching a token pasted into an innocently named field.

---

## 6. Not yet built — stated plainly

| | |
|---|---|
| Passkey authentication | Phase 3. **No passkey-only login is promised until it works end to end.** Firebase Auth's support will be verified against live documentation before an approach is chosen |
| Session and device management | Phase 3 |
| App Check enforcement | after real traffic is observed |
| Encrypted backup and tested restore | Phase 11 — **a backup is not VERIFIED until a restore test succeeds** |
| Penetration testing | not performed. No security audit has been carried out by anyone |

NN never collects or stores raw biometric data. Face and fingerprint
verification happen inside the platform authenticator; NN receives only a
public key and a signature counter.
