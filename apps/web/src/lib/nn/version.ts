/**
 * Which NN this is.
 *
 * An operating environment that cannot say what version it is cannot be
 * debugged by the person using it: "it is broken" and "it is broken on the
 * build from Tuesday" are different reports, and only one of them is
 * actionable. NN had no answer at all.
 *
 * The build id comes from Vercel's own commit SHA where there is one, and
 * falls back to a development marker. It is deliberately **not** a version
 * number NN maintains by hand — a number someone has to remember to raise
 * is a number that is wrong.
 */

/** A human name for the current generation of NN. Raised deliberately. */
export const NN_RELEASE = "1.0";

/** Set at build time by Vercel. Absent in development. */
export function buildId(env: Record<string, string | undefined> = process.env): string {
  const sha = (env["VERCEL_GIT_COMMIT_SHA"] ?? "").trim();
  if (sha.length >= 7) return sha.slice(0, 7);
  return "dev";
}

export interface Change {
  /** ISO date. What the founder actually scans for. */
  at: string;
  /** One line, in plain words. What changed, not which file. */
  said: string;
}

/**
 * What changed, newest first.
 *
 * Written for the founder, not for a developer: each line says what is
 * different about using NN, and nothing says "refactored" or names a module.
 * A changelog nobody can read is a changelog nobody reads.
 */
export const CHANGES: readonly Change[] = [
  { at: "2026-11-21", said: "Settings redrawn as a proper grouped list, with a press state for touch." },
  { at: "2026-11-21", said: "NN now tells you which version it is, and notices when a new one is ready." },
  { at: "2026-11-21", said: "A first run that sets up NN on each device, in four questions." },
  { at: "2026-11-21", said: "REN's voice can be changed by asking — male, female, or the device's own." },
  { at: "2026-11-21", said: "Every touch target on the phone now meets 44px, and nothing is under 12px." },
  { at: "2026-11-20", said: "NN signs you in itself, so sign-in no longer depends on Firebase." },
  { at: "2026-11-20", said: "Your records read and write again, through NN's own server." },
  { at: "2026-11-20", said: "REN can hold a conversation, and can call NN's tools to act on it." },
  { at: "2026-11-19", said: "The password door is always offered, so a wrong flag cannot lock you out." },
];
