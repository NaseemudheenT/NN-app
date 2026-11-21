import { afterEach, describe, expect, it, vi } from "vitest";
import { SETUP_VERSION, completeSetup, forgetSetup, needsSetup, readSetup } from "./setup";

/**
 * The first run, remembered.
 *
 * Per device on purpose: everything it configures belongs to the screen and
 * speaker in front of you, not to the account. A new phone should ask again,
 * because a new phone really does not know what voice it has.
 */

afterEach(() => {
  try { window.localStorage.clear(); } catch { /* ignore */ }
  vi.restoreAllMocks();
});

describe("knowing whether to ask", () => {
  it("asks on a device that has never been set up", () => {
    expect(needsSetup()).toBe(true);
  });

  it("stops asking once it is done", () => {
    completeSetup();
    expect(needsSetup()).toBe(false);
    expect(readSetup()?.version).toBe(SETUP_VERSION);
  });

  it("asks again when there is a genuinely new question", () => {
    window.localStorage.setItem("nn.setup", JSON.stringify({
      version: SETUP_VERSION - 1, completedAt: "2026-01-01T00:00:00.000Z",
    }));
    expect(needsSetup()).toBe(true);
  });

  it("does not drag the founder back for the same questions", () => {
    window.localStorage.setItem("nn.setup", JSON.stringify({
      version: SETUP_VERSION + 1, completedAt: "2026-01-01T00:00:00.000Z",
    }));
    expect(needsSetup()).toBe(false);
  });

  it("treats a corrupt record as never having been set up", () => {
    for (const junk of ["", "{", "null", '{"version":"one"}', '{"completedAt":1}']) {
      window.localStorage.setItem("nn.setup", junk);
      expect(needsSetup(), junk).toBe(true);
    }
  });

  it("can be asked for again, from Settings", () => {
    completeSetup();
    forgetSetup();
    expect(needsSetup()).toBe(true);
  });

  it("survives storage being refused, and simply asks again", () => {
    // Private browsing, an embedded webview, site data switched off. The
    // cost of failure is one extra setup, never a broken NN.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("refused");
    });
    expect(() => completeSetup()).not.toThrow();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("refused");
    });
    expect(needsSetup()).toBe(true);
  });
});
