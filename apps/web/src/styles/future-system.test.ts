import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "src/styles/future-system.css"), "utf8");

const CORE_PRIMITIVES = [
  "nn-surface-glass", "nn-surface-elevated", "nn-surface-reading", "nn-surface-quiet",
  "nn-surface-command", "nn-surface-hero", "nn-surface-inset", "nn-surface-frosted",
  "nn-surface-spectrum", "nn-surface-plain",
  "nn-card", "nn-card-interactive", "nn-card-selected", "nn-card-compact", "nn-card-featured",
  "nn-card-grid", "nn-tile", "nn-tile-center", "nn-tile-compact", "nn-icon-well",
  "nn-button-primary", "nn-button-secondary", "nn-button-quiet", "nn-button-icon", "nn-field",
  "nn-chip", "nn-status", "nn-status-ok", "nn-status-warn", "nn-status-error",
  "nn-divider", "nn-section-heading", "nn-section-kicker", "nn-metric", "nn-metric-value",
  "nn-metric-label", "nn-list-row", "nn-list-content", "nn-data-value", "nn-progress",
  "nn-empty-state", "nn-empty-icon", "nn-skeleton", "nn-callout", "nn-callout-warning",
  "nn-callout-danger", "nn-dialog-scrim", "nn-dialog-surface", "nn-tooltip", "nn-focus-ring",
] as const;

describe("NN future interface system", () => {
  it("defines exactly 50 unique core primitives", () => {
    expect(CORE_PRIMITIVES).toHaveLength(50);
    expect(new Set(CORE_PRIMITIVES).size).toBe(50);
  });

  it.each(CORE_PRIMITIVES)("implements the %s primitive", (name) => {
    expect(css).toMatch(new RegExp("\\." + name + "(?:[\\s,{.:#\\[]|$)"));
  });

  it("provides reduced-motion fallbacks for animated feedback", () => {
    expect(css).toContain("@media(prefers-reduced-motion:reduce)");
    expect(css).toContain(".nn-skeleton::after{animation:none}");
    expect(css).toContain(".nn-motion-safe,.nn-card,.nn-card-interactive,.nn-progress>span{transition:none!important}");
  });

  it("provides narrow-screen layout and blur fallbacks", () => {
    expect(css).toContain("@media(max-width:700px)");
    expect(css).toContain("@supports not");
  });
});
