# NN Brand Guide

**Status:** `VERIFIED` · Approved by the founder 8 November 2026.

## The mark

**Concept A.** Two N forms, each built from two verticals and one diagonal on
a 76-unit grid, separated by a **6-unit gap** so the mark reads unambiguously
as N N. The mark is **94 × 76 — it is not square.**

```
M0 0 H12 L32 46 V0 H44 V76 H32 L12 30 V76 H0 Z
M50 0 H62 L82 46 V0 H94 V76 H82 L62 30 V76 H50 Z
```

> **Revision history.** Approved 2026-11-08 as an interlocked ligature sharing
> one stem. Revised the same day at the founder's direction to open the gap.
> No further change without founder approval.

This path is the identity. It is declared once, in
`apps/web/src/components/ui/NNLogo.tsx` as `NN_MARK_PATH`, and every other use
imports it or reproduces it byte-for-byte. A unit test asserts the string has
not changed, so the brand cannot drift through a refactor.

**It must not be redrawn, re-proportioned, re-spaced or re-interpreted without
the founder's explicit approval.**

### Files

| File | Use |
|---|---|
| `nn-symbol.svg` | `currentColor` — the general-purpose mark |
| `nn-logo-dark.svg` | fixed `#F7F9FC`, for dark grounds |
| `nn-logo-light.svg` | fixed `#07111F`, for light grounds |
| `nn-logo-mono.svg` | pure black, for single-colour reproduction |
| `nn-app-icon.svg` | 1024 grid, navy tile + white mark, iOS corner radius |
| `nn-favicon.svg` | tiled so the mark holds contrast in any browser tab |
| `nn-maskable.svg` | Android maskable icon, mark inside the 80% safe zone |

All live in `apps/web/public/brand/nn/`.

### Clear space and minimum size

Clear space on all sides is **one quarter of the mark's height**. Minimum
rendered **height** is 16px. `size` always means height; width follows the
94:76 ratio automatically.

### The glass mark

`<NNGlassMark>` is the ceremonial treatment — volumetric bloom, a refraction
gradient through the body, chromatic dispersion at the edges and a travelling
specular streak. It imports the same locked geometry, so it can never diverge.

Use it for the launch sequence, the authentication screen and the hero. Use the
plain `<NNLogo>` everywhere else; the glass treatment loses its weight if it is
everywhere.

### The lockup

Mark plus the word NN, set in real text rather than outlines, so it stays
selectable, translatable and responsive to the founder's font-size settings.
Gap is 45% of the mark height; the word is 78% of it, tracked at `0.14em`.

## Colour

| Token | Hex | Role |
|---|---|---|
| Base | `#07111F` | the ground everything sits on |
| Deep | `#0B1930` | recessed areas |
| Surface | `#10223B` | raised surfaces |
| Elevated | `#172B45` | the highest surfaces |
| White | `#F7F9FC` | primary text on dark; the light ground |
| Soft | `#E7EDF6` | secondary light surfaces |
| Silver | `#A6B3C5` | secondary text on dark |
| Grey | `#77869B` | muted text on dark |
| Icy | `#9CC8FF` | highlights, focus, ORIN |
| Accent | `#649CE3` | primary actions |

Measured contrast is enforced by `src/styles/tokens.test.ts`, which fails the
build if any text token drops below WCAG AA on its ground, in either theme.

## Typography

Inter, with the native system stack as fallback. Nine sizes from `display`
(40px) down to `micro` (11px, tracked `0.16em` for uppercase labels). The scale
is defined in `tokens.css`; components reference the tokens, never raw px.

## What the brand is not

No cartoon, no anime, no gaming aesthetic, no neon, no glowing outlines, no
robot or mascot, no generic AI brain, no lightning bolt, no emoji as an icon,
no second logo on a second screen.
