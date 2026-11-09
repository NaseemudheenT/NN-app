# NN — Master Product UI & Animation Implementation Prompt

**Purpose:** This is the reusable implementation prompt for designing and building the complete NN product. Keep it in GitHub as permanent project knowledge. Read it before every substantial frontend, app-screen, animation, interaction or visual-system task.

**Authority:** Founder-approved direction. The founder makes final product decisions. This prompt authorises normal reversible design and frontend implementation on the working feature branch; it does not authorise production deployment, billing, secret changes, weakening security, merging to main or irreversible data operations.

## 1. Product identity

Design NN as a private, lifelong personal operating environment — a coherent personal computing system, not a collection of unrelated SaaS dashboards. The environment should feel like a believable advanced personal computer: spatial, cinematic, calm, precise, tactile and deeply usable.

The signature visual language is **quiet futuristic computing**:
- Midnight/deep navy architecture, icy-blue light, soft white typography and restrained silver.
- Layered glass with material hierarchy, edge highlights, depth and subtle refraction.
- Spatial transitions and purposeful 3D, never motion for decoration alone.
- Information-dense screens that remain readable, fast and accessible.
- A consistent visual grammar across every NN application, device and system surface.

Never drift into neon cyberpunk, gaming HUD, crypto terminal, generic AI chatbot, cartoon/robot mascot, random stock imagery, gold/bronze styling, unrelated icon packs or excessive gradients. Do not redesign the approved NN logo.

## 2. Non-negotiable repository rules

1. Inspect the current branch, routes, components, tokens, data contracts and tests before editing.
2. Work on `design/nn-frontend-system` unless the founder names another feature branch. Never silently work on `main`.
3. Preserve the existing Next.js App Router, React, strict TypeScript, pnpm workspace and CSS Modules architecture.
4. Preserve the V3 design tokens in `apps/web/src/styles/tokens.css`; do not hardcode values already represented by tokens.
5. Reuse existing NN components before creating new ones. Do not install shadcn, Tailwind, Framer Motion, GSAP, Three.js or another component/animation framework merely because a supplied demo uses it.
6. The supplied reference snippets are design/source references, not permission to replace NN architecture. Adapt their material, geometry and interaction to NN.
7. Never fabricate metrics, activity, notifications, sync, progress, AI state, microphone activity or backend success.
8. No dead buttons. A control must work, be visibly disabled with a reason, or be clearly labelled as planned/unavailable.
9. Every state and animation must be tied to a real event or actual local interaction.
10. Preserve authentication, Firebase boundaries, owner-scoped rules, server-only credentials and permission gates.
11. No production deployment, merge, paid plan, billing, external account connection, secret rotation or security-policy change without the required founder approval.
12. Update documentation and tests with implementation. Never report a feature complete without evidence.

## 3. NN visual source of truth

Read these files first:
- `CLAUDE.md`
- `docs/FRONTEND_DESIGN_SYSTEM.md`
- `docs/NN_CINEMATIC_VISUAL_SYSTEM.md`
- `docs/NN_PRODUCT_UI_ANIMATION_MASTER_PROMPT.md` (this file)
- `docs/NN_ANIMATION_COMPONENT_SOURCE_INDEX.md`

Existing core source components to inspect and adapt:
- `apps/web/src/components/nn/NNIntro.tsx` and `NNIntro.module.css` — perspective tunnel / cinematic entrance.
- `apps/web/src/components/nn/Room.tsx` and `Room.module.css` — one shared global environment mount.
- `apps/web/src/components/ui/GlassFold.tsx` — WebGL Glass Fold effect.
- `apps/web/src/components/ui/LiquidButton.tsx` and associated glass filter definitions — liquid-glass controls.
- `apps/web/src/components/ui/Coverflow.tsx` — spatial 3D coverflow.
- `apps/web/src/components/nn/NNWorkspace.tsx` and `NNWorkspace.module.css` — adjustable-glass workspace.
- Existing REN components and state model — state-driven REN presence.

Do not create duplicate copies of these effects. If a reference effect already exists, improve its existing implementation.

## 4. Product-wide system architecture

Design the whole product as five coherent layers:

### NN OS
A consistent operating shell: entry, identity, system bar, navigation, app launcher, dock/quick switch, command palette, search, notifications, workspace canvas, overlays, profile/preferences and responsive device navigation.

### NN Applications
Every approved application shares NN's shell, typography, controls, material hierarchy, motion rules, empty/loading/error/offline states and REN context. Each app still gets a distinct information architecture appropriate to its job.

### REN
REN is NN's intelligence surface and identity. Visual states must map to the actual state machine and execution events. Never animate a fake microphone waveform, thinking loop, tool execution, answer stream or success state.

### NN Infrastructure
Identity, devices, data, permissions, connectors, sync, audit, security, automation, notifications, backups and restore surfaces use a precise technical visual language. State and risk must be explicit.

