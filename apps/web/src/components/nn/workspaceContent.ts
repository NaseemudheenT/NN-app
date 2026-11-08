import type { IconName } from "@/components/ui/Icon";

/**
 * Illustrative content for the NN workspace.
 *
 * This is sample material so the workspace can be designed, measured and
 * verified against realistic density — a timetable, a revision load, a week of
 * actual hours. It is labelled as illustrative wherever it appears on screen
 * and is never presented as the founder's real data.
 */

export const WORKSPACE_SAMPLE_NOTICE =
  "Illustrative content — not real data. REN is a designed surface here and performs nothing yet.";

export type EntryKind = "class" | "study" | "task" | "build" | "admin";

export interface WorkspaceEntry {
  id: string;
  name: string;
  kind: EntryKind;
  when: string;
  /** Minutes. Always positive — the two series are studied and planned. */
  minutes: number;
  status: "Done" | "Planned";
}

export interface WorkspaceGoal {
  id: string;
  name: string;
  done: number;
  target: number;
  unit: string;
}

export interface WorkspacePoint {
  label: string;
  /** Minutes actually spent. Nonnegative. */
  studied: number;
  /** Minutes the day was planned for. Nonnegative. */
  planned: number;
}

export interface WorkspacePeriod {
  id: string;
  label: string;
  points: readonly WorkspacePoint[];
  description?: string;
}

export const KIND_ICON: Record<EntryKind, IconName> = {
  class: "calendar",
  study: "book",
  task: "check",
  build: "grid",
  admin: "settings",
};

export const KIND_LABEL: Record<EntryKind, string> = {
  class: "Class",
  study: "Study",
  task: "Task",
  build: "Build",
  admin: "Admin",
};

export const ENTRIES: readonly WorkspaceEntry[] = [
  { id: "e1", name: "Engineering Mathematics", kind: "class", when: "Today · 09:00", minutes: 50, status: "Done" },
  { id: "e2", name: "Matrices — revision set 3", kind: "study", when: "Today · 11:20", minutes: 95, status: "Done" },
  { id: "e3", name: "DSA assignment", kind: "task", when: "Today · 14:00", minutes: 70, status: "Planned" },
  { id: "e4", name: "NN — coverflow launcher", kind: "build", when: "Today · 16:30", minutes: 140, status: "Planned" },
  { id: "e5", name: "Data Structures lab", kind: "class", when: "Yesterday · 10:00", minutes: 110, status: "Done" },
  { id: "e6", name: "Python — unit 4 exercises", kind: "study", when: "Yesterday · 15:10", minutes: 65, status: "Done" },
  { id: "e7", name: "Fee receipt filed", kind: "admin", when: "Yesterday · 18:40", minutes: 10, status: "Done" },
  { id: "e8", name: "Operating Systems — paging", kind: "study", when: "6 Nov · 20:00", minutes: 80, status: "Done" },
  { id: "e9", name: "Digital Electronics", kind: "class", when: "6 Nov · 11:00", minutes: 50, status: "Done" },
  { id: "e10", name: "Project brief — NN Finance", kind: "build", when: "5 Nov · 21:15", minutes: 125, status: "Done" },
];

export const GOALS: readonly WorkspaceGoal[] = [
  { id: "cat2", name: "CAT-II revision", done: 11, target: 18, unit: "units" },
  { id: "python", name: "Python track", done: 4, target: 9, unit: "modules" },
  { id: "dsa", name: "DSA problem set", done: 62, target: 120, unit: "problems" },
];

export const PERIODS: readonly WorkspacePeriod[] = [
  {
    id: "week",
    label: "Week",
    description: "Minutes per day for the selected week.",
    points: [
      { label: "Mon", studied: 215, planned: 240 },
      { label: "Tue", studied: 180, planned: 240 },
      { label: "Wed", studied: 265, planned: 210 },
      { label: "Thu", studied: 150, planned: 240 },
      { label: "Fri", studied: 205, planned: 180 },
      { label: "Sat", studied: 310, planned: 300 },
      { label: "Sun", studied: 120, planned: 150 },
    ],
  },
  {
    id: "month",
    label: "Month",
    description: "Minutes across November so far. Each point is its labelled interval.",
    points: [
      { label: "1 Nov", studied: 160, planned: 210 },
      { label: "3 Nov", studied: 205, planned: 210 },
      { label: "6 Nov", studied: 240, planned: 240 },
      { label: "8 Nov", studied: 195, planned: 240 },
      { label: "11 Nov", studied: 260, planned: 240 },
      { label: "13 Nov", studied: 230, planned: 270 },
      { label: "16 Nov", studied: 300, planned: 270 },
      { label: "18 Nov", studied: 275, planned: 300 },
      { label: "21 Nov", studied: 320, planned: 300 },
      { label: "23 Nov", studied: 290, planned: 300 },
      { label: "26 Nov", studied: 345, planned: 330 },
      { label: "30 Nov", studied: 310, planned: 330 },
    ],
  },
  {
    id: "term",
    label: "Term",
    description: "Monthly totals for the current term.",
    points: [
      { label: "Jul", studied: 2850, planned: 3200 },
      { label: "Aug", studied: 3400, planned: 3400 },
      { label: "Sep", studied: 3950, planned: 3600 },
      { label: "Oct", studied: 4220, planned: 4000 },
      { label: "Nov", studied: 2480, planned: 4000 },
    ],
  },
];

export interface LauncherApp {
  id: string;
  name: string;
  icon: IconName;
  hint: string;
}

export const LAUNCHER: readonly LauncherApp[] = [
  { id: "life", name: "NN Life", icon: "calendar", hint: "3 today" },
  { id: "college", name: "NN College", icon: "book", hint: "CAT-II in 6 days" },
  { id: "academy", name: "NN Academy", icon: "graph", hint: "Python · unit 4" },
  { id: "projects", name: "NN Projects", icon: "grid", hint: "2 active" },
  { id: "finance", name: "NN Finance", icon: "wallet", hint: "Nov budget" },
  { id: "files", name: "NN Files", icon: "folder", hint: "12 recent" },
  { id: "memory", name: "NN Memory", icon: "sparkle", hint: "48 entries" },
  { id: "security", name: "NN Security", icon: "shield", hint: "All clear" },
  { id: "control", name: "NN Control", icon: "settings", hint: "Spark · dev" },
];
