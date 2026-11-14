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

## Frontend execution programme — 2026-11-09

- Founder explicitly approved the complete NN frontend/UI execution programme. The scope is recorded in `docs/NN_FRONTEND_EXECUTION_PROGRAMME.md`; work remains on `design/nn-frontend-system`. No production deployment or merge is authorised by this approval.
- Added `apps/web/src/lib/apps/registry.ts` as the typed canonical 34-application frontend registry, aligned to `docs/NN_APP_REGISTRY.md`. REN remains an ambient assistant capability and App Factory remains a system capability, not launcher applications.
- Home now reads its application index and category counts from the shared registry instead of maintaining a duplicate 35-item list. Only NN Life is marked available because it is the only canonical application with an implemented route in the current route inventory; other app surfaces remain visibly in development.
- Fixed the Home REN feature tile so it summons the persistent REN panel rather than filtering the app launcher for a non-existent REN app entry.
- Added `apps/web/src/lib/apps/registry.test.ts` to check the 34-app count, unique IDs, route availability, derived category totals and capability separation.
- Implementation commits: `928b015b9a85f18e05f203bc4e7d1427c7cfa0bd` (programme), `480bb00d41383e3346cb581d534615f556f158a3` (registry), `1e59a4ffbfc677528566f151ecab4e20edca6d23` (Home integration), `f27aff729ec240a663436176be74ea8fe10f9a5a` (registry tests).
- Verification: tests have been authored but not executed in a local checkout. Typecheck, lint, unit tests, production build and browser/device QA remain outstanding. Do not mark this milestone VERIFIED.
- Next frontend milestone: inspect and implement the persistent responsive NN OS shell and route-aware app navigation using the central registry, then proceed through application modules in the approved sequence.

## Shared application navigation — 2026-11-09

- Added `NNAppNavigation` as a route-aware floating dock for the Life, Workspace and Design surfaces. It reuses the existing Dock primitive, marks the active route, provides direct navigation back to Home, and opens the persistent REN assistant.
- Home and Life keep their purpose-built navigation, avoiding duplicate controls. The shared dock is shown on Workspace and Design, and does not add a side rail or separate menu panel.
- The dock respects iOS safe-area insets, uses large touch targets, and disables its hover transition under reduced-motion settings.
- This is frontend navigation only. It does not make planned applications available, change authentication, or add REN reasoning/tool capabilities.
- Verification: source changes are committed on the feature branch; no local typecheck, lint, unit tests, production build or real-device/browser QA has been run. No deployment was requested or performed.


## Founder-only product boundary — 2026-11-09

- Founder clarified that NN is exclusively a private personal operating environment for its single owner, Naseemudheen. It is not a public SaaS product, multi-tenant workspace or collaboration platform.
- Product scope now explicitly excludes public registration, invitations, member directories, team roles and additional owner accounts. All data, settings, files, memories and application state belong to the single passkey-enrolled founder identity.
- Keep the existing server-side nnOwner: true claim, passkey-only access and default-deny Firestore/Storage rules. A users/{uid}/… namespace is a secure owner-data boundary, not a signal that multiple users are supported.
- Build integrations for the founder's personal accounts/devices. Any outward sharing, publishing or consequential external action requires explicit founder authorisation.
- Product prioritisation is based on the founder's real workflows and devices, not generic-market needs. Never represent a planned feature as operational before its data path, permissions, failure states and behaviour are verified.
- This is a product-scope clarification and documentation change; it does not alter authentication or security rules.

## Home launch-surface integrity pass — 2026-11-09

