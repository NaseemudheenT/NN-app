import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_GLASS, GLASS_PRESETS, GLASS_STORAGE_KEY,
  glassVariables, normaliseGlass, readStoredGlass, writeStoredGlass,
} from "./glass";

describe("normaliseGlass", () => {
  it("keeps values that are already in range", () => {
    const value = { blur: 18, opacity: 0.5, saturation: 1.4, edge: 0.3, tint: "#A1B2C3" };
    expect(normaliseGlass(value)).toEqual(value);
  });

  it("clamps rather than rejects, so a slider at its end still renders", () => {
    const out = normaliseGlass({ blur: 900, opacity: -4, saturation: 99, edge: 7 });
    expect(out.blur).toBe(40);
    expect(out.opacity).toBe(0.08);
    expect(out.saturation).toBe(2);
    expect(out.edge).toBe(1);
  });

  it("refuses a malformed tint instead of painting the environment with it", () => {
    for (const tint of ["", "red", "#fff", "#12345g", "rgb(1,2,3)"]) {
      expect(normaliseGlass({ tint }).tint).toBe(DEFAULT_GLASS.tint);
    }
    expect(normaliseGlass({ tint: "#7A9CFF" }).tint).toBe("#7A9CFF");
  });

  it("survives NaN, which is what an empty number input produces", () => {
    expect(normaliseGlass({ blur: Number.NaN }).blur).toBe(DEFAULT_GLASS.blur);
  });

  it("fills in from the default when given nothing at all", () => {
    expect(normaliseGlass(undefined)).toEqual(DEFAULT_GLASS);
    expect(normaliseGlass({})).toEqual(DEFAULT_GLASS);
  });
});

describe("GLASS_PRESETS", () => {
  it("offers only settings NN can actually render", () => {
    for (const preset of GLASS_PRESETS) {
      expect(normaliseGlass({ ...DEFAULT_GLASS, ...preset.value }))
        .toEqual({ ...DEFAULT_GLASS, ...preset.value });
    }
  });

  it("names each one and says what it is for", () => {
    for (const preset of GLASS_PRESETS) {
      expect(preset.name.length).toBeGreaterThan(0);
      expect(preset.hint.length).toBeGreaterThan(0);
    }
  });
});

describe("glassVariables", () => {
  it("emits the five properties NN's stylesheets read", () => {
    const vars = glassVariables(DEFAULT_GLASS) as Record<string, string>;
    expect(vars["--nn-glass-blur"]).toBe("24px");
    expect(vars["--nn-glass-opacity"]).toBe("0.34");
    expect(vars["--nn-glass-saturation"]).toBe("1.2");
    expect(vars["--nn-glass-edge"]).toBe("0.6");
    expect(vars["--nn-glass-tint"]).toBe("#9CC8FF");
  });
});

describe("stored glass", () => {
  beforeEach(() => { window.localStorage.clear(); });

  it("round-trips the founder's setting", () => {
    const value = { ...DEFAULT_GLASS, blur: 11, tint: "#123456" };
    writeStoredGlass(value);
    expect(readStoredGlass()).toEqual(value);
  });

  it("returns the default when nothing is stored", () => {
    expect(readStoredGlass()).toEqual(DEFAULT_GLASS);
  });

  it("returns the default rather than throwing on a corrupt value", () => {
    window.localStorage.setItem(GLASS_STORAGE_KEY, "{not json");
    expect(readStoredGlass()).toEqual(DEFAULT_GLASS);
  });

  it("normalises a stored value written by an older build", () => {
    window.localStorage.setItem(GLASS_STORAGE_KEY, JSON.stringify({ blur: 500 }));
    expect(readStoredGlass().blur).toBe(40);
  });

  it("does not take the shell down when storage refuses to write", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => { throw new Error("QuotaExceededError"); });
    expect(() => writeStoredGlass(DEFAULT_GLASS)).not.toThrow();
    setItem.mockRestore();
  });
});
