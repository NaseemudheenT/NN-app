import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { NNIntro } from "./NNIntro";
import { NNLogo, NN_MARK_PATH } from "@/components/ui/NNLogo";

/**
 * The door.
 *
 * The corridor's motion belongs to a frame loop jsdom does not run, so what
 * is checked here is what the first screen of NN actually says — which is
 * the part that was wrong. Five cards flew past carrying a single verb each,
 * and a later stylesheet then switched even that off, so NN opened on five
 * empty panes of glass.
 */
beforeEach(() => {
  document.documentElement.dataset["motion"] = "reduced";
});
afterEach(() => {
  delete document.documentElement.dataset["motion"];
  cleanup();
});

describe("NN intro", () => {
  it("names real applications on the cards, not verbs", () => {
    const { container } = render(<NNIntro />);
    const titles = [...container.querySelectorAll("[class*='cardTitle']")]
      .map((node) => node.textContent);
    // Every one of these is in the approved 34-app registry.
    expect(titles).toContain("Life");
    expect(titles).toContain("College");
    expect(titles).toContain("Finance");
    expect(titles).toContain("Creator Studio");
    expect(titles).toContain("Memory");
    expect(titles).toContain("REN");
  });

  it("says what each one holds — no card is empty", () => {
    const { container } = render(<NNIntro />);
    const hints = [...container.querySelectorAll("[class*='cardHint']")];
    expect(hints.length).toBeGreaterThanOrEqual(6);
    for (const hint of hints) {
      expect(hint.textContent?.trim().length ?? 0).toBeGreaterThan(20);
    }
  });

  it("gives every card NN's own water", () => {
    const { container } = render(<NNIntro />);
    const waves = container.querySelectorAll("[class*='cardWave']");
    const cards = container.querySelectorAll("[class*='cardInner']");
    expect(waves.length).toBe(cards.length);
  });

  it("shows REN as itself and not as a glyph", () => {
    const { container } = render(<NNIntro />);
    expect(container.querySelector("[fill='url(#nn-ren-body)']")).toBeTruthy();
  });

  it("lights the mark on the door", () => {
    const { container } = render(<NNIntro />);
    const marks = [...container.querySelectorAll("path")]
      .filter((node) => node.getAttribute("d") === NN_MARK_PATH);
    // Bloom, face, edge — the same locked geometry painted three times.
    expect(marks.length).toBe(3);
  });
});

describe("the NN mark, lit", () => {
  it("changes material and never geometry", () => {
    const { container } = render(<NNLogo glow decorative />);
    for (const path of container.querySelectorAll("path")) {
      expect(path.getAttribute("d")).toBe(NN_MARK_PATH);
    }
  });

  it("stays flat when it is not asked to glow", () => {
    const { container } = render(<NNLogo decorative />);
    expect(container.querySelectorAll("path")).toHaveLength(1);
    expect(container.querySelector("defs")).toBeNull();
  });

  it("lets its own light out of the box the mark fills", () => {
    // The mark touches all four edges of its viewBox; a bloom clipped to
    // that box is a rectangle of light with a letter cut out of it.
    const { container } = render(<NNLogo glow decorative />);
    expect(container.querySelector("svg")).toHaveStyle({ overflow: "visible" });
  });
});
