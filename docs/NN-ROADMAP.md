# NN — Product Delivery Roadmap

**Status:** Active development  
**Working branch:** `nn-nexus-interface`  
**Release rule:** NN is not declared ready until every release gate below is verified against the integrated product.

This roadmap separates implemented foundations from planned capabilities. A designed surface, demo control, sample metric, or visual state is not counted as a working product feature.

## Product principles

- **One coherent environment:** navigation, motion, typography, spacing, surfaces, and interaction patterns must feel like one operating environment across every route.
- **Useful before cinematic:** motion and visual effects must communicate state or improve navigation; they must not obscure content or slow the interface.
- **Responsive by design:** phone, tablet, laptop, and desktop layouts are first-class, not scaled-down desktop pages.
- **Truthful states:** never show fabricated AI activity, live data, agent availability, battery/network status, or successful actions.
- **Secure by default:** owner-scoped data, explicit permissions, safe session handling, and no sensitive data in client-only mock state.
- **Accessible and resilient:** keyboard operation, screen-reader semantics, reduced motion, clear loading/error/empty states, and graceful recovery.

## Milestones

### M0 — Engineering foundation and product truth

**Status: In progress**

- [x] Establish a dedicated UI development branch.
- [x] Keep the existing application structure and authentication flow intact.
- [x] Add a shared NN shell with route-aware navigation.
- [x] Establish reusable app identity and glass-surface primitives.
- [x] Add CI for typecheck, lint, tests, and production build.
- [x] Make workspace sample data visibly identifiable as illustrative.
- [ ] Audit all routes for placeholder actions, false success states, and misleading live indicators.
- [ ] Establish a documented app/module contract for frontend-to-backend integration.

**Exit criteria:** all existing flows are understood, all placeholder behaviour is labelled, and the main branch remains untouched until an approved integration point.

### M1 — NN operating shell

**Status: UI implementation underway; device-level QA pending**

- [x] Add the floating NEXUS activity surface.
- [x] Add desktop system navigation and a compact mobile navigation pattern.
- [x] Add route-aware labels, keyboard shortcuts, and an actual local focus timer.
- [x] Add reduced-motion-aware interface motion and app-specific icon identities.
- [ ] Verify every navigation state at phone, tablet, laptop, and wide-desktop breakpoints.
- [ ] Verify focus order, Escape behaviour, touch targets, safe-area insets, and scroll containment.
- [ ] Refine transitions and loading states using real route and session state.
- [ ] Confirm the shell never obstructs critical content or authentication flows.

**Exit criteria:** the shell is stable, accessible, responsive, and consistent across all supported routes and browsers.

### M2 — Production workspace

**Status: Current workspace is an interactive design foundation; data is illustrative**

- [ ] Replace sample timeline, goal, and insight data with owner-scoped persisted records.
- [ ] Build reliable create, read, update, and delete flows for workspace records.
- [ ] Add real empty, loading, error, offline, and retry states.
- [ ] Verify filters, period selection, charts, exports, and calculations against persisted data.
- [ ] Add data validation, conflict handling, and safe export behaviour.
- [ ] Remove any sample-only metric from production views.

**Exit criteria:** a signed-in owner can manage real data, reload the app, and see accurate persisted state without sample data.

### M3 — NN application suite

**Status: App identities exist; separate production modules are not complete**

Planned application identities:

| App | Intended responsibility | Release evidence |
|---|---|---|
| Life | Routines, calendar, habits, personal planning | Persisted schedules and completed routine flows |
| Study | Subjects, coursework, exams, revision | Working academic records and study workflows |
| Learn | Skills, lessons, knowledge progress | Trackable learning paths and progress |
| Build | Projects, tasks, milestones | Working project and task lifecycle |
| Money | Budgets, income, spending, financial records | Validated calculations and secure financial records |
| Files | Documents and media | Upload, retrieval, preview, permissions, and deletion |
| Recall | Notes and personal knowledge | Searchable, editable, owner-controlled memory records |
| Shield | Sessions, devices, security controls | Verified session and device-management actions |
| System | Preferences and operating environment | Persisted settings with clear effect and reset behaviour |

