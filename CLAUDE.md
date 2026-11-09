# NN — Project Knowledge Base

**Read this first.** It is written so a new Claude conversation, or a
different developer, can continue NN without the original chat history.

Owner and sole user: **Naseemudheen T.** · Repository: `NaseemudheenT/NN-app`
(private) · Workspace: `/Users/thajudeen/NN-app-workspace`

---

## 0. Parallel implementation ownership\n\nRead `docs/CLAUDE_COLLABORATION_HANDOFF.md` before substantial work. ChatGPT owns the complete product design and frontend implementation. Claude owns backend services, persistence, REN execution, integrations and backend verification. Avoid overlapping edits to frontend-owned files; agree on typed contracts first. The handoff document defines constraints, approval gates and status reporting.\n\n## 1. What NN is

A private, lifelong **personal operating environment** — one coherent system
holding the founder's life, education, work, business, finances, health,
faith and creativity, with a personal intelligence named **REN** running
through all of it.

The visual ambition is **NN**: a believable personal computing
environment from an advanced civilisation. Spatial, cinematic, glass, depth,
restraint.

**It is not** a dashboard, an admin panel, a chatbot, a portfolio, or a set of
disconnected pages. It is not finished because a page exists.

### The five layers

1. **NN OS** — workspace, launcher, floating windows, dock, search, command
   interface, notifications, settings, profile.
2. **NN Applications** — 34 approved applications (§5).
3. **REN** — provider-independent AI intelligence layer with skills, memory,
   tools, permissions and approval gates.
4. **NN Infrastructure** — identity, Firestore, Storage, permissions,
   automation, notifications, audit, backup.
5. **NN Evolution** — App Factory, versioning, evaluation, rollback.

---

## 2. Rules that must never be broken

| Rule | Why |
|---|---|
| **Firebase only.** No PostgreSQL, Neon or Drizzle, ever | founder decision |
| **`nn-os-dev` only.** Default alias is `dev` | `nn-os-prod` is untouched |
| **Never touch `the-zap-e7583`** | unrelated "Renew" project |
| **Never enable Blaze or attach billing** without explicit founder approval | cost control |
| **No install scripts.** All three are explicitly declined in `pnpm-workspace.yaml` | supply chain |
| **Never weaken the security rules** | they are the only authorisation boundary |
| **Never redesign the NN logo** | approved geometry, test-guarded |
| **The assistant is REN.** Renamed from ORIN on 2026-11-08 | founder decision |
| **REN has three capabilities and no more:** text, voice, appearance | founder decision |
| **Never claim something works without running it** | the founder's hardest rule |
| **No dead buttons, no fake data, no simulated integrations** | |
| **Never reset git history or discard uncommitted work** | |

### Firebase identifiers

| Env | Project ID | Number |
|---|---|---|
| Development | `nn-os-dev` | 607545263036 |
| Production | `nn-os-prod` | 62302820912 |
| **Do not touch** | `the-zap-e7583` | 884123213542 |

Signed in as `t.naseemudheen@gmail.com`. Both NN projects are on the **free
Spark plan**. Spark cannot run Cloud Functions, Cloud Storage or App Hosting —
see `docs/COST_ESTIMATE.md`.

---

## 3. Repository structure

```
apps/web/              Next.js 15 · React 19 · TypeScript strict
  src/app/             routes: / · /sign-in · /workspace · /design · /api/auth/*
  src/components/ui/   the design system (13 components)
  src/components/nn/   NN-specific composites
  src/lib/             theme · firebase client · auth client
  src/server/          Admin SDK and server-only code — never imported by the browser
  public/brand/nn/     7 locked logo assets
packages/firebase/     typed paths, document metadata, config validation
packages/security/     permission tiers, sensitive-action floor, log redaction
packages/auth/         WebAuthn, owner bootstrap, session policy  (pure, testable)
packages/{ui,core,app-registry}/   empty — reserved, not yet used
firebase/              security rules, indexes, emulator config, rules tests
functions/             empty — blocked on Blaze
docs/                  the permanent knowledge base
```

