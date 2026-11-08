# NN APP — Experience Specification

**Status:** awaiting founder approval · Version 1.0 · 2026-11-08
Covers the 15 areas required by the Founder's Clarifications. This document
describes *the experience*. It is not a component catalogue.

---

## 0. The governing idea

**NN is a place, not a set of pages.**

A dashboard asks you to read it. An operating environment lets you *act* in it.
The difference is that NN has a **persistent spatial workspace** — a dark,
lit room in which the founder's applications exist as panes of glass at real
depths. Opening NN College does not navigate away from NN; it brings a surface
forward. Closing it sends the surface back. Nothing ever feels like a page load.

Three consequences that shape every decision below:

1. **Depth carries meaning.** Z-position is hierarchy: what you are working on
   is nearest and brightest; what is waiting recedes and dims. This is why the
   glass is graded and why parallax is proportional to depth — it is a reading
   aid, not an effect.
2. **ORIN is ambient, not a destination.** It lives as a quiet presence that
   expands only as far as the task needs: a line, a floating pane, or the whole
   room. The founder never "goes to" ORIN.
3. **The environment recedes.** On a quiet Tuesday NN should show almost
   nothing — a greeting, what matters today, and a place to speak. Density is
   earned by content, never designed in.

**Anti-patterns, absolutely excluded:** permanent left sidebar · widget walls ·
admin-table density · tabs across the top · cartoon or gaming aesthetics ·
neon · glow for its own sake · anything that looks like a CMS.

---

## 1. Identity and brand

The mark is Concept A with the approved gap — **94 × 76, not square**. Locked,
test-guarded, present in seven published variants.

Where it appears, and only here: launch sequence · authentication · top bar at
22px · app icon and favicon · empty states. Never decoratively, never twice on
one screen, never animated outside the launch sequence.

`NNGlassMark` — the lit-glass treatment with bloom, refraction, chromatic
dispersion and travelling specular — is ceremonial. Launch and authentication
only. Its weight comes from rarity.

---

## 2. Cinematic startup

Seven beats, total ~3.2s first run, ~1.1s thereafter. Skippable at any point by
tap, key or click. Under reduced motion the whole sequence collapses to a
220 ms cross-fade that still lands on the same frame.

| Beat | What happens |
|---|---|
| 1 | Near-black. Slow volumetric haze drifts. No text. |
| 2 | The mark **draws itself** — a single continuous stroke tracing the geometry — then fills to glass. |
| 3 | It settles onto an invisible ground plane: a soft impact, a light ripple outward, the haze displaced. |
| 4 | The mark becomes touchable. Pressing it opens a circular aperture of light. |
| 5 | The aperture widens into the authentication surface. |
| 6 | After success: the aperture expands past the frame and the workspace assembles — panels settle in from depth, staggered, 40 ms apart. |
| 7 | Returning launches skip beats 1–3 and open at beat 4. |

**It must never delay access.** Authentication is interactive from beat 4; the
remaining animation runs behind it.

---

## 3. Authentication and profile

**Authentication** — a single calm surface. Mark, `Welcome back, Founder.`, one
primary action, a fingerprint *symbol* that is explicitly only a symbol, and a
recovery link. The real flow is WebAuthn through the platform authenticator. NN
never sees or stores biometric data, and the screen says so in one quiet line.

**Profile** *(per your instruction, everything personal moves here)* — a
separate full surface, scrollable, reached from the top-bar avatar. Sections:
identity · preferences (language, time zone, units) · appearance · ORIN
(name, voice, model, memory) · notifications · privacy · **security** (passkeys,
devices, sessions, audit) · connected services · storage · backup · data export
and deletion · about.

Nothing from this list appears on the dashboard. The dashboard shows the
founder's *day*, never his *account*.

---

## 4. The desktop operating environment

