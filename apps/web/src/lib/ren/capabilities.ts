import type { Route } from "next";
import { APPLICATIONS, getApplication, matchApplications } from "@/lib/apps/registry";
import { APP_SECTIONS, type AppSection } from "@/lib/apps/sections";

/**
 * What REN can actually do.
 *
 * This is the whole of it. REN is not a chat surface that describes NN — it
 * operates NN, and every operation it can perform is one of the capabilities
 * below. Each one names what it changes, so the cost of an action is declared
 * before it is taken rather than discovered afterwards.
 *
 * Three rules hold, and they are why this file exists at all:
 *
 * 1. **REN cannot do anything that is not here.** A model, when one is
 *    connected, proposes a capability and its arguments. It does not get to
 *    invent an action, and it never touches Firestore directly.
 * 2. **REN never reports success it has not verified.** Each capability
 *    returns the outcome it actually observed. "Opened Finance" is said after
 *    the route changed, not after the router was asked.
 * 3. **Consequence is declared, not inferred.** `writes` asks first.
 *    `sensitive` asks first *and* requires a fresh biometric assertion from
 *    the device — the same passkey that proves ownership of NN at all.
 *
 * The security rules remain the real boundary. Nothing here can read or write
 * anything the founder's own session could not; REN is an operator with the
 * founder's hands, not a privileged service.
 */

/** How much a capability costs to be wrong about. */
export type Consequence =
  /** Reads, navigates, reports. Reversible by going back. */
  | "none"
  /** Creates or changes one of the founder's records. Confirmed first. */
  | "writes"
  /** Deletes, or acts outside NN. Confirmed, and re-authenticated. */
  | "sensitive";

export type CapabilityId =
  | "open"
  | "capture"
  | "find"
  | "report"
  | "appearance"
  | "complete"
  | "discard";

export interface CapabilitySpec {
  id: CapabilityId;
  /** What REN says it is about to do, in the first person. */
  verb: string;
  consequence: Consequence;
  /** One line the founder can read in a confirmation. */
  describes: (args: CapabilityArgs) => string;
}

/**
 * Arguments, resolved from language into things that exist.
 *
 * Deliberately not a free-form bag: every field here names something NN can
 * check before acting. An application id that is not in the registry, or a
 * collection no application owns, cannot survive resolution — so a mistaken
 * instruction fails at the edge rather than halfway through a write.
 */
export interface CapabilityArgs {
  /** A registry application id. */
  appId?: string;
  /** An owner collection, always one some application owns. */
  collection?: string;
  /** The record's title. */
  title?: string;
  /** Free text for search, or a record's detail. */
  text?: string;
  /** A theme or tint instruction. */
  appearance?: "dark" | "light" | "system" | "calm" | "vivid";
  /** A record id, for completing or discarding. */
  recordId?: string;
}

export const CAPABILITIES: Readonly<Record<CapabilityId, CapabilitySpec>> = {
  open: {
    id: "open", verb: "Open", consequence: "none",
    describes: (a) => `Open ${nameOfApp(a.appId) ?? "NN"}`,
  },
  find: {
    id: "find", verb: "Find", consequence: "none",
    describes: (a) => `Search your records for "${a.text ?? ""}"`,
  },
  report: {
    id: "report", verb: "Report", consequence: "none",
    describes: () => "Tell you what NN is holding",
  },
  appearance: {
    id: "appearance", verb: "Retheme", consequence: "none",
    describes: (a) => `Change NN's appearance to ${a.appearance ?? "its default"}`,
  },
  capture: {
    id: "capture", verb: "Add", consequence: "writes",
    describes: (a) =>
      `Add "${a.title ?? "Untitled"}" to ${sectionName(a.collection) ?? "your records"}`,
  },
  complete: {
    id: "complete", verb: "Complete", consequence: "writes",
    describes: (a) => `Mark "${a.title ?? "that"}" as done`,
  },
  discard: {
    id: "discard", verb: "Delete", consequence: "sensitive",
    describes: (a) => `Move "${a.title ?? "that"}" to the trash`,
  },
};

/* ------------------------------------------------------------- resolution -- */

function nameOfApp(id: string | undefined): string | null {
  if (!id) return null;
  return getApplication(id)?.name ?? null;
}

