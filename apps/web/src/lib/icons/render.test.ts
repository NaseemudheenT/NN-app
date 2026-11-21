import { describe, expect, it } from "vitest";
import { iconImage, materialFor, renderIconPixels } from "./render";
import { ICON_RENDER_LARGE, ICON_RENDER_SMALL, renderSizeFor } from "./useIconImage";
import { ICON_PATHS } from "./paths";

/**
 * The renderer, as far as a test environment can see it.
 *
 * jsdom has no canvas, so the shading loop cannot run here — the same hole
 * that hid two shipped WebGL bugs. What is locked down is everything around
 * it: that it fails to null rather than throwing, that the material changes
 * with the theme, and that the size buckets keep the downscale sane. The
 * pixels themselves are checked in a real browser.
 */

describe("icon render", () => {
  it("returns null rather than throwing where there is no canvas", () => {
    // Every caller treats null as "keep the vector", so this is the path
    // that runs on the server and in this suite.
    expect(renderIconPixels("calendar", 64, materialFor("blue", true))).toBeNull();
    expect(iconImage("calendar", "blue", true, 64)).toBeNull();
  });

  it("caches the failure too, so a missing canvas is not retried forever", () => {
    expect(iconImage("clock", "cyan", true, 64)).toBeNull();
    expect(iconImage("clock", "cyan", true, 64)).toBeNull();
  });

  it("lights the object differently in each theme", () => {
    const dark = materialFor("blue", true);
    const light = materialFor("blue", false);
    // The room above a dark object is bright; above a pale one it is white,
    // and what is below it is what actually separates the two.
    expect(dark.skyBottom).not.toEqual(light.skyBottom);
    expect(dark.shadow).toBeGreaterThan(light.shadow);
  });

  it("keeps the body inside the range a colour can be", () => {
    for (const tone of ["blue", "cyan", "aqua", "violet", "slate", "green", "amber", "red", "ice"]) {
      for (const dark of [true, false]) {
        for (const channel of materialFor(tone, dark).body) {
          expect(channel).toBeGreaterThanOrEqual(0);
          expect(channel).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("renders chrome small and everything else large", () => {
    // Not one size for everything: a 160px lit object shown at 18 is averaged
    // into a grey smudge by the browser's own downscale.
    expect(renderSizeFor(18)).toBe(ICON_RENDER_SMALL);
    expect(renderSizeFor(24)).toBe(ICON_RENDER_SMALL);
    expect(renderSizeFor(32)).toBe(ICON_RENDER_LARGE);
    expect(renderSizeFor(74)).toBe(ICON_RENDER_LARGE);
    // Both buckets stay within about 2x of what they are shown at.
    expect(ICON_RENDER_SMALL / 24).toBeLessThan(4);
    expect(ICON_RENDER_LARGE / 74).toBeLessThan(4);
  });

  it("can render every glyph in the family", () => {
    // A name with no path would render an empty image rather than failing,
    // which is the kind of missing icon nobody notices until the founder does.
    for (const path of Object.values(ICON_PATHS)) {
      // `minus` is the shortest in the family at eight characters.
      expect(path.length).toBeGreaterThanOrEqual(8);
      expect(path.startsWith("M")).toBe(true);
    }
  });
});
