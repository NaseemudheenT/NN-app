# NN Cinematic Visual & Motion System

**Status:** Visual direction locked for implementation; runtime rollout is incremental.  
**Owner:** NN founder  
**Reference source:** Founder-supplied component reference containing Liquid Glass Button, Glass Fold, Coverflow Carousel, Perspective Tunnel Hero and Adjustable Glass Dashboard.  
**Implementation branch:** `design/nn-frontend-system`

This document is the persistent product-level visual brief for NN. It translates the supplied references into NN's existing architecture. It is not permission to replace NN's design tokens, authentication, data boundaries or app structure with a generic component-library starter.

## 1. Product character

NN must feel like a private, high-end personal operating environment: spatial, cinematic, precise, calm and unmistakably its own.

The intended feeling is **quiet futuristic computing**:
- Deep midnight surfaces with icy-blue light, controlled highlights and real visual depth.
- Glass that has thickness, refraction and hierarchy—not blur applied indiscriminately.
- 3D motion that communicates spatial relationships and state.
- Interface elements that feel tactile, deliberate and immediate.
- Dense work screens that remain readable and practical.

Do not turn NN into a neon cyberpunk dashboard, gaming HUD, generic AI chatbot, crypto terminal or a grid of marketing cards. Do not introduce gold, purple neon, arbitrary accent colours, random stock photography or unrelated icon families.

## 2. Existing NN visual foundation — preserve it

The repository already has a custom TypeScript + Next.js + CSS Modules visual system. It is not a shadcn/Tailwind starter. The supplied component examples are references to adapt, not a requirement to install a second UI architecture.

| Supplied reference | Existing NN implementation | Integration rule |
|---|---|---|
| Perspective Tunnel Hero | `NNIntro` + `NNIntro.module.css` | Keep the 3D corridor as NN's signature entrance. Expand its app constellation as the product grows. |
| Glass Fold WebGL shader | `GlassFold` + global `Room` | One persistent low-power environment behind the whole app. Never mount a duplicate shader per page. |
| Liquid Glass Button | `LiquidButton` + `LiquidGlassDefs` | Use the shared NN control for primary actions, links and icon actions. One shared SVG filter only. |
| Coverflow Carousel | `Coverflow` | Use for app launch, featured work and spatial collections where depth adds meaning. Do not force it onto dense tables or forms. |
| Adjustable Glass Dashboard | `NNWorkspace` + workspace CSS | Preserve the live material controls and apply the same layered-glass rules to future dashboard widgets. Never copy sample finance values into real user data. |
| Animated AI identity | `RenMark`, `RenLauncher`, `RenPanel`, REN state model | REN keeps the NN mark visible; animation must reflect actual state, not pretend to listen, think or execute. |

The V3 token file remains the source of truth: midnight navy, deep/raised/elevated navy, soft white, silver, icy blue and accent blue. Existing theme support, semantic states, radii, spacing, glass tiers and motion tokens remain authoritative.

## 3. Global visual architecture

### 3.1 Environment layer

- The global `Room` remains mounted once at the application root.
- Its WebGL shader uses the existing NN palette and low-power GPU preference.
- Keep the environment subtle behind reading surfaces; opaque panels protect text contrast.
- Pause rendering when the document is hidden or the environment is off-screen.
- Provide a non-WebGL fallback and respect `prefers-reduced-motion`.
- Do not add another canvas, Three.js scene or full-screen shader to individual app routes without a measured need.

### 3.2 Glass material hierarchy

Use glass according to information density:

1. **Atmospheric glass:** launch surfaces, floating launcher cards and REN presence.
2. **Workspace glass:** navigation rails, dashboard panels, command surfaces and contextual panels.
3. **Reading glass:** opaque/high-contrast panels for tables, long text, forms, settings and financial data.

Glass must retain visible edges, restrained highlights and layered shadows. Blur is not a substitute for contrast. Avoid glass over glass over glass when the underlying text becomes difficult to read.

### 3.3 Controls and iconography

- Use `LiquidButton` for primary glass actions; use restrained variants for destructive and secondary actions.
- Keep the existing NN icon family consistent in stroke, grid and optical weight.
- Every icon-only control requires an accessible name and a visible focus state.
- Buttons must have real actions, disabled states, loading states and success/error feedback where applicable.
- Do not use the supplied MetalButton gold/bronze variants; they conflict with NN's palette.

### 3.4 Spatial cards and collections

- Use `Coverflow` for the app constellation, pinned tools, recent projects or featured learning paths.
- Support pointer drag, touch, keyboard arrows, reduced motion and a clear selected item.
- Use a conventional list/grid for large datasets, searchable content and repetitive management.
- A 3D effect must never hide labels, truncate essential content or prevent touch scrolling.

## 4. Page-by-page visual application

Every page shares the global room, NN typography, tokenised spacing, navigation, focus treatment and REN presence. Page-specific effects must remain subordinate to the task.

