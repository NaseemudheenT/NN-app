# NN — Claude OS Completion Brief

**Prepared:** 2026-11-10  
**Repository:** `NaseemudheenT/NN-app` (private)  
**Frontend baseline branch:** `design/nn-frontend-system`  
**Purpose:** Give Claude a precise, repository-grounded starting point to complete NN as a working private personal operating system. This brief is an execution handoff, not proof that NN is complete.

---

## 1. Your assignment

Take technical implementation ownership of completing NN OS end-to-end: inspect the current repository, reconcile stale documentation, design the implementation sequence, then build, integrate, test and document the remaining system.

The existing frontend branch is the approved visual and interaction baseline. Preserve its brand, design tokens, material language and existing working behaviour. You may improve or extend frontend code when required to make the OS coherent and functional; do not replace it with a generic admin dashboard, template, component library or unrelated visual system.

Do not merely produce another plan. After the audit, implement the next safe, testable milestone and continue in focused commits. At each stage report exact changed files, commit SHA, commands run, results, limitations and the next concrete milestone.

## 2. Product definition and permanent boundaries

NN is one private, lifelong personal operating environment for one owner: its founder.

- One owner only. No public sign-up, second owner, member accounts, teams, invites, collaboration, tenant switching or SaaS assumptions.
- Passkey-only sign-in. Preserve the server-enforced Firebase custom claim `nnOwner: true`; client-side UI visibility is never authorisation.
- Personal records, files, settings, devices, activity and integrations belong to the sole owner.
- REN is the integrated private assistant. It must use only explicitly authorised data and tools, identify sources and uncertainty, and request approval before consequential external actions.
- Outbound messages, publishing, purchases, financial actions, destructive actions, permission changes and other consequential external effects require explicit owner confirmation and an auditable result.
- Do not weaken Firestore/Storage rules, authentication, owner claims, permission checks, audit protections or secret handling to make a feature easier.
- Never invent data, balances, prices, attendance, reminders delivered, device state, integration status, AI activity, sync, automation results or security health.
- A page, prototype, disabled control or design mock is not an operational feature. Show honest availability and state.
- NN is separate from NERO NOREN and every other project.
- Never deploy, merge to the production branch, change production Firebase, enable billing/Blaze, change domains or incur paid services without explicit founder approval.

## 3. Read these sources before coding

Start with:
1. `CLAUDE.md`
2. `docs/CLAUDE_COLLABORATION_HANDOFF.md`
3. `docs/NN_FOUNDER_VISUAL_RESET.md`
4. `docs/NN_CINEMATIC_VISUAL_SYSTEM.md`
5. `docs/NN_FUTURE_DESIGN_SYSTEM.md`
6. `docs/NN_FRONTEND_EXECUTION_PROGRAMME.md`
7. `docs/NN_OS_ARCHITECTURE.md`
8. `docs/NN_APP_REGISTRY.md`
9. `docs/FIRESTORE_DATA_MODEL.md`
10. `docs/SECURITY.md`
11. `docs/MASTER_IMPLEMENTATION_PLAN.md`
12. `PROJECT_STATUS.md`

Some historical planning/status documents predate substantial implementation and contradict newer code or later sections of the same document. Do not trust a status table without checking the actual code, tests, emulator rules, workflow history and deployment state. Reconcile contradictions in a dedicated audit document before relying on them. Do not silently choose between conflicting founder-approved app lists or product decisions; record the conflict and ask the founder when it affects product scope.

## 4. Current frontend baseline

Branch: `design/nn-frontend-system`.

The frontend is a meaningful but incomplete baseline. It is not a completed OS.

