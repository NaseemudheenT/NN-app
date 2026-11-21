import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("global material accessibility fallbacks", () => {
  const css = readFileSync(resolve(process.cwd(), "src/styles/global.css"), "utf8");
  const reducedTransparency = css.slice(css.lastIndexOf("@media (prefers-reduced-transparency: reduce)"));

  it("disables backdrop filters on every shared glass primitive", () => {
    for (const selector of [
      ".nn-glass-card", ".nn-glass", ".nn-glass-primary", ".nn-glass-reading",
      ".nn-holo", ".nn-glass-icon", ".nn-liquid", ".nn-surface-glass",
      ".nn-surface-reading", ".nn-surface-frosted", ".nn-nav-rail", ".nn-dialog-scrim",
    ]) {
      expect(reducedTransparency).toContain(selector);
    }
    expect(reducedTransparency).toMatch(/backdrop-filter:\s*none\s*!important/);
  });

  it("replaces translucent shared faces with the raised surface token", () => {
    expect(reducedTransparency).toContain("background-color: var(--surface-raised) !important");
    expect(reducedTransparency).toContain(".nn-liquid::before");
    expect(reducedTransparency).toContain("background: rgb(3 7 14 / 88%) !important");
  });
});
