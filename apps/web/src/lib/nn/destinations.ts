import type { Route } from "next";
import type { IconName } from "@/components/ui/Icon";
import { APPLICATIONS } from "@/lib/apps/registry";

/**
 * Everywhere in NN you can actually go.
 *
 * One list, because there were two: the command palette built its own and
 * the navigation rails each carried a hand-written subset. Three places
 * naming the same destinations is three places to forget one, and the
 * symptom is a screen you can reach by keyboard and not by thumb.
 *
 * `route` is typed as `Route`, so naming a page that does not exist fails
 * the build rather than the founder's press. A destination without one is
 * something NN intends to have and does not yet — listed, never offered.
 */

export interface Destination {
  id: string;
  label: string;
  /** One short line. Shown where there is room, never required to read. */
  hint: string;
  icon: IconName;
  group: "NN" | "Applications";
  route?: Route;
  /** REN is a presence rather than a view, and wears its own mark. */
  mark?: "ren";
  /** Shown on the right where a keyboard exists. */
  keys?: string;
}

/** The places that are not applications. */
export const PLACES: readonly Destination[] = [
  { id: "ren", label: "REN", hint: "Speak to your intelligence", icon: "sparkle", group: "NN", route: "/ren" as Route, mark: "ren", keys: "⌘J" },
  { id: "home", label: "Today", hint: "What NN has for you", icon: "calendar", group: "NN", route: "/home" as Route, keys: "⌘H" },
  { id: "workspace", label: "Workspace", hint: "Your study and your work", icon: "grid", group: "NN", route: "/workspace" as Route },
  { id: "settings", label: "Settings", hint: "Appearance, REN, security", icon: "settings", group: "NN", route: "/settings" as Route, keys: "⌘," },
];

/** Every destination NN knows, places first. */
export function destinations(): readonly Destination[] {
  const apps: Destination[] = APPLICATIONS.map((app) => ({
    id: `app-${app.id}`,
    label: app.name,
    hint: app.description,
    icon: app.icon,
    group: "Applications",
    ...(app.href !== undefined ? { route: app.href } : {}),
  }));
  return [...PLACES, ...apps];
}

/** Only the ones NN can actually open. */
export function reachable(): readonly Destination[] {
  return destinations().filter((destination) => destination.route !== undefined);
}

/**
 * Which destination a path is currently in.
 *
 * Longest match wins, so `/ren/chat` resolves to REN rather than to nothing,
 * and `/` resolves to nothing rather than to everything.
 */
export function currentDestination(pathname: string): Destination | null {
  let best: Destination | null = null;
  for (const destination of destinations()) {
    const route = destination.route;
    if (route === undefined) continue;
    const path = String(route);
    if (pathname !== path && !pathname.startsWith(`${path}/`)) continue;
    if (best === null || path.length > String(best.route).length) best = destination;
  }
  return best;
}
