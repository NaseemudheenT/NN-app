# NN Future Interface System — 50 Core Primitives

**Status:** implemented as reusable CSS primitives in `apps/web/src/styles/future-system.css`, loaded globally from `global.css`.

This is a visual and interaction language for NN's private, single-owner operating environment. It is not a claim that planned applications or backend capabilities are operational.

## Material and surface family (01–10)

| # | Primitive | Purpose |
|---:|---|---|
| 01 | `nn-surface-glass` | Floating optical-glass surface |
| 02 | `nn-surface-elevated` | Higher-emphasis layered surface |
| 03 | `nn-surface-reading` | Opaque, contrast-first reading surface |
| 04 | `nn-surface-quiet` | Low-emphasis section surface |
| 05 | `nn-surface-command` | Focused command/assistant surface |
| 06 | `nn-surface-hero` | Ambient hero surface with spectral light |
| 07 | `nn-surface-inset` | Recessed well for grouped controls |
| 08 | `nn-surface-frosted` | High-blur frosted surface |
| 09 | `nn-surface-spectrum` | Restrained iridescent edge treatment |
| 10 | `nn-surface-plain` | Solid, low-distraction surface |

## Cards, tiles and icon materials (11–20)

| # | Primitive | Purpose |
|---:|---|---|
| 11 | `nn-card` | Standard responsive card |
| 12 | `nn-card-interactive` | Hover/press feedback for interactive cards |
| 13 | `nn-card-selected` | Explicit selected state |
| 14 | `nn-card-compact` | Dense information card |
| 15 | `nn-card-featured` | High-emphasis feature card |
| 16 | `nn-card-grid` | Responsive auto-fit card grid |
| 17 | `nn-tile` | Application or action tile |
| 18 | `nn-tile-center` | Centered tile composition |
| 19 | `nn-tile-compact` | Compact tile |
| 20 | `nn-icon-well` | Coloured, dimensional icon material |

## Actions, fields and statuses (21–30)

| # | Primitive | Purpose |
|---:|---|---|
| 21 | `nn-button-primary` | Primary high-contrast action |
| 22 | `nn-button-secondary` | Secondary glass action |
| 23 | `nn-button-quiet` | Low-emphasis action |
| 24 | `nn-button-icon` | Icon-only touch target |
| 25 | `nn-field` | Keyboard-friendly form field |
| 26 | `nn-chip` | Neutral filter or metadata chip |
| 27 | `nn-status` | Explicit status indicator |
| 28 | `nn-status-ok` | Verified/healthy status |
| 29 | `nn-status-warn` | Warning status |
| 30 | `nn-status-error` | Error status |

## Information architecture and data (31–40)

| # | Primitive | Purpose |
|---:|---|---|
| 31 | `nn-divider` | Soft spectral divider |
| 32 | `nn-section-heading` | Consistent section header row |
| 33 | `nn-section-kicker` | Compact technical section label |
| 34 | `nn-metric` | Metric grouping |
| 35 | `nn-metric-value` | Numeric metric display |
| 36 | `nn-metric-label` | Supporting metric label |
| 37 | `nn-list-row` | Reusable record row |
| 38 | `nn-list-content` | Flexible, overflow-safe list content |
| 39 | `nn-data-value` | Tabular numeric value |
| 40 | `nn-progress` | Accessible-ready visual progress track |

## Feedback, safety and accessibility (41–50)

| # | Primitive | Purpose |
|---:|---|---|
| 41 | `nn-empty-state` | Honest no-data state |
| 42 | `nn-empty-icon` | Empty-state icon well |
| 43 | `nn-skeleton` | Loading placeholder |
| 44 | `nn-callout` | Informational callout |
| 45 | `nn-callout-warning` | Warning callout |
| 46 | `nn-callout-danger` | Destructive/error callout |
| 47 | `nn-dialog-scrim` | Modal backdrop |
| 48 | `nn-dialog-surface` | Scroll-safe modal surface |
| 49 | `nn-tooltip` | Compact contextual explanation |
| 50 | `nn-focus-ring` | Keyboard-visible focus treatment |

### Supporting variants and utilities

The stylesheet also includes icon-well size variants, active chip state, navigation tabs/items, safe-area spacing, horizontal scrolling, overflow containment, and reduced-motion helpers. These extend the 50 core primitives; they are not counted as additional core designs.

### Usage rules

- Use the shared semantic tokens; do not create a new palette per screen.
- Use denser/opaque surfaces behind long text and sensitive information.
- Use one primary action per local task; keep secondary actions visually quieter.
- Never use colour alone to communicate a state.
- Keep touch targets at least 44px where practical and preserve safe-area insets.
- Respect `prefers-reduced-motion`; do not make animation necessary to understand state.
- Do not render fake data, fake connectivity, fake AI activity or fabricated completion metrics.
- A planned application remains visibly planned until its real interface, data path, owner permissions, error states and tests exist.
- This system is phone-first and responsive; no visual effect may introduce horizontal overflow or reduce text contrast.
