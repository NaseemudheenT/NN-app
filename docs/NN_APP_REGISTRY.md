# NN APP — Canonical Application Registry

**Status:** awaiting founder approval · Version 1.0 · 2026-11-08
**Authority:** the four master specification documents plus the Founder's
Clarifications of 2026-11-08. No Version 4.1 document exists; none is assumed.

---

## 1. Consolidation decisions applied

| Was | Now | Note |
|---|---|---|
| NN Wealth | **NN Finance** | single money application |
| NN Inbox | **NN Mail** | single mail application |
| NN Health & Wellness | **NN Body** | single health application |
| NN Media Vault | **NN Files** | Media becomes a view inside Files |
| NN Relationships | **NN Contacts** | single people application |
| NN Calendar · Tasks · Reminders · Notes | **modules inside NN Life** | surfaced across NN OS; full functionality, never decorative widgets |

**NN Learning Vault stays separate.** No other application is removed.

**Result: 34 applications**, plus NN App Factory as a system capability.

---

## 2. Shared services — every application inherits these

Rather than restate them 34 times, every application in this registry
automatically receives, and must correctly implement:

| Service | Obligation on the application |
|---|---|
| **Identity** | all records owned by the authenticated UID; no client-trusted ownership |
| **Security rules** | default-deny; explicit owner-scoped allow; field validation |
| **Global search** | expose an indexed, permission-aware search surface |
| **Notifications** | declare its notification types and respect quiet hours |
| **REN tools** | expose a typed, permission-gated tool contract — never conversational faking |
| **Memory** | may write to NN Memory only with a recorded source and timestamp |
| **Audit** | every create, update and delete produces an audit record |
| **Export** | full data export in a documented format |
| **Backup** | included in the backup inventory and the restore test |
| **States** | loading, empty, error and permission-denied states are mandatory |
| **Responsive** | real desktop, tablet and phone layouts |
| **Design** | NN tokens and components only; no bespoke colours or one-off controls |

**Data ownership default:** `users/{uid}/…` in Firestore, `users/{uid}/…` in
Cloud Storage. Any departure must be justified in this document.

**Permission vocabulary:** `read` · `create` · `modify` · `external-action`
(requires confirmation) · `security` (requires re-authentication).

---

## 3. The 34 applications

### Group A — Life and wellbeing

| # | Application | Purpose | Core features | Primary data | REN integration | Highest permission |
|---|---|---|---|---|---|---|
| 1 | **NN Life** | The daily operating system for the founder's life | **Calendar** (day/week/month/year/agenda, recurrence + exceptions, time zones, conflict detection) · **Tasks** (subtasks, dependencies, Kanban) · **Reminders** (durable, escalation, snooze) · **Notes** (rich text, Markdown, versions, links) · habits · goals · routines · focus sessions · daily/weekly/monthly reviews | `calendar_events`, `tasks`, `reminders`, `notes`, `habits`, `goals`, `routines`, `reviews` | plan the day, reschedule, create events and reminders from language, weekly review | modify |
| 2 | **NN Soul** | Faith, purpose and reflection, on the founder's own terms | prayer/worship routines, scripture study, gratitude, reflection journal, values, purpose, meditation, quiet time | `soul_practices`, `reflections`, `gratitude` | reminders, reflection prompts — **never speaks for God, never invents scripture** | modify |
| 3 | **NN Mind** | Mental strength and personal growth | focus, patience, emotional intelligence, self-control, confidence, resilience, stress exercises, decision records, journaling | `mind_exercises`, `journal`, `decisions` | exercises, reflection, decision support — **no diagnosis, not a substitute for care** | modify |
| 4 | **NN Body** | Health and fitness *(absorbs Health & Wellness)* | workouts, strength, cardio, mobility, nutrition, hydration, sleep, recovery, measurements, HealthKit/Health Connect where authorised | `workouts`, `body_metrics`, `nutrition`, `sleep` | plan sessions, track progress — **labels estimates, no medical claims** | modify |
| 5 | **NN Contacts** | People and relationships *(absorbs Relationships)* | contacts, family, college, professional, birthdays, important dates, interaction history, follow-ups, shared plans | `contacts`, `important_dates`, `interactions` | drafts messages and surfaces follow-ups; **sending always needs confirmation** | external-action |
| 6 | **NN Nature & Universe** | Scientific learning and discovery | astronomy, solar system, stars, galaxies, cosmology, Earth science, oceans, ecosystems, weather, moon phases, sunrise/sunset, stargazing | `discoveries`, `observations` | explains with cited sources; **separates evidence, hypothesis, philosophy and belief** | read |
| 7 | **NN Peace Mode** | A deliberately quiet environment | minimal interface, breathing, meditation timer, reflection, calm visuals, authorised nature sounds, reduced notifications with safety exceptions | `peace_sessions` | enters Peace Mode on request, suppresses non-essential interruptions | modify |

