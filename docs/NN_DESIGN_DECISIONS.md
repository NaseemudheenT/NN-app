# NN — Design Decisions

Append-only. Each entry records who decided, when, and why — so a future
conversation can tell your decisions from my recommendations.

**🔒 Founder decision** · **💡 Claude recommendation** (reversible)

---

## 2026-11-08

**🔒 Product name is NN.** 3008 is the design ambition, never part of the
name. *Correcting my own drift — I had used "NN" as a label.*

**🔒 Logo: Concept A — INTERLOCK, with the gap.** Not to be redesigned.
Geometry locked at 94 × 76, guarded by test.

**🔒 Palette: the approved ten colours are the foundation.** Tonal variations,
gradients and material treatments may be derived; new base hues may not be
introduced. `ui-ux-pro-max` proposed a different palette and was overruled.

**🔒 The smart home is the interaction philosophy, not a visual motif.** NN
should feel like entering an intelligent environment that understands context
— not like a smart-home control panel.

**🔒 Design the whole application before building the OS.** No launcher, dock
or window system until the design foundation is complete and verified.

**💡 Style direction: Spatial UI.** Confirmed independently by
`ui-ux-pro-max`, which returned "Spatial UI (VisionOS) — glass, depth,
immersion, translucent" for NN's profile and named *flatness*, not excess, as
the failure mode.

**💡 Depth becomes structural, not decorative.** Z-position will encode
hierarchy: the thing you are working on is nearest and brightest; what waits
recedes. Currently depth exists in one hero only.

**💡 Add an ambient environment system.** Lighting and atmosphere respond to
time of day, focus state and system activity. This is the difference between
"a glass interface" and "an environment that understands context".

**💡 Add a density system.** Glass must behave differently under dense data:
more opaque, less blur, borders carrying structure instead of shadow. Without
this, NN College and NN Finance cannot be made readable. *This is the highest
design risk in the project.*

**💡 Introduce a blur budget.** `ui-ux-pro-max` names blur as the performance
driver for this style. A hard cap on stacked `backdrop-filter` layers, plus a
degradation ladder, measured on the actual 8 GB Intel machine.

**💡 No WebGL for now.** CSS 3D transforms deliver the required depth far more
cheaply on this hardware. NN Nature & Universe is the one candidate where
Three.js would earn its cost — revisited when that application is built.

**💡 Dark-first, light maintained.** A spatial glass environment is a dark
medium. Light theme stays correct and accessible, but dark is where NN is
designed.

**💡 Cinematic launch on first run and after long absence only.** Magic once,
friction daily. Always skippable, always reduced-motion aware.

**💡 No sound design yet.** Revisit after the OS shell exists.

**💡 `/design` is a development tool, never a product surface.** It must not
ship as part of NN.

---

## Earlier decisions, preserved

**🔒 2026-11-08 — Application consolidations.** Wealth→Finance ·
Inbox→Mail · Health & Wellness→Body · Media Vault→Files ·
Relationships→Contacts. Calendar, Tasks, Reminders and Notes are modules
inside NN Life. Learning Vault stays separate. **34 applications.**

**🔒 Firebase is the mandatory backend.** PostgreSQL, Neon and Drizzle
excluded.

**🔒 `nn-os-dev` only. No Blaze, no billing, no production.**

**🔒 Never claim something works without running it.**