### NN Evolution
App Factory, versioning, evaluation, preview, approval and rollback use inspectable workflows, not decorative progress.

## 5. Application-by-application visual and motion map

Apply the shared design system to all approved applications. These are design requirements, not claims that the screens or backend functions already exist.

### Life & wellbeing
- **Life:** daily command surface with day timeline, calendar/task/reminder/note modules, quick capture and focus. Use gentle timeline reveals and stateful completion transitions.
- **Soul:** quiet reflective reading/journaling surface; typography-first, low-motion, privacy cues and calm page transitions.
- **Mind:** thought capture, structured reflection and mental models; use progressive disclosure, linked cards and restrained focus transitions.
- **Body:** health/activity records and trends; high-contrast charts, explicit units and source freshness. No decorative vital signs.
- **Contacts:** relationship directory and profile detail; coverflow only for a small featured set, conventional searchable lists for large sets.
- **Nature & Universe:** location/time/astronomy/environmental exploration; use spatial maps or orbit-like visualisations only when data and interaction support them.
- **Peace Mode:** distraction-free immersive focus; dim peripheral chrome, use subtle ambient motion, clear exit and reduced-motion support.

### Education
- **College (SMVEC):** timetable, subjects, syllabus, question banks, exams, attendance, marks and revision. Use source-first document panes, subject navigation, progress only from saved work, and precise quiz feedback.
- **Academy:** structured learning paths, lessons, exercises, quizzes, projects and mastery. Use progressive path/step transitions and accessible progress indicators.
- **Learning Vault:** source library and study material. Reading-first panels, document preview transitions, metadata and provenance.
- **Formula Engine:** formula catalogue, variable inputs, worked steps and results. Use mathematical typesetting and stepwise reveal; never animate incorrect/incomplete calculations as final.
- **Logic Lab:** interactive logic problems and experiments. Animate graph/tree/sequence changes only in response to learner actions.
- **English:** vocabulary, listening, speaking, grammar and writing practice. Use clear audio state indicators and transcript/feedback transitions; do not imply recording when microphone access is absent.

### Money & work
- **Finance:** accounts, budgets, transactions and reports. Opaque reading surfaces, explicit currency/date/source, restrained chart transitions; no sample balances as live data.
- **Invest:** holdings/watchlists/research and risk. Data provenance, timestamp, market status and units must be visible; no flashing trading terminal effects.
- **Business:** company operations, revenue/cost, customers, orders and decisions. Dense tables with clear hierarchy, status transitions and decision timelines.
- **Freelance:** leads, proposals, clients, projects, invoices and delivery. Pipeline transitions and actionable next steps, not fake activity.
- **Career:** skills, portfolio, applications, interviews and career roadmap. Timeline and milestone transitions driven by saved progress.

### Creation & record
- **Creator Studio:** content pipeline, scripts, assets, publishing and performance. Media previews, timeline editing and status-driven transitions.
- **Studio:** creative workspace for assets and production. Canvas-like focus only where needed; keep editing controls tactile and precise.
- **Projects:** project boards, milestones, tasks, files, decision logs and delivery. Timeline/board transitions with accessible keyboard alternatives.
- **Achievements:** verified milestones and evidence. Use restrained reveal, provenance and dates; never invent achievements.
- **Memory:** personal memory records with source, date, confidence/provenance, review and correction. Use clear lineage and non-destructive transitions.
- **Analytics:** dashboards and reports. Animate only real data changes; show range, units, source, freshness and text summaries.
- **Files:** folders, documents, media, previews, tags and versions. Use smooth preview/split-pane transitions; preserve reading contrast.
- **Mail:** inbox, threads, compose, search and send state. Clear message density, thread transitions and explicit send confirmation; never imply delivery before server confirmation.

### System
- **Command Centre:** system status and operational actions. Use technical high-contrast panels, clear severity and confirmation for sensitive actions.
- **Automation Studio:** visual workflow builder, schedules, runs, logs and approvals. Animate actual node execution only when run events arrive; show paused/failed states clearly.
- **Search:** unified search, filters, source grouping and result preview. Fast focus transitions and highlighted matches; preserve keyboard navigation.
- **Security Centre:** devices, sessions, permissions, security events and recovery. Calm but unmistakable risk hierarchy; confirmations and audit detail.
- **Control Room:** settings, system preferences, accessibility, appearance and environment status. Use immediate previews only for local reversible preferences; save state must be explicit.

### Other
- **Travel:** itinerary, places, bookings and route planning. Map/route motion only for real geospatial data and selected route; show timezone and local time.
- **Simulator:** scenario inputs, assumptions and model outputs. Distinguish simulated results from real-world data; use controlled step-through visualisation.
- **App Factory:** app specification, generated preview, tests, permissions, review, release and rollback. Show real build/test states and explicit approval gates.

The current registry and repository status are authoritative if app names, groupings or routes differ. Do not invent routes or claim planned applications are live.

