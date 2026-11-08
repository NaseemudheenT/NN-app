# NN Design System

**Status:** `VERIFIED` — built, typechecked, linted and tested.
Review it live at `/design`, or `/design#controls` for one section.

## Principle

Tokens are the only source of truth. No component hardcodes a colour, a size,
a radius or a duration that exists as a token. Retheming NN — which REN must
be able to do on request in a later phase — therefore means changing values in
one file, not touching components.

## Tokens — `src/styles/tokens.css`

Colour, glass, borders, status, shadow, spacing (4px base), radii, the type
scale, motion and z-index layers. Dark is the default; light is a sibling
definition, not an inversion.

### Why light is not an inversion

`#A6B3C5` on `#07111F` is 8.8:1 — comfortable. The same grey on `#F7F9FC` is
3.5:1, which fails WCAG AA. The light theme therefore defines its own ramp
(`#4C5A6E`, `#64728A`, `#2F6FBD`). Both ramps are asserted by test.

### Theme resolution

```
:root                       dark (default)
[data-theme="light"]        light, chosen
[data-theme="dark"]         dark, chosen
prefers-color-scheme        followed only when no choice has been made
```

A small inline script in `<head>` applies the stored choice before first paint,
so a light-theme founder never sees a dark flash.

### Motion

Reduced motion **collapses every duration token to 1ms** rather than removing
transitions. This matters: removing a transition means `transitionend` never
fires, which silently stalls any state machine waiting on it. Collapsing keeps
every code path identical. Honoured from the OS and from an in-app override.

## The glass material

Three graded tiers. **Transparency is graded, never uniform** — this is the one
rule that stops glassmorphism becoming unreadable.

| Tier | Use | Character |
|---|---|---|
| 1 | chrome, large surfaces | most transparent, lightest blur |
| 2 | content cards | mid opacity, comfortable for body text |
| 3 | dialogs, windows | nearly opaque — dense text never fights the ground |

### The holographic surface — `src/styles/holo.css`

`.nn-holo` adds a prismatic chamfer and a specular top line to any element.
The rim is a conic gradient painted **only inside a 1px border band** via a
mask, so the edge refracts like real glass rather than the whole surface
glowing. Applied to app tiles, the dock, dialogs and tier-3 panels.

### Depth — `HoloStage` and `HoloPanel`

A real 3D scene, not a tilt. Panels sit at genuine Z depths, so parallax is
proportional to depth: a panel 180px forward travels visibly further than one
180px back. The arithmetic runs in CSS from stage-level `--px`/`--py`
variables, so pointer movement causes **no React re-render**. Panels are
authored in plain pixels against a design canvas and the scene scales to fit
any width through a `ResizeObserver`. Parallax is disabled under reduced
motion.

## Components — `src/components/ui/`

| Component | Notes |
|---|---|
| `NNLogo` / `NNLockup` | the locked mark; lockup uses real text |
| `NNGlassMark` | bloom, refraction, chromatic dispersion, specular sweep |
| `Icon` | one family: 24 grid, 1.6 stroke, consistent caps and joins |
| `GlassPanel` | three tiers, four paddings, optional holo rim |
| `Button` | 4 variants × 3 sizes, loading, icon-only, `type="button"` default |
| `TextField` | label association, hint/error, `role="alert"`, multiline |
| `Switch` | a real checkbox underneath — native keyboard and semantics |
| `Dialog` | focus trap, Escape, backdrop close, scroll lock, focus restore |
| `AppTile` | launcher tile, full and compact |
| `Dock` | labelled navigation landmark, `aria-current` |
| `FloatingWindow` | pointer-capture drag, minimise/maximise/close |
| `RenWave` | deterministic double-hump envelope across 29 nested curves |
| `RenCommand` | controlled; performs no speech and makes no network call |

### Robustness decisions worth knowing

`FloatingWindow` feature-detects `setPointerCapture` / `hasPointerCapture`
(absent in older Safari and some webviews), ignores non-finite pointer
coordinates so a window can never be stranded at `NaN`, and treats a pointer
event with no `button` as the primary button rather than refusing to drag.

`RenWave` computes its geometry from a pure function with no randomness, so
server and client markup match exactly and there is no hydration mismatch.

## Accessibility

- Every interactive element has an accessible name — asserted in the browser
- One focus treatment system-wide, `:focus-visible` only, never on mouse
- Touch targets at or above 44px
- WCAG AA enforced by test for all eight text/ground pairs
- `prefers-reduced-motion` honoured, plus an in-app override
- Layouts use `100dvh`, so mobile browser chrome never clips content

## Testing

| Gate | Result |
|---|---|
| `tsc --noEmit`, strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` | clean |
| `eslint --max-warnings 0` | clean |
| `vitest run` | 52 passing |
| `next build` | succeeds, 119 kB first load for `/design` |

Contrast tests parse `tokens.css` directly and compute real WCAG ratios, so a
palette change that harms readability fails immediately rather than shipping.