- Updated the Home featured application tiles to read their identity, icon and availability from the canonical 34-app registry. Life is presented as available; College, Projects and Finance are explicitly labelled in development and route into the filtered application index rather than pretending to open.
- Kept REN separate from the application registry. The Home REN tile and quick action summon the existing persistent REN surface; the Home capability copy now states that appearance controls are available while text intelligence and voice are not connected.
- Corrected the Home search affordance to say “Find an NN application”; it opens the application index and is not represented as a global content search.
- Removed duplicate quick actions that all landed on the same Life route. The remaining actions have distinct outcomes: open Life, browse the application index, open Workspace, and summon REN.
- Added visible availability pills, improved tile spacing for their additional state labels, and added explicit keyboard-focus outlines to Home launch and action controls.
- Source commits: `3e0aaef0d3138ce982e0e1174e8418aeb5eb2ea8` (Home behavior/content) and `df91fb67f8a4b2ee50a53586422bcb7311b430ad` (Home styling).
- Verification status: source was re-fetched from GitHub after each commit and the intended changes were confirmed in the committed files. No local checkout is available in this execution environment, so TypeScript, lint, unit tests, production build, browser interaction, responsive screenshots, accessibility audit and real iPhone QA have **not** been run. This milestone is implemented in source but not verified.
- Release status: no merge, deployment or production change was made. Continue on `design/nn-frontend-system`.

### Home interaction polish — 2026-11-09

- The Home greeting now follows the device's local time (morning, afternoon or evening) rather than always saying “Good evening”.
- Pressing Escape closes the application index and clears its query, so a later open starts cleanly.
- Commit: `88650bfefde05ab53b39c3f67c49c65311d88818`.
- Verification remains source-level only; no executable test/build/browser/device run was available in this session.

## NN Life destructive-action safety pass — 2026-11-09

- Swipe-to-reveal remains the primary touch interaction for deleting Life records, but tapping Delete now opens the shared accessible Dialog and requires a second explicit confirmation before Firestore `deleteDoc` runs.
- The confirmation states that deletion is permanent and cannot currently be undone. The action is disabled while another save is in progress; the existing verified-save/error path remains responsible for reporting the Firestore result.
- Added a keyboard alternative: focus a record action group and press Delete/Backspace to reveal the delete action; Escape closes the revealed action. The action group uses a state-specific accessible label and a visible keyboard focus outline. A subsequent CI lint run flagged `aria-expanded` as unsupported on role=group; that attribute was removed and replaced with a supported label announcement.
- Added phone-friendly dialog actions and visible focus treatment. No data model, Firestore rules or authentication code was changed.
- Source commits: `0c48fe71a25eb50bcd9a45e273fd709cf49509a2` (confirmation flow), `ba37d960d937e4b01e1916daed8c682714991a10` (dialog styling), `f0e89c75045eda4561cdb1f669ca9441586be522` (keyboard alternative), `6ead944f561d728422a66a091306592473bf5885` (expanded state), and `92ee43f6466370ff5fbd10c869cdc75dede5b4a3` (focus visibility), and `c77a54f597bc7d7f5f01a38ccdc03ff83c26a270` (accessible state announcement correction).
- Verification status: all changed source files were re-fetched from the feature branch and the intended changes were confirmed. The first CI attempt typechecked successfully but failed lint on the unsupported `aria-expanded` attribute described above; the source has since been corrected. A fresh CI run is required to verify the correction. Browser and device QA remain outstanding.

## Persistent room rendering efficiency pass — 2026-11-10

- The shared WebGL room previously read `canvas.clientWidth` / `clientHeight` and reset the viewport on every animation frame, even when its dimensions were unchanged.
- The drawing buffer now resizes only when the measured pixel dimensions change. A `ResizeObserver` handles element-size changes, and a passive window resize listener catches device-pixel-ratio changes such as display-scale or orientation transitions.
- The correct drawing buffer is established before the first frame, including reduced-motion mode. Cleanup removes both observers/listeners.
- The shader, palette, visual composition, DPR quality cap, motion preference behaviour and visibility-aware frame loop remain unchanged.
- Source commits: `2289804eef276074c3f6bf1c98a3915527fc34d1` and `188b15ec40a689e42e6f2e707c29211f7f45168e`.
- Expected benefit: fewer repeated layout reads and viewport resets in the persistent animation loop. This is a code-level optimisation hypothesis; no profiling or device battery/frame-time measurements have been run.
- Verification: source re-fetched from GitHub and the resize, first-frame, observer and cleanup paths inspected. TypeScript/build/runtime/WebGL context-loss/mobile-device QA remain outstanding.