---

## 4. How to run and test

```bash
pnpm install                 # install scripts are all declined; this is expected
pnpm --filter @nn/web dev    # http://localhost:3000
pnpm -r typecheck            # all 5 packages
pnpm -r test                 # 209 tests
pnpm test:rules              # 88 security-rules tests, needs Java + emulators
pnpm --filter @nn/web test:e2e   # 10 real-browser passkey tests (system Chrome)
cd apps/web && ./node_modules/.bin/next build
```

**Playwright.** Drives the **system Chrome** (`channel: "chrome"`), because
Playwright no longer ships a Chromium build for Intel macOS 12. WebKit and
Firefox engines cannot be installed on this host at all.

**Java.** The Firestore/Storage emulators need a JDK. Temurin 21.0.13 x86_64 is
installed system-wide (Homebrew cask). `firebase/scripts/with-java.sh` locates
it. Homebrew has **no** Java bottle for Intel macOS 12 — do not try
`brew install openjdk`.

**Host.** Intel MacBook Air, 8 GB RAM, macOS Monterey 12.7.6. No modern Xcode,
no arm64. Prefer light tooling; avoid heavy local workloads.

**Environment.** Copy `.env.example` to `apps/web/.env.local`. Never commit it.

---

## 5. The 34 approved applications

Consolidations already approved — **do not re-create the left-hand names**:
Wealth→**Finance** · Inbox→**Mail** · Health&Wellness→**Body** ·
Media Vault→**Files** · Relationships→**Contacts**.
Calendar, Tasks, Reminders and Notes are **modules inside NN Life**, surfaced
across NN OS. **Learning Vault stays separate.**

**Life & wellbeing** — Life · Soul · Mind · Body · Contacts · Nature & Universe · Peace Mode
**Education** — College (SMVEC) · Academy · Learning Vault · Formula Engine · Logic Lab · English
**Money & work** — Finance · Invest · Business · Freelance · Career
**Creation & record** — Creator Studio · Studio · Projects · Achievements · Memory · Analytics · Files · Mail
**System** — Command Centre · Automation Studio · Search · Security Centre · Control Room
**Other** — Travel · Simulator · App Factory

Full detail: `docs/APPLICATION_REGISTRY.md`.

---

## 6. Design system

Palette (fixed): `#07111F` `#0B1930` `#10223B` `#172B45` `#F7F9FC` `#E7EDF6`
`#A6B3C5` `#77869B` `#9CC8FF` `#649CE3`

- Tokens live in `apps/web/src/styles/tokens.css`. **Components never hardcode
  a value that exists as a token** — REN must be able to retheme NN at runtime.
- Light theme is **not** an inversion; it has its own measured text ramp,
  because the dark ramp fails WCAG AA on a light ground. Both are test-enforced.
- Reduced motion **collapses durations to 1 ms** rather than removing
  transitions, so `transitionend` listeners still fire.
- Glass is **graded in three tiers** — denser information sits on a more
  opaque tier. This single rule is what keeps glassmorphism readable.
- `.nn-holo` adds the prismatic chamfer; the rim is painted only in a 1 px
  border band via a mask.
- The logo is **Concept A, 94 × 76, not square**, with a 6-unit gap. Declared
  once as `NN_MARK_PATH` and guarded by a test.

Forbidden: permanent left sidebar · widget walls · neon · cyberpunk · cartoon ·
gaming aesthetics · robot mascots · glow for its own sake.

---

## 7. Security model

**Authorisation happens in the Firestore and Storage rules, never in React.**

Everything the owner owns lives under `users/{uid}/…`, so one ownership check
protects all 34 applications — including ones not yet written, proven by test.

Key properties, all test-enforced (88 cases):
- cross-user reads, writes and lists refused
- `audit_logs`, `security_events`, `permissions`, `credentials`, `summaries`,
  `backups`, `tool_executions` reject every client write
- credential-shaped fields (`accessToken`, `apiKey`, …) refused in **any**
  collection — tokens belong in Secret Manager
