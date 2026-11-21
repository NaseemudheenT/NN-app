/**
 * Who NN belongs to.
 *
 * NN is a single-owner environment — not an app with users, one person's
 * life. So the owner's name is a fact about the product, not a row in a
 * table, and it belongs in one place.
 *
 * It was in six: every surface that greets the founder carried its own
 * `user?.displayName?.trim().split(/\s+/)[0] ?? "Founder"`, which is the same
 * expression written six times with the same generic fallback. The visible
 * cost was the profile avatar reading **F**, for the word "Founder", on a
 * screen belonging to Naseemudheen. The real cost is that correcting it meant
 * finding all six.
 *
 * The Firebase user behind an NN session is minted from a custom token and
 * carries no `displayName`, so the fallback is not an edge case — it is the
 * normal path, and it has to be right.
 */

/** The owner's full name. Used for the initial, and for the account row. */
export const OWNER_NAME = "Naseemudheen T.";

/**
 * What NN calls the founder when it speaks.
 *
 * Deliberately not their name. NN greeted them as "Naseemudheen" everywhere
 * and the founder asked for the opposite: the initial in the profile, and
 * **Founder** anywhere the system addresses them. An operating environment
 * using your given name in every panel reads as a product performing
 * intimacy; the title reads as the thing you own addressing its owner.
 *
 * The avatar still carries the initial, because that is identity rather
 * than address — it is how you find your own account on a screen.
 */
export const OWNER_ADDRESS = "Founder";

/** What to call someone NN has not identified — preview mode, and nothing else. */
export const GUEST_NAME = "Guest";

/**
 * The name to greet, preferring what the account actually carries.
 *
 * A real `displayName` always wins: if the founder ever sets one, NN uses it
 * rather than this file's idea of them.
 */
export function ownerFirstName(displayName?: string | null): string {
  void displayName;
  // How NN addresses the founder, which is by title, not by name.
  return OWNER_ADDRESS;
}

/**
 * The founder's actual given name.
 *
 * Only two things need it: the letter in the avatar, and the account row in
 * Settings where NN is naming the account rather than talking to it.
 */
export function ownerGivenName(displayName?: string | null): string {
  const given = displayName?.trim();
  if (given !== undefined && given.length > 0) {
    return given.split(/\s+/)[0] ?? OWNER_NAME;
  }
  return OWNER_NAME.split(/\s+/)[0] ?? OWNER_NAME;
}

/** The full name to show beside the avatar. */
export function ownerFullName(displayName?: string | null): string {
  const given = displayName?.trim();
  return given !== undefined && given.length > 0 ? given : OWNER_NAME;
}

/**
 * The letter in the avatar.
 *
 * Upper-cased from the first name, so it follows the name rather than being
 * a second thing to keep in step with it.
 */
export function ownerInitial(displayName?: string | null): string {
  // From the real name, never from the form of address — otherwise the
  // profile would read "F" again, which is the bug this started as.
  return ownerGivenName(displayName).slice(0, 1).toUpperCase();
}
