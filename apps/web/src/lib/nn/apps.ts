/**
 * The NN application registry.
 *
 * One list, read by the launcher, the dock, search, and the application
 * routes themselves. It was previously written out inside the home screen,
 * which meant nothing else could see it and every count had to be typed by
 * hand.
 *
 * `surface` is the honest part. NN has thirty-four approved applications and
 * most of them are not built; the registry says which, so no part of the
 * product has to guess, and nothing can offer to open a screen that does not
 * exist.
 */

import type { Route } from "next";

import type { IconName } from "@/components/ui/Icon";

export type AppFamily =
  | "Life & wellbeing"
  | "Education"
  | "Money & work"
  | "Creation & communication"
  | "Knowledge & insight"
  | "System";

export const APP_FAMILIES: readonly AppFamily[] = [
  "Life & wellbeing",
  "Education",
  "Money & work",
  "Creation & communication",
  "Knowledge & insight",
  "System",
];

export interface NNApplication {
  /** Stable, URL-safe. Never derived from the name at runtime. */
  slug: string;
  name: string;
  family: AppFamily;
  icon: IconName;
  description: string;
  /**
   * Where the application's real work surface lives.
   *
   * Typed as a `Route`, so a slug that does not correspond to an actual page
   * fails the build rather than producing a dead entry in the launcher.
   * `null` means it has not been built — a surface is only named here once it
   * reads and writes the founder's actual records.
   */
  route: Route | null;
  /** Owner collections the application works with. Drives search. */
  collections?: readonly string[];
}

