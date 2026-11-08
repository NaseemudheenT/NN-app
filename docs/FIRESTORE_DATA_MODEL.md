# NN APP — Firestore Data Model

**Status:** `IMPLEMENTED` — rules and tests exist; no production data yet.
Version 1.0 · 2026-11-08

---

## 1. Shape of the database

Everything the founder owns lives under one root document, so ownership is
structural rather than a field that could be forgotten:

```
users/{uid}                          the owner document
users/{uid}/<collection>/{docId}     everything else
```

A rule that denies any path not beginning `users/{request.auth.uid}` therefore
protects every application at once, including ones not yet written. This is the
single most important property of the model.

Two deliberate exceptions, both read-only to the client:

```
reference/{docId}          shared verified data (formula library, curricula)
reference/{docId}/{sub}/{id}
```

Nothing else is global. There is no second user, and no collection is shared.

---

## 2. Rules every collection obeys

1. **No unbounded arrays inside a document.** Anything that grows becomes a
   subcollection. A document that accumulates array entries eventually exceeds
   the 1 MiB limit and fails *writes* — silently losing data.
2. **No document above ~100 KiB in normal use.** Large text goes to Storage
   with metadata in Firestore.
3. **Every document carries** `createdAt`, `updatedAt` (server timestamps) and
   `schemaVersion` (number). Migrations depend on the last of these.
4. **Soft delete before hard delete.** `deletedAt` set; trash purged by a
   scheduled job after the retention window.
5. **Hot and cold data are separated.** A counter that updates every minute
   never lives in the same document as a large static record.
6. **Dashboards read summary documents, never collection scans.** Summaries are
   maintained by Cloud Functions, not computed in the browser.
7. **Every query is paginated and bounded.** No unbounded listener exists
   anywhere in NN — this is a cost control as much as a performance one.

---

## 3. Identity, security and system

| Path | Purpose | Notes |
|---|---|---|
| `users/{uid}` | profile, display name, locale, time zone, onboarding state | the anchor document |
| `users/{uid}/preferences/{key}` | appearance, density, motion, dashboard layout, quiet hours | one doc per preference group |
| `users/{uid}/assistant/config` | **ORIN identity** — `assistantName`, avatar, voice, personality, language, activation, default model | the display name lives here so renaming ORIN never touches schema |
| `users/{uid}/credentials/{credentialId}` | WebAuthn passkeys — public key, counter, transports, label | **client can read and delete; only the server may create or update** |
| `users/{uid}/devices/{deviceId}` | registered devices, platform, push token, last seen | token rotation handled server-side |
| `users/{uid}/sessions/{sessionId}` | active sessions, issued/expires, IP class, revocation | client may revoke, never forge |
| `users/{uid}/security_events/{eventId}` | sign-in, revocation, permission change, failure | **append-only; immutable** |
| `users/{uid}/audit_logs/{logId}` | every create/update/delete across NN, with actor | **server-written only, immutable** |
| `users/{uid}/permissions/{scope}` | granted ORIN and integration scopes | **server-written only** — ORIN can never widen its own access |
| `users/{uid}/apps/{appId}` | install state, version, pinned, order, per-app permissions | drives the launcher |
| `users/{uid}/integrations/{provider}` | connection status, account identity, scopes, last sync | **tokens are never stored here** — they live in Secret Manager, referenced by id |
| `users/{uid}/summaries/{key}` | maintained aggregates for the dashboard | server-written only |
| `users/{uid}/backups/{backupId}` | backup manifests, checksums, verification state | server-written only |

---

## 4. NN Life — the scheduling spine

| Path | Key fields |
|---|---|
| `calendar_events/{id}` | `calendarId`, `title`, `start`, `end`, `allDay`, `timeZone`, `rrule`, `exdates[]`, `location`, `travelMinutes`, `status` |
| `calendar_events/{id}/occurrences/{occId}` | materialised exceptions and modified instances |
| `calendars/{id}` | name, colour, category, external account, sync state |
| `tasks/{id}` | `title`, `status`, `priority`, `dueAt`, `estimateMinutes`, `parentId`, `dependsOn[]`, `projectId` |
| `reminders/{id}` | `fireAt`, `rrule`, `timeZone`, `state`, `attempts`, `snoozedUntil`, `escalation` |
| `notes/{id}` | `title`, `format`, `body`, `folderId`, `tags[]`, `pinned`, `linkedIds[]` |
| `notes/{id}/versions/{versionId}` | immutable history — **the original is never overwritten** |
| `habits/{id}` + `habits/{id}/entries/{date}` | definition separate from the daily log |
| `goals/{id}`, `routines/{id}`, `reviews/{id}` | horizon, progress, cadence |

