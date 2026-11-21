/**
 * Exploring NN without an account.
 *
 * The founder needs to walk the whole environment before a passkey exists on
 * it. This is that door, and it is deliberately narrow:
 *
 * - **It is one environment variable.** Removing `NEXT_PUBLIC_NN_PREVIEW`
 *   closes it everywhere, with no code change and no deploy of new source.
 * - **It grants nothing.** No session is created, no token is minted. The
 *   Firestore rules are untouched and still require a real owner, so every
 *   panel reports honestly that it could not read. What is visible is the
 *   environment itself, not anyone's records.
 * - **It cannot be stumbled into.** It lives for one browser tab, set only by
 *   pressing the button on the sign-in page, and it is cleared the moment a
 *   real session begins.
 * - **It announces itself.** Every surface entered this way carries a banner,
 *   so it is never mistaken for being signed in.
 */

/** One browser tab, cleared by closing it. Never localStorage. */
export const PREVIEW_KEY = "nn.temporary-guest";

/** Whether this deployment offers the door at all. */
export function previewOffered(): boolean {
  return process.env.NEXT_PUBLIC_NN_PREVIEW === "1";
}

/** Whether this tab came through it. */
export function inPreview(): boolean {
  if (typeof window === "undefined") return false;
  if (!previewOffered()) return false;
  try {
    return window.sessionStorage.getItem(PREVIEW_KEY) === "1";
  } catch {
    // Private browsing can refuse session storage. Refusing the preview is
    // the correct failure: it is a convenience, not a capability.
    return false;
  }
}

export function enterPreview(): void {
  try {
    window.sessionStorage.setItem(PREVIEW_KEY, "1");
  } catch {
    /* Nothing to do: the next read returns false and the gate holds. */
  }
}

export function leavePreview(): void {
  try {
    window.sessionStorage.removeItem(PREVIEW_KEY);
  } catch {
    /* Already gone, as far as anything that matters is concerned. */
  }
}