export const APPLICATIONS: readonly NNApplication[] = [
  // ---- Life & wellbeing -------------------------------------------------
  { slug:"life", name:"Life", family:"Life & wellbeing", icon:"calendar",
    description:"Calendar, tasks, reminders, notes, habits, goals and routines",
    route:"/life", collections:["tasks","calendar_events","reminders","notes","goals"] },
  { slug:"soul", name:"Soul", family:"Life & wellbeing", icon:"sparkle",
    description:"Faith, purpose, gratitude and reflection", route:null },
  { slug:"mind", name:"Mind", family:"Life & wellbeing", icon:"graph",
    description:"Focus, resilience, reflection and personal growth", route:null },
  { slug:"body", name:"Body", family:"Life & wellbeing", icon:"check",
    description:"Fitness, nutrition, sleep and recovery", route:null },
  { slug:"contacts", name:"Contacts", family:"Life & wellbeing", icon:"grid",
    description:"People, important dates and follow-ups", route:null },
  { slug:"nature", name:"Nature & Universe", family:"Life & wellbeing", icon:"sparkle",
    description:"Science, astronomy and discovery", route:null },
  { slug:"peace", name:"Peace Mode", family:"Life & wellbeing", icon:"clock",
    description:"A quieter environment for focus and reflection", route:null },

  // ---- Education --------------------------------------------------------
  { slug:"college", name:"College", family:"Education", icon:"book",
    description:"SMVEC subjects, exams, notes and academic progress", route:null },
  { slug:"academy", name:"Academy", family:"Education", icon:"book",
    description:"Structured technical and professional learning", route:null },
  { slug:"formula-engine", name:"Formula Engine", family:"Education", icon:"graph",
    description:"Verified formulas, calculations and visualisation", route:null },
  { slug:"logic-lab", name:"Logic Lab", family:"Education", icon:"grid",
    description:"Reasoning, aptitude and programming challenges", route:null },
  { slug:"learning-vault", name:"Learning Vault", family:"Education", icon:"folder",
    description:"Books, research, flashcards and knowledge paths", route:null },

  // ---- Money & work -----------------------------------------------------
  { slug:"finance", name:"Finance", family:"Money & work", icon:"wallet",
    description:"Personal money, budgets, assets and financial goals", route:null },
  { slug:"invest", name:"Invest", family:"Money & work", icon:"graph",
    description:"Investment research, watchlists and portfolio tracking", route:null },
  { slug:"business", name:"Business", family:"Money & work", icon:"grid",
    description:"Ventures, validation, operations and decisions", route:null },
  { slug:"freelance", name:"Freelance", family:"Money & work", icon:"file",
    description:"Clients, proposals, deliverables and invoices", route:null },
  { slug:"career", name:"Career", family:"Money & work", icon:"book",
    description:"Skills, portfolio, interviews and career progress", route:null },
  { slug:"projects", name:"Projects", family:"Money & work", icon:"grid",
    description:"Milestones, dependencies and execution", route:null },
  { slug:"achievements", name:"Achievements", family:"Money & work", icon:"sparkle",
    description:"Verified milestones, certificates and evidence", route:null },

  // ---- Creation & communication ----------------------------------------
  { slug:"creator-studio", name:"Creator Studio", family:"Creation & communication", icon:"sparkle",
    description:"Photography, video, design and content planning", route:null },
  { slug:"studio", name:"Studio", family:"Creation & communication", icon:"file",
    description:"Writing, documents and publishing drafts", route:null },
  { slug:"mail", name:"Mail", family:"Creation & communication", icon:"file",
    description:"Connected inboxes, drafts and follow-ups", route:null },
  { slug:"english", name:"English", family:"Creation & communication", icon:"mic",
    description:"Speaking, listening, grammar and writing practice", route:null },

  // ---- Knowledge & insight ---------------------------------------------
  { slug:"files", name:"Files", family:"Knowledge & insight", icon:"folder",
    description:"Private documents, media and file organisation", route:null },
  { slug:"memory", name:"Memory", family:"Knowledge & insight", icon:"sparkle",
    description:"Owner-controlled knowledge with source and provenance", route:null },
  { slug:"life-archive", name:"Life Archive", family:"Knowledge & insight", icon:"clock",
    description:"A chronological record of milestones and memories", route:null },
  { slug:"analytics", name:"Analytics", family:"Knowledge & insight", icon:"graph",
    description:"Measured progress from real stored data", route:null },
  { slug:"travel", name:"Travel", family:"Knowledge & insight", icon:"calendar",
    description:"Trips, itineraries, maps and travel planning", route:null },
  { slug:"simulator", name:"Simulator", family:"Knowledge & insight", icon:"grid",
    description:"Safe financial, business, science and coding scenarios", route:null },

  // ---- System -----------------------------------------------------------
  { slug:"command-centre", name:"Command Centre", family:"System", icon:"sparkle",
    description:"Natural-language entry point and quick actions", route:null },
  { slug:"search", name:"Search", family:"System", icon:"search",
    description:"Permission-aware search across NN", route:"/search" },
  { slug:"automation-studio", name:"Automation Studio", family:"System", icon:"settings",
    description:"Triggers, workflows, approvals and run history", route:null },
  { slug:"security-centre", name:"Security Centre", family:"System", icon:"shield",
    description:"Passkeys, devices, sessions and audit history", route:null },
  { slug:"control-room", name:"Control Room", family:"System", icon:"settings",
    description:"System health, integrations, jobs and cost visibility", route:null },
];

/** The thirty-four approved applications, and no thirty-fifth. */
export const APPLICATION_COUNT = APPLICATIONS.length;

export function applicationsIn(family: AppFamily): readonly NNApplication[] {
  return APPLICATIONS.filter((app) => app.family === family);
}

export function applicationBySlug(slug: string): NNApplication | undefined {
  return APPLICATIONS.find((app) => app.slug === slug);
}

/** The applications that have a real work surface today. */
export function openableApplications(): readonly NNApplication[] {
  return APPLICATIONS.filter((app) => app.route !== null);
}

/**
 * Every owner collection any application works with.
 *
 * Search reads this rather than a second list of its own, so a collection
 * added to an application becomes searchable without anyone remembering to.
 */
export function searchableCollections(): readonly string[] {
  const names = new Set<string>();
  for (const app of APPLICATIONS) for (const name of app.collections ?? []) names.add(name);
  return [...names].sort();
}

/** Case-insensitive match across name, family and description. */
export function matchApplications(term: string): readonly NNApplication[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return APPLICATIONS;
  return APPLICATIONS.filter((app) =>
    `${app.name} ${app.family} ${app.description}`.toLowerCase().includes(needle));
}