- privilege fields (`permissions`, `role`, `isAdmin`, …) refused from clients
- a document cannot claim to belong to another user
- note version history is append-only; the owner record cannot be deleted
- Storage: no public path, MIME allow-list, 200 MB cap; `derived/` and
  `backups/` sit **outside** `users/` because Storage rules are a permissive
  union (see `docs/SECURITY.md` §2)

App Check is **not** authentication or authorisation. Enforcement stays off
until real traffic is observed.

---

## 8. Authentication (Phase 3)

Firebase has **no released passkey support** — it is in private preview on an
unpublished branch. NN therefore implements WebAuthn itself:

```
browser passkey → /api/auth/signin/verify (Next.js route handler)
                → Admin SDK mints a Firebase custom token
                → signInWithCustomToken → owner-scoped rules apply
```

Route handlers rather than Cloud Functions, **specifically to avoid Blaze**.
Details and the first-owner bootstrap: `docs/AUTHENTICATION.md`.

---

## 8b. The rename: ORIN → REN

The assistant was renamed **REN** on 2026-11-08. The rename was mechanical but
checked: every occurrence in the tree was a UI label, a component name, a
CSS class or a prose comment. **No Firestore collection, document field,
permission action id or API contract ever carried the name**, so nothing in
the data model or the security rules changed meaning — only comments did. The
one real contract that moved is the PWA manifest shortcut, `/workspace?orin=1`
→ `/workspace?ren=1`; nothing reads that parameter yet.

The only substring hazard in the tree is the word "authoring"; all
replacements were word-boundary anchored and it is intact.

**REN's scope is fixed by founder decision to three capabilities:** text,
voice, and appearance (retheming NN). Appearance is the only one wired today
and lives on REN's own surface — not in the workspace chrome, because
retheming NN is REN's job, not a system setting.

## 8c. REN as built (phases 1–3 of 7)

REN is mounted once in the root layout, inside `AuthProvider`, so it is a
property of NN rather than a page. Three files carry it:

- `lib/ren/state.ts` — the six-state machine: idle, awakening, listening,
  thinking, speaking, complete. **Illegal transitions throw rather than being
  ignored.** `respond` refuses an empty utterance, `settle` is unreachable
  except from thinking or speaking, and `fail` returns to idle — REN cannot
  show a success flourish for work that did not happen.
- `lib/ren/intents.ts` — a deterministic matcher, not a model. Every entry
  maps to a real function. Anything unmatched gets an honest refusal. When a
  provider is connected it goes *in front* of this; the intent list stays the
  authority on what is permitted.
- `lib/ren/context.ts` — a pure function from route to what REN knows about
  where the founder is. REN never has to be told which page you are on.

**Panel visibility is deliberately NOT derived from the state machine.** REN
sits idle with its surface open while you read a reply. Conflating the two
made REN close itself a second after every answer.

Navigation is verified: REN asks the router to move, waits for the route to
actually change, and reports success only then — with a 4 s timeout that
reports failure rather than hanging.

Summon with ⌘K / Ctrl+K, or the floating mark in the corner. Escape closes.
The launcher hides while the panel is open: one identity on screen, never two.

**Not built:** voice (phase 4), model intelligence (5), module actions beyond
navigation (6). The panel states this in one line rather than implying more.

## 9. REN architecture (designed, not yet built)

Provider-independent by design — OpenAI, Anthropic, Google and open-weight
models behind one gateway, with intelligent routing on quality, cost, latency
and privacy. Never hardcode a single vendor. Do not call every provider for
every message.

Planned: skills (software-engineer, business-strategist, financial-analyst,
research-specialist, teacher, mathematician, designer, writer, project-manager,
data-analyst, personal-assistant, security-analyst, automation-specialist,
travel-planner), long-term memory with RAG, voice, vision, tool execution,
background workflows, proactive assistance, evaluations.