## 6. Animation and interaction catalogue

Use a consistent, tokenised motion language. Suggested targets; adapt to existing motion tokens:
- Micro feedback: 90–150 ms; press compression, focus light, toggle confirmation.
- Tooltip/popover: 150–220 ms; opacity + small translation.
- Dialog/drawer/sheet: 220–360 ms; ease-out, focus-managed.
- Page/app transitions: 220–520 ms; shared spatial direction, never block navigation.
- Data reveal: 300–520 ms; short stagger only when it improves comprehension.
- Spatial 3D: pointer/touch/keyboard-driven; clamp perspective and disable on reduced motion.
- Ambient environment: very low amplitude, one global scene, pause when hidden/offscreen.
- REN: event-driven state animation only; idle breathing is subtle and non-urgent.

Allowed effects when they serve the task:
- Perspective tunnel and depth camera for entry/launch.
- Glass Fold ambient WebGL environment (one shared instance).
- Liquid glass/refraction on selected primary controls and floating surfaces.
- 3D coverflow for app launcher or small curated collections.
- Adjustable material controls for the workspace.
- Parallax depth for selected hero/overview surfaces, never for dense reading.
- Spring-like panel/overlay transitions using existing CSS primitives.
- Staggered list/chart reveals on initial entry or real data change.
- Timeline, progress, ring and chart transitions driven by actual saved data.
- Hover/focus edge light, pressed depth, selected-state rim and subtle surface sheen.
- Skeleton shimmer only during actual loading; stop immediately when loading ends.

Do not add continuous motion to every card. Do not animate large blur/shadow/layout every frame. Avoid simultaneous competing loops. Never make animation a prerequisite to use a control.

## 7. Design tokens, responsive and accessibility

- Existing NN palette is authoritative: midnight navy, deep/raised/elevated navy, soft white, silver and icy/accent blue from V3 tokens.
- Use semantic status colors only for status.
- Preserve existing typography, spacing, radius, elevation and theme tokens.
- Three glass tiers: atmospheric (launcher/REN), workspace (panels/navigation), reading (opaque, high-contrast tables/forms/text).
- WCAG 2.2 AA target; semantic HTML; keyboard access; visible focus; dialog focus trap and focus return; screen-reader status announcements.
- Touch targets minimum 44×44 CSS px; iPhone safe-area insets; no hover-only interactions.
- At 360px phone width, no horizontal page overflow. Adapt tables, charts and navigation for mobile.
- Support dark and existing light theme with independently measured contrast.
- Respect `prefers-reduced-motion` and NN's explicit reduced-motion setting. Reduced motion removes parallax and continuous loops but retains state feedback.
- WebGL/SVG filter failure must degrade to a stable non-WebGL/non-refraction surface.

## 8. Performance constraints

Target includes Intel MacBook Air, 8 GB RAM and iPhone. Use one global WebGL scene. Pause it when hidden/offscreen. Avoid large bundles and duplicate animation runtimes. Lazy-load heavy optional surfaces. Animate transform/opacity when possible. Never use React state updates at animation-frame frequency. Use refs/CSS for transient pointer motion. Test low-power mode and older Safari/WebKit behavior.

## 9. Data truth and state contract

Every data-backed screen must specify and implement:
1. Loading
2. Populated
3. Empty
4. Error + retry
5. Offline/stale + last sync
6. Permission/configuration required
7. Saving/submitting
8. Verified success
9. Destructive confirmation/recovery

Every live-looking visual must map to a real source/event. Sample content must be explicitly labelled in development. No fake chart values, notification dots, sync indicators, REN activity, audio waveform, progress or completion.

## 10. Required implementation workflow

For each task:
1. Inspect existing routes, files, reusable components, token usage and app contracts.
2. Write a short implementation plan and list exact files to change.
3. Implement on the feature branch, reusing existing components.
4. Update source docs and this master prompt if new reusable design rules emerge.
5. Add unit/component tests for behavior and accessibility.
6. Run repository typecheck, lint, unit tests and relevant e2e/build checks; report actual output.
7. Review desktop, tablet and phone; keyboard, touch, reduced motion, light/dark theme and WebGL fallback.
8. Commit focused changes to the feature branch with descriptive messages.
9. Report: implemented vs documented vs pending, exact commit SHA, tests actually run, preview status and known risks.

Do not stop after writing a design plan when the task asks to implement. Do not silently mark all 34 applications complete. Work in coherent increments and keep the pull request draft until the product is verified.

## 11. Definition of done

A product surface is done only when its information architecture, responsive layout, actual data contract, interactions, loading/empty/error/offline/permission states, accessibility, performance and tests are complete. A polished screenshot alone is not completion.

**Founder direction:** Apply this design language throughout the whole NN product wherever it adds clarity, hierarchy, feedback or spatial meaning. Use judgement: the same visual system must not mean the same animation on every screen. Keep the product coherent, premium, functional and truthful.
