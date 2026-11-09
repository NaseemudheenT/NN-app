# NN Frontend & Product UI System

**Status:** DESIGN IN PROGRESS  
**Branch:** `design/nn-frontend-system`  
**Started:** 2026-11-09  
**Scope:** The complete NN personal operating environment across desktop, tablet and iPhone.

> This document defines the product experience. It does not mark any screen, integration or feature as implemented. A screen is complete only when its interface, real data contract, interactions, loading/empty/error/offline states, permissions, responsive behaviour and tests are complete.

---

## 1. Product direction

NN is a private, single-owner personal operating environment. It should feel like a coherent operating system rather than a collection of unrelated SaaS dashboards.

**Experience principles**
1. **Quietly powerful:** calm, precise, premium and information-dense without visual noise.
2. **Spatial, not gimmicky:** a consistent desktop workspace with a clear hierarchy; windows and overlays only where they improve multitasking.
3. **One system:** navigation, search, command palette, notifications, account, preferences and REN behave consistently across every application.
4. **Data before decoration:** no fabricated metrics, fake activity, invented notifications or sample content presented as real.
5. **Progressive disclosure:** show the next useful action first; expose advanced controls when needed.
6. **Responsive by design:** desktop gets the full workspace; tablet adapts its navigation and panels; iPhone gets touch-first, single-column task flows.
7. **Honest states:** every unavailable capability is explicitly labelled. Never render a decorative control that implies an action it cannot perform.

## 2. Visual language

The existing V3 NN design tokens are the source of truth and should be preserved unless a measured accessibility or usability review justifies a change.

### Brand palette

- Midnight navy: `#07111F` (base)
- Deep navy: `#0B1930`
- Raised navy: `#10223B`
- Elevated navy: `#172B45`
- Soft white: `#F7F9FC`
- Silver: `#A6B3C5`
- Icy blue: `#9CC8FF`
- Accent blue: `#649CE3`

Dark-first by default, with the existing explicit light theme retained. Status colours remain semantic: success, warning, error and information. Accent blue is for interaction and focus, not decoration.

### Materials and depth

- Use the existing three glass tiers according to content density. Dense tables and forms must use the most opaque tier.
- Keep the ambient WebGL room subtle and behind the application. It must never reduce text contrast or compete with task content.
- Reserve strong blur, refraction and animated light for the global shell, launcher and REN presence. Ordinary app surfaces should prioritise legibility and speed.
- Avoid neon, cyberpunk styling, excessive gradients, giant empty hero sections and decorative card grids.

### Typography and geometry

- Inter for interface typography; existing monospace token for IDs, timestamps and technical values.
- Preserve the current type ramp and 4px spacing base.
- Use the existing radius scale consistently. Avoid introducing one-off radii.
- Use tabular numerals for balances, dates, counters and analytics.
- Motion uses the existing duration/easing tokens. Respect reduced-motion settings.

## 3. Information architecture

### Global shell

Every authenticated screen shares these persistent capabilities:

- **Top system bar:** NN mark, current app/context, global search/command entry, sync/connection state, notifications, account/profile.
- **Primary navigation:** desktop sidebar/rail with pinned apps and app categories; tablet collapsible rail; iPhone bottom navigation plus an app switcher.
- **Workspace canvas:** app content with a consistent page header, breadcrumb/context, primary action and responsive content grid.
- **REN presence:** one persistent launcher and one conversation/task panel. It must show whether REN is active, unavailable or waiting for configuration; it must not imply an AI action was executed when it was not.
- **Global overlays:** command palette, app launcher, notification centre, confirmation dialogs, contextual menus and quick-create.
- **Profile & preferences:** account, passkeys/devices, theme, accessibility, privacy, connected services, export and sign-out. Settings belong under Profile, not scattered between apps.

### Primary navigation groups

1. **Home** — overview, daily focus and recent activity.
2. **Life** — Calendar, Tasks, Reminders, Notes, Habits, Goals, Routines, Focus and Reviews.
3. **Learning** — College and Academy.
4. **Work** — Projects, Business and Analytics.
5. **Personal** — Files, Memory, Media and Finance.
6. **System** — REN, Search, Automations, Connectors, Security, Control Centre, Backup/Restore and App Factory.

