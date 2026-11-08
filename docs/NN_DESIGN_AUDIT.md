# NN — Design Audit

**Date:** 2026-11-08 · **Method:** direct inspection of the repository, plus a
`ui-ux-pro-max` design-system query. Every number below was measured, not
estimated.

---

## 0. Sources I could and could not review

| Source | Access |
|---|---|
| This conversation, in full — all four specification parts, every correction and approval | ✅ complete |
| The NN repository: code, docs, assets, git history | ✅ complete |
| `ui-ux-pro-max` skill and its dataset | ✅ used, results below |
| **ChatGPT conversations** | ❌ **no access.** Outside this environment entirely |
| **Your other Claude accounts** (the temporary office account) | ❌ **no access.** Conversations and connectors do not cross accounts |
| Any deleted conversation | ❌ gone |

Everything in this audit comes from the two sources I actually have. Where a
requirement exists only in a conversation I cannot read, it is invisible to me
— if something important is missing, it is likely to be from there.

---

## 1. What the skill independently concluded

Queried with NN's product profile, `ui-ux-pro-max` returned:

- **Style: Spatial UI (VisionOS)** — "Glass, depth, immersion, spatial,
  translucent". Best for "futuristic dashboards". This matches the direction
  you specified, arrived at independently.
- **Typeface: Inter** — already in use.
- **Performance: cost moderate, drivers `animation, blur`.** Blur is the
  expensive thing, not glass itself. This shapes the whole implementation.
- **Accessibility: risk `conditional`** — acceptable only with
  `contrast-text-4.5`, `keyboard`, `visible-focus`, `reduced-motion`. NN
  already enforces all four, three of them by test.
- **Anti-patterns: "2D design", "no spatial depth".** The failure mode for
  this style is flatness, not excess.

Its suggested palette (glass-white, system blue) was **rejected** — NN's
approved palette is a founder decision and overrides a dataset default.

---

## 2. What exists today

### Measured

| | |
|---|---|
| Design tokens | **130**, across 20 categories |
| UI components | **15** |
| NN composites | **1** (`HoloShowcase`) |
| Routes | **4** — `/`, `/sign-in`, `/workspace`, `/design` |
| Raw hex outside `tokens.css` | **12 occurrences** |
| Tests covering design | 53 web + 15 token/contrast |

### Component inventory

`NNLogo` · `NNGlassMark` · `Icon` · `GlassPanel` · `HoloPanel` · `HoloStage` ·
`Button` · `TextField` · `Switch` · `Dialog` · `AppTile` · `Dock` ·
`FloatingWindow` · `OrinWave` · `OrinCommand`

### What is genuinely good

- **Tokens are real and enforced.** Light theme has its own measured text ramp
  rather than being an inversion, and WCAG AA is asserted by test for all
  eight text/ground pairs in both themes.
- **Reduced motion is handled correctly** — durations collapse to 1 ms rather
  than being removed, so `transitionend` listeners never stall. This is a
  subtlety most systems get wrong.
- **Graded glass.** Three tiers, with denser information on more opaque
  surfaces. This is the single rule that keeps glassmorphism readable.
- **Real depth exists.** `HoloStage`/`HoloPanel` implement genuine Z-axis
  parallax driven by CSS variables, so pointer movement causes no React
  re-render.
- **The brand is test-guarded.** `NN_MARK_PATH` is declared once and a test
  fails if it changes.

---

## 3. What is wrong

### 3.1 The system covers one screen type

The 15 components support a sign-in page and a documentation page. They do not
support an operating environment. **19 required components do not exist:**

> Menu · Tooltip · Toast · Notification · Chart · DataTable · Tabs · Select ·
> Checkbox · Radio · Slider · Avatar · Badge · Skeleton · Breadcrumb · Popover ·
> ContextMenu · CommandPalette · Launcher

Without Menu, ContextMenu and Popover there is no way to build the app-tile
context menu the specification requires. Without Chart and DataTable, NN
Analytics, NN Finance and NN Invest cannot be designed at all.

### 3.2 There is no information-density strategy

Every current surface is sparse. NN College must show a timetable, marks and a
question bank simultaneously; NN Finance must show transactions. **Nothing in
the system yet says how dense information behaves on glass.** This is the
single biggest gap, and it is a design problem, not a component problem.

### 3.3 Depth is decorative, not structural

`HoloStage` exists but is used in exactly one place, as a hero. Depth is
currently an effect applied to a showcase rather than the organising principle
of the interface. The skill's named anti-pattern — "no spatial depth" — applies
to every screen except the hero.

### 3.4 No environmental or contextual behaviour

Your smart-home reference implies the environment *responds*: lighting shifts,
surfaces appear when needed, the system reflects context. Today the background
is a static gradient. Nothing changes with time of day, focus, activity or
system state.

### 3.5 Twelve raw hex values outside the tokens

Most are legitimate — the palette swatches on `/design` must show literal hex,
and `theme-color` meta tags cannot take a CSS variable. **Two are real
violations**: the device-chrome colours in `design.module.css`
(`#2A3444`, `#0B1118`).

### 3.6 `/design` is a documentation page, not a product surface

It is a useful development tool and should remain one. It is **not** evidence
that NN looks good, and it must never ship as part of the product.

### 3.7 Naming drift — "NN"

I introduced "NN" as a label in `CLAUDE.md`, `EXPERIENCE_SPEC.md` and
commit messages. **The product is NN.** 3008 is the design ambition. Corrected
across the documentation.

---

## 4. Honest scoring

| Area | State | Note |
|---|---|---|
| Tokens | **Strong** | real, enforced, themed, accessible |
| Accessibility foundation | **Strong** | AA by test, reduced motion done properly |
| Glass material | **Good** | graded tiers; blur budget not yet governed |
| Brand | **Good** | locked and test-guarded |
| Depth | **Partial** | exists, used once, not structural |
| Component coverage | **Weak** | 15 of ~34 needed |
| Density strategy | **Absent** | the critical gap |
| Environmental response | **Absent** | the gap between "glass UI" and "3008" |
| Data visualisation | **Absent** | blocks four applications |
| Product surfaces | **Absent** | no application has been designed |

**Design completion: roughly 20%** — a solid foundation under almost no
product.
