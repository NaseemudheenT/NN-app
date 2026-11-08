# NN OS — Architecture

**Status:** `NOT IMPLEMENTED` — designed here, deliberately not built.
Implementation begins only after design Stage F is approved.

---

## The idea

NN OS is **a place, not a set of pages.** A dark, lit environment in which
applications exist as surfaces at real depths. Opening NN College brings a
surface forward; closing it sends it back. Nothing navigates.

Three principles govern everything:

1. **Depth is hierarchy.** Z-position is meaning, not decoration — what you
   are working on is nearest and brightest; what waits recedes and dims.
2. **The environment responds.** Lighting and atmosphere shift with time of
   day, focus and system state. This is what separates an environment from a
   skin.
3. **Density is earned.** A quiet day shows almost nothing. Content, not
   layout, decides how full a screen is.

## Surfaces

| Surface | Role |
|---|---|
| **Environment** | the lit room: ambient light, atmosphere, ground plane |
| **Workspace** | where application surfaces live, at depth |
| **Chrome** | top bar and dock — floating, never a sidebar |
| **REN** | ambient presence, expanding only as far as the task needs |
| **Overlays** | launcher, command palette, notifications, dialogs |

## Components it requires

Beyond today's 15: `Window` · `Launcher` · `CommandPalette` · `Menu` ·
`ContextMenu` · `Popover` · `Tooltip` · `Toast` · `NotificationCentre` ·
`Tabs` · `Breadcrumb` · `Avatar` · `Badge` · `Skeleton`

## Window model

Draggable by title bar with pointer capture, resizable from edges, minimise to
dock, maximise, close. Focus expressed through brightness, chamfer intensity
and shadow tier. Layout persists per application per device.

On phones a window becomes a full-screen surface with a back affordance — the
same component, a different presentation, never a shrunken window.

## Per device

| | Phone | Tablet | Desktop |
|---|---|---|---|
| Structure | vertical stack, full-screen surfaces | two-column adaptive | spatial workspace |
| Windows | none | simplified panes | full management |
| Depth | flattened — light kept, parallax off | reduced | full |
| Navigation | bottom dock, 5 slots | dock + launcher | dock + `⌘K` + windows |

Parallax is disabled on phones for performance **and** because parallax on a
handheld device is disorienting.

## Explicitly out of scope right now

Launcher, dock, window system, workspaces, global search and the notification
centre are **designed** in this document and **not implemented** until the
design foundation is approved.
