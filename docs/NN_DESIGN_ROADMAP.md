# NN — Design Roadmap

Stages A–F, per your sequence. **The operating system is not built in any of
them** — that begins only after Stage F is approved.

---

## Stage A — Vision analysis · **COMPLETE**

Requirements traced to source, design audited against the real repository,
`ui-ux-pro-max` consulted, decisions separated into yours and mine.

Delivered: `NN_DESIGN_AUDIT.md` · `NN_DESIGN_REQUIREMENTS.md` ·
`NN_DESIGN_DECISIONS.md` · this file · registry and vision documents
reconciled rather than duplicated.

**Finding:** design completion ≈ 20%. A strong foundation — tokens, accessible
themes, graded glass, locked brand — under almost no product. Three gaps
matter most: **no density strategy**, **no environmental response**, **19
missing components**.

---

## Stage B — Creative exploration · **BUILT, AWAITING YOUR CHOICE**

Three genuinely different interpretations of "an intelligent environment",
built as real, interactive pages rather than pictures, so they can be judged
honestly:

1. **Atmosphere** — the environment is a lit room; surfaces emerge from
   darkness as attention moves. Depth through light.
2. **Strata** — the environment is stacked planes of glass; working context is
   nearest and brightest, everything else recedes. Depth through layering.
3. **Field** — the environment is a continuous surface with regions of
   density; information condenses where you look. Depth through focus.

All three are built and live at **`/design/directions`**, rendering identical
content so the comparison is fair. Each responds to the pointer differently on
purpose.

**My recommendation: C · Field, carrying A's lighting.** Field is the only one
that solves the density problem from the audit — it makes the surface *more*
opaque under attention, so NN College and NN Finance stay readable. It is the
least cinematic at first glance, which is why Atmosphere's pointer-tracked
lighting should be applied to its surface, and Strata's layering kept for the
one place it genuinely belongs: floating application windows.

**You choose.**

---

## Stage C — Design architecture

From the chosen direction: the complete token system including density and
environment layers, the material specification, the depth and lighting model,
the motion system, and the governing rules for density, blur budget and
responsive behaviour.

Delivered as `NN_DESIGN_SYSTEM.md` plus implemented tokens.

---

## Stage D — Visual implementation

The 19 missing components, then the existing screens redesigned: launch,
sign-in, profile, and `/design` rebuilt as a living system reference.

Every component ships with all five states, keyboard support, both themes and
reduced-motion behaviour.

---

## Stage E — Visual verification

Real browser, real screenshots, at 375 / 768 / 1440. Contrast measured in both
themes. Keyboard traversal walked. **Frame timing measured on the actual 8 GB
Intel machine**, not assumed. Defects fixed and re-verified.

---

## Stage F — Design completion report

Before and after, what was implemented, what was verified and how, what
remains, and what I recommend next.

**Only then** does the operating system begin.

---

## Not in this phase

Launcher · dock · floating-window architecture · workspaces · global search ·
notification centre · any of the 34 applications · REN intelligence.

Their *design* is planned here. Their *implementation* is not.