/** "calendar_events" → "Calendar events". For collections with no section. */
function readable(collection: string): string {
  const words = collection.replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

interface Destination {
  appId: string;
  appName: string;
  collection: string;
  /** What this place is called, in the founder's words. */
  name: string;
  label: string;
}

/**
 * Every place a record can go.
 *
 * Built from the registry's own collections, not only from APP_SECTIONS:
 * Life and Files have surfaces of their own and so no sections, but they own
 * the collections the founder uses most. Indexing only sectioned applications
 * meant "add a task" — the single most likely thing anyone would say — had
 * nowhere to land.
 */
const DESTINATIONS: readonly Destination[] = APPLICATIONS.flatMap((app) => {
  const sections: readonly AppSection[] = APP_SECTIONS[app.id] ?? [];
  if (sections.length > 0) {
    return sections.map((section) => ({
      appId: app.id,
      appName: app.name,
      collection: section.collection,
      name: section.name,
      label: `${app.name} · ${section.name}`,
    }));
  }
  return (app.collections ?? []).map((collection) => ({
    appId: app.id,
    appName: app.name,
    collection,
    name: readable(collection),
    label: `${app.name} · ${readable(collection)}`,
  }));
});

export function sectionName(collection: string | undefined): string | null {
  if (!collection) return null;
  return DESTINATIONS.find((d) => d.collection === collection)?.label ?? null;
}

/** Every destination, for the surface that lists what REN can file into. */
export function destinations(): readonly Destination[] {
  return DESTINATIONS;
}

/** The route a capability would open, or null when it names nowhere. */
export function routeFor(args: CapabilityArgs): Route | null {
  if (!args.appId) return null;
  const app = getApplication(args.appId);
  if (!app) return null;
  return (app.href ?? app.overviewHref) as Route;
}

/**
 * Where a captured record belongs.
 *
 * Resolution is by what the founder said, in order of how specific it is:
 * a named section wins, then a named application's first section, then the
 * place NN keeps things that have no home yet. It never guesses between two
 * equally good matches — an ambiguous instruction comes back unresolved so
 * REN can ask rather than file something in the wrong application.
 */
export function resolveDestination(text: string): {
  collection: string; appId: string; label: string;
} | null {
  const needle = text.toLowerCase();

  // A named place wins over a named application: "a transaction in Finance"
  // and "a note in Finance" land in different collections, and the noun is
  // what distinguishes them.
  const named = DESTINATIONS.filter((d) => {
    const word = d.name.toLowerCase();
    const singular = word.endsWith("s") ? word.slice(0, -1) : word;
    return (
      new RegExp(`\\b${escapeForRegExp(word)}\\b`).test(needle) ||
      new RegExp(`\\b${escapeForRegExp(singular)}\\b`).test(needle)
    );
  });
  if (named.length === 1) {
    const hit = named[0]!;
    return { collection: hit.collection, appId: hit.appId, label: hit.label };
  }
  // Several places share a name — "Notes" exists in more than one application.
  // If they all belong to the same one, that is still an answer.
  if (named.length > 1) {
    const apps = new Set(named.map((d) => d.appId));
    if (apps.size === 1) {
      const hit = named[0]!;
      return { collection: hit.collection, appId: hit.appId, label: hit.label };
    }
    const alsoNamed = named.filter((d) =>
      new RegExp(`\\b${escapeForRegExp(d.appName.toLowerCase())}\\b`).test(needle),
    );
    if (alsoNamed.length === 1) {
      const hit = alsoNamed[0]!;
      return { collection: hit.collection, appId: hit.appId, label: hit.label };
    }
  }

  // Only an application was named: its first collection is its front door.
  const appHits = APPLICATIONS.filter((app) =>
    // Whole word, so "Mind" does not match "reminder".
    new RegExp(`\\b${escapeForRegExp(app.name.toLowerCase())}\\b`).test(needle),
  );
  if (appHits.length === 1) {
    const first = DESTINATIONS.find((d) => d.appId === appHits[0]!.id);
    if (first) return { collection: first.collection, appId: first.appId, label: first.label };
  }

  return null;
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The application the founder most likely meant, or null if it is unclear. */
export function resolveApplication(text: string): string | null {
  const matches = matchApplications(text.trim());
  if (matches.length === 0) return null;
  const exact = matches.find((app) => app.name.toLowerCase() === text.trim().toLowerCase());
  if (exact) return exact.id;
  // One clear match is a decision; several is a question, and REN asks it.
  return matches.length === 1 ? matches[0]!.id : null;
}

/* ----------------------------------------------------------------- plans -- */

/**
 * One thing REN intends to do, fully resolved.
 *
 * A plan is inert. It names a capability and its arguments and says what it
 * would cost — nothing has happened yet. Holding that as a value is what lets
 * NN show the founder the consequence *before* it is paid, and what lets a
 * model propose an action without being able to perform one.
 */
export interface RenPlan {
  capability: CapabilityId;
  args: CapabilityArgs;
  /** What REN will say it is doing. */
  summary: string;
  consequence: Consequence;
}

export function plan(capability: CapabilityId, args: CapabilityArgs): RenPlan {
  const spec = CAPABILITIES[capability];
  return {
    capability,
    args,
    summary: spec.describes(args),
    consequence: spec.consequence,
  };
}

/** True when NN must ask before doing this. */
export function needsConfirmation(p: RenPlan): boolean {
  return p.consequence !== "none";
}

/**
 * True when NN must see the founder's own biometric before doing this.
 *
 * The device performs the check; NN only ever receives the assertion. This is
 * the same passkey that proves ownership of NN, which is the point: deleting
 * a record should cost exactly what signing in costs, and no less.
 */
export function needsReauthentication(p: RenPlan): boolean {
  return p.consequence === "sensitive";
}

/** Everything REN can do, for the surface that lists it. */
export function capabilityList(): readonly CapabilitySpec[] {
  return Object.values(CAPABILITIES);
}
