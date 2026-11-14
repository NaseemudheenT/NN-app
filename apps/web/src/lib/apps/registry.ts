import type { Route } from "next";

import type { IconName } from "@/components/ui/Icon";
import { APP_SECTIONS } from "./sections";

/**
 * Canonical frontend navigation registry.
 *
 * This mirrors the approved 34-app registry. REN is an ambient assistant
 * capability, not a launcher application; App Factory is a system capability,
 * not a user-facing app. A surface is available only when a real route exists.
 */

export type NNAppGroup =
  | "Life & wellbeing"
  | "Education"
  | "Money & work"
  | "Creation & communication"
  | "Knowledge & insight"
  | "System";

export interface NNApplication {
  id: string;
  name: string;
  group: NNAppGroup;
  icon: IconName;
  description: string;
  availability: "available" | "planned";
  /**
   * Operational route, present only when the application itself works.
   *
   * Typed as a `Route`, so naming a page that does not exist fails the build
   * rather than putting a dead entry in the launcher.
   */
  href?: Route;
  /**
   * Owner collections this application reads and writes.
   *
   * Search derives what it can reach from here rather than keeping a second
   * list, so a collection added to an application becomes searchable without
   * anyone remembering to. Server-written collections never appear: the rules
   * refuse a client read, and offering one would only produce a denial NN
   * caused itself.
   */
  collections?: readonly string[];
  /** Honest discovery page for the application, including planned surfaces. */
  overviewHref: string;
}

const REGISTERED: readonly NNApplication[] = [
  { id: "life", name: "Life", group: "Life & wellbeing", icon: "calendar", description: "Calendar, tasks, reminders, notes, habits, goals and routines", availability: "available", overviewHref: "/apps/life", href: "/life", collections: ["tasks", "calendar_events", "reminders", "notes", "goals"] },
  { id: "soul", name: "Soul", group: "Life & wellbeing", icon: "sparkle", description: "Faith, purpose, gratitude and reflection", availability: "planned", overviewHref: "/apps/soul" },
  { id: "mind", name: "Mind", group: "Life & wellbeing", icon: "graph", description: "Focus, resilience, reflection and personal growth", availability: "planned", overviewHref: "/apps/mind" },
  { id: "body", name: "Body", group: "Life & wellbeing", icon: "check", description: "Fitness, nutrition, sleep and recovery", availability: "planned", overviewHref: "/apps/body" },
  { id: "contacts", name: "Contacts", group: "Life & wellbeing", icon: "grid", description: "People, important dates and follow-ups", availability: "planned", overviewHref: "/apps/contacts" },
  { id: "nature-universe", name: "Nature & Universe", group: "Life & wellbeing", icon: "sparkle", description: "Science, astronomy and discovery", availability: "planned", overviewHref: "/apps/nature-universe" },
  { id: "peace-mode", name: "Peace Mode", group: "Life & wellbeing", icon: "clock", description: "A quieter environment for focus and reflection", availability: "planned", overviewHref: "/apps/peace-mode" },

  { id: "college", name: "College", group: "Education", icon: "book", description: "SMVEC subjects, exams, notes and academic progress", availability: "planned", overviewHref: "/apps/college" },
  { id: "academy", name: "Academy", group: "Education", icon: "book", description: "Structured technical and professional learning", availability: "planned", overviewHref: "/apps/academy" },
  { id: "formula-engine", name: "Formula Engine", group: "Education", icon: "graph", description: "Verified formulas, calculations and visualisation", availability: "planned", overviewHref: "/apps/formula-engine" },
  { id: "logic-lab", name: "Logic Lab", group: "Education", icon: "grid", description: "Reasoning, aptitude and programming challenges", availability: "planned", overviewHref: "/apps/logic-lab" },
  { id: "learning-vault", name: "Learning Vault", group: "Education", icon: "folder", description: "Books, research, flashcards and knowledge paths", availability: "planned", overviewHref: "/apps/learning-vault" },

  { id: "finance", name: "Finance", group: "Money & work", icon: "wallet", description: "Personal money, budgets, assets and financial goals", availability: "planned", overviewHref: "/apps/finance" },
  { id: "invest", name: "Invest", group: "Money & work", icon: "graph", description: "Investment research, watchlists and portfolio tracking", availability: "planned", overviewHref: "/apps/invest" },
  { id: "business", name: "Business", group: "Money & work", icon: "grid", description: "Ventures, validation, operations and decisions", availability: "planned", overviewHref: "/apps/business" },
  { id: "freelance", name: "Freelance", group: "Money & work", icon: "file", description: "Clients, proposals, deliverables and invoices", availability: "planned", overviewHref: "/apps/freelance" },
  { id: "career", name: "Career", group: "Money & work", icon: "book", description: "Skills, portfolio, interviews and career progress", availability: "planned", overviewHref: "/apps/career" },
  { id: "projects", name: "Projects", group: "Money & work", icon: "grid", description: "Milestones, dependencies and execution", availability: "planned", overviewHref: "/apps/projects" },
  { id: "achievements", name: "Achievements", group: "Money & work", icon: "sparkle", description: "Verified milestones, certificates and evidence", availability: "planned", overviewHref: "/apps/achievements" },

  { id: "creator-studio", name: "Creator Studio", group: "Creation & communication", icon: "sparkle", description: "Photography, video, design and content planning", availability: "planned", overviewHref: "/apps/creator-studio" },
  { id: "studio", name: "Studio", group: "Creation & communication", icon: "file", description: "Writing, documents and publishing drafts", availability: "planned", overviewHref: "/apps/studio" },
  { id: "mail", name: "Mail", group: "Creation & communication", icon: "file", description: "Connected inboxes, drafts and follow-ups", availability: "planned", overviewHref: "/apps/mail" },
  { id: "english", name: "English", group: "Creation & communication", icon: "mic", description: "Speaking, listening, grammar and writing practice", availability: "planned", overviewHref: "/apps/english" },

  { id: "files", name: "Files", group: "Knowledge & insight", icon: "folder", description: "Private documents, media and file organisation", availability: "available", overviewHref: "/apps/files", href: "/files", collections: ["documents"] },
  { id: "memory", name: "Memory", group: "Knowledge & insight", icon: "sparkle", description: "Owner-controlled knowledge with source and provenance", availability: "planned", overviewHref: "/apps/memory" },
  { id: "life-archive", name: "Life Archive", group: "Knowledge & insight", icon: "clock", description: "A chronological record of milestones and memories", availability: "planned", overviewHref: "/apps/life-archive" },
  { id: "analytics", name: "Analytics", group: "Knowledge & insight", icon: "graph", description: "Measured progress from real stored data", availability: "planned", overviewHref: "/apps/analytics" },
  { id: "travel", name: "Travel", group: "Knowledge & insight", icon: "calendar", description: "Trips, itineraries, maps and travel planning", availability: "planned", overviewHref: "/apps/travel" },
  { id: "simulator", name: "Simulator", group: "Knowledge & insight", icon: "grid", description: "Safe financial, business, science and coding scenarios", availability: "planned", overviewHref: "/apps/simulator" },

  { id: "command-centre", name: "Command Centre", group: "System", icon: "sparkle", description: "Natural-language entry point and quick actions", availability: "planned", overviewHref: "/apps/command-centre" },
  { id: "search", name: "Search", group: "System", icon: "search", description: "Permission-aware search across NN", availability: "available", overviewHref: "/apps/search", href: "/search" },
  { id: "automation-studio", name: "Automation Studio", group: "System", icon: "settings", description: "Triggers, workflows, approvals and run history", availability: "planned", overviewHref: "/apps/automation-studio" },
  { id: "security-centre", name: "Security Centre", group: "System", icon: "shield", description: "Passkeys, devices, sessions and audit history", availability: "planned", overviewHref: "/apps/security-centre" },
  { id: "control-room", name: "Control Room", group: "System", icon: "settings", description: "System health, integrations, jobs and cost visibility", availability: "planned", overviewHref: "/apps/control-room" },
] as const;