| NN area | Visual treatment | Motion and interaction |
|---|---|---|
| Launch / entry | Signature perspective tunnel; app cards in a golden-angle constellation; restrained center light | Scroll, wheel, swipe and keyboard travel; camera parallax; entrance action appears only at the end |
| Sign-in / identity | Quiet opaque glass panel over the room; NN mark and passkey-first hierarchy | Short panel entrance; passkey pending/success/error states; no fake scanning or progress |
| Home | Adjustable glass widget canvas; spatial app launcher; clear daily focus hierarchy | Widget reorder/resize only when implemented; chart reveal on entry; real-time freshness states |
| Calendar | Dense glass calendar surface with clear day/week/month structure | Drag/reschedule feedback, event expansion and conflict transitions |
| Tasks / reminders | Fast list and board surfaces; priority and status are semantic | Check completion, reorder, snooze and bulk action feedback |
| Notes / files / memory | Reading-first panes with clear provenance and metadata | Preview transitions, save state, version history and search highlighting |
| Habits / goals / routines / focus | Progress surfaces, milestone rings and restrained timelines | Progress changes only after a confirmed update; focus timer reflects real elapsed time |
| College / Academy | Study workspace, source panels, question-bank and lesson cards | Quiz feedback, lesson progression and source-document transitions |
| Projects / Business | Project overview, timeline, decision log and operational tables | Milestone/status transitions and drill-downs; no decorative activity feed |
| Analytics / Finance | High-contrast data panels, restrained chart animation and explicit units | Animate only on data change; show source, date range and last refresh |
| REN | Persistent NN mark, state-specific aura/rings/particles, clear task/approval timeline | Idle, awakening, listening, thinking, speaking and complete states tied to actual system events |
| Security / Control / Automations / Connectors | Precise technical panels and clear trust boundaries | Confirmation, permission, connection and audit-state transitions |
| Backup / Restore / App Factory | Step-based operational surfaces with explicit risk and progress | Progress only from actual operation events; destructive steps require confirmation |

## 5. Motion language

Motion must feel physically coherent and fast. It communicates hierarchy, causality and state.

| Interaction | Target duration | Behaviour |
|---|---:|---|
| Hover / focus | 90–150 ms | Subtle light, border and elevation response |
| Button press | 90–150 ms | Small compression and return |
| Popover / tooltip | 150–220 ms | Short opacity + 4–8px translation |
| Panel / sheet | 220–360 ms | Ease-out with restrained depth |
| Page/app transition | 220–520 ms | Shared spatial direction; avoid long blocking transitions |
| Chart/data reveal | 300–520 ms | Staggered only when it helps reading |
| REN idle | Continuous, very low amplitude | Slow breath; no urgent pulse |
| REN active | Event-driven | Listening reflects microphone input; thinking only while a request is in flight |
| 3D intro | User-driven | Scroll/swipe/keyboard controls the corridor; do not trap page scrolling |

Rules:
- Use the existing motion tokens and easing curves; do not scatter arbitrary durations.
- Animate transform and opacity where possible. Avoid animating large blur radii, layout dimensions or box shadows every frame.
- No React state updates at animation-frame frequency. Use refs and direct transform updates for transient frame values.
- Stop loops on hidden tabs, off-screen sections and unmounted components.
- All effects must have a reduced-motion equivalent. Reduced motion removes parallax, continuous loops and long travel, while retaining clear state changes.
- Do not invent activity, live metrics, audio levels, AI thinking or progress animations.

## 6. Performance and device policy

The target hardware includes an Intel MacBook Air with 8 GB RAM and iPhone-class mobile devices.

- Keep one global WebGL environment; request low-power rendering.
- Prefer CSS 3D transforms and the existing lightweight motion utilities.
- Load any genuinely heavy optional visual module lazily and only when its surface is opened.
- Avoid introducing Framer Motion, GSAP, Three.js or a new component library just to duplicate existing NN primitives. Add a dependency only after a concrete gap and bundle/performance review.
- Limit simultaneous animated surfaces. The background should not compete with the active page.
- Use responsive card sizing, safe-area insets and 44px minimum touch targets.
- Test narrow phones, tablet, laptop and wide desktop.
- Respect browser capability differences; degrade gracefully when SVG filter refraction or WebGL is unavailable.

## 7. Content and authenticity

- Replace reference-demo copy, demo people, music metadata, stock images and sample financial values with NN-specific language and genuine NN data contracts.
- The NN visual identity should use the NN logo and icon family, not unrelated demo artwork.
- Illustrative content must be clearly labelled. Never present placeholder balances, marks, attendance, goals, alerts or activity as real.
- An animation that implies an action has started, succeeded or is live must be driven by a real event and state.
- REN's visual states are not proof that REN's reasoning, memory, tools or integrations are active.

## 8. Implementation order and acceptance

1. **Visual foundation audit:** preserve current tokens and existing components; verify every route uses the shared root environment and REN shell.
2. **Signature entry:** complete the corridor constellation and ensure the reduced-motion and touch paths are correct.
3. **Shared app shell:** consistent system bar, navigation, app switcher, command surface, content frame and responsive behaviour.
4. **Dashboard:** make the glass workspace a real data-driven widget canvas; keep sample data labelled until persistence exists.
5. **App surfaces:** apply shared panels, controls, transitions and states across Life, Learning, Work, Personal and System.
6. **REN and system tools:** connect visual states to real execution, permissions, approvals and audit events.
7. **Quality:** typecheck, lint, unit tests, browser checks, reduced-motion checks, keyboard/touch checks and visual review at all breakpoints.

A screen is not complete because it looks finished. It is complete only when its controls work, data is truthful, loading/empty/error/offline/permission states exist, responsive behaviour is verified and tests pass.

## 9. Founder direction

This is the standing visual direction for NN: **the supplied cinematic 3D, glass-fold, liquid-glass, coverflow and adjustable-glass visual language is the product's design reference across the whole NN environment.** Adapt all wording, icons, data, states and interactions to NN. Preserve the existing brand system. Build carefully, page by page, and never trade reliability or legibility for visual spectacle.
