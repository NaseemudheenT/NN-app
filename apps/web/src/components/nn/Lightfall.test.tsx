import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { Lightfall } from "./Lightfall";

/**
 * Light that follows your hand.
 *
 * The founder asked for cinematic. NN has already decided once what that
 * must not mean — the transition canvas was removed for being "theatre in
 * front of work" — so this lights the material instead of staging a show.
 *
 * The properties worth pinning are the ones that keep it affordable on a
 * 2015 laptop and a phone, and the one that keeps it out of the way of
 * someone who asked for less motion.
 */

afterEach(() => { cleanup(); vi.restoreAllMocks(); });


describe("lighting the surface under your hand", () => {
  it("attaches one listener for the whole document, not one per surface", () => {
    // NN draws dozens of glass surfaces on some screens. Sixty listeners
    // firing on every pointer move is how an old laptop drops frames.
    const spy = vi.spyOn(document, "addEventListener");
    render(<Lightfall />);
    const pointerMoves = spy.mock.calls.filter(([type]) => type === "pointermove");
    expect(pointerMoves).toHaveLength(1);
  });

  it("asks the browser not to wait on it, so scrolling stays smooth", () => {
    const spy = vi.spyOn(document, "addEventListener");
    render(<Lightfall />);
    for (const [type, , options] of spy.mock.calls) {
      if (type !== "pointermove" && type !== "pointerdown") continue;
      expect(options, type).toMatchObject({ passive: true });
    }
  });

  it("does nothing at all where motion is unwelcome", () => {
    vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    } as unknown as MediaQueryList);
    const spy = vi.spyOn(document, "addEventListener");
    render(<Lightfall />);
    expect(spy.mock.calls.filter(([t]) => t === "pointermove")).toHaveLength(0);
  });

  it("lets go of every listener when it unmounts", () => {
    const spy = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<Lightfall />);
    unmount();
    const types = spy.mock.calls.map(([type]) => type);
    for (const type of ["pointermove", "pointerdown", "pointerup", "pointercancel"]) {
      expect(types, type).toContain(type);
    }
  });

  it("renders nothing of its own", () => {
    const { container } = render(<Lightfall />);
    expect(container.innerHTML).toBe("");
  });
});

describe("what it paints", () => {
  const css = readFileSync(resolve(process.cwd(), "src/styles/global.css"), "utf8");

  it("paints one soft pool, not a bright spot", () => {
    // A bright dot tracking the cursor is a gimmick. A faint lift under the
    // thumb is a material.
    const block = /\.nn-glass-card\[data-lit\]::before[\s\S]*?\n\}/.exec(css)?.[0] ?? "";
    expect(block).toContain("radial-gradient");
    const alpha = /rgb\(255 255 255 \/ (\d+)%\)/.exec(block)?.[1];
    expect(Number(alpha)).toBeLessThanOrEqual(16);
  });

  it("keeps the liquid control's own layers underneath it", () => {
    // Replacing them instead of adding to them would delete the tide and
    // the top-edge highlight the moment a thumb touched a button.
    const block = /\.nn-liquid\[data-lit\]::before \{[\s\S]*?\n\}/.exec(css)?.[0] ?? "";
    expect(block).toContain("--liquid-tide");
    expect(block).toContain("--glass-sheen");
  });

  it("switches off under reduced motion", () => {
    expect(css).toMatch(/prefers-reduced-motion[\s\S]*?data-lit\]::before \{ background-image: none/);
  });
});
