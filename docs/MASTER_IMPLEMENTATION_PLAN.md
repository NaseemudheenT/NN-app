# NN APP — Master Implementation Plan

**Status:** awaiting founder approval · Version 1.0 · 2026-11-08
Every phase ends with a report and a **founder approval gate**. Nothing in a
later phase begins before the gate before it is passed.

Process per phase: **VALIDATE → PLAN → DESIGN → BUILD → TEST → REVIEW → APPROVE**

---

## Baseline

| | |
|---|---|
| Repository | `NaseemudheenT/NN-app`, private, `main`, clean |
| Verified working | monorepo, strict TS, 53 tests, production build, brand assets, design tokens, 13 UI components, Firebase config, default-deny rules |
| Verified absent | authentication, data model, storage, Functions, **all 34 applications**, ORIN, PWA, 13 required documents |
| Firebase | `nn-os-dev` + `nn-os-prod`, Spark, **no billing** |
| Honest completion | ~3% of NN |

**Preserved, not rebuilt:** the logo and SVGs, design tokens, the accessible
component primitives, project configuration, the passing tests. **Reconsidered:**
the operating experience, per §4 of your clarifications. The `/design` gallery
is a development tool, not the product, and will not ship as the NN experience.

---

## Phase 2 — Firebase infrastructure and security

**Why first:** every application needs identity and ownership. Building any
screen before this means building it twice.

| | |
|---|---|
| **Deliverables** | Firestore data model for all 34 apps · owner-scoped security rules · Storage rules · Emulator Suite · security-rules test suite · App Check config · seed/fixture data · `FIRESTORE_DATA_MODEL.md`, `FIRESTORE_SECURITY_RULES.md`, `STORAGE_SECURITY.md`, `SECURITY.md` |
| **Files** | `firebase/**`, `packages/firebase/**` (currently empty), `packages/security/**`, `apps/web/src/lib/firebase/**` |
| **Firebase** | Firestore, Auth, Storage, Emulator Suite. **Functions deferred to Phase 3** so Phase 2 needs no billing |
| **Security** | default-deny → explicit owner-scoped allow; field validation; no client-trusted ownership; tested for both authorised and unauthorised access |
| **Testing** | emulator-based rules tests: owner can read own, **nobody can read another UID's**, malformed writes rejected, privileged fields unwritable |
| **Cost** | **$0** — all local emulators |
| **Blockers** | Java runtime required for the emulators (`brew install openjdk`, no password needed) |
| **Gate** | data model and rules reviewed and approved before any app writes real data |

---

## Phase 3 — Identity and the NN OS shell

| | |
|---|---|
| **Deliverables** | passkey authentication end to end · session and device management · cinematic launch sequence · the spatial workspace · top bar · dock · `⌘K` launcher · notification sheet · **Profile page with all settings moved into it** · PWA manifest, service worker, icon set, iPhone home-screen install |
| **Files** | `apps/web/src/app/(auth)/**`, `(workspace)/**`, `profile/**`, `packages/core/**` |
| **Firebase** | Auth; Firestore for devices/sessions/preferences; **Functions needed for WebAuthn challenge verification → Blaze required on `nn-os-dev`** |
| **Security** | server-generated challenges, origin validation, replay protection, credential management, re-auth for sensitive changes, audit on every auth event |
| **Testing** | register a passkey · sign in · revoke a device · session expiry · cross-UID isolation · e2e on the launch→auth→workspace path · install to a real iPhone home screen |
| **Cost** | ~$0 within free allowances; **needs your Blaze approval for `nn-os-dev`** |
| **Risk** | Firebase Auth's passkey support must be verified against live docs first. If it does not cover the flow, custom WebAuthn bridged via custom tokens — **I will report which before building** |
| **Gate** | you sign in on your own device, and NN is on your home screen |

---

## Phase 4 — NN Life

The scheduling spine. Calendar, Tasks, Reminders and Notes as real integrated
modules, surfaced across NN OS.

| | |
|---|---|
| **Deliverables** | calendar (day/week/month/year/agenda, recurrence + exceptions, time zones, conflict detection) · tasks (subtasks, dependencies, Kanban) · reminders (durable, server-scheduled) · notes (rich text, Markdown, versions, links) · habits · goals · routines · focus · reviews |
| **Firebase** | Firestore + Functions + Cloud Scheduler (one dispatcher job) + FCM |
| **Security** | owner-scoped; notification tokens rotated; no reminder content in logs |
| **Testing** | recurrence across a DST boundary · `Asia/Kolkata` correctness · **a reminder fires with the app closed and the device restarted** · idempotent retries · note autosave and version history |
| **Cost** | ~$0; one scheduler job keeps us inside the 3 free |
| **Gate** | a reminder you set reaches your phone with NN closed |

