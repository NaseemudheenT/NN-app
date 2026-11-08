# Firestore Security Rules

Source: [`firebase/firestore.rules`](../firebase/firestore.rules) ·
Tests: [`firebase/tests/firestore.rules.test.ts`](../firebase/tests/firestore.rules.test.ts)

## Posture

**Default deny.** The file ends with a catch-all that refuses everything, so a
path nobody thought about is closed rather than open.

## Structure

```
users/{uid}                               owner only; can never be deleted
users/{uid}/{collection}/{docId}          owner only, minus server-written collections
users/{uid}/credentials/{id}              delete only — never create or update
users/{uid}/{c}/{d}/{sub}/{id}            owner only; history subcollections append-only
reference/{document=**}                   read when signed in; never writable
{document=**}                             denied
```

## Why one generic rule rather than 34 specific ones

A rule per application would mean 34 chances to forget one. The generic rule
plus an explicit list of server-written collections means a new application is
protected the moment its first document exists. A test asserts exactly that.

## Server-written collections

`audit_logs` · `security_events` · `permissions` · `summaries` · `backups` ·
`tool_executions` · `credentials` · `system_health` · `job_runs`

Every client write is denied. The Admin SDK bypasses rules entirely, so denial
here is what makes these collections server-authored. This is the mechanism
that stops ORIN editing its own audit trail or granting itself a permission.

## Validity requirements

Every document must carry `createdAt`, `updatedAt` (timestamps) and
`schemaVersion` (integer ≥ 1). On update, `createdAt` must be unchanged and
`updatedAt` must not move backwards. Documents wider than 120 fields are
rejected before they can approach Firestore's 1 MiB limit, where writes begin
failing silently.

## Sensitive fields — rejected at the boundary

A client write is refused outright if it contains any of these, **in any
collection in NN**:

| Group | Fields | Why |
|---|---|---|
| Credentials | `accessToken` `refreshToken` `idToken` `apiKey` `apiSecret` `clientSecret` `privateKey` `password` `secret` `sessionToken` | tokens belong in Secret Manager, referenced by id. Enforcing it in the rules means a bug in any of the 34 applications cannot leak one |
| Privilege | `permissions` `grantedScopes` `scopes` `role` `roles` `isAdmin` `admin` `tier` `approvedBy` | privilege is decided by the server, never asserted by the client. Without this an app's own install record could be used to grant itself scopes |
| Ownership | `ownerUid` `uid` `userId` | allowed only when the value matches the path. Ownership is structural; a document that also carries an owner field could otherwise claim someone else's |

The supported pattern is a reference, not a value:
`{ status: "connected", secretRef: "projects/nn-os-dev/secrets/gmail-oauth" }`.

## Memory provenance

A client may only ever write `source: "stated"`. `inferred` and `imported` must
come from a trusted server. This is what keeps ORIN's guesses from quietly
becoming facts about the founder.

## Append-only history

`versions` · `occurrences` · `entries` · `messages` · `steps` accept creates
but refuse updates and deletes, so an original note survives every later edit.