The navigation registry must be data-driven. An app can be visible, pinned, hidden, unavailable or under development. Do not show a broken route as a functioning app.

## 4. Screen specifications

### A. Entry and identity

**Launch / welcome**
- Cinematic NN identity intro, short and skippable.
- Clear state for checking configuration, ready, offline and maintenance.
- No fake progress bar or arbitrary waiting sequence.

**Sign-in / first claim**
- Passkey-first.
- Separate first-owner claim from returning sign-in.
- Clear browser compatibility, device passkey and recovery guidance.
- Error messages explain the recovery action without exposing secrets.

**Device management**
- Current device, registered passkeys, last-used metadata, revoke device, sign out other sessions.
- Confirm destructive/revocation actions and show verified result.

### B. Home dashboard

The dashboard is a configurable command surface, not a marketing page.

- Greeting and local date/time (Asia/Kolkata default).
- Today summary: calendar commitments, overdue tasks, reminders and focus block.
- Quick capture: task, note, reminder, event and file.
- Pinned apps and recent work.
- Learning snapshot (when configured): next class, next exam, syllabus progress.
- Projects and business snapshot (only when real data exists).
- Finance snapshot (only when a real account/ledger is configured).
- REN brief: actionable observations with source/time and confidence; absent until REN can substantiate them.
- Customisable widget layout, hide/reorder/reset.

Each widget supports loading, empty, stale, offline, permission-denied and error states.

### C. Life applications

| App | Primary screen | Key interactions |
|---|---|---|
| Calendar | Day / week / month / agenda | Create/edit event, recurrence, timezone, conflict view, drag/reschedule |
| Tasks | List / board / priority | Quick add, subtasks, dependencies, due dates, filters, bulk actions |
| Reminders | Upcoming / completed | Schedule, repeat, snooze, acknowledge, delivery status |
| Notes | Note list + editor | Autosave, Markdown/rich text, backlinks, version history, search |
| Habits | Today + streak history | Check-in, schedule, skip, trend |
| Goals | Goal overview + detail | Milestones, progress source, review cadence |
| Routines | Routine builder + today | Ordered steps, schedule, completion |
| Focus | Focus session | Timer, session history, interruption handling |
| Reviews | Daily/weekly/monthly | Guided review, carry-forward, export |

### D. Learning applications

**NN College**
- Overview, timetable, subjects, syllabus, units, question banks, exam planner, assignments, attendance, marks and analytics.
- Study view: source document/question bank, topic explanation, practice, answer review and mastery.
- Clearly show which content came from uploaded college material versus generated explanation.
- No invented marks, attendance or exam dates.

**NN Academy**
- Roadmap, courses, lesson view, exercise runner, quiz, project workspace and mastery dashboard.
- Learning path is structured, measurable and resumable.
- Every lesson includes objectives, explanation, examples, practice, feedback and next step.

### E. Work applications

**NN Projects**
- Portfolio/list, project overview, tasks, milestones, files, decisions, activity and status.
- Board/list/timeline views; links between projects and tasks.

**NN Business**
- Business workspace, entities, operations, customers/orders only when enabled, documents, decisions and KPIs.
- Financial and customer data must be permission-scoped and auditable.

**NN Analytics**
- Metric catalogue, dashboards, date range, filters, drill-down and export.
- Every chart identifies its source, period and last refresh. Empty data must not become zero-valued fake charts.

### F. Personal applications

**NN Files**
- Folder navigation, search, filters, list/grid, preview, metadata, upload, download, version history, trash and restore.
- Upload progress, retry, unsupported-file and storage-quota states.
- Private by default; never expose public file URLs.

**NN Memory**
- Searchable entries with source, timestamp, confidence and stated-vs-inferred classification.
- Review, correct, export, disable category and delete source/content.
- Clearly separate saved source facts from REN-generated inferences.

**NN Media**
- Photo/video/audio library, albums, metadata, preview and private storage controls.
- No media-processing claims until the processing pipeline exists.