### Existing foundations to preserve and inspect
- Next.js 15, React 19, strict TypeScript, pnpm workspace and CSS Modules.
- V3 semantic tokens, dark/light themes, graded glass surfaces, motion and reduced-motion support.
- Global environment/room and WebGL GlassFold foundation.
- Existing reusable components include LiquidButton, GlassFold, Coverflow, Dock, Dialog, FloatingWindow, GlassPanel, HoloPanel/HoloStage, TextField, Switch, NNLogo, REN visual components and other primitives.
- Home launcher uses the typed application registry.
- NN Life is the only application currently marked operational in the frontend registry and has an owner-scoped Firestore UI.
- Workspace and Design preview surfaces exist; inspect their actual data semantics and do not present sample content as real owner data.
- `/apps/[appId]` provides honest overview/status pages for planned applications.
- `apps/web/src/styles/future-system.css` provides 50 named reusable design primitives; `future-system.test.ts` checks their presence and responsive/reduced-motion fallbacks.
- The founder-approved visual direction is midnight-blue, icy cyan/aqua, electric blue and restrained indigo/violet reflections, dimensional optical glass, calm spatial depth, strong reading contrast and restrained motion. No gold, cyberpunk, neon overload, generic robot/AI imagery, permanent left sidebar or gaming HUD.

### Known routes at baseline
Inspect the current route tree; at the time of this handoff it includes entry/sign-in, Home, Life, Workspace, Design, offline and `/apps/[appId]` routes plus API routes. Do not assume the list is exhaustive without inspecting the tree.