---

## Phase 5 — NN Files and NN Memory

| | |
|---|---|
| **Deliverables** | file manager, folders, upload, previews, search, tags, versions, trash, OCR, document analysis, **Media view** (absorbing Media Vault) · NN Memory with source, timestamp, stated-vs-inferred, review, correct, export, delete, category disable |
| **Firebase** | Cloud Storage + Firestore metadata + Functions for processing |
| **Security** | private by default, no public URLs, MIME allow-list, size caps, signed access for processing |
| **Testing** | upload/download/delete · unauthorised access blocked · OCR accuracy on a real college PDF · memory deletion actually removes |
| **Cost** | first real storage spend — still inside the 5 GB free allowance initially |
| **Gate** | your own college PDFs upload, preview and search correctly |

---

## Phase 6 — ORIN foundation

| | |
|---|---|
| **Deliverables** | provider-independent AI gateway · model registry · tool registry over Life, Files and Memory · context manager · permission manager · execution pipeline (LISTEN→UNDERSTAND→PLAN→CHECK→CONFIRM→EXECUTE→VERIFY→REPORT) · conversation history · audit · usage and cost tracking · all four ORIN presences |
| **Firebase** | Functions only — **API keys never reach the browser** |
| **Security** | least privilege per tool; high-impact actions gated; nothing sent to a provider without the configured privacy policy allowing it |
| **Testing** | tool permission enforcement · provider failure handling · cancellation · **a refused action is actually refused** · verified-vs-claimed results |
| **Cost** | Firebase ~$0; **AI provider billed separately — needs your key and a budget** |
| **Gate** | ORIN completes a real multi-step task and reports honestly, including a failure |

---

## Phase 7 — NN College and NN Academy

Your two highest-value applications. Built as full products.

| | |
|---|---|
| **Deliverables** | College: timetable, subjects, syllabus, units, question banks, CAT/model/semester prep, assignments, attendance, marks, revision plans, analytics, PDF/DOCX/image processing · Academy: the C → Python → DSA → … → AI roadmap with lessons, exercises, quizzes, projects, mastery, spaced revision |
| **Testing** | uploaded material is demonstrably the primary exam source · gaps explicitly stated · progress persists · quiz scoring correct |
| **Gate** | NN prepares you for a real SMVEC exam from your own uploaded material |

---

## Phases 8–13

| Phase | Contents | Gate |
|---|---|---|
| **8** | NN Finance · NN Projects · NN Business · NN Analytics | receipt OCR → confirmed transaction → updated budget, end to end |
| **9** | Connectors — Google Calendar, Gmail, GitHub, cloud storage, market data, weather, health | two-way sync without duplicates; revoke actually revokes |
| **10** | Automation Studio · notifications at scale · Command Centre · Search | an automation runs for a week unattended with a correct log |
| **11** | **Backup and restore** — full inventory, encryption, 3-2-1, Restore Centre | a restore into an isolated environment succeeds and is verified |
| **12** | The remaining 20 applications, in priority order you set | each individually useful and tested |
| **13** | App Factory · devices and smart home · hardening · accessibility · performance · production deployment | security review, restore test, live deployment verified |

> **No application is marked complete because its screen exists.** Interface,
> logic, data, validation, all five states, permissions, tests — or it is not
> done.

---

## Decisions I will bring back to you

| When | Decision | Why it is yours |
|---|---|---|
| Phase 2 end | Blaze on `nn-os-dev` | spending money |
| Phase 3 start | passkey approach, after verification | affects your security model |
| Phase 6 start | which AI provider, and the monthly ceiling | recurring cost and a privacy choice |
| Phase 9 | each connector, individually | each grants access to a real account |
| Phase 13 | Blaze on `nn-os-prod` and go-live | production and spending |

---

## What I need to start Phase 2

1. **Approval of this plan**, the registry and the cost estimate
2. **Permission to install a Java runtime** (`brew install openjdk`, no password, no cost) for the emulators
3. Nothing else — Phase 2 needs no billing and no credentials

---

## Honest statement of scale

34 applications, an agent platform, a sandboxed app factory and a tested
disaster-recovery system is a large, long programme — many months of sustained
work, not weeks. I will not pretend otherwise, and I will not reach the end
faster by shipping shells.

What I can promise is that every phase delivers something you can actually use
that day, each is honestly labelled, and the foundation never has to be rebuilt.