**NN Finance**
- Accounts, transactions, budgets, categories, recurring items, goals and reports.
- Manual entry and import first; external banking connectors require explicit connection.
- All monetary amounts show currency and date range. No investment advice presented as execution.

### G. System applications

**REN**
- Conversation, task plan, permissions, execution timeline, tool results, citations/sources and audit history.
- Four presences may share one identity, but all must show the same real capability state.
- Explicit confirmation for sensitive or irreversible actions.
- Status vocabulary: Ready, Needs configuration, Waiting for approval, Running, Verified, Failed.
- Never claim completion without a verified result.

**Search**
- One search surface across apps, files, notes, tasks and memory, with filters and source context.

**Automation Studio**
- Trigger → conditions → actions → permissions → schedule → run history.
- Dry-run, approval gate, pause/disable and failure recovery.

**Connectors**
- Provider catalogue, scopes requested, connected account, last sync, sync errors and revoke.
- Least-privilege scopes and visible disconnect/revoke controls.

**Security**
- Passkeys/devices, sessions, security events, privacy controls and account recovery.

**Control Centre**
- Service health, sync state, storage usage, configuration, feature availability and diagnostics.
- No secret values displayed in UI or logs.

**Backup & Restore**
- Backup status, schedule, retention, encrypted export, restore points and restore verification.

**App Factory**
- App catalogue, permissions manifest, preview, install/uninstall and sandboxed runtime.
- Apps cannot silently gain access to private data.

### H. Profile and preferences

- Identity and profile.
- Passkeys and devices.
- Appearance: dark/light/system, glass intensity only if accessible.
- Accessibility: reduced motion, text scaling, contrast.
- Notifications and quiet hours.
- Privacy, memory controls and data export/delete.
- Connected services.
- Session and sign-out controls.

## 5. Responsive behaviour

Use content-driven breakpoints, initially:

- **Wide desktop:** 1440px and above — full navigation, multi-column dashboard, optional resizable workspace panes.
- **Desktop/laptop:** 1024–1439px — compact sidebar, two-column content where useful.
- **Tablet:** 768–1023px — collapsible navigation, reduced multi-column layouts, touch-friendly controls.
- **Phone:** 360–767px — single-column, bottom navigation, full-screen app pages, bottom sheets, no hover-only interactions.

Requirements:
- No horizontal page overflow at 360px.
- Touch targets at least 44×44 CSS px.
- Safe-area insets on iPhone.
- Inputs must not be obscured by the mobile keyboard.
- Tables become labelled cards or controlled horizontal scrollers.
- Charts reflow and retain textual summaries.
- Respect device orientation and browser zoom.

## 6. Shared component library

Build on existing accessible primitives and tokens; extend rather than duplicate.

- Navigation: SystemBar, Sidebar, MobileTabBar, AppLauncher, Breadcrumbs.
- Layout: PageHeader, ContentGrid, SplitPane, WorkspacePanel, Inspector.
- Data: DataTable, ListRow, Metric, ChartFrame, Timeline, CalendarGrid.
- Inputs: SearchField, CommandPalette, DateTimePicker, Select, Combobox, RichTextEditor.
- Feedback: Toast, InlineAlert, EmptyState, Skeleton, OfflineBanner, ErrorBoundary.
- Overlays: Dialog, Drawer, BottomSheet, Popover, ContextMenu.
- App-specific: TaskCard, EventCard, NoteEditor, FileRow, GoalProgress, StudyQuestion.
- REN: RenLauncher, RenPanel, PlanTimeline, ApprovalCard, ToolResult, SourceCitation.

All components need keyboard support, accessible names, focus management, disabled/busy states and reduced-motion behaviour.

## 7. Universal state contract

Every data-backed screen must define these states before it is considered complete:

1. Initial loading (skeleton, not layout jump).
2. Populated state.
3. Empty state with a useful next action.
4. Error state with retry and diagnostic context.
5. Offline/stale state with last successful sync time.
6. Permission-denied or configuration-required state.
7. Saving/submitting state with duplicate-submit prevention.
8. Success confirmation based on the server result.
9. Destructive confirmation and recoverability where applicable.

Sample data is permitted only in development fixtures and must be visibly marked. Production UI must never silently fall back to fixtures.

