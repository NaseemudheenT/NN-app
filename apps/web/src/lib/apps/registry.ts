import type { IconName } from "@/components/ui/Icon";

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
  href?: "/life";
}

export const APPLICATIONS: readonly NNApplication[] = [
  { id: "life", name: "Life", group: "Life & wellbeing", icon: "calendar", description: "Calendar, tasks, reminders, notes, habits, goals and routines", availability: "available", href: "/life" },
  { id: "soul", name: "Soul", group: "Life & wellbeing", icon: "sparkle", description: "Faith, purpose, gratitude and reflection", availability: "planned" },
  { id: "mind", name: "Mind", group: "Life & wellbeing", icon: "graph", description: "Focus, resilience, reflection and personal growth", availability: "planned" },
  { id: "body", name: "Body", group: "Life & wellbeing", icon: "check", description: "Fitness, nutrition, sleep and recovery", availability: "planned" },
  { id: "contacts", name: "Contacts", group: "Life & wellbeing", icon: "grid", description: "People, important dates and follow-ups", availability: "planned" },
  { id: "nature-universe", name: "Nature & Universe", group: "Life & wellbeing", icon: "sparkle", description: "Science, astronomy and discovery", availability: "planned" },
  { id: "peace-mode", name: "Peace Mode", group: "Life & wellbeing", icon: "clock", description: "A quieter environment for focus and reflection", availability: "planned" },

  { id: "college", name: "College", group: "Education", icon: "book", description: "SMVEC subjects, exams, notes and academic progress", availability: "planned" },
  { id: "academy", name: "Academy", group: "Education", icon: "book", description: "Structured technical and professional learning", availability: "planned" },
  { id: "formula-engine", name: "Formula Engine", group: "Education", icon: "graph", description: "Verified formulas, calculations and visualisation", availability: "planned" },
  { id: "logic-lab", name: "Logic Lab", group: "Education", icon: "grid", description: "Reasoning, aptitude and programming challenges", availability: "planned" },
  { id: "learning-vault", name: "Learning Vault", group: "Education", icon: "folder", description: "Books, research, flashcards and knowledge paths", availability: "planned" },

  { id: "finance", name: "Finance", group: "Money & work", icon: "wallet", description: "Personal money, budgets, assets and financial goals", availability: "planned" },
  { id: "invest", name: "Invest", group: "Money & work", icon: "graph", description: "Investment research, watchlists and portfolio tracking", availability: "planned" },
  { id: "business", name: "Business", group: "Money & work", icon: "grid", description: "Ventures, validation, operations and decisions", availability: "planned" },
  { id: "freelance", name: "Freelance", group: "Money & work", icon: "file", description: "Clients, proposals, deliverables and invoices", availability: "planned" },
  { id: "career", name: "Career", group: "Money & work", icon: "book", description: "Skills, portfolio, interviews and career progress", availability: "planned" },
  { id: "projects", name: "Projects", group: "Money & work", icon: "grid", description: "Milestones, dependencies and execution", availability: "planned" },
  { id: "achievements", name: "Achievements", group: "Money & work", icon: "sparkle", description: "Verified milestones, certificates and evidence", availability: "planned" },

  { id: "creator-studio", name: "Creator Studio", group: "Creation & communication", icon: "sparkle", description: "Photography, video, design and content planning", availability: "planned" },
  { id: "studio", name: "Studio", group: "Creation & communication", icon: "file", description: "Writing, documents and publishing drafts", availability: "planned" },
  { id: "mail", name: "Mail", group: "Creation & communication", icon: "file", description: "Connected inboxes, drafts and follow-ups", availability: "planned" },
  { id: "english", name: "English", group: "Creation & communication", icon: "mic", description: "Speaking, listening, grammar and writing practice", availability: "planned" },

  { id: "files", name: "Files", group: "Knowledge & insight", icon: "folder", description: "Private documents, media and file organisation", availability: "planned" },
  { id: "memory", name: "Memory", group: "Knowledge & insight", icon: "sparkle", description: "Owner-controlled knowledge with source and provenance", availability: "planned" },
  { id: "life-archive", name: "Life Archive", group: "Knowledge & insight", icon: "clock", description: "A chronological record of milestones and memories", availability: "planned" },
  { id: "analytics", name: "Analytics", group: "Knowledge & insight", icon: "graph", description: "Measured progress from real stored data", availability: "planned" },
  { id: "travel", name: "Travel", group: "Knowledge & insight", icon: "calendar", description: "Trips, itineraries, maps and travel planning", availability: "planned" },
  { id: "simulator", name: "Simulator", group: "Knowledge & insight", icon: "grid", description: "Safe financial, business, science and coding scenarios", availability: "planned" },

  { id: "command-centre", name: "Command Centre", group: "System", icon: "sparkle", description: "Natural-language entry point and quick actions", availability: "planned" },
  { id: "search", name: "Search", group: "System", icon: "search", description: "Permission-aware search across NN", availability: "planned" },
  { id: "automation-studio", name: "Automation Studio", group: "System", icon: "settings", description: "Triggers, workflows, approvals and run history", availability: "planned" },
  { id: "security-centre", name: "Security Centre", group: "System", icon: "shield", description: "Passkeys, devices, sessions and audit history", availability: "planned" },
  { id: "control-room", name: "Control Room", group: "System", icon: "settings", description: "System health, integrations, jobs and cost visibility", availability: "planned" },
] as const;

const GROUP_DETAILS: ReadonlyArray<{ name: NNAppGroup; detail: string; icon: IconName }> = [
  { name: "Life & wellbeing", detail: "Plan, organise and live well", icon: "calendar" },
  { name: "Education", detail: "Learn, practise and master", icon: "book" },
  { name: "Money & work", detail: "Build, manage and measure", icon: "wallet" },
  { name: "Creation & communication", detail: "Create, write and communicate", icon: "sparkle" },
  { name: "Knowledge & insight", detail: "Store, recall and understand", icon: "folder" },
  { name: "System", detail: "Control, search and protect NN", icon: "settings" },
];

export const GROUPS = GROUP_DETAILS.map((group) => ({
  ...group,
  count: String(APPLICATIONS.filter((app) => app.group === group.name).length).padStart(2, "0"),
}));

export const getApplication = (idOrName: string) =>
  APPLICATIONS.find(
    (app) => app.id === idOrName || app.name.toLowerCase() === idOrName.toLowerCase(),
  );
