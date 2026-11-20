import { describe, expect, it } from "vitest";
import { GUEST_NAME, OWNER_NAME, ownerFirstName, ownerFullName, ownerInitial } from "./owner";

/**
 * NN belongs to one person, and it should say their name.
 *
 * The avatar read "F" — the first letter of the word "Founder" — on the
 * founder's own environment, because six surfaces each carried their own copy
 * of the same fallback. These pin the answer in the one place it now lives.
 */

describe("who NN belongs to", () => {
  it("greets the owner by name when the account carries none", () => {
    // The normal path: a session minted from a custom token has no
    // displayName, so this is what the founder actually sees.
    expect(ownerFirstName(null)).toBe("Naseemudheen");
    expect(ownerFirstName(undefined)).toBe("Naseemudheen");
    expect(ownerFirstName("")).toBe("Naseemudheen");
    expect(ownerFirstName("   ")).toBe("Naseemudheen");
  });

  it("puts N in the avatar, not F", () => {
    expect(ownerInitial(null)).toBe("N");
    expect(ownerInitial("")).toBe("N");
  });

  it("prefers a real display name over its own idea of the owner", () => {
    expect(ownerFirstName("Naseemudheen T.")).toBe("Naseemudheen");
    expect(ownerFirstName("Ada Lovelace")).toBe("Ada");
    expect(ownerInitial("Ada Lovelace")).toBe("A");
  });

  it("shows the full name beside the avatar", () => {
    expect(ownerFullName(null)).toBe(OWNER_NAME);
    expect(ownerFullName("Ada Lovelace")).toBe("Ada Lovelace");
  });

  it("never calls the owner Founder", () => {
    // The literal that caused it, kept out by test rather than by memory.
    for (const name of [null, undefined, "", "  "]) {
      expect(ownerFirstName(name)).not.toBe("Founder");
      expect(ownerFullName(name)).not.toBe("Founder");
    }
  });

  it("keeps a name for someone NN has not identified", () => {
    // Preview mode is the one place a generic name is the honest one.
    expect(GUEST_NAME).toBe("Guest");
  });
});