## 8. Interaction and accessibility standards

- WCAG 2.2 AA target.
- Semantic HTML and landmarks; logical heading hierarchy.
- Keyboard access to every action; visible focus.
- Dialog focus trap and focus return.
- Screen-reader announcements for async status and validation.
- Colour is never the only status signal.
- Reduced motion respected globally.
- Form validation is inline, specific and announced.
- Undo for reversible destructive actions; explicit confirmation for irreversible actions.
- Use optimistic updates only where rollback is reliable.
- Avoid auto-refresh that moves focus or loses unsaved input.

## 9. Technical implementation rules

- Next.js App Router, React, TypeScript strict and existing pnpm workspace remain.
- Preserve existing design tokens, icon system, logo, auth and accessible primitives.
- Extract shell/navigation/overlays into shared components; app content lives in feature modules.
- Route registry is the source of truth for app metadata, permissions and availability.
- Keep UI state separate from server data state.
- Firebase access only through the established client/server boundaries and owner-scoped rules.
- Never put Admin credentials, AI keys or service-account JSON in browser code.
- No UI should imply a backend capability that is not implemented.
- Add component tests and Playwright journeys per app; test desktop and phone viewports.
- Avoid large animation or rendering dependencies that degrade the Intel Mac/iPhone experience.

## 10. Build sequence

### UI-0 — Audit and foundations
- Capture the current entry, sign-in, workspace and design gallery at desktop and phone widths.
- Inventory existing components, tokens, routes and sample-data dependencies.
- Mark every existing screen as keep, refactor, replace or remove.
- Resolve conflicting status documentation before changing product claims.

### UI-1 — Design system and global shell
- Token audit and component standards.
- Responsive system bar, navigation, app launcher, command palette and global overlays.
- Profile/preferences and consistent app page frame.

### UI-2 — Home dashboard
- Widget framework, real-data contracts, quick capture, pinned apps and recent items.
- Complete all universal states.

### UI-3 — Core productivity
- Calendar, tasks, reminders and notes.
- Keyboard/touch interactions and shared data patterns.

### UI-4 — Files, Memory and Learning
- Files and Memory, then College and Academy.
- Document viewing, question-bank study and learning progress.

### UI-5 — Work and Personal
- Projects, Business, Analytics, Finance and Media.

### UI-6 — REN and system surfaces
- REN conversation and execution UI, permissions, audit, connectors, automation, security, control centre and backup.

### UI-7 — Responsive, accessibility and quality pass
- Desktop/tablet/iPhone regression, keyboard and screen-reader checks, performance, offline behaviour and e2e journeys.

### UI-8 — Release readiness
- No sample data in production; no dead controls; all routes guarded; all app states implemented; security and restore tests passed; preview verified before production.

## 11. Acceptance criteria

The frontend design phase is not complete until:
- Every app has a defined information architecture and screen inventory.
- Shared shell and components are implemented, not merely documented.
- Every screen is responsive and keyboard accessible.
- Every interactive control has a real action or is explicitly disabled with an explanation.
- All data states are designed and implemented.
- No production screen presents sample content as real.
- Screens are tested against real backend contracts.
- Desktop and iPhone journeys are recorded and reviewed.
- The founder reviews the visual result before production release.

---

## 12. Current implementation observations (2026-11-09)

Verified by source inspection, not by a live browser session:

- Existing token file already defines the midnight-navy/icy-blue palette, light theme, three glass tiers, spacing, typography, motion and z-index layers.
- Existing UI primitives include buttons, fields, glass, logo, icons and REN visual components.
- Existing `NNWorkspace` has interactive view switching, material controls, chart and launcher concepts.
- Its content source explicitly labels the current timeline/goals/period metrics as illustrative sample data.
- The root route is an introduction page with links to the design gallery and workspace.
- The workspace route is owner-guarded.
- The current REN surface is described in source as designed but not wired to actual reasoning/tools.

**Implication:** do not discard the existing visual foundation or rewrite blindly. The work is to turn the existing prototype surface into a complete, coherent, real-data operating experience and to build the missing app surfaces around it.