**REN's limits are code, not prompt:** `@nn/security` fails closed on unknown,
revoked and expired grants, and escalates 13 sensitive actions regardless of
any grant. A broad `modify` permission can never become a licence to send
email. An automation cannot chain around an approval gate.

Execution cycle: `LISTEN → UNDERSTAND → PLAN → CHECK PERMISSIONS → CONFIRM IF
REQUIRED → EXECUTE → VERIFY → REPORT`. Never report success without
verification.

---

## 10. Current status

**Built and verified** — design system (13 components, 3D holographic layer),
locked brand assets, Firestore data model, owner-scoped security rules,
emulator suite, `@nn/firebase`, `@nn/security`, `@nn/auth`, WebAuthn passkey
registration and sign-in, first-owner bootstrap, session policy with idle and
absolute limits, sign-out everywhere, route guard.

**216 unit/integration tests + 10 real-browser e2e tests passing.** Typecheck
clean on 5 packages. Lint clean. Build succeeds.

Passkey sign-in is **verified end to end in Chrome 150** via a Playwright CDP
virtual authenticator against real emulators — not mocked.

**Not built** — the NN OS workspace, all 34 applications, REN, Cloud
Functions (Blaze), notifications, automation, backup/restore, PWA install.

Honest completion: roughly **7%**. See `docs/NN_GAP_ANALYSIS.md` and
`PROJECT_STATUS.md`.

---

## 11. How to continue in a new conversation

1. Read this file, then `PROJECT_STATUS.md` and `docs/MASTER_IMPLEMENTATION_PLAN.md`.
2. Run `pnpm -r test` and `pnpm test:rules` to confirm the baseline still passes.
3. Pick up the next phase in the roadmap.
4. Work in small verifiable stages. After each: report what was inspected,
   what changed, which tests ran and their **actual** results, and what remains.
5. Update `PROJECT_STATUS.md` and `docs/NN_DECISIONS.md` as you go.

Ask the founder only for: production changes, paid services, billing,
destructive operations, brand changes, or a genuine scope decision. Make
ordinary reversible engineering calls yourself.

## NN visual direction — founder-approved project context

Before changing any frontend, read:
- `docs/FRONTEND_DESIGN_SYSTEM.md`
- `docs/NN_CINEMATIC_VISUAL_SYSTEM.md`

The founder's standing visual direction is a premium, futuristic personal operating environment using the supplied perspective-tunnel introduction, WebGL Glass Fold atmosphere, liquid-glass controls, floating 3D coverflow cards and adjustable-glass workspace language. Apply the same coherent NN visual identity across Home, Life, Learning, Work, Personal and System—not only the landing page.

Preserve the existing NN V3 navy/icy-blue tokens, custom TypeScript + Next.js + CSS Modules architecture, NN icon family, accessibility and performance constraints. Reuse the existing `NNIntro`, `Room`/`GlassFold`, `LiquidButton`, `Coverflow`, `NNWorkspace` and REN components before creating alternatives. The supplied shadcn/Tailwind/Framer Motion/GSAP snippets are references to adapt, not instructions to add duplicate frameworks or dependencies.

All visible controls must work. All live-looking animations must reflect actual state. Keep placeholder data clearly labelled. Respect reduced motion, touch and keyboard interaction, and low-power devices. Do not claim a feature or screen is complete until its real data path, states, responsive behaviour and tests are verified.


##  Design and animation implementation authority

Before any product-wide UI or animation work, also read:
- `docs/NN_PRODUCT_UI_ANIMATION_MASTER_PROMPT.md` — complete product design and reusable implementation prompt for all approved NN applications.
- `docs/NN_ANIMATION_COMPONENT_SOURCE_INDEX.md` — mapping from the founder's five supplied animation references to the existing NN source components.

These documents are the persistent implementation authority for the complete NN visual system. Store future founder-supplied UI prompts and source snippets in `docs/` (or a clearly named `docs/reference/` archive) and index them. Do not merely mention that references were seen in chat. Adapt every reference to NN's actual architecture, palette, data, accessibility, device and security constraints. The 34-app visual map is a design target, not a claim those apps are implemented.
