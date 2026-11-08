import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Accessibility is a property of the tokens, not of any one screen. These tests
 * parse tokens.css directly and compute real WCAG 2.1 contrast ratios, so a
 * palette change that breaks readability fails CI immediately — in either theme.
 */

// Vite rewrites import.meta.url under jsdom, so resolve from the package root.
const css = readFileSync(resolve(process.cwd(), "src/styles/tokens.css"), "utf8");

function block(selector: string): string {
  const i = css.indexOf(selector);
  if (i === -1) throw new Error(`selector not found in tokens.css: ${selector}`);
  const open = css.indexOf("{", i);
  const close = css.indexOf("\n}", open);
  return css.slice(open, close);
}

const ROOT = block(":root {");
const LIGHT = block(':root[data-theme="light"]');

/** Resolves a token to a hex colour, following one level of var() indirection. */
function token(scope: string, name: string): string {
  const direct = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(scope);
  const fromRoot = direct ?? new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(ROOT);
  if (fromRoot?.[1] === undefined) throw new Error(`token not found: ${name}`);
  const value = fromRoot[1].trim();
  const ref = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value);
  if (ref?.[1] !== undefined) return token(ROOT, ref[1]);
  return value;
}

function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (m?.[1] === undefined) throw new Error(`not a hex colour: ${hex}`);
  const n = parseInt(m[1], 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const [r, g, b] = channels as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT_TOKENS = ["--text-primary", "--text-secondary", "--text-muted", "--text-accent"] as const;

describe("colour contrast — dark theme", () => {
  const ground = token(ROOT, "--surface-base");

  it("uses the approved midnight base", () => {
    expect(ground.toUpperCase()).toBe("#07111F");
  });

  it.each(TEXT_TOKENS)("%s meets WCAG AA (4.5:1) on the base surface", (name) => {
    expect(contrast(token(ROOT, name), ground)).toBeGreaterThanOrEqual(4.5);
  });

  it("primary text clears AAA (7:1)", () => {
    expect(contrast(token(ROOT, "--text-primary"), ground)).toBeGreaterThanOrEqual(7);
  });
});

describe("colour contrast — light theme", () => {
  const ground = token(LIGHT, "--surface-base");

  it("uses the approved premium white", () => {
    expect(ground.toUpperCase()).toBe("#F7F9FC");
  });

  it.each(TEXT_TOKENS)("%s meets WCAG AA (4.5:1) on the base surface", (name) => {
    expect(contrast(token(LIGHT, name), ground)).toBeGreaterThanOrEqual(4.5);
  });

  it("does not simply reuse the dark text ramp", () => {
    expect(token(LIGHT, "--text-secondary")).not.toBe(token(ROOT, "--text-secondary"));
  });
});

describe("palette integrity", () => {
  const APPROVED = [
    "#07111F", "#0B1930", "#10223B", "#172B45", "#F7F9FC",
    "#E7EDF6", "#A6B3C5", "#77869B", "#9CC8FF", "#649CE3",
  ];

  it("contains every approved Version 3.0 colour, unaltered", () => {
    for (const hex of APPROVED) expect(css.toUpperCase()).toContain(hex);
  });
});

describe("reduced motion", () => {
  it("collapses every duration token under the OS preference", () => {
    const media = block("@media (prefers-reduced-motion: reduce)");
    for (const d of ["--dur-instant", "--dur-fast", "--dur-base", "--dur-slow", "--dur-slower"]) {
      expect(media).toMatch(new RegExp(`${d}\\s*:\\s*1ms`));
    }
  });

  it("collapses them again under the in-app override", () => {
    const attr = block(':root[data-motion="reduced"]');
    for (const d of ["--dur-instant", "--dur-fast", "--dur-base", "--dur-slow", "--dur-slower"]) {
      expect(attr).toMatch(new RegExp(`${d}\\s*:\\s*1ms`));
    }
  });
});