```
┌──────────────────────────────────────────────────────────────┐
│  ◇ NN          ⌕ search            ◉ status   ⚑ 3   ⬤ avatar │  ← floating bar, 52px
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                  Good evening, Founder.                      │
│                  Saturday 8 November · 11:42                 │
│                                                              │
│        ╭────────────────────────────────────────────╮        │
│        │   Ask me anything…                          │  ← ORIN, the largest
│        │   ∿∿∿∿∿∿∿∿                      ◉  ➤      │     single element
│        ╰────────────────────────────────────────────╯        │
│                                                              │
│    ▢ Today        ▢ Next           ▢ Focus                   │  ← at most 3,
│    3 tasks        DSA 18:00        Python · unit 4           │     hidden when empty
│                                                              │
│      ◻ Life    ◻ College   ◻ Academy   ◻ Finance             │  ← floating app
│      ◻ Projects ◻ Files    ◻ Business  ◻ ⋯ All               │     cards, in depth
│                                                              │
│                  ╭──────────────────╮                        │
│                  │ ◉ ◻ ◻ ◻ ◻  ⌘K  │  ← dock, floating       │
│                  ╰──────────────────╯                        │
└──────────────────────────────────────────────────────────────┘
```

**Layout** — a vertical rhythm, centred, generous. Roughly 55% of the first
screen is empty space, deliberately. The page scrolls; below the fold sits
recent activity and anything the founder has pinned.

**Behaviour**
- Pointer movement produces real parallax across the app cards — depth-proportional, disabled under reduced motion
- Hovering a card lifts it toward the viewer on Z and brightens its chamfer
- Opening a card does not navigate: the card expands in place into a window
- The greeting, the context cards, the card order and the dock are all configurable, and ORIN can change them on request
- A context card with nothing to say is **not rendered** — never an empty shell

**Responsive** — the layout above is ≥1280px. 1024–1280 drops to three app
columns. Below 1024 see §12.

---

## 5. ORIN interaction

Four presences, one identity, one state machine (`idle · listening · thinking ·
speaking`) expressed through the waveform's amplitude and tempo.

| Presence | Where | What it is for |
|---|---|---|
| **Ambient line** | dashboard centre | the default. Type or press to speak. |
| **Orb** | bottom-right, inside any app | a quiet dot; ORIN is reachable without leaving what you are doing |
| **Floating pane** | over the workspace | a conversation that does not take the room — drag, minimise, keep working |
| **Full workspace** | its own surface | research with sources, document analysis, long tasks, task history, memory controls |

**Agent transparency is part of the design.** When ORIN runs a multi-step task
the founder sees the plan, the tool being used, progress, and any approval
request — as a compact timeline inside the pane. Approvals appear inline with
the exact action stated. ORIN never reports success it has not verified.

**Honesty surface** — when no AI provider is configured, ORIN says exactly that
and the input stays usable for non-AI commands (open, create, search). It never
simulates a reply.

---

## 6. Application launcher

Summoned by `⌘K`, the dock, or "All". A floating glass sheet over a dimmed
workspace — the room is still visible behind it.

Search first (fuzzy, instant, keyboard-driven) · favourites · recent · the full
grid in the six registry groups · folders · drag to reorder · right-click for
pin, rename, hide, permissions, uninstall. Enter opens the top result; Escape
dismisses; arrows navigate. The launcher is also the command palette: typing a
verb ("remind me", "new note") offers the action rather than the app.

---

## 7. Floating application windows

Desktop and large tablet only. Draggable by the title bar with pointer capture,
resizable from edges, minimise to dock, maximise, close. Focus is expressed by
brightness, chamfer intensity and shadow tier — the unfocused window dims to
82%. Snap zones at the screen edges. Layout persists per application, per
device. Multiple apps open simultaneously is the normal case, not an edge case.

On phones a window becomes a full-screen surface with a back affordance. The
same component, a different presentation — never a shrunken window.

---

## 8. Application interfaces

Every one of the 34 applications follows the same skeleton so the founder
learns it once:

```
app header   — name · primary action · app-level search · overflow
workspace    — the application's own content, full width, never boxed in
context rail — optional right-hand panel, collapsible, for detail
ORIN orb     — always present, context-aware of this application
```

Each application must ship all five states — **content · loading · empty ·
error · permission-denied** — and must be genuinely useful with ORIN switched
off. Each is specified individually before it is built; the registry defines
purpose, features, data and permissions.

