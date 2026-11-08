/**
 * What REN knows about where the founder is.
 *
 * REN must not have to be told "I am on the workspace page". This maps the
 * current route onto a description REN can reason from, and onto the
 * suggestions worth offering *there* rather than a generic list.
 *
 * It is deliberately a pure function of the path: no guessing, no inference
 * from content, nothing that could be wrong without being obviously wrong.
 */

export interface RenPageContext {
  /** The route this describes. */
  path: string;
  /** What the founder would call this place. */
  name: string;
  /** One line REN can use to ground an answer. */
  summary: string;
  /** Offered on this page only. Each must correspond to something real. */
  suggestions: readonly string[];
}

interface Entry {
  match: (path: string) => boolean;
  build: (path: string) => Omit<RenPageContext, "path">;
}

const ENTRIES: readonly Entry[] = [
  {
    match: (p) => p === "/",
    build: () => ({
      name: "the entrance",
      summary: "The founder is at NN's entrance, before signing in.",
      suggestions: ["Open the design system", "Take me to the workspace", "What is NN?"],
    }),
  },
  {
    match: (p) => p === "/workspace" || p === "/design/workspace",
    build: () => ({
      name: "the workspace",
      summary:
        "The founder is in the NN workspace, which shows time spent against planned, recent activity and goals.",
      suggestions: ["Show my goals", "Open the timeline", "How am I doing this month?"],
    }),
  },
  {
    match: (p) => p === "/design/cinematic",
    build: () => ({
      name: "the cinematic system",
      summary: "The founder is looking at NN's materials: the room, the glass, the ring and the corridor.",
      suggestions: ["Open the design system", "Take me to the workspace"],
    }),
  },
  {
    match: (p) => p.startsWith("/design"),
    build: () => ({
      name: "the design system",
      summary: "The founder is in NN's design system, reviewing components and tokens.",
      suggestions: ["Show the cinematic layer", "Take me to the workspace"],
    }),
  },
  {
    match: (p) => p === "/sign-in",
    build: () => ({
      name: "sign-in",
      summary: "The founder is signing in to NN with a passkey.",
      suggestions: ["What is a passkey?"],
    }),
  },
  {
    match: (p) => p === "/offline",
    build: () => ({
      name: "the offline screen",
      summary: "NN has no connection, so it cannot reach the founder's data.",
      suggestions: [],
    }),
  },
];

const FALLBACK: Omit<RenPageContext, "path"> = {
  name: "NN",
  summary: "The founder is somewhere in NN.",
  suggestions: ["Take me to the workspace", "Open the design system"],
};

export function describePage(path: string | null): RenPageContext {
  const safe = path ?? "/";
  const entry = ENTRIES.find((e) => e.match(safe));
  return { path: safe, ...(entry ? entry.build(safe) : FALLBACK) };
}