/**
 * The registry, with each application's surface and collections filled in
 * from its sections.
 *
 * Derived rather than retyped: an application is available exactly when it
 * has somewhere real to work, and it reads exactly the collections its
 * sections name. Keeping those as three hand-maintained facts is how a
 * launcher ends up offering a screen that does not exist.
 */
export const APPLICATIONS: readonly NNApplication[] = REGISTERED.map((app) => {
  const sections = APP_SECTIONS[app.id];
  if (!sections || sections.length === 0) return app;
  // `overviewHref` is a plain string because it is derived from the id;
  // asserting it here is safe because /apps/[appId] is a real route and the
  // id came from this same array.
  const href = (app.href ?? app.overviewHref) as Route;
  return {
    ...app,
    availability: "available",
    href,
    collections: app.collections ?? sections.map((section) => section.collection),
  };
});

const GROUP_DETAILS: ReadonlyArray<{ name: NNAppGroup; detail: string; icon: IconName }> = [
  { name: "Life & wellbeing", detail: "Plan, organise and live well", icon: "calendar" },
  { name: "Education", detail: "Learn, practise and master", icon: "book" },
  { name: "Money & work", detail: "Build, manage and measure", icon: "wallet" },
  { name: "Creation & communication", detail: "Create, write and communicate", icon: "sparkle" },
  { name: "Knowledge & insight", detail: "Store, recall and understand", icon: "folder" },
  { name: "System", detail: "Control, search and protect NN", icon: "settings" },
];

/**
 * A URL-safe slug for a family.
 *
 * Derived rather than stored, because the family names are the canonical
 * thing and a second hand-written list would drift from them.
 */
export function familySlug(group: NNAppGroup): string {
  return group.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export const GROUPS = GROUP_DETAILS.map((group) => ({
  ...group,
  slug: familySlug(group.name),
  count: String(APPLICATIONS.filter((app) => app.group === group.name).length).padStart(2, "0"),
}));

export type NNFamily = (typeof GROUPS)[number];

export function familyBySlug(slug: string): NNFamily | undefined {
  return GROUPS.find((group) => group.slug === slug);
}

export function applicationsInFamily(group: NNAppGroup): readonly NNApplication[] {
  return APPLICATIONS.filter((app) => app.group === group);
}

export const getApplication = (idOrName: string) =>
  APPLICATIONS.find(
    (app) => app.id === idOrName || app.name.toLowerCase() === idOrName.toLowerCase(),
  );


/* ---------------------------------------------------------------------- */

/** The applications with a real, working surface today. */
export function openableApplications(): readonly NNApplication[] {
  return APPLICATIONS.filter((app) => app.href !== undefined);
}

/**
 * Every owner collection any application works with, sorted and deduplicated.
 *
 * Derived from the registry rather than listed separately, so the two cannot
 * fall out of step.
 */
export function searchableCollections(): readonly string[] {
  const names = new Set<string>();
  for (const app of APPLICATIONS) for (const name of app.collections ?? []) names.add(name);
  return [...names].sort();
}

/** Case-insensitive match across name, group and description. */
export function matchApplications(term: string): readonly NNApplication[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return APPLICATIONS;
  return APPLICATIONS.filter((app) =>
    `${app.name} ${app.group} ${app.description}`.toLowerCase().includes(needle));
}