### Group B — Education and intelligence

| # | Application | Purpose | Core features | Primary data | REN integration | Highest permission |
|---|---|---|---|---|---|---|
| 8 | **NN College** | SMVEC academic management | profile, semesters, subjects, syllabus, units, question banks, CAT-I/CAT-II/model/semester prep, notes, assignments, timetable, attendance, marks, revision plans, analytics, PDF/DOCX/image processing | `subjects`, `syllabus`, `question_banks`, `assignments`, `attendance`, `marks`, `exams` | builds revision plans from the real timetable; **uploaded material is the primary exam source, and gaps are stated** | modify |
| 9 | **NN Academy** | Long-term technical education | C → Python → DSA → OOP → SQL → Web → Backend → APIs → Git → Cloud → AI, plus maths, finance, business, communication; lessons, exercises, quizzes, projects, mastery, revision scheduling | `courses`, `lessons`, `learning_progress`, `assessments` | teaches at the founder's level, resumes the saved position, scores practice | modify |
| 10 | **NN Formula Engine** | Verified formula and calculation library | algebra, matrices, calculus, differential equations, probability, statistics, engineering maths, physics, electrical, CS, finance, geometry, unit conversion; rendering, symbolic + numeric computation, graphing, step-by-step, history | `formulas`, `calculations` | identifies the topic, solves, verifies, explains — **never fabricates an identity, never claims exhaustive coverage** | read |
| 11 | **NN Logic Lab** | Reasoning and aptitude practice | logical reasoning, aptitude, brain games, memory, coding and algorithm challenges, timed tests, difficulty levels, analytics | `challenges`, `attempts`, `performance` | sets practice, analyses weak areas; can create new games via App Factory | modify |
| 12 | **NN Learning Vault** | The knowledge library *(stays separate from Files)* | books, articles, research, course material, tutorials, saved pages, learning paths, knowledge maps, flashcards, spaced repetition | `vault_items`, `flashcards`, `review_schedule` | retrieves, summarises, schedules repetition; **respects copyright** | modify |

### Group C — Money and work

| # | Application | Purpose | Core features | Primary data | REN integration | Highest permission |
|---|---|---|---|---|---|---|
| 13 | **NN Finance** | Personal money management *(absorbs Wealth)* | income, expenses, categories, budgets, savings, net worth, goals, accounts, assets, loans, bills, subscriptions, receipt OCR with review before save, reports, financial education | `transactions`, `budgets`, `accounts`, `financial_goals`, `bills` | answers from real records only; **never invents a balance; receipt extraction always confirmed** | modify |
| 14 | **NN Invest** | Investment research and tracking | stocks, ETFs, mutual funds, financial statements, company research, watchlists, portfolio, market news, risk, history | `holdings`, `watchlists`, `research` | research and analysis; **labels real-time vs delayed vs historical; never trades without brokerage integration and explicit confirmation** | external-action |
| 15 | **NN Business** | Startup and venture work (incl. NERO NOREN) | ideas, market research, customer discovery, competitors, validation, market sizing, models, pricing, sales, customers, revenue, expenses, roadmaps, decision records | `businesses`, `experiments`, `customers`, `business_finance` | researches with citations and writes structured reports into the workspace | modify |
| 16 | **NN Freelance** | Independent client work | skills, services, portfolio, clients, proposals, pricing, workflows, deliverables, feedback, income, invoices | `clients`, `proposals`, `deliverables`, `invoices` | drafts proposals; **sending requires confirmation** | external-action |
| 17 | **NN Career** | Software engineering career (Zoho and similar) | goals, programming progress, GitHub projects, portfolio, resume, interview prep, internships, applications, skill gaps, assessments | `career_goals`, `applications`, `resume`, `skills` | interview practice, gap analysis — **never guarantees employment** | modify |
| 18 | **NN Projects** | Project execution | projects, milestones, tasks, dependencies, deadlines, files, notes, progress, history | `projects`, `milestones`, `project_tasks` | tracks progress, flags overdue milestones | modify |
| 19 | **NN Achievements** | The verified record | achievements, certificates, courses, projects, milestones, evidence, dates, portfolio, resume and LinkedIn drafts | `achievements`, `certificates` | drafts only; **never publishes without approval** | external-action |

