import type { IconName } from "@/components/ui";

/**
 * One shared content set, used by all three directions.
 *
 * The comparison is only fair if each direction renders exactly the same
 * material. This is ILLUSTRATIVE sample content for design evaluation — it is
 * labelled as such on screen and never presented as the founder's real data.
 */

export const SAMPLE_NOTICE =
  "Illustrative content for design comparison — not real data.";

export interface AppEntry { id: string; name: string; icon: IconName; hint: string }

export const APPS: readonly AppEntry[] = [
  { id: "life", name: "NN Life", icon: "calendar", hint: "3 today" },
  { id: "college", name: "NN College", icon: "book", hint: "CAT-II in 6 days" },
  { id: "academy", name: "NN Academy", icon: "graph", hint: "Python · unit 4" },
  { id: "projects", name: "NN Projects", icon: "grid", hint: "2 active" },
  { id: "finance", name: "NN Finance", icon: "wallet", hint: "Nov budget" },
  { id: "files", name: "NN Files", icon: "folder", hint: "12 recent" },
  { id: "memory", name: "NN Memory", icon: "sparkle", hint: "48 entries" },
  { id: "security", name: "NN Security", icon: "shield", hint: "All clear" },
];

export interface ContextEntry { id: string; label: string; value: string; detail: string; icon: IconName }

export const CONTEXT: readonly ContextEntry[] = [
  { id: "next", label: "Next", value: "Engineering Maths", detail: "09:00 · Block C", icon: "clock" },
  { id: "focus", label: "Focus", value: "Matrices revision", detail: "2 of 5 units", icon: "book" },
  { id: "due", label: "Due", value: "DSA assignment", detail: "Tomorrow, 23:59", icon: "check" },
];

export const GREETING = "Good evening, Founder.";
export const WHEN = "Saturday 8 November · 19:42";
