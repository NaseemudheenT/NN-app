import { describe, expect, it } from "vitest";
import {
  GUEST_NAME, OWNER_NAME, ownerFirstName, ownerFullName, ownerGivenName, ownerInitial,
} from "./owner";

/**
 * NN belongs to one person, and it should say their name.
 *
 * The avatar read "F" — the first letter of the word "Founder" — on the
 * founder's own environment, because six surfaces each carried their own copy
 * of the same fallback. These pin the answer in the one place it now lives.
 */

describe("who NN belongs to", () => {
  it("addresses the founder by title, not by their given name", () => {
    /*
     * Reversed deliberately, at the founder's instruction: "only profile
     * top alone N, other than [that] the system can call me founder".
     *
     * An operating environment using your given name in every panel reads
     * as a product performing intimacy. The title reads as the thing you
     * own addressing its owner — and the initial in the profile is identity
     * rather than address, which is why that stays a letter of the name.
     */
    expect(ownerFirstName(null)).toBe("Founder");
    expect(ownerFirstName("Naseemudheen T.")).toBe("Founder");
  });

  it("puts N in the avatar, not F", () => {
    expect(ownerInitial(null)).toBe("N");
    expect(ownerInitial("")).toBe("N");
  });

  it("takes the initial from the real name, never from the title", () => {
    // Otherwise the avatar reads "F" again, which is the bug this began as.
    expect(ownerInitial("Ada Lovelace")).toBe("A");
    expect(ownerInitial(null)).toBe("N");
    expect(ownerInitial(null)).not.toBe("F");
  });

  it("still knows the given name where NN names the account rather than speaks to it", () => {
    expect(ownerGivenName(null)).toBe("Naseemudheen");
    expect(ownerGivenName("Ada Lovelace")).toBe("Ada");
  });

  it("shows the full name beside the avatar", () => {
    expect(ownerFullName(null)).toBe(OWNER_NAME);
    expect(ownerFullName("Ada Lovelace")).toBe("Ada Lovelace");
  });

  it("never puts the title where the account's own name belongs", () => {
    // Settings names the account; it must not say "Founder" there.
    for (const name of [null, undefined, "", "  "]) {
      expect(ownerFullName(name)).not.toBe("Founder");
      expect(ownerFullName(name)).toContain("Naseemudheen");
    }
  });

  it("keeps a name for someone NN has not identified", () => {
    // Preview mode is the one place a generic name is the honest one.
    expect(GUEST_NAME).toBe("Guest");
  });
});
