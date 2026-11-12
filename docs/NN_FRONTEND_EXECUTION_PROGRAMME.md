# NN — Complete Frontend Execution Programme

**Founder direction approved:** 2026-11-09  
**Owner:** ChatGPT — product design and frontend implementation  
**Branch:** `design/nn-frontend-system`  
**Release policy:** feature-branch work only; no production merge or deployment without separate founder approval.

This programme turns the approved NN experience into a complete, coherent, responsive product interface. It is an implementation programme, not a declaration that the listed features already exist.

## Product quality bar

NN must feel like one premium personal operating environment—not a collection of unrelated dashboards. Preserve the approved V3 brand geometry, typography, semantic colour system and iridescent spatial-glass direction. The environment should be dimensional and immersive while remaining calm, legible, fast and comfortable on iPhone.

Non-negotiable:
- One consistent interaction language across all applications.
- Real controls only: every visible action has a defined, working outcome.
- No fabricated data, fake system status, simulated AI, false sync or decorative progress.
- Five explicit screen states where applicable: content, loading, empty, error/offline and permission denied.
- Phone-first interaction with safe areas, 44px minimum targets, keyboard-safe forms and no unintended horizontal overflow.
- Desktop spatial workspace, tablet adaptive workspace and phone full-screen surfaces.
- Keyboard support, visible focus, screen-reader semantics and reduced-motion alternatives.
- Motion must communicate hierarchy, state or navigation. Expensive effects pause when hidden and have low-power fallbacks.
- Preserve authentication, security boundaries, data contracts and existing functionality. Frontend visibility is never authorisation.
- Do not claim a feature is verified until its behaviour and tests have been run.

## Latest founder design direction — 2026-11-10

This section supersedes any earlier shell/navigation guidance below where the two conflict.

- **Phone is the primary device.** Design and validate the iPhone experience first; desktop and tablet adapt from the same interaction model.
- **Home is an app launcher, not an analytics dashboard.** Show the application groups and their application cards. Do not add decorative metrics, activity feeds, quick-action strips, promotional panels or other widgets to Home.
- **Remove navigation clutter.** No persistent side rail, bottom dock, carousel arrows, previous/next chevrons or duplicate navigation bars. Every route must retain a simple, discoverable way to return to Home without introducing a row of controls.
- **Keep REN immediately accessible.** REN is the one persistent assistant entry point. Its surface, cards and icon treatment should follow the supplied REN visual reference.
- **Brand fidelity.** Use the supplied official NN monogram as the source of truth. Do not redraw, distort, recolour arbitrarily or substitute a generic AI mark.
- **Visual language.** One restrained premium spatial-glass system: thin, elegant translucent cards; layered optical depth; cool blue/cyan with restrained violet dispersion; soft reflections; precise icon wells; subtle floating motion. Avoid thick borders, heavy bevels, excessive glow, visual clutter and cyberpunk effects.
- **Touch-first operation.** Make the complete intended card surface tappable, use generous hit areas, simple gestures, clear pressed/selected feedback and no hover-only functionality. Keep controls easy to reach one-handed.
- **Smart behaviour must be real.** Build context-aware assistance, proactive reminders, routines and automation only when the underlying data, permissions, schedules and integrations exist. Display the source, freshness and confidence of important information. Never fabricate a device state, action, insight, AI execution or integration.
- **Approval and safety.** Any outbound communication, publishing, purchase, financial operation, destructive change, permission change or other consequential external action remains behind explicit founder approval and an audit record.
- **3D is a quality of presentation, not a false capability claim.** Use performant layered depth and motion. Do not claim spatial tracking, AR or WebXR unless those features are genuinely implemented and tested.

The Home launcher must remain visually simple even as the applications become more capable. Complexity belongs inside the relevant application, not on the dashboard.

## Repository facts at programme start

The route tree currently contains entry, sign-in, Home, Life, Workspace, offline and design-preview routes. Home's application index lists 34 planned surfaces and correctly labels all but Life as planned. The Workspace contains explicitly illustrative sample content. The current app registry is embedded in Home rather than shared as a typed product registry.

This means the first objective is not to cosmetically restyle 34 empty pages. It is to establish a reliable application architecture, then implement each application as a complete product surface with honest availability and real data contracts.

## Delivery sequence

### Stage 1 — Operating-system shell and application architecture
- Establish a typed, central application registry with stable IDs, groups, icons, descriptions, route targets, availability and navigation metadata.
- Build the persistent NN shell: top system bar, app navigation, workspace canvas, dock, app launcher, global search/command surface, notification surface, profile entry and REN presence.
- Make desktop, tablet and iPhone navigation distinct responsive compositions.
- Ensure unimplemented apps are discoverable but cannot masquerade as working routes.
- Consolidate duplicate navigation and remove dead or misleading controls.
- Acceptance: every navigation item resolves to a real route or a clearly explained unavailable state; keyboard, touch and browser-back navigation work.