### Design-branch verification coverage — 2026-11-10

- Expanded `.github/workflows/ci.yml` push triggers to include `design/**` branches. The existing pipeline remains unchanged: frozen pnpm install, TypeScript checks, ESLint, unit tests and Next.js production build.
- This closes a coverage gap where the active `design/nn-frontend-system` branch was excluded from the workflow's push filters.
- Commit: `8f81562e515b77e7a96bf8f0160ab1cb5dc37961`.
- The workflow file is committed and re-fetched. At the time of inspection, no associated workflow run was returned and no passing CI result was available. Do not treat the pipeline as executed until a run is visible.



## Application discovery surfaces — 2026-11-10

- Added a dedicated route at `/apps/[appId]` for all 34 registered applications. The registry now distinguishes an operational `href` from an `overviewHref`; this prevents a discovery page from being misrepresented as a working application.
- The 33 planned applications open an explicit development-status overview. Each page states that the application is not operational and that the overview does not create records, connect accounts, run automations or claim unfinished functionality.
- Overview pages show only registry-backed identity, group and description, plus shared release gates: complete interface, real functionality, owner security and verification. Related applications are derived from the same registry group.
- NN Life redirects to its actual `/life` route. Unknown application IDs return the normal not-found response.
- Home launcher now routes planned entries to their status overview rather than leaving them in a search loop; the index offers “VIEW STATUS” for planned apps and “OPEN” only for available apps.
- Registry tests now assert that all 34 entries have a deterministic overview route while only genuinely operational routes are marked available.
- Commits: `7dafb743b4761006f2b8f19c8bfed283b9570516` (registry), `677a74a86c2077dca9d6ca86912ab8e06c52b52e` (Home), `aabb39cba5c4f648bfcba5b8a053c68301dab781` (tests), `264fd49af9f49760e183fee9dc793aa622b09736` and `003f79b9916fd7bdc8b339875ee30ef0db8a0b2e` (overview route and styling).
- Verification: all 34 overview route declarations, Home routing and status copy were re-fetched from GitHub. CI for these new commits has not yet been confirmed; no production build or browser/device QA is claimed.


### Application overview route CI correction — 2026-11-10

- The first full CI run for the overview-page milestone passed typecheck, lint and unit tests (including 90 Firebase rules tests and 125 web tests), but the Next.js production build failed because a dynamically typed registry overview URL was passed to a typed Next Link.
- Corrected the Link destination with the Next.js `Route` type assertion in `apps/web/src/app/apps/[appId]/page.tsx` (commit `71f63048f971b589188c4f76c1cf4a5131f8a891`). This is a routing type correction only; no security or data contracts changed.
- A fresh CI run for that commit is in progress at the time of this note. Do not mark the milestone build-verified until the run completes successfully.


### Home launcher typed-route correction — 2026-11-10

- The overview-route CI run passed TypeScript, lint, all 90 Firebase rules tests and all 125 web tests, but the Next.js production build then found a second typed-route error: the Home launcher passed the registry's string-typed `overviewHref` to `router.push`.
- Added the Next.js `Route` type import and narrowed the registry destination at the navigation boundary. This preserves the registry's string-based metadata model and does not alter route behaviour or security contracts.
- Commit: `51ee18461bc4bec1273a253eff4be856e556cbc2`.
- A fresh CI run is required. Do not mark the overview milestone build-verified until the full pipeline succeeds.


## NN Future Interface System — 2026-11-10

