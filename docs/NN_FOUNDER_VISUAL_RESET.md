# NN Founder Visual Reset — Iridescent Spatial Glass

**Status:** Approved visual direction from the founder's supplied reference image  
**Applies to:** Every NN route, application, overlay, launcher, dock, dashboard and REN surface  
**Implementation branch:** `design/nn-frontend-system`

## 1. The visual target

NN is a calm, premium, futuristic personal operating environment. The supplied image is the material and atmosphere reference:

- Deep midnight-blue foundation.
- Flowing luminous wave forms in cyan, aqua, electric blue, indigo and violet.
- Translucent, softly rounded glass with visible thickness, specular edges, internal reflections and depth.
- Floating 3D cards and icon tiles; layered surfaces should feel suspended, not like flat web cards.
- Soft bloom and refraction used selectively. No harsh neon, gaming HUD, crypto-terminal aesthetic, gold, generic dashboard grids or gratuitous decoration.
- Restrained typography and concise labels. Feature surfaces should be icon-led; use text only where it improves recognition or accessibility.
- Calm movement: slow wave drift, gentle float, responsive spring and subtle parallax. No constant distracting motion.

## 2. Brand assets

The current NNLogo component is a placeholder until the founder supplies the official NN mark. Do not redraw, approximate, or invent the official logo. Keep its component boundary so the approved asset can replace it globally.

REN's mark and all NN/REN identity assets must remain distinct, consistent and founder-approved. Never substitute a generic AI orb for the official REN logo once supplied.

## 3. Material system

Use one coherent material family:

1. **Atmosphere:** full-bleed room with fluid wave light; one shared WebGL GlassFold scene mounted once.
2. **Floating glass:** translucent cyan/blue/violet-tinted surfaces, rounded corners, bright upper specular, iridescent edge and soft depth shadow.
3. **Primary glass:** higher opacity for controls and selected cards; legible text and clear interaction states.
4. **Reading glass:** sufficiently opaque for forms, tables, long text and sensitive data.
5. **Icon tiles:** compact dimensional glass tiles with consistent icon stroke, optical centring and soft coloured internal light.

Do not give every element the same transparency. Maintain contrast and hierarchy.

## 4. Motion language

- Global GlassFold: one instance, low-power, pause when hidden/offscreen, reduced-motion still frame.
- Liquid Glass: primary actions and a small set of important controls; not every button.
- Perspective Tunnel: entrance/major transitions only.
- Coverflow: app launcher and small curated collections, never dense data lists.
- Adjustable Glass Dashboard: resizable/reorderable workspace only where the interaction is real.
- Floating card response: restrained pointer/touch tilt with keyboard alternative and reduced-motion fallback.
- Wave movement: slow, low-amplitude, non-distracting.
- Every loading, progress, REN and sync animation must represent actual application state.

## 5. Product-wide placement

- **Entry / hero:** cinematic perspective, wave environment, approved NN identity and a small number of clear entry actions.
- **Home:** spacious floating app surfaces, quick capture, meaningful day overview and REN presence; no cluttered dashboard grid.
- **Launcher:** icon-first glass coverflow and searchable complete app index.
- **Life:** timeline, tasks, reminders, calendar, notes and goals in consistent floating glass.
- **College / Academy:** learning surfaces use the same material but prioritise readable content, source documents and progress.
- **Finance / Invest:** restrained high-contrast data panels; never fake market data or trading-terminal styling.
- **Business / Projects / Career:** glass boards, timelines and decision surfaces.
- **Files / Memory / Analytics:** source-aware reading surfaces and clear provenance.
- **System / Security / Control:** calm technical glass with explicit status and confirmation.
- **REN:** official REN identity, event-driven state and a distinct but matching iridescent glass surface.

## 6. Non-negotiable quality rules

- Remove redundant labels, duplicate navigation, empty decorative panels and dead buttons.
- Do not show placeholder metrics as if live.
- No unsupported “online”, “secure”, “synced”, “thinking” or “listening” claims.
- Keep 44px touch targets, keyboard access, focus visibility and WCAG 2.2 AA contrast.
- Test 360px phone width, iPhone safe areas, desktop, reduced motion, WebGL fallback and low-power Intel Mac.
- No additional animation framework solely to copy a reference demo. Use the existing Next.js, React, TypeScript, CSS Modules and shader architecture.
- Do not merge or deploy production without founder approval.

## 7. Implementation order

1. Shared shell, background room, tokens, icon tiles and glass primitives.
2. Home and application launcher.
3. Life and core personal applications.
4. College and Academy.
5. Finance, Business, Projects and Career.
6. Files, Memory, Analytics and creative surfaces.
7. System, Security, Control and App Factory.
8. REN visual integration with Claude's real backend state contracts.
9. Cross-device, accessibility, performance and regression review.

A design is complete only when every route is implemented, functional, responsive and verified. A screenshot or preview is not proof of full completion.