- [ ] Agree route, data, permission, and API contracts for every app.
- [ ] Build each app as a complete workflow, not just a launcher card.
- [ ] Give each app a distinct visual identity within the shared NN design language.
- [ ] Add role-specific agent surfaces only when their real backend capability exists.

**Exit criteria:** every listed app has a working, tested core workflow and clear ownership/security boundaries.

### M4 — REN intelligence and specialist agents

**Status: UI surfaces exist; production AI capability is not active**

- [ ] Connect the REN interface to the agreed assistant runtime.
- [ ] Implement text interaction with streaming, cancellation, retries, and error handling.
- [ ] Implement voice capture and speech output with explicit microphone permissions.
- [ ] Add tool execution with permission checks, confirmation for consequential actions, and audit history.
- [ ] Define specialist agent contracts, scopes, hand-offs, and shared context rules.
- [ ] Display real agent status and activity from backend events only.
- [ ] Add evaluation sets for correctness, tool use, latency, safety, and reliability.

**Exit criteria:** REN and specialist agents complete tested tasks through real integrations; no demo state is represented as live intelligence.

### M5 — Data, integrations, and continuity

**Status: Planned**

- [ ] Integrate frontend with the agreed backend APIs and authentication/session model.
- [ ] Verify secure synchronisation across supported devices.
- [ ] Define backup, export, restore, and account-recovery flows.
- [ ] Define offline behaviour per feature; never imply unsaved changes are synced.
- [ ] Add notifications and background work only where the product has a real event source.
- [ ] Test API failures, expired sessions, slow networks, duplicate requests, and interrupted uploads.

**Exit criteria:** user data and app state remain correct through refreshes, multiple devices, network loss, and recovery.

### M6 — Quality, security, and performance

**Status: Planned**

- [ ] Add end-to-end tests for authentication, core workspace flows, and every released app.
- [ ] Run responsive visual checks on real phone and desktop viewports.
- [ ] Test current supported browsers and touch/keyboard input.
- [ ] Audit accessibility, colour contrast, reduced motion, and screen-reader labels.
- [ ] Measure Core Web Vitals, bundle size, interaction latency, and animation performance.
- [ ] Review security rules, authorization boundaries, input validation, dependencies, and data exposure.
- [ ] Verify no secrets or private user data enter client bundles, logs, or analytics.
- [ ] Complete failure-mode and recovery testing.

**Exit criteria:** no release-blocking defects; agreed accessibility, security, and performance thresholds are met and recorded.

### M7 — Founder acceptance and official release

**Status: Not started**

- [ ] Complete a feature-by-feature acceptance checklist.
- [ ] Confirm production environment, domains, secrets, backups, monitoring, and rollback plan.
- [ ] Verify production authentication and owner access.
- [ ] Run production smoke tests on phone and desktop.
- [ ] Review legal/privacy copy and data-retention behaviour.
- [ ] Obtain explicit founder approval before merge and deployment.
- [ ] Publish release notes and known limitations.

**Exit criteria:** all prior milestones are accepted, the production build and end-to-end checks pass, and the founder approves the release.

## Responsibility boundary

- **NN frontend / operating environment:** shared shell, app interfaces, responsive behaviour, visual system, motion, accessibility, client-side state, and integration contracts.
- **Backend / intelligence implementation:** APIs, persistence, security rules, agent runtime, model/tool execution, voice infrastructure, and background services. These must be integrated against agreed contracts and verified end to end.
- **Release authority:** no merge to the default branch, production deployment, or official-ready declaration without explicit approval.

## Current verified snapshot

- The NEXUS shell, navigation rail/dock, app icon system, and workspace visual foundation are present on the working branch.
- Workspace content is still illustrative sample data.
- REN text and voice surfaces are not production AI features yet.
- The app names and launcher identities do not mean all nine app modules are implemented.
- The latest recorded CI run passed TypeScript, lint, unit tests, and the Next.js production build.
- Browser/device visual QA, real-data integration, end-to-end app acceptance, and production release are still outstanding.
