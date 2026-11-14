import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The preview door.
 *
 * Every test here is about the door being narrow, not about it working.
 * A door that opens is easy; a door that cannot be left open by accident,
 * cannot be stumbled into, and grants nothing is the part worth proving.
 */

const ORIGINAL = process.env.NEXT_PUBLIC_NN_PREVIEW;

async function load() {
  vi.resetModules();
  return import("./preview");
}

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_NN_PREVIEW;
  else process.env.NEXT_PUBLIC_NN_PREVIEW = ORIGINAL;
  vi.restoreAllMocks();
});

beforeEach(() => { window.sessionStorage.clear(); });

describe("whether the door exists at all", () => {
  it("is closed unless the deployment says otherwise", async () => {
    delete process.env.NEXT_PUBLIC_NN_PREVIEW;
    const { previewOffered } = await load();
    expect(previewOffered()).toBe(false);
  });

  it("is closed by anything other than an exact 1", async () => {
    for (const value of ["", "0", "true", "yes", "on"]) {
      process.env.NEXT_PUBLIC_NN_PREVIEW = value;
      const { previewOffered } = await load();
      expect(previewOffered(), value).toBe(false);
    }
  });

  it("opens on exactly 1", async () => {
    process.env.NEXT_PUBLIC_NN_PREVIEW = "1";
    const { previewOffered } = await load();
    expect(previewOffered()).toBe(true);
  });
});

describe("whether this tab came through it", () => {
  it("refuses a tab that marked itself while the door was shut", async () => {
    // Removing the variable must close the door for tabs already inside,
    // not only for new ones — otherwise turning it off does nothing today.
    delete process.env.NEXT_PUBLIC_NN_PREVIEW;
    const { enterPreview, inPreview } = await load();
    enterPreview();
    expect(inPreview()).toBe(false);
  });

  it("lets through a tab that entered while it was open", async () => {
    process.env.NEXT_PUBLIC_NN_PREVIEW = "1";
    const { enterPreview, inPreview } = await load();
    expect(inPreview()).toBe(false);
    enterPreview();
    expect(inPreview()).toBe(true);
  });

  it("closes when the tab leaves", async () => {
    process.env.NEXT_PUBLIC_NN_PREVIEW = "1";
    const { enterPreview, leavePreview, inPreview } = await load();
    enterPreview();
    leavePreview();
    expect(inPreview()).toBe(false);
  });

  it("lives in session storage, so closing the tab closes it", async () => {
    process.env.NEXT_PUBLIC_NN_PREVIEW = "1";
    const { enterPreview, PREVIEW_KEY } = await load();
    enterPreview();
    expect(window.sessionStorage.getItem(PREVIEW_KEY)).toBe("1");
    expect(window.localStorage.getItem(PREVIEW_KEY)).toBeNull();
  });

  it("refuses rather than throwing when storage is unavailable", async () => {
    process.env.NEXT_PUBLIC_NN_PREVIEW = "1";
    const { enterPreview, inPreview } = await load();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(() => enterPreview()).not.toThrow();
    // A convenience that cannot be stored is simply not granted.
    expect(inPreview()).toBe(false);
  });
});