- Added `apps/web/src/styles/future-system.css` with 50 named core primitives, organised into five groups: optical surfaces; cards/tiles/icon materials; actions/fields/statuses; information architecture/data display; and feedback/safety/accessibility.
- Added supporting variants for compact icon wells, active chips, navigation, safe-area spacing, overflow containment and reduced-motion handling.
- Imported the system globally after the shared token and holographic material sheets. It consumes the approved NN semantic palette and existing glass tokens rather than creating a competing colour system.
- Integrated the shared interaction/focus treatment and dimensional icon well into the Home application launcher.
- Added `docs/NN_FUTURE_DESIGN_SYSTEM.md` as the 50-item design catalogue and `future-system.test.ts` to assert the exact 50 unique primitives exist and that reduced-motion, narrow-screen and no-backdrop-filter fallbacks remain present.
- No backend, Firestore, authentication, owner-claim or storage contract was modified. No application is promoted to operational by this visual system.
- Commits: `1733e3a47e826a7487a9de16170c9e6adad48fe0` (50 primitives), `fd2b93c9716b4119315635ecb105368216f42749` (global import), `a5933b4b771100734a7374bac3a710fb77c0eafd` (Home integration), `2200084e33c7ac4f77e3402156fd9f97ec6efc28` (catalogue), `3fe57236eb45058bacf19d31d97300886556e055` (primitive tests).
- Verification pending: the full CI pipeline must confirm typecheck, lint, unit tests and production build. Real iPhone/desktop visual QA remains outstanding.

- Extended the shared material language to planned application overview pages: hero surfaces, owner-facing status callout, release-gate cards, related-application interaction feedback, and dimensional application icon wells. This changes presentation only; the explicit planned/not-operational state remains intact.
- Overview visual integration commit: `e4ee43b5e84c35bee3e61bb77af1a3cc5c9b4fd8`.

- Refined the Home visual composition with the shared spatial hero light field and a restrained refractive spectral rim on application tiles. This remains CSS-only and respects the existing reduced-motion rules. Commit: `2555871d76b987984661dfcc8bac4cb7f10af2bd`.


## Claude OS completion handoff — 2026-11-10

- Founder has directed Claude to take the lead on completing the remaining NN operating system using the current frontend as the approved baseline. This supersedes the previous strict division where ChatGPT owned all frontend work and Claude only backend services.
- Added `docs/CLAUDE_OS_COMPLETION_BRIEF.md` with the product boundary, current frontend baseline, confirmed CI evidence, architecture requirements, execution order, definition of done and required final report.
- Current baseline commit with a confirmed full green CI workflow: `44b1ecf13b0444d96c30cd7f229dfe824fb4c4ba`; run `42734103628`. The workflow's typecheck/lint/tests stage and Next.js production build both succeeded.
- The 50-primitive design system is implemented and tested. It does not constitute 50 completed app screens. NN Life is the only operational app in the frontend registry; 33 others remain planned.
- Updated `CLAUDE.md` to point Claude at the new brief and clarify that Claude may extend frontend code while preserving the existing NN design system.
- Updated the top-level project status to remove the stale ~3% completion claim and clarify the actual frontend/app availability state. Historical phase tables below still require reconciliation against repository evidence.
- No production deployment, merge, production Firebase action or paid infrastructure change is authorised.

## Deployment state — 2026-11-13

**Live preview:** https://nn-app-git-design-nn-frontend-system-clientflownn.vercel.app
(branch alias, re-pointed at the current deployment). Commit `210c8a82fd5560651bd21e64a150f002f2eea920`.
Reachable only to someone signed in to the Vercel account — Deployment
Protection (`vercel_authentication`) is on.

### Fixed: authentication was completely broken in production

Every `/api/auth/*` route returned 500 on the deployed site. It did not
reproduce locally and was only found by reading the deployed function's own
logs:

```
Error: require() of ES Module .../jose@6.2.15/dist/webapi/index.js
from .../jwks-rsa@4.1.0/src/utils.js not supported   (ERR_REQUIRE_ESM)
```

