import { describe, expect, it } from "vitest";
import {
  ART_PRESETS,
  ART_PRESET_NAMES,
  SEED_VARIANTS,
  createArtJob,
  fanSlot,
  hashString,
  hexToRgb,
  presetFor,
  rng,
  seedFor,
} from "./folderArt";

/** Every colour NN is allowed to paint with, lowercased. */
const PALETTE = new Set(
  [
    "#080d24", "#101a3a", "#19264d", "#253565",
    "#f7f9fc", "#e7edf6", "#c3cbe2", "#929fc0",
    "#a9d9ff", "#7a9cff",
    "#29b0ff", "#52ceff", "#2366ff", "#6a70ff", "#b770ff",
  ],
);

describe("NN art recipes", () => {
  it("paints only with approved brand colours", () => {
    // The founder's standing direction forbids neon and warm hues. A recipe
    // is the easiest place for one to slip in unnoticed, so it is checked.
    for (const name of ART_PRESET_NAMES) {
      for (const colour of ART_PRESETS[name].colors) {
        expect(PALETTE.has(colour.toLowerCase()), `${name}: ${colour}`).toBe(true);
      }
    }
  });

  it("gives every recipe at least two stops to travel between", () => {
    for (const name of ART_PRESET_NAMES) {
      expect(ART_PRESETS[name].colors.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("hexToRgb", () => {
  it("reads both short and long form", () => {
    expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
    expect(hexToRgb("#080D24")).toEqual([8, 13, 36]);
    expect(hexToRgb("080D24")).toEqual([8, 13, 36]);
  });

  it("falls back to mid-grey rather than NaN on nonsense", () => {
    expect(hexToRgb("not a colour")).toEqual([128, 128, 128]);
    expect(hexToRgb("")).toEqual([128, 128, 128]);
  });
});

describe("rng", () => {
  it("is deterministic for a seed", () => {
    const a = rng(42);
    const b = rng(42);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("stays inside [0, 1)", () => {
    const next = rng(7);
    for (let i = 0; i < 2000; i++) {
      const value = next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

describe("assigning a material to a surface", () => {
  it("gives the same name the same material every time", () => {
    expect(presetFor("Life & wellbeing")).toBe(presetFor("Life & wellbeing"));
    expect(seedFor("Education")).toBe(seedFor("Education"));
  });

  it("bounds the seed, so a wall of cards costs a bounded number of paints", () => {
    // This is the whole reason seeds are folded: 34 applications must not
    // mean 34 separate noise fields on the founder's Intel laptop.
    const names = Array.from({ length: 500 }, (_, i) => `Application ${i}`);
    for (const name of names) {
      const seed = seedFor(name);
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(SEED_VARIANTS);
    }
  });

  it("spreads names across the available materials", () => {
    const seen = new Set(
      Array.from({ length: 200 }, (_, i) => presetFor(`Surface ${i}`)),
    );
    expect(seen.size).toBe(ART_PRESET_NAMES.length);
  });

  it("does not collide the two forms of the mark's own name", () => {
    expect(hashString("Life")).not.toBe(hashString("life"));
  });
});

describe("createArtJob", () => {
  it("reports done only once, and fills every pixel opaquely", () => {
    const job = createArtJob(24, 18, ART_PRESETS.deep, 1);
    let guard = 0;
    while (!job.step(4)) {
      guard++;
      expect(guard).toBeLessThan(500); // a job that never finishes is a hang
    }
    expect(job.step(4)).toBe(true); // idempotent once complete

    expect(job.pixels.length).toBe(24 * 18 * 4);
    for (let i = 3; i < job.pixels.length; i += 4) {
      expect(job.pixels[i]).toBe(255);
    }
  });

  it("actually varies across the canvas rather than painting one flat colour", () => {
    const job = createArtJob(32, 32, ART_PRESETS.signal, 2);
    while (!job.step(8));
    const reds = new Set<number>();
    for (let i = 0; i < job.pixels.length; i += 4) reds.add(job.pixels[i]!);
    expect(reds.size).toBeGreaterThan(8);
  });

  it("is reproducible: the same recipe and seed give the same picture", () => {
    const run = () => {
      const job = createArtJob(16, 16, ART_PRESETS.tide, 3);
      while (!job.step(8));
      return Array.from(job.pixels);
    };
    expect(run()).toEqual(run());
  });

  it("survives a degenerate size without throwing", () => {
    const job = createArtJob(1, 1, ART_PRESETS.frost, 0);
    while (!job.step(4));
    expect(job.pixels.length).toBe(4);
  });

  it("keeps a single-colour recipe from dividing by zero", () => {
    const job = createArtJob(8, 8, { style: "marble", colors: ["#080D24"] }, 1);
    while (!job.step(4));
    for (const value of job.pixels) expect(Number.isFinite(value)).toBe(true);
  });
});

describe("fanSlot", () => {
  it("centres a lone sheet instead of pushing it to one side", () => {
    expect(fanSlot(0, 1)).toBe(0);
    expect(fanSlot(0, 0)).toBe(0);
  });

  it("spans -1 to 1 across the stack", () => {
    expect(fanSlot(0, 4)).toBe(-1);
    expect(fanSlot(3, 4)).toBe(1);
    expect(fanSlot(1, 3)).toBe(0);
  });
});
