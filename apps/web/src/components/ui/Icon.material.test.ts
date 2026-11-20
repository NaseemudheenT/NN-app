import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The material rules that jsdom cannot see.
 *
 * These assert the *source*, not the render, and that is the point: the two
 * worst bugs NN has shipped were both invisible to the DOM. A transformed
 * ancestor becomes the containing block for every `position: fixed`
 * descendant, so one stray `animation-fill-mode: both` pinned the phone's
 * tab bar 172px below the fold — and `pnpm test` passed the whole time,
 * because jsdom computes no styles. A test that reads the stylesheet is the
 * only kind that can catch it.
 */

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const icon = read("src/components/ui/Icon.module.css");
const global = read("src/styles/global.css");

describe("the icon's arrival", () => {
  it("reveals the rendered object through glass", () => {
    expect(icon).toContain("@keyframes nn-icon-reveal");
    expect(icon).toMatch(/animation:\s*nn-icon-reveal/);
  });

  it("starts magnified and out of focus, the way glass holds a thing", () => {
    const from = /from\s*\{[^}]*\}/.exec(icon)?.[0] ?? "";
    expect(from).toMatch(/scale\(1\.\d+\)/);
    expect(from).toMatch(/blur\(/);
  });

  it("never leaves a transform behind on an icon", () => {
    // `both` holds the *final* frame forever, which here is `transform: none`
    // — but a computed `none` from a fill-mode is still a computed transform
    // in some engines, and NN has been bitten by exactly that. `backwards`
    // holds only the opening frame, before the animation starts.
    expect(icon).toMatch(/animation:[^;]*\bbackwards\b/);
    expect(icon).not.toMatch(/animation:[^;]*\bboth\b/);
    expect(icon).not.toMatch(/animation:[^;]*\bforwards\b/);
  });

  it("collapses rather than disappears where motion is unwelcome", () => {
    // Removed outright, an `animationend` listener never fires and whatever
    // waited on it waits forever. 1ms still completes.
    expect(icon).toContain("@media (prefers-reduced-motion: reduce)");
    expect(icon).toMatch(/prefers-reduced-motion[^}]*\}[\s\S]*?animation-duration:\s*1ms/);
    expect(icon).toContain('data-motion="reduced"');
  });
});

describe("the liquid material every control shares", () => {
  it("refracts what is behind it, not only blurs it", () => {
    expect(global).toMatch(/\.nn-liquid::before\s*\{[\s\S]*?backdrop-filter:\s*var\(--liquid-refraction\)/);
  });

  it("keeps the refraction off the element itself, so no engine loses the blur", () => {
    // `backdrop-filter: url(...)` is Chromium-only. Listed beside the blur in
    // one declaration, an engine that cannot run it drops the whole property
    // — which would make the founder's iPhone strictly worse than before.
    const base = /\.nn-liquid\s*\{[\s\S]*?\n\}/.exec(global)?.[0] ?? "";
    expect(base).toMatch(/backdrop-filter:\s*blur\(/);
    expect(base).not.toContain("--liquid-refraction");
  });

  it("puts it on a pseudo-element, which has no fixed descendants to capture", () => {
    // The containing-block trap again: `backdrop-filter` creates one.
    expect(global).toMatch(/\.nn-liquid::before[\s\S]*?backdrop-filter/);
  });
});

describe("the primary control", () => {
  it("is glass, not a painted slab", () => {
    // It was 88% opaque accent, which stopped NN's water at its edge and
    // made the one control that matters most the only one not made of the
    // same material as the rest.
    const block = /\.nn-liquid-primary \{[\s\S]*?\n\}/.exec(global)?.[0] ?? "";
    expect(block).toContain("--glass-3-bg");
    expect(block).not.toMatch(/var\(--text-accent\)\s*;/);
  });

  it("leads by light rather than by colour", () => {
    // Hierarchy from luminance: a brighter rim and more water than its
    // neighbours, so it still reads as the decision.
    expect(global).toMatch(/\.nn-liquid-primary::before \{[^}]*--liquid-tide/);
  });
});