`firebase-admin` → `jwks-rsa@4` does `require('jose')`; jose 6 is ESM-only.
`jose` is now held at `^5.10.0` in `pnpm-workspace.yaml` (**not**
`package.json` — pnpm 11 ignores the `pnpm` field there, silently). jwks-rsa
uses only `importJWK` and `exportSPKI`, both present in jose 5, which ships
CommonJS. Verified live: `/api/auth/status` returns its real body from the
deployed function, and the deployment logs contain zero error lines.

### Fixed: unconfigured deployments lied about why

A deployment with no service account made `getAdmin()` throw inside the rate
limiter — before any route's own handling — so all six auth routes answered a
bare 500 with an empty body, which the sign-in screen could only report as
"could not reach NN". `requireServerCredentials()`
(`src/server/auth/credentials.ts`) is now asked first in every auth route and
answers 503 with a message a person can act on. Which variable is missing
stays on the server, guarded by a test. `/sign-in` renders a dedicated
"Sign-in is not available here" panel instead of a dead button.

### Environment variables

Set (Preview, branch `design/nn-frontend-system`): all six
`NEXT_PUBLIC_FIREBASE_*` values, `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false`,
`WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN`, `WEBAUTHN_RP_NAME`. `WEBAUTHN_RP_ID`
matches the alias hostname exactly — verified, because a mismatch fails passkey
registration with a confusing error.

`NEXT_PUBLIC_FIREBASE_API_KEY` is stored as **Config**, not Secret. Vercel
flags the name as credential-shaped; for Firebase that is a false positive —
the Web API key identifies the project rather than authorising anything, the
browser SDK cannot initialise without it, and NN's authorisation boundary is
the Firestore rules.

**Still required, and only the founder can provide them** — passkey sign-in
cannot work until both exist:

| Variable | Where it comes from |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase console → `nn-os-dev` → Project settings → Service accounts → Generate new private key. **Empty in `.env.local` too**, so local sign-in outside the emulators is also blocked. |
| `NN_BOOTSTRAP_SECRET` | Already in `apps/web/.env.local`; needs to exist on Vercel to claim NN as first owner. |

Claude did not create, read or transfer either: both are credentials, and the
founder provisions them through the Vercel interface or CLI.

### Open decisions for the founder

1. **Deployment Protection vs the iPhone home screen.** Protection keeps the
   preview private but puts a Vercel sign-in in front of every visit, which
   will interfere with installing NN as a standalone PWA. NN's real security is
   passkey-only sign-in plus owner-scoped rules; `docs/DEPLOY_VERCEL.md` §5
   says URL-only privacy is not enough, so this is not Claude's call to reverse.
2. **Production.** This is a preview deployment. `CLAUDE.md` §0 requires
   explicit founder approval before any production deploy, so the production
   domain was left untouched.
3. **The dashboard card design.** The glass folder cards the founder asked for
   are built and shown on `/design/cinematic`; the dashboard currently uses the
   frontend lane's own card design, which survived the merge. Which one the
   dashboard should use is a visual decision, not a merge outcome.

### Known, not hidden