---

## 9. Notifications and system controls

A floating sheet from the top bar. Grouped by urgency: **needs you** (approvals,
conflicts, security) above **worth knowing** (reminders, completions, sync).

Every notification states its true delivery state — created, scheduled, queued,
sent, delivered *only when the platform confirms it*, failed, cancelled. Quiet
hours, per-app preferences, snooze and complete inline. Never a badge for
something that cannot be acted on.

**System controls** sit in the top-bar status dot: connection, sync, background
jobs, ORIN availability, backup health. Green is never claimed without a check.

---

## 10. Search and command

One index, permission-aware, across apps, notes, files, calendar, tasks,
projects, conversations, memory, contacts and authorised services.

`⌘K` anywhere. Results grouped by source with the source named. Typing a
natural sentence hands off to ORIN instead of searching. Recent commands and
context-aware suggestions. Everything reachable from the keyboard.

---

## 11. Dark and light

Dark is the identity; light is a full first-class theme with its own measured
text ramp, not an inversion. Both are already built and WCAG AA is enforced by
test. The theme choice persists, follows the OS when set to system, and applies
before first paint so there is never a flash. ORIN can change it on request.

---

## 12. Desktop, tablet and phone

Three designs, not one layout stretched.

| | Phone (<768) | Tablet (768–1023) | Desktop (≥1024) |
|---|---|---|---|
| Structure | vertical stack, full-screen surfaces | two-column adaptive | spatial workspace |
| Navigation | floating bottom dock, 5 slots | dock + launcher sheet | dock + `⌘K` + windows |
| ORIN | bottom sheet, thumb-reachable | floating pane | all four presences |
| Apps | 2-column grid, large targets | 3-column | floating cards in depth |
| Windows | none — full-screen surfaces | simplified panes | full window management |
| Depth | flattened; glass and light kept, parallax off | reduced | full |
| Density | one idea per screen | moderate | rich but spacious |

**Phone is the priority surface.** It is where NN will be used most and it is
installable to the home screen as a PWA with its own icon, splash and
full-screen chrome. Safe areas respected; `100dvh` throughout; every target
≥44px; nothing critical within thumb-shadow of the bottom edge.

---

## 13. Interaction and accessibility

Motion durations 90–520 ms, standard easing, nothing bouncy. Reduced motion
collapses durations to 1 ms rather than removing transitions, so no state
machine stalls.

Full keyboard operability. One focus treatment system-wide, `:focus-visible`
only. Dialogs trap focus and restore it. Every control has an accessible name.
WCAG AA on every text/ground pair, enforced by test in both themes. Screen
reader labels on every ORIN state. No meaning carried by colour alone.

---

## 14. Security and settings

Security is **a surface the founder can read**, not a claim. The Security
Centre shows passkeys, trusted devices, live sessions with one-click
revocation, login history, granted permissions, integration access, encryption
status, backup health and the audit log.

Sensitive changes require re-authentication at the moment of change. Every
high-impact action — send, publish, purchase, transfer, trade, permanent
delete, security change, unlock — shows exactly what will happen, to what, on
which account, and requires explicit confirmation. ORIN can prepare all of it
and may complete none of it.

Settings live entirely in Profile (§3), organised, searchable, and **every
control has a real effect**. No decorative toggles.

---

## 15. Automation and integrations

**Automation Studio** — trigger, conditions, actions, schedule, approvals,
retry policy, history. Before an automation can be enabled it must show, in
plain language, exactly what it will do and what permissions it will use. High-
impact steps keep their confirmation even inside an automation; chaining can
never be used to escape an approval gate.

**Connector Centre** — each service shows status, the account identity, the
permissions granted, the data categories reachable, last successful sync,
errors, and one-click revoke. Six graduated permission levels from read-only to
confirmed sensitive actions. OAuth only; NN never asks for a third-party
password.

---

## Delivery method

Every screen above will be delivered as a **working implementation in the
application**, reviewed live in the browser at real desktop, tablet and phone
viewports. Where a static reference helps a decision it will be labelled a
reference. **No screenshot will ever be presented as a working feature.**