### Verified CI evidence
- Latest confirmed full CI run at handoff: [GitHub Actions run 42734103628](https://github.com/NaseemudheenT/NN-app/actions/runs/42734103628).
- Commit: `44b1ecf13b0444d96c30cd7f229dfe824fb4c4ba`.
- Job `Typecheck, lint, test, build`: success. Typecheck/lint/unit-test stage and Next.js production build both completed successfully.
- This proves that commit passed that CI workflow. It does not prove browser/device QA, all app functionality, production readiness or that a later commit is verified.
- Current branch HEAD must be checked before work. Do not reset, force-push, discard, or rewrite existing commits.
- No production deployment is authorised by this handoff.

## 5. Technical and infrastructure constraints

- Firebase is the chosen backend. Do not introduce Postgres, Supabase, Neon, Drizzle or another database.
- Development Firebase project: `nn-os-dev`. Inspect aliases and active environment before every operation.
- Production project `nn-os-prod` must remain untouched.
- The unrelated project `the-zap-e7583` must never be accessed.
- Both NN projects were documented as Spark/free at last audit. Cloud Functions, Storage, App Hosting or other paid/Blaze-dependent capabilities may be blocked. Verify current Firebase plan/capabilities from the repository and console before attempting provisioning.
- Never enable billing or use a workaround that incurs cost. If a required feature needs paid infrastructure, design the contract, mark it blocked and present the exact cost/approval requirement.
- Keep secrets out of source, logs, commits and chat. Never guess environment values.
- Respect the repo's install-script policy and pinned toolchain.
- Keep all work on a dedicated feature branch and use focused commits. No destructive git operations.

## 6. Required OS capabilities

Build the OS as one coherent environment, not 34 disconnected dashboards.

### OS shell
- Global environment layer mounted once; low-power and visibility-aware.
- Responsive top chrome, floating dock, launcher, global search/command palette, notification centre, contextual menus, dialogs, toasts, profile/settings and app navigation.
- Desktop spatial workspace with real window focus, drag, resize, minimise, maximise, close and persisted layout where approved.
- Tablet adaptive composition.
- iPhone full-screen app surfaces, safe-area aware navigation and touch-first controls; no tiny desktop windows shrunk to phone size.
- Keyboard navigation, visible focus, screen-reader semantics, escape behaviour and reduced-motion fallbacks.
- Browser back/forward and deep links must behave correctly.
- No permanent side rail unless the founder changes the product decision.

### Application layer
- Reconcile the canonical founder-approved 34-app registry across docs and code.
- Each app needs a distinct domain-appropriate information architecture and workflows; do not use one generic dashboard template for every app.
- Build complete screens and all states: loading, first-run/empty, populated, validation, error, offline/stale, permission denied, destructive confirmation and success.
- Every control must have a real outcome or be explicitly disabled with a clear explanation until its dependency exists.
- Connect only to approved typed services and actual data. No fabricated demo data in the owner's production environment.
- Build shared services for search, audit, export, backup, preferences, notification settings and permission-aware REN tools as the architecture allows.

### REN
- Inspect the existing REN implementation and founder-approved capability decisions; do not assume it is absent or fabricate a new provider.
- Separate UI state from actual model/tool execution state.
- Show source, permission, tool, approval, failure and completion details honestly.
- Never imply it is listening, reasoning, remembering, syncing or executing unless the underlying operation is actually happening.
- Consequential tool execution requires explicit approval, idempotency where relevant, audit records and verifiable result reporting.

## 7. Recommended execution order

1. **Repository truth audit:** inspect current branch/HEAD, routes, packages, server code, Firebase rules, auth, REN, data model, tests, deployment workflows and stale documentation. Produce `docs/NN_CURRENT_STATE_AUDIT.md`.
2. **Architecture and contract reconciliation:** align app registry, route registry, Firestore collections, service interfaces, permissions and audit events. Resolve conflicting app names/scope with founder before irreversible decisions.
3. **OS shell:** complete launcher, dock, global command/search, notifications, profile/settings, responsive workspace and overlays.
4. **Life completion:** audit existing implementation against the full Life spec; complete missing workflows and test recurrence, time zones, reminders, notes, tasks, goals, habits and reviews as supported by infrastructure.
5. **Core applications:** build in dependency order from the canonical registry, each with real backend services and complete UX states.
6. **REN integration:** connect the real assistant execution, permissions, memory/source provenance and approval flow to approved apps.
7. **System controls:** security centre, device/session management, integrations, automation, audit, export, backup, status and cost visibility.
8. **Quality gates:** unit, integration, Firebase emulator security, browser E2E, accessibility, mobile/desktop responsive QA, offline, performance and failure testing.
9. **Release candidate:** produce a feature-complete report with exact evidence and blockers. Stop for founder approval before production merge/deploy or paid infrastructure.

For each milestone use: **Inspect → Specify → Implement → Test → Review → Document**. Work incrementally; do not attempt a risky one-shot rewrite.

## 8. Definition of done

NN is not complete until all of the following are true:

- All founder-approved apps have their intended domain-specific screens and real workflows.
- Every visible action is functional or honestly disabled pending a named dependency.
- All records are owner-scoped and all permissions are enforced server-side.
- Passkey-only access and the `nnOwner: true` claim are preserved and tested.
- REN tools cannot exceed owner-granted scopes; approvals and audit are enforced.
- All relevant loading, empty, error, offline, permission and destructive-action states exist.
- No fake metrics, fake records, fake AI, fake integrations or unsupported system status.
- Desktop, tablet and iPhone layouts have been tested on actual viewports/devices.
- Keyboard and assistive-technology basics, WCAG contrast, focus and reduced motion are verified.
- Unit, integration, security emulator, browser E2E and production build pass.
- Performance and cost constraints are measured and documented.
- Documentation accurately matches the code and deployment.
- Founder has reviewed and explicitly approved production release.

## 9. Required final report

Create/update `docs/NN_BUILD_COMPLETION_REPORT.md` with:
- feature-by-feature status (VERIFIED / IMPLEMENTED / NEEDS CONFIGURATION / BLOCKED / NOT IMPLEMENTED);
- exact routes, workflows and data collections;
- exact commit SHAs;
- exact commands and test results;
- Firebase project/environment used;
- security and owner-scope evidence;
- browser/device QA matrix;
- accessibility and performance results;
- cost and billing status;
- known limitations and unresolved founder decisions;
- deployment status (must say NOT DEPLOYED unless explicitly approved and actually done).

**Start now:** inspect the actual current branch and the files listed above. Produce the state audit first, then implement the first safe OS-shell milestone. Do not stop after writing a plan.