`/apps/[appId]` throws an intermittent React hydration mismatch (#418) on
roughly one navigation in five. React regenerates the subtree and the page
renders correctly. The browser verification run reports it separately rather
than failing or swallowing it.

## Production is live — 2026-11-13

Founder gave explicit approval for production, the card direction and full
management. Acted on all three.

**https://nn-app-sooty.vercel.app** — production, commit `009ddea0`.
Publicly reachable (no Vercel login wall), `robots: noindex, nofollow`, and
every personal surface is behind passkey plus owner-scoped Firestore rules.
Public reachability is deliberate: the SSO wall on the preview would have sat
in front of every launch and broken standalone PWA install on iPhone.

The preview alias remains for review:
https://nn-app-git-design-nn-frontend-system-clientflownn.vercel.app

### Production configuration

Production had **no environment variables at all** before this. Now set: all
six `NEXT_PUBLIC_FIREBASE_*`, `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false`, and
`WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN` / `WEBAUTHN_RP_NAME` pointed at
`nn-app-sooty.vercel.app`.

**Passkeys bind to the relying-party id.** They will only work on
`nn-app-sooty.vercel.app`. A custom domain later means updating
`WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN` and re-registering the passkey.

### Still required: two credentials

Passkey sign-in cannot work until both exist, in **both** environments.
Claude did not create, read or transfer either — they are credentials, and
`gcloud` is not installed while the Firebase CLI cannot mint service-account
keys, so the first genuinely needs the founder's console session.

| Variable | Source |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase console → `nn-os-dev` → Project settings → Service accounts → Generate new private key. Empty in `.env.local` too, so local sign-in outside the emulators is blocked as well. |
| `NN_BOOTSTRAP_SECRET` | Already in `apps/web/.env.local`; needs to exist on Vercel to claim NN as first owner. |

**Claim NN immediately after adding these.** While NN is unclaimed and the
bootstrap secret is live on a publicly reachable host, the secret is the only
thing standing between a stranger and ownership.

### The dashboard now uses the founder's folder cards

Each of the six families is a glass folder: the panel leans on its bottom
hinge, the sheets rise and fan, each sheet is an application, and opening one
travels the corridor. Artwork is generated on the device from NN's palette —
never fetched.

A folder shows four sheets before they read as a crowd, and families hold up
to seven, so the key at its lower-right corner — the affordance from the
founder's own reference — opens `/family/[slug]`, a real page listing every
application in that family with its honest state. Nothing is hidden behind the
preview.

### `start_url` was wrong for an installed app

The manifest launched into `/workspace`, a design surface. It now opens
`/home`. A test checks every manifest shortcut against the real route list,
because a shortcut to a route that does not exist is a dead button on the
founder's phone.

### Passkey authentication is proven to work

All **10 real-browser passkey tests pass** — Chrome's own WebAuthn against a
CDP virtual authenticator, hitting the real route handlers backed by real
Firestore and Auth emulators. That includes the full ceremony: claiming NN
with a passkey, exchanging the assertion for a Firebase session, and landing
in the workspace with the owner's uid. Also covered: a wrong bootstrap secret
refused, the secret dying once NN is claimed, a challenge that cannot be
replayed, an unknown credential refused without disclosure, malformed input,
and rate limiting actually engaging.

So the code is right. The live site is missing only the credential.

Two things were wrong with the suite and are now fixed:

- It failed on the first test for want of a compiler, not a bug. `next dev`
  compiles each route on first request — 50s for the entrance on this Intel
  Air — and `/api/auth/status` was still compiling when the 30s assertion gave
  up. The page sat on "Checking this environment…" and it read like a logic
  error. `e2e/warm.ts` (Playwright `globalSetup`) now compiles every route the
  suite touches before any assertion runs, serially, because compiling six at
  once on 8 GB starts swapping.
- The ceremony test asserted a heading, "You are signed in.", from the old
  placeholder workspace. It now asserts the owner's Firebase uid is printed
  and the guest notice is absent — proof of a real session rather than of page
  copy, and it will not break the next time the wording changes.

### Evidence

5/5 packages typecheck, lint clean, **271 unit/integration tests**, **10/10
real-browser passkey e2e tests**, production build, and **10/10 checks against
the live production site** in a real browser: the
refraction shader drawing (6240 distinct colours), the mark handing over to
the corridor, sign-in stating why it cannot verify a passkey, `/home` gated,
the family page listing all seven, a planned application admitting it is not
operational, the manifest asking for standalone launch into `/home`, and no
sideways scroll at 375px.

### What is still not built

**32 of the 34 applications have no work surface.** Only Life and Search do.
The registry, record layer, app shell, corridor, folder dashboard and family
pages are the scaffolding they will be built on; the honest overview at
`/apps/[appId]` is what each planned application shows today. Finance,
Projects and Files are the natural next three.