### Stage 2 — Shared visual and interaction system
- Audit and consolidate the existing tokens and primitives rather than adding a competing framework.
- Establish documented recipes for atmosphere, floating glass, primary glass, reading glass, icon tiles, buttons, inputs, dialogs, menus, tabs, lists, empty states, charts and notifications.
- Standardise focus, hover, pressed, selected, disabled, busy, success and failure states.
- Implement a motion catalogue: route transitions, spring feedback, launcher transitions, card depth, sheet presentation, gesture response and progress animation.
- Add performance budgets and fallbacks for WebGL, backdrop filters, blur and parallax.
- Acceptance: components look and behave consistently in dark/light themes, at phone/tablet/desktop widths, and with reduced motion.

### Stage 3 — Home and global command experience
- Build a genuinely useful Home with real daily context, quick capture, pinned apps and recent activity.
- Only render context widgets when real data exists.
- Complete launcher search, favourites, recents, keyboard navigation and contextual actions.
- Complete command palette and global search states without pretending AI or connectors are configured.
- Acceptance: all actions have observable outcomes and no sample metrics are shown as real.

### Stage 4 — Life productivity suite
- Calendar, tasks, reminders, notes, habits, goals, routines, focus and reviews.
- Integrate cross-links and quick actions; preserve owner-scoped Firebase access.
- Support recurring events, date/time handling, editing, deletion, undo where appropriate, empty/loading/error/offline states and accessible forms.
- Acceptance: end-to-end data workflows are verified against the approved backend contracts.

### Stage 5 — Learning and college
- College, Academy, Formula Engine, Logic Lab and Learning Vault.
- Source-aware document and question-bank views, subject structures, study plans, practice, feedback, progress and mastery.
- Clearly distinguish uploaded/source material from generated explanations.
- Acceptance: no invented academic dates, marks, attendance or source content.

### Stage 6 — Work, business and career
- Projects, Business, Freelance, Career and Achievements.
- Boards, milestones, timelines, decision logs, deliverables, client workflows and evidence-backed progress.
- Acceptance: functional create/read/update/archive flows and clear permission/error states.

### Stage 7 — Personal finance and investing
- Finance and Invest, with high-contrast financial reading surfaces.
- Budgets, transactions, goals, assets, watchlists and research views only when the corresponding data source exists.
- No fake balances, market prices, returns or trading actions.
- Acceptance: all values show provenance and timestamp; sensitive actions require confirmation.

### Stage 8 — Creation, communication and knowledge
- Creator Studio, Studio, Mail, English, Files, Memory, Life Archive, Analytics, Travel and Simulator.
- Build appropriate domain-specific workspaces instead of forcing every app into one generic dashboard.
- Acceptance: each module has its own useful workflows, clear source/provenance and complete empty/error states.

### Stage 9 — System, security and control
- Command Centre, Search, Automation Studio, Security Centre, Control Room and REN surfaces.
- Status indicators must reflect actual backend state; approval gates must be explicit.
- REN remains transparent about provider configuration, permissions, plans, tool execution and verified outcomes.
- Acceptance: no simulated automation, AI response, sync, notification delivery or security status.

### Stage 10 — Quality, accessibility and release readiness
- Typecheck, lint, unit/integration tests, browser E2E, route audit and regression checks.
- Review 360px and 390px phones, iPhone safe areas, tablet, desktop, keyboard-only, screen reader basics, light/dark, reduced motion, offline and WebGL fallback.
- Measure startup, navigation, interaction latency, layout shifts and animation cost.
- Fix critical/high issues before requesting founder release approval.
- Acceptance: a written evidence report lists exact commits, test commands/results, known limitations and deployment status.

## Implementation rules

1. Work in focused commits on `design/nn-frontend-system`.
2. Read the relevant app registry, data model and backend contract before implementing each connected module.
3. Do not modify Claude-owned backend services or Firebase security contracts from the frontend lane.
4. Do not add animation libraries or heavyweight 3D dependencies unless a measured requirement justifies them.
5. Do not use production data for visual fixtures; label any development fixture explicitly.
6. Update the project status and collaboration handoff after each meaningful milestone.
7. Stop at a release boundary and report evidence. Production merge/deployment requires separate approval.

## First execution milestone

Begin with a route/component inventory and a central typed application registry. Use it to make the Home launcher, dock and navigation share one source of truth. Then build the persistent responsive shell before expanding individual app surfaces. This prevents 34 applications from becoming 34 inconsistent mini-products.