### Group D — Creation and communication

| # | Application | Purpose | Core features | Primary data | REN integration | Highest permission |
|---|---|---|---|---|---|---|
| 20 | **NN Creator Studio** | Photography and visual craft (TITAN VIEW, Zupiko) | photography, camera settings, lighting, composition, editing, video, design, storytelling, branding, content plans, social calendars, analytics | `creative_projects`, `content_plan`, `assets` | briefs, plans, generates imagery through a connected provider | modify |
| 21 | **NN Studio** | Writing and publishing workspace | rich text and Markdown editors, message and email composers, social planner, captions, hashtags, templates, media library, brand assets, drafts, publishing history | `documents`, `drafts`, `publications` | drafts and schedules; **publishing requires the destination account shown and explicit confirmation** | external-action |
| 22 | **NN Mail** | Unified email *(absorbs Inbox)* | multiple authorised accounts, inbox, sent, drafts, archive, labels, search, attachments, templates, signatures, follow-ups, thread summaries, task and event extraction | `mail_accounts`, `mail_meta`, `mail_followups` | drafts, rewrites, translates, summarises, extracts actions; **sending, forwarding and deleting always require confirmation** | external-action |
| 23 | **NN English** | Language and communication | grammar, vocabulary, listening, speaking, pronunciation, reading, writing, spelling, assessments, progress | `english_progress`, `assessments` | practice, correction, pronunciation feedback | modify |

### Group E — Knowledge, record and insight

| # | Application | Purpose | Core features | Primary data | REN integration | Highest permission |
|---|---|---|---|---|---|---|
| 24 | **NN Files** | Private file system *(absorbs Media Vault)* | folders, upload, previews, search, tags, metadata, versions, duplicate detection, archive, trash, OCR, document analysis, doc→note and doc→task; **Media view** for photos, video, audio, generated assets, albums | `files`, `folders` + Cloud Storage | searches, summarises, compares and extracts from authorised files | modify |
| 25 | **NN Memory** | The founder's personal knowledge | approved facts, preferences, goals, projects, decisions, learning history, routines, important dates, saved instructions; source, timestamp, confidence, retention; review, edit, correct, export, delete, disable categories | `memories` | retrieves context; **distinguishes stated from inferred and never promotes a guess to a fact** | modify |
| 26 | **NN Life Archive** | The chronological life record | memories, milestones, achievements, reflections, photographs, travel, projects, decisions, documents — owner-controlled and exportable | `archive_entries` | helps recall and organise; never edits silently | modify |
| 27 | **NN Analytics** | Measured progress | learning, academics, tasks, goals, habits, fitness, finance, projects, time use, consistency | derived + `analytics_snapshots` | explains trends from real stored data; **labels estimates and missing data** | read |
| 28 | **NN Travel** | Journeys | plans, itineraries, flights from connected services, hotels, booking references, packing lists, budgets, documents, maps, time-zone shifts, reminders, destination research, emergency contacts | `trips`, `itineraries` | researches and prepares; **never fabricates a booking or a status** | modify |
| 29 | **NN Simulator** | Safe experimentation | financial scenarios, business models, coding sandboxes, maths visualisation, physics, astronomy, algorithm visualisation, custom simulations | `simulations` | builds and explains models; **always labelled as simulation, never as measurement** | read |

