# NN — Final Frontend Design Specification

**Authority:** Founder-approved visual direction, based on the supplied iridescent glass reference.  
**Scope:** All NN product surfaces, 34 registered applications, shared OS shell, REN surfaces, onboarding, authentication, responsive states and motion.  
**Feature registry:** `docs/NN_APP_REGISTRY.md` remains authoritative for application scope, data contracts and permissions. This document defines presentation and interaction, not replacement product requirements.

---

## 1. Product experience

NN should feel like a private spatial computing environment: calm, luminous, precise, personal and premium. It is not a conventional SaaS dashboard, a cyberpunk HUD, a gaming interface or a page full of generic glass cards.

The user should feel they are entering one coherent environment. Navigation, app surfaces, search, dialogs, REN, settings and mobile layouts must share the same visual physics and materials.

### Visual hierarchy
1. **Environment:** midnight-blue spatial room, one global Glass Fold scene, fluid cyan-to-violet light waves.
2. **Identity:** official NN mark and restrained wordmark. Never approximate the official mark.
3. **Navigation:** minimal floating dock, icon-led app launcher, contextual app header.
4. **Work surface:** large floating glass panes with clear depth and one primary focal point.
5. **Controls:** tactile liquid-glass buttons, compact icon controls and legible form surfaces.
6. **Information:** clean high-contrast typography; charts and records remain readable and never become decorative noise.

## 2. Colour and material specification

### Core palette
- Abyss: `#080D24`
- Deep room: `#101A3A`
- Mid room: `#19264D`
- Raised room: `#253565`
- Cyan light: `#42D6FF`
- Aqua light: `#72E8F2`
- Electric blue: `#4D9DFF`
- Periwinkle: `#7A9CFF`
- Indigo: `#625FE8`
- Violet: `#B18CFF`
- Primary text: cool near-white
- Secondary text: cool silver with accessible contrast

Colour is atmospheric, not arbitrary. Each application may use a restrained semantic accent, but the global environment remains cyan/blue/indigo/violet.

### Glass tiers
- **G0 / atmosphere:** full-screen WebGL room and CSS fallback waves; no text.
- **G1 / floating:** translucent 10–22% cool-tinted fill, subtle blur, iridescent border, soft ambient shadow.
- **G2 / elevated:** 18–32% fill, stronger edge highlight, layered depth for selected panels.
- **G3 / reading:** opaque enough for forms, tables, long text and data entry.
- **G4 / focus:** active dialog, command palette or selected control with crisp border and clear focus ring.

Glass is not a blanket filter. Preserve readability and avoid nested blur layers that degrade Intel Mac performance.

### Card geometry
- Main hero / large canvas: 28–36px radius.
- App panes: 22–28px radius.
- Feature tiles: 16–22px radius.
- Icon tiles: 13–18px radius.
- Controls: 12–16px radius.
- Edges use a subtle top specular highlight and restrained cyan/blue/violet rim. Shadows are soft and deep, never black hard outlines.

## 3. Shared OS shell — every authenticated route

### Desktop
- Full-bleed spatial room.
- Minimal top identity strip: NN mark, current app identity, global search/command, system state only when real, profile menu.
- Floating application dock, not a permanent sidebar.
- App canvas centered with generous negative space and a maximum readable width.
- REN entry point floats independently and never covers primary controls.
- App windows use a shared header, icon, title, breadcrumb/context, actions and pane body.
- Multi-window mode only when focus, z-order, resizing, snapping and keyboard operation are implemented.

### Tablet
- Dock becomes compact and can expand into the app launcher.
- Panes reflow into two columns where content supports it.
- Floating controls stay within safe touch areas.

### Phone
- Safe-area-aware compact top bar.
- Bottom floating dock with a small number of destinations plus launcher.
- Full-screen app panes; no miniature desktop windows.
- Sheets replace desktop popovers where appropriate.
- Touch targets minimum 44×44 CSS px.
- No horizontal overflow; keyboard does not obscure active fields.

### Global interaction
- `⌘/Ctrl + K`: command/search palette.
- `Escape`: close topmost dialog/palette.
- Tab order follows visual hierarchy.
- Visible focus ring uses the same luminous glass language.
- Every action has hover, focus, pressed, disabled, loading, success and error states where relevant.
- No dead buttons or fake toggles.

## 4. Shared motion system

| Motion | Duration | Use |
|---|---:|---|
| Micro press | 120–180ms | icon buttons, controls |
| Surface hover | 180–260ms | floating glass tiles |
| Pane entrance | 420–620ms | app navigation |
| Modal entrance | 220–320ms | dialogs and command palette |
| Hero reveal | 800–1200ms | entry / first session |
| Ambient wave | 18–36s loop | global environment, low amplitude |
| REN idle | state-driven | only when actual REN service state is known |

Use existing components: GlassFold, LiquidButton, Coverflow, Perspective Tunnel and Adjustable Glass Dashboard. Their placement must follow the component source index. Do not create duplicate animation frameworks or mount multiple WebGL rooms.

