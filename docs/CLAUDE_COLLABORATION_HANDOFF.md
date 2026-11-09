# Claude Collaboration Handoff — NN

**Purpose:** Coordinate parallel implementation without competing edits or conflicting product decisions.

## Founder-approved work split

### ChatGPT lane — product design and frontend
ChatGPT owns:
- NN visual system, responsive UI and CSS Modules.
- Shared application shell, navigation, launcher and command surfaces.
- All application screen layouts and frontend interaction states.
- Integration of the five supplied visual references: Liquid Glass Button, Glass Fold, Coverflow Carousel, Perspective Tunnel Hero and Adjustable Glass Dashboard.
- Frontend accessibility, reduced-motion behaviour, device adaptation and visual QA.
- Frontend commits on `design/nn-frontend-system`.

Do not overwrite ChatGPT-owned frontend files while implementing backend services. If a frontend contract change is required, propose it in a focused PR comment or this handoff document first.

### Claude lane — backend and remaining product engineering
Claude owns:
- Firebase-backed data services and persistence, using the approved `nn-os-dev` project only.
- Firestore repository/service layer, typed domain contracts and validation.
- Server-side API routes and secure access boundaries.
- REN reasoning/tool orchestration backend, provider abstraction, permissions, approval flow and audit events.
- Integration adapters, background job contracts, notification and automation services where permitted.
- Backend unit, emulator, security and integration tests.
- Technical documentation for backend contracts and operational setup.

Claude must not change production, enable Blaze/billing, change domains, weaken rules, add secrets to source, or alter authentication/security without the founder's explicit approval.

## Shared engineering constraints

1. Read `CLAUDE.md`, `docs/NN_CINEMATIC_VISUAL_SYSTEM.md`, `docs/NN_PRODUCT_UI_ANIMATION_MASTER_PROMPT.md`, `docs/NN_ANIMATION_COMPONENT_SOURCE_INDEX.md`, `docs/NN_APP_REGISTRY.md`, `docs/NN_OS_ARCHITECTURE.md` and `docs/FIRESTORE_DATA_MODEL.md` before substantial work.
2. Preserve the existing Next.js 15 / React 19 / strict TypeScript / CSS Modules architecture and V3 tokens.
3. Firebase only. Development project: `nn-os-dev`. Production project: `nn-os-prod`, untouched.
4. Never add sample balances, fake attendance, fabricated analytics, fake REN activity, or simulated integrations to real-looking UI.
5. Every feature must define loading, empty, error, offline/stale and permission states.
6. All user data remains owner-scoped. Firestore/Storage rules are the security boundary; React visibility is not authorisation.
7. Keep changes on the feature branch and use focused commits. Never merge PR #2 or deploy production without founder approval.
8. No duplicate UI frameworks or animation libraries. Existing NN primitives are the source of truth.
9. Keep the founder's Intel MacBook Air (8 GB) and iPhone performance constraints in mind.
10. A route or component is not complete until its tests and actual behaviour are verified.

## Contract-first integration

Before connecting a frontend screen to a backend service:
- Define typed request/response contracts and ownership assumptions.
- Document collection paths, validation, permission level and audit behaviour.
- Keep credentials and provider keys server-side.
- Expose stable loading/success/error states to the frontend.
- Do not invent a Firestore collection or change a schema silently; reconcile with the canonical data model first.

## Current coordination snapshot

- Frontend: the founder-approved iridescent spatial-glass direction is being unified through shared derived reflection tokens. The base V3 palette and NN mark geometry remain unchanged.
- Frontend implementation commit: `f938a0df30ec0ac4f96fdd1be3369922df5bcc1a` (branch `design/nn-frontend-system`). Updated shared tokens, global wave fallback, holographic rim, HoloPanel, NN Home materials and token tests. The latest visual override is documented in `docs/NN_FOUNDER_VISUAL_RESET.md`.
- Verification: this milestone has **not yet been built or tested locally**. Typecheck, unit tests, reduced-motion checks and desktop/iPhone browser review remain required before calling it verified.
- Preview: the last READY Vercel preview is still an older commit (`4a54f3e`), not this implementation. Vercel reported the free daily deployment API limit; do not present the older preview as current.
- Backend: Claude should inspect actual repository state before claiming implementation or duplicating existing authentication, Firebase or security work.
- REN: visual shell exists, but reasoning, memory and tool execution must remain explicitly disconnected until implemented and verified.

## Handoff update protocol

After each meaningful backend milestone, update this file with:
- files and services changed;
- exact commit SHA;
- tests actually run and results;
- Firebase emulator/project used;
- integration contract exposed to the frontend;
- remaining blockers.

After each frontend milestone, ChatGPT updates the same coordination snapshot. If both agents need the same file, stop and agree the smallest interface change before editing it.


## Passkey-only security contract (founder instruction)

NN app access is passkey-only. ChatGPT has hardened the Firebase client session,
server token verifier, Firestore rules and Storage rules to require the
server-issued Firebase custom claim `nnOwner: true`, which is minted only after
a successful WebAuthn assertion. Do not add another Firebase sign-in provider
or bypass this claim check. The bootstrap secret is a one-time first-owner
enrollment gate only; it is not a login option. Preserve tests proving that
Firebase-authenticated users without `nnOwner: true` cannot access data.

Firebase preview deployment is not yet fully configured: the Vercel project
currently has no environment variables. Never guess Firebase web config or
service-account credentials. Keep all secrets server-side and ask the founder
to provision them through the local CLI / Vercel secure environment interface
rather than pasting them into chat.


## Frontend visual pass — 2026-11-09

- Applied the founder-approved iridescent spatial-glass treatment to the existing entry corridor, sign-in card, Home, Life and Workspace CSS modules.
- Added shared `--nn-glass-*` material recipes and reusable `.nn-glass`, `.nn-glass-primary`, `.nn-glass-reading` and `.nn-glass-icon` primitives in `apps/web/src/styles/global.css`.
- Kept the fixed V3 base palette and existing logo component/geometry unchanged. No backend contracts or data behaviour were changed.
- Exact latest implementation commit: `ee4676fa739ba203aa07e4bc984be7d00b31de40` on `design/nn-frontend-system` (the handoff update itself will create a later docs-only commit).
- Verification: no local typecheck, unit test, production build, browser, accessibility or device review has been run in this session. Do not call this pass verified.
- Preview deployment: attempted against the exact implementation commit; Vercel rejected it with `api-deployments-free-per-day` and `retryAfter=86400`. The current READY deployment remains an older commit and must not be represented as the updated design.
- Release readiness: Vercel reports zero production environment variables, and SSO protection remains enabled for all except custom domains. Do not weaken SSO or invent production Firebase/passkey settings. Production is not ready to release.
- Remaining work: run the documented pnpm typecheck/tests/build locally, review all routes at desktop and 360px/iPhone widths, correct regressions, provision production configuration securely, then deploy the exact verified commit when Vercel quota permits.