### Group F — System surfaces

| # | Application | Purpose | Core features | Primary data | REN integration | Highest permission |
|---|---|---|---|---|---|---|
| 30 | **NN Command Centre** | One place to reach anything | global command input, cross-app search, quick actions, app opening, recent commands, keyboard shortcuts, voice, history, context-aware suggestions | `command_history` | the primary natural-language entry point to the whole system | modify |
| 31 | **NN Search** | Permission-aware global index | searches apps, notes, files, calendar, tasks, projects, conversations, memory, contacts and authorised services; filters, source attribution, relevance | search index | REN's retrieval layer | read |
| 32 | **NN Automation Studio** | Personal workflows | triggers, conditions, actions, schedules, delays, dependencies, approvals, retries, logs, pause/resume/disable, workflow testing, show-before-enable | `automations`, `automation_runs` | proposes and runs approved automations; **high-impact steps still require confirmation** | external-action |
| 33 | **NN Security Centre** | Protection and privacy | passkeys, trusted devices, sessions and revocation, login history, permissions, integration access, encryption status, backup status, API tokens, recovery, audit log, alerts | `devices`, `sessions`, `security_events`, `audit_logs` | may report status; **may never change a security setting itself** | security |
| 34 | **NN Control Room** | Operational truth | installed apps, integrations, background jobs, automations, AI provider status, device connections, storage use, notification and sync status, errors, updates, versions, **cost monitoring** | `system_health`, `job_runs` | reports real metrics only; **no fabricated operational numbers** | read |

### System capability — NN App Factory

Not an application in the launcher sense. REN specifies, generates, statically
analyses, tests, previews and — only after founder approval — installs new
applications into a **sandboxed runtime** with a manifest, declared permissions,
its own data scope, a version and a rollback path. Generated code never runs in
the main application process.

---

## 4. Dependency order

```
Infrastructure  →  identity · Firestore · storage · permissions · audit
      ↓
NN OS shell     →  dashboard · launcher · windows · search · notifications · settings
      ↓
NN Life         →  calendar · tasks · reminders · notes   (everything schedules against these)
      ↓
NN Files · NN Memory        (everything stores and recalls through these)
      ↓
REN            →  tool registry over the apps that now exist
      ↓
NN College · Academy · Finance · Projects      (first full applications)
      ↓
Connectors · Automation · Notifications
      ↓
Backup and restore
      ↓
Remaining applications  →  App Factory  →  devices  →  hardening
```

Nothing above a line can be built honestly before the line beneath it exists,
because every application depends on identity, ownership and the shared
services listed in §2.


---

## Founder-only product boundary — 2026-11-09

**NN is a private, single-owner personal operating environment built exclusively for its founder, Naseemudheen. It is not a public product, SaaS service, multi-tenant workspace or social platform.**

This boundary applies to every application, shared service, workflow and future feature:

1. **One owner identity.** Only the founder's enrolled passkey-backed owner identity may enter the private environment. No public sign-up, invite flow, member directory, team roles or additional owner accounts.
2. **Owner-only data.** All personal records, files, settings, memories, activity and application state belong to the founder. Preserve server-side owner verification and default-deny access. Client-side visibility is never an authorisation boundary.
3. **Founder-centred intelligence.** REN is the founder's private assistant. It may use only data and integrations explicitly authorised by the founder, must identify uncertainty and sources, and must request confirmation for consequential external actions.
4. **Personal integrations, not multi-user sharing.** Connectors, devices and external accounts exist to serve the founder's own workflows. Sharing or publishing outward is an explicit founder-authorised action, not a collaboration feature.
5. **No generic-market compromises.** Prioritise the founder's actual devices, habits, education, work, businesses, accessibility needs, privacy and preferred workflows over hypothetical mass-market personas.
6. **No false capability.** Do not display a feature as operational until its real data path, permission boundary, failure states and user interaction are implemented and verified.

**Architecture note:** users/{uid}/… may remain the secure storage namespace for the one enrolled owner UID. That storage shape does not imply multi-tenancy or permission for multiple users. Do not weaken the existing passkey-only and nnOwner: true security contract.