Reduced motion removes spatial translation, parallax and ambient loops; keep simple opacity transitions and fully functional static surfaces. Pause expensive animation when hidden or offscreen.

## 5. The five supplied animation systems — exact placement

1. **Glass Fold:** one global environment mounted once in the root layout. It supplies the slow flowing wave field and atmospheric light.
2. **Liquid Glass Button:** primary actions, selected dock actions, command palette action and high-value confirmations. Secondary actions remain quieter.
3. **Coverflow Carousel:** app launcher, pinned applications, featured projects, learning paths and media collections. Never use it for dense tables or long records.
4. **Perspective Tunnel Hero:** intro / sign-in entry and a limited number of major section transitions. Do not replay a giant entrance on every route.
5. **Adjustable Glass Dashboard:** Home and selected configurable workspaces such as Command Centre and Analytics. Drag/reorder/resize affordances appear only when the corresponding interaction works.

## 6. NN Home — final composition

- Small identity header and global command entry.
- One cinematic hero with fluid cyan-blue-violet light wave and official NN identity.
- Greeting / concise contextual statement, not marketing copy.
- Primary action: open launcher / command.
- Spatial orbit or layered icon cluster used sparingly; it must not compete with the hero.
- Six application-domain glass tiles: Life & wellbeing, Education, Money & work, Creation & communication, Knowledge & insight, System.
- Each tile is icon-led; labels are short; descriptions appear on focus/hover or in launcher, not repeated everywhere.
- A compact Today strip appears only when real calendar/task data is available.
- REN presence is a true service state; never show connected/online/thinking when untrue.
- No fake KPIs, fake activity feed, filler widgets or redundant cards.

## 7. Launcher and navigation

- Search-first, icon-first floating glass surface.
- 34 applications grouped exactly as in `NN_APP_REGISTRY.md`.
- Coverflow for pinned/recent apps; grid/list for complete index.
- Keyboard navigation, category filters, recent and pinned sections.
- App availability labels distinguish implemented, in development and unavailable integrations. No route should pretend to be live if it is a placeholder.
- App Factory is a system capability, not a 35th ordinary app.

## 8. Application-by-application visual composition

Every app uses the same OS shell and material family, but its work surface is purpose-designed. These are the approved page compositions:

### Group A — Life and wellbeing
1. **NN Life:** spacious Today timeline as the hero surface; date rail/calendar view; task stack; reminder queue; notes and goals as secondary panes. Tabs for Today, Calendar, Tasks, Reminders, Notes, Habits, Goals, Routines and Reviews. Use real calendar density and readable timelines, not decorative widgets.
2. **NN Soul:** quiet reflection canvas; daily practice ring; scripture/study reading pane; gratitude and journal cards. Avoid religious iconography not chosen by the owner. Respect the owner's own faith preferences.
3. **NN Mind:** focus canvas with one active exercise; reflection timeline; decision journal; skill/practice progress. Calm, low-stimulation layout.
4. **NN Body:** training plan as a session card; weekly activity timeline; recovery/sleep and nutrition panels. Use clear units and never imply medical diagnosis.
5. **NN Contacts:** people search and compact contact cards; selected person opens a rich profile pane with dates, notes and follow-ups. Contact actions require permission.
6. **NN Nature & Universe:** immersive discovery canvas; celestial/earth topic cards; evidence-led article reader with source rail; observation timeline. Scientific imagery is restrained and sourced.
7. **NN Peace Mode:** full-screen quiet scene; one central timer/breathing interaction; minimal controls and explicit exit. Notifications are suppressed only according to the actual settings.

### Group B — Education and intelligence
8. **NN College:** semester rail; subject cards; current unit and exam focus; question-bank reader; assignment/timetable panels. Study mode prioritises the user's uploaded syllabus and question banks.
9. **NN Academy:** learning-path coverflow; current lesson canvas; code/practice workspace; mastery and revision rail. Lesson content remains readable, not over-glassed.
10. **NN Formula Engine:** topic navigation; equation canvas; variable/units panel; step-by-step derivation; graph surface and calculation history. Distinguish symbolic result from numerical approximation.
11. **NN Logic Lab:** challenge selection carousel; focused challenge stage; answer/input surface; timer only when timed; post-attempt explanation and performance review.
12. **NN Learning Vault:** library shelves and search; source/document reader; annotations, flashcards and spaced-repetition queue. Distinct from general Files.

### Group C — Money and work
13. **NN Finance:** account/balance overview only from actual records; cashflow timeline; budgets; transactions table; goals and bills. No fake numbers, no stock-terminal styling.
14. **NN Invest:** research-first company/ETF/fund pages; watchlist; portfolio allocation and history; source/date badges for market data. Distinguish live, delayed and historical information.
15. **NN Business:** venture switcher; opportunity/validation canvas; experiment board; customer evidence; financial model; decision log. Each metric includes its source or assumption label.
16. **NN Freelance:** client pipeline; proposal editor; delivery board; invoice register. External messages and sending require confirmation.
17. **NN Career:** career roadmap; skill matrix; portfolio/projects; application tracker; interview practice workspace. No guaranteed outcomes.
18. **NN Projects:** project cover/identity; milestone timeline; task board; dependencies; decision and activity history. Drag-and-drop only when persistence works.
19. **NN Achievements:** evidence-first timeline; certificate/achievement cards; verification attachments; exportable portfolio view. Never invent credentials.

