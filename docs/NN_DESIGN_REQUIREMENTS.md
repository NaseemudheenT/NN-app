# NN — Design Requirements

Every row traces to something you actually said in this conversation.
**Your explicit decisions are marked 🔒. My professional recommendations are
marked 💡** and are mine to be held to, not yours to have asserted.

Format: what you asked · why it matters · what exists · what's missing ·
what must change · how completion is verified.

---

## 1 🔒 The product is called **NN**

**Why:** brand integrity. 3008 is the design ambition, not the name.
**Exists:** the mark, the registry, the repository — all correctly "NN".
**Missing:** nothing in product code.
**Change:** I introduced "NN" as a label in `CLAUDE.md`,
`EXPERIENCE_SPEC.md` and commit messages. Corrected.
**Verified when:** no document or UI string says "NN" as a product name.

## 2 🔒 Concept A — INTERLOCK, with the gap. Never redesigned

**Why:** approved brand property, already revised once at your direction.
**Exists:** `NN_MARK_PATH` declared once, 7 SVG variants byte-identical, a
test fails if the geometry changes.
**Missing:** nothing.
**Change:** none. Protected as-is.
**Verified when:** the brand-lock test passes. It does.

## 3 🔒 The approved ten-colour palette is the foundation

**Why:** founder decision; `ui-ux-pro-max` suggested a different palette and
was overruled.
**Exists:** all ten as tokens; a test asserts every one is present unaltered.
**Missing:** tonal ramps, material treatments and state variations derived
*from* those ten.
**Change:** extend with derived scales. Never add a new base hue.
**Verified when:** every colour in NN resolves to an approved hue or a
documented derivation of one.

## 4 🔒 Feel like a smart home, not a website

**Why:** this is the defining requirement. The environment should understand
context, surface what is needed, and feel connected.
**Exists:** static gradient background. Nothing responds to anything.
**Missing:** the entire environmental layer — time-of-day lighting,
focus-responsive atmosphere, surfaces that arrive when relevant.
**Change:** build an **ambient environment system** as a first-class part of
the design, not decoration.
**Verified when:** the interface demonstrably differs at 07:00, 15:00 and
23:00, and when REN is idle versus working.

## 5 🔒 Spatial, three-dimensional, depth-driven

**Why:** the skill names "no spatial depth" as the failure mode of this style.
**Exists:** `HoloStage`/`HoloPanel` with real Z-parallax — used in exactly one
hero.
**Missing:** depth as the organising principle everywhere else.
**Change:** promote depth from effect to **structure**: Z-position encodes
hierarchy, and that rule governs every surface.
**Verified when:** a screenshot of any screen reads as layered, and the layer
of an element predicts its importance.

## 6 🔒 Impressive, but usability always matters

**Why:** you said it twice, and rejected an earlier build as too basic *and*
warned against cluttered.
**Exists:** AA contrast by test; reduced motion handled correctly.
**Missing:** a **blur budget**. The skill names blur as the performance
driver; nothing currently limits how many blurred surfaces can stack.
**Change:** cap simultaneous backdrop-filter layers and define a degradation
ladder for weaker hardware.
**Verified when:** measured on this Intel MacBook Air at 8 GB, scrolling stays
smooth with the heaviest screen open.

## 7 🔒 One reusable system, not per-application designs

**Why:** 34 applications designed separately would be 34 inconsistent products.
**Exists:** 15 components, tokens enforced, almost no hardcoded values.
**Missing:** 19 components, including Menu, Popover, ContextMenu, Chart,
DataTable, Toast, Tabs and CommandPalette.
**Change:** complete the library before designing any application screen.
**Verified when:** an application screen can be built without writing a new
primitive.

## 8 💡 Information density is the unsolved problem

**Why:** *my assessment, not your instruction.* Every existing surface is
sparse. NN College must show a timetable, marks and a question bank at once;
NN Finance must show transaction tables. Glass at that density becomes
unreadable, and this is the most likely way the design fails in practice.
**Exists:** three graded glass tiers — the right foundation, insufficient alone.
**Missing:** rules for dense data on glass.
**Change:** add a **density system**: at high density the surface becomes more
opaque, blur reduces, and borders carry the structure instead of shadow.
**Verified when:** a 200-row table on glass is as readable as one on a solid
surface, measured by contrast.

## 9 🔒 Desktop, tablet and mobile each purpose-built

**Why:** you rejected shrinking the desktop layout.
**Exists:** responsive grid folds; a phone frame demonstrated on `/design`.
**Missing:** genuinely distinct paradigms. Depth and parallax must largely
disappear on phones — for performance and because parallax on a handheld
device is disorienting.
**Change:** define three interaction models, not three widths.
**Verified when:** each is checked in a real browser at 375 / 768 / 1440.

## 10 🔒 REN is an intelligence layer, not a chatbot

**Why:** stated repeatedly and emphatically.
**Exists:** `RenWave` with four real states, `RenCommand`, honest about
being unconnected.
**Missing:** how REN *inhabits* the environment — ambient presence, how it
surfaces contextual information, how it shows reasoning and asks approval.
**Change:** design REN as a presence with states, not a panel.
**Verified when:** REN is reachable and legible from every surface without
occupying one.

## 11 🔒 No fake data, no dead controls, no mockups called finished

**Why:** your most-repeated rule.
**Exists:** honoured so far — `/workspace` is deliberately bare rather than a
fake dashboard.
**Missing:** nothing.
**Change:** none. Every designed screen ships with real empty, loading and
error states.
**Verified when:** every visible control has a handler and every screen has
all five states.

## 12 🔒 Preserve auth, Firebase, security, existing logic

**Why:** Phases 2 and 3 are verified and must not regress.
**Exists:** 216 unit tests, 10 real-browser tests, owner-scoped rules.
**Missing:** nothing.
**Change:** design work touches presentation only.
**Verified when:** the full gate still passes after every design commit.

---

## Unresolved — my recommendation, your call

| # | Question | My recommendation |
|---|---|---|
| A | Should the cinematic launch play every time or only on first launch and after long absence? | **Only on first launch and after 7+ days away.** A 3-second entrance is magic once and friction daily. Always skippable. |
| B | Does NN ever use light theme in practice? | **Keep it, maintain it, but design dark-first.** A spatial glass environment is fundamentally a dark medium; light mode should be correct and accessible rather than equally cinematic. |
| C | Sound design? | **Not now.** Audio in a web app is intrusive without careful control; revisit after the OS shell exists. |
| D | Real 3D via Three.js / R3F? | **No, not yet.** CSS 3D transforms deliver the depth you want at a fraction of the cost on an 8 GB Intel machine. Reach for WebGL only where it earns its weight — NN Nature & Universe is the one genuine candidate. |

I will proceed on these recommendations unless you say otherwise.
