# NN Animation Component Source Index

This index records where the animation ideas supplied by the founder belong in the NN repository. The original examples were written for a different stack in places; the NN implementation must adapt them to its own TypeScript, Next.js, CSS Modules and token architecture.

## Founder-supplied source concepts

| Reference source concept | Existing NN source | Reuse / adaptation |
|---|---|---|
| `liquid-glass-button.tsx` | `apps/web/src/components/ui/LiquidButton.tsx` + shared glass filter definitions | Preserve NN variants, disabled/focus states, 44px touch use, shared SVG definitions and token colors. Do not add Radix Slot/CVA/Tailwind only to reproduce the demo. |
| `glass-fold.tsx` | `apps/web/src/components/ui/GlassFold.tsx` | Keep one shared WebGL environment through `Room`; low-power, visibility-aware, reduced-motion and fallback. |
| `coverflow-carousel.tsx` | `apps/web/src/components/ui/Coverflow.tsx` | Use for app launcher and curated collections; keep touch/keyboard support and don't use for dense data tables. |
| `perspective-tunnel-hero.tsx` | `apps/web/src/components/nn/NNIntro.tsx` + `NNIntro.module.css` | Signature entrance; NN constellation, skip/keyboard/touch and reduced-motion path. |
| `adjustable-glass-dashboard.tsx` | `apps/web/src/components/nn/NNWorkspace.tsx` + `NNWorkspace.module.css` | Live material controls and dashboard glass hierarchy; all displayed values must be real or labelled fixtures. |

## Other NN visual source files

- Global environment mount: `apps/web/src/components/nn/Room.tsx`
- Global tokens: `apps/web/src/styles/tokens.css`
- Global styles and reduced-motion rules: `apps/web/src/styles/global.css`
- Shared root layout: `apps/web/src/app/layout.tsx`
- NN-specific composite components: `apps/web/src/components/nn/`
- Shared accessible controls: `apps/web/src/components/ui/`

## Source preservation and licensing

The founder's supplied reference text is the source of design direction. Preserve the original uploaded reference alongside this index in the project knowledge/archive when it is available as a repository file. Do not claim that a demo snippet has been copied into NN unchanged. The NN implementation is an adaptation, not a shadcn/Tailwind migration.

## Rules for future additions

1. Add a new animation primitive only if no existing NN component can serve the need.
2. Keep the source component, stylesheet, reduced-motion behavior, fallback, tests and example usage together.
3. Add a row to this index and update `docs/NN_CINEMATIC_VISUAL_SYSTEM.md`.
4. Map the effect to the actual NN app surfaces in `docs/NN_PRODUCT_UI_ANIMATION_MASTER_PROMPT.md`.
5. Record bundle/performance impact and verify Intel Mac + iPhone behavior.
6. A reusable effect must have at least one real production-intent use; avoid a gallery of unused effects.
