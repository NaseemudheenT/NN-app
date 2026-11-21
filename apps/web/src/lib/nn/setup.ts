"use client";

/**
 * Whether NN has been set up on this device.
 *
 * Deliberately **per device**, not per account, and that is a design
 * decision rather than a shortcut. Everything the first run configures —
 * the theme, how much motion is welcome, which voice REN speaks in — is a
 * property of the screen and speaker in front of you, not of the founder.
 * A new phone should ask again, because a new phone genuinely does not know
 * what voice it has installed or how bright its screen is.
 *
 * Storage can throw: private browsing, an embedded webview, a browser told
 * to refuse site data. Every path here survives that, and the cost of
 * failure is the setup appearing once more rather than NN breaking.
 */

const KEY = "nn.setup";
/**
 * Bumped when the setup asks something genuinely new.
 *
 * A founder who has answered v1 should not be dragged through it again for
 * a wording change — only when there is a new question worth their time.
 */
export const SETUP_VERSION = 1;

export interface SetupState {
  version: number;
  completedAt: string;
}

export function readSetup(): SetupState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<SetupState>;
    if (typeof parsed.version !== "number") return null;
    if (typeof parsed.completedAt !== "string") return null;
    return { version: parsed.version, completedAt: parsed.completedAt };
  } catch {
    return null;
  }
}

/** True when this device still needs the first run. */
export function needsSetup(): boolean {
  const state = readSetup();
  return state === null || state.version < SETUP_VERSION;
}

export function completeSetup(now: Date = new Date()): void {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ version: SETUP_VERSION, completedAt: now.toISOString() }),
    );
  } catch { /* the setup will simply ask again next time */ }
}

/** Only for the founder asking to see it again from Settings. */
export function forgetSetup(): void {
  try { window.localStorage.removeItem(KEY); } catch { /* nothing to undo */ }
}