**Reminders are the one place where correctness is hardest.** `fireAt` is always
UTC; `timeZone` is stored alongside so recurrence survives a DST shift; `state`
moves only `scheduled → queued → sent → delivered | failed | cancelled`, and
`delivered` is written only when the platform confirms it.

---

## 5. Knowledge and files

| Path | Notes |
|---|---|
| `files/{id}` | metadata only — `storagePath`, `mimeType`, `size`, `sha256`, `folderId`, `tags[]`, `ocrState`, `previewPath`. **Blobs never live in Firestore** |
| `folders/{id}` | `parentId`, `path` denormalised for prefix queries |
| `memories/{id}` | `category`, `content`, `source` (`stated` \| `imported` \| `inferred`), `confidence`, `verified`, `retention`, `sourceRef` |
| `conversations/{id}` + `/messages/{msgId}` | messages as a subcollection — a conversation document never grows |
| `agent_jobs/{id}` + `/steps/{stepId}` | plan, status, approvals, result, verification |
| `tool_executions/{id}` | tool, input hash, outcome, duration, error — the audit trail behind every ORIN action |

`memories.source` is enforced by rule: a document written by a Cloud Function on
ORIN's behalf **cannot** claim `source: "stated"`. Only a client write
originating from the founder can.

---

## 6. The remaining applications

Each owns its own collections under `users/{uid}`, all following §2:

**College** `subjects` · `syllabus_units` · `question_banks` (+ `/questions`) ·
`assignments` · `attendance` · `marks` · `exams` · `revision_plans`
**Academy** `courses` · `lessons` · `learning_progress` · `assessments`
**Finance** `accounts` · `transactions` · `budgets` · `bills` · `financial_goals`
**Invest** `holdings` · `watchlists` · `instrument_research`
**Business** `businesses` · `experiments` · `customers` · `business_finance`
**Projects** `projects` · `milestones` · `project_tasks`
**Freelance** `clients` · `proposals` · `deliverables` · `invoices`
**Career** `career_goals` · `applications` · `resume` · `skills`
**Body** `workouts` · `body_metrics` · `nutrition` · `sleep`
**Soul / Mind** `soul_practices` · `reflections` · `gratitude` · `journal` · `decisions`
**Contacts** `contacts` · `important_dates` · `interactions`
**Creator / Studio** `creative_projects` · `content_plan` · `assets` · `documents` · `drafts` · `publications`
**Mail** `mail_accounts` · `mail_meta` · `mail_followups` *(message bodies stay with the provider)*
**Learning Vault** `vault_items` · `flashcards` · `review_schedule`
**Travel / Archive / Simulator** `trips` · `itineraries` · `archive_entries` · `simulations`
**Logic Lab** `challenges` · `attempts`
**Automation** `automations` · `automation_runs`
**System** `notifications` · `command_history` · `system_health` · `job_runs` · `analytics_snapshots`

---

## 7. Indexes

Composite indexes are added **only when a real query needs one**, never
speculatively — each one costs storage and slows writes. The known set at
Phase 2:

| Collection | Fields |
|---|---|
| `calendar_events` | `start` ASC + `status` ASC |
| `tasks` | `status` ASC + `dueAt` ASC |
| `reminders` | `state` ASC + `fireAt` ASC |
| `notes` | `folderId` ASC + `updatedAt` DESC |
| `transactions` | `date` DESC + `category` ASC |
| `notifications` | `read` ASC + `createdAt` DESC |

Single-field indexes are automatic. Large text fields are **exempted from
indexing** to save storage and write cost.

---

## 8. What is deliberately not in Firestore

| Data | Where it lives | Why |
|---|---|---|
| File and media blobs | Cloud Storage | Firestore is not a blob store |
| OAuth tokens, API keys | Secret Manager | never in a database the client can reach |
| Email message bodies | the mail provider | NN stores metadata and fetches on demand |
| Full-text search index | a dedicated index | Firestore cannot do real full-text search |
| Large AI context | Cloud Storage, referenced | keeps conversation documents small |

### Cloud Storage layout

```
users/{uid}/…      the founder's own files — he may read, write and delete
derived/{uid}/…    previews, OCR output, thumbnails — he may read only
backups/{uid}/…    encrypted archives — no client may read or write
```

Derived output and backups sit **outside** `users/` on purpose. Storage rules
are a permissive union: if any matching rule allows a request, it is allowed.
A nested `users/{uid}/_derived/` path would still be matched by the owner's
general write rule, so a `deny` there would have no effect and a client could
forge server-generated files. Structural separation is the only reliable fix.
This was found by a security-rules test, not by review.