### Group D — Creation and communication
20. **NN Creator Studio:** creative project canvas; asset strip; storyboard/content calendar; camera/lighting reference panels; media preview. No fake editor controls.
21. **NN Studio:** focused writing canvas; contextual formatting rail; document outline; drafts and publishing queue. Publishing actions require explicit destination and confirmation.
22. **NN Mail:** three-pane desktop mail layout; mobile inbox/thread full-screen; account switcher; message reader; draft composer. Sending, forwarding and deleting require confirmation.
23. **NN English:** daily practice card; skill selector; listening/speaking/writing exercise pane; vocabulary/revision rail; assessment history. Audio controls must reflect actual audio state.

### Group E — Knowledge, record and insight
24. **NN Files:** folder navigation; file grid/list; preview pane; metadata and version history; Media view for photos/video/audio. Upload progress and OCR states must be real.
25. **NN Memory:** source-aware memory timeline; confidence/source metadata; review and correction queue; retention and export controls. Clearly distinguish stated, inferred and system-derived facts.
26. **NN Life Archive:** chronological life timeline; milestone cards; media/document attachments; filters by year, project and category. Owner-controlled.
27. **NN Analytics:** configurable insight canvas; charts tied to real data; date range and source selectors; missing-data disclosure. Dashboard rearrangement only when saved.
28. **NN Travel:** trip cover card; itinerary timeline; map; booking/document wallet; packing and reminders. Booking status must come from verified sources.
29. **NN Simulator:** scenario selector; adjustable variables; simulation canvas/visualisation; assumptions and output panel. Persistent simulation label and no confusion with real-world measurement.

### Group F — System surfaces
30. **NN Command Centre:** single command field; contextual suggestions; recent commands; action preview; confirmation gate. Never execute a consequential action before showing what will happen.
31. **NN Search:** search field; grouped results with app/source labels; filters; preview pane; keyboard navigation. Permission-aware and source-attributed.
32. **NN Automation Studio:** workflow canvas; trigger/condition/action nodes; test run; approval gate; run history and pause/resume controls. Show-before-enable.
33. **NN Security Centre:** security posture summary from real checks; passkeys/devices/sessions; permissions; audit history; recovery controls. Sensitive changes require re-authentication.
34. **NN Control Room:** operational status grid; integrations/jobs/provider health; storage and cost panels; errors and release history. Every status must come from actual telemetry, otherwise label unavailable.

### NN App Factory — system capability
A sandboxed application builder with manifest, declared permissions, preview, static analysis, tests, versioning and rollback. Generated apps must not execute in the main application process. Install requires founder approval.

## 9. REN visual system

- REN has a distinct official mark, not an invented orb or the NN mark.
- REN surfaces share the iridescent glass material but use a clear focal command panel.
- Persistent launcher remains compact; expanded panel has conversation, context/source rail, active task and tool/action preview.
- Service states: unavailable, idle, processing, awaiting approval, completed, failed. Render only states delivered by the backend.
- Tool execution shows the exact action, target and permission before approval.
- No fake waveform, listening animation, thought indicator, confidence percentage or progress bar.

## 10. Required states for every application

- First-use / empty state with a single useful next action.
- Loading skeleton with stable layout; no fake percentage.
- Content state with real records and provenance where applicable.
- Error state with retry and diagnostic detail appropriate to the user.
- Offline / stale state when the data layer exposes it.
- Permission-denied state explaining the required permission.
- Destructive-action confirmation and undo where supported.
- Search-no-results and filtered-no-results.
- Mobile keyboard-open and safe-area state.
- Reduced-motion and WebGL-unavailable fallback.

## 11. Brand assets

Official NN and REN logo assets are not yet in the repository. Keep the existing logo component boundary, but do not redraw, approximate or substitute official marks. When supplied, store source SVG/PNG plus optimised variants and apply them through the shared brand components. The supplied reference image defines glass/material and colour, not the logo.

## 12. Definition of done

A page is complete only when:
- The actual route exists and uses the shared shell.
- Its primary interactions work against the agreed data/service contract.
- Loading, empty, error, offline and permission states exist.
- It has a unique information architecture matching its purpose.
- Desktop, tablet and phone layouts are tested.
- Keyboard, screen reader labels, contrast and reduced motion are checked.
- It does not fabricate data or service status.
- Build, lint, typecheck and relevant tests pass.
- Visual review is completed on the deployed preview.

A successful Next.js build proves compilation, not complete product functionality or visual quality. The PR stays draft until all acceptance checks pass.
