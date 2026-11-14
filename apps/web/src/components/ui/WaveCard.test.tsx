import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WaveCard, WaveChip } from "./WaveCard";

/**
 * The card is decoration carrying content, so the tests are about the two
 * things decoration can get wrong: colliding with another instance, and
 * announcing itself to a screen reader.
 */
describe("WaveCard", () => {
  it("gives every instance its own gradient ids", () => {
    const { container } = render(
      <>
        <WaveCard tone="aurora" />
        <WaveCard tone="violet" />
      </>,
    );
    const ids = Array.from(container.querySelectorAll("linearGradient, filter")).map(
      (node) => node.getAttribute("id"),
    );
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("points every fill and filter at an id that exists in the same card", () => {
    const { container } = render(<WaveCard tone="tide" />);
    const defined = new Set(
      Array.from(container.querySelectorAll("[id]")).map((n) => n.getAttribute("id")),
    );
    for (const path of Array.from(container.querySelectorAll("path"))) {
      for (const attribute of ["fill", "filter"] as const) {
        const reference = path.getAttribute(attribute) ?? "";
        const id = /^url\(#(.+)\)$/.exec(reference)?.[1];
        expect(id, `${attribute}=${reference}`).toBeDefined();
        expect(defined.has(id!)).toBe(true);
      }
    }
  });

  it("is invisible to assistive technology and keeps its content visible", () => {
    render(
      <WaveCard>
        <p>Seventeen tasks today</p>
      </WaveCard>,
    );
    expect(screen.getByText("Seventeen tasks today")).toBeVisible();
    expect(document.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("draws the same card twice for the same inputs", () => {
    const first = render(<WaveCard tone="aurora" intensity={0.7} />);
    const a = Array.from(first.container.querySelectorAll("path")).map((n) => n.getAttribute("d"));
    first.unmount();
    const second = render(<WaveCard tone="aurora" intensity={0.7} />);
    const b = Array.from(second.container.querySelectorAll("path")).map((n) => n.getAttribute("d"));
    expect(a).toEqual(b);
  });

  it("closes the loop: each band has the same height at x and x + one tile", () => {
    const { container } = render(<WaveCard tone="aurora" />);
    for (const path of Array.from(container.querySelectorAll("path"))) {
      const points = (path.getAttribute("d") ?? "")
        .slice(1)                      // drop the leading M
        .split(/[ML]/)
        .filter(Boolean)
        .map((pair) => pair.trim().split(/\s+/).map(Number) as [number, number]);
      // 129 sampled points across two tiles, then three points closing the shape.
      const sampled = points.slice(0, 129);
      expect(sampled).toHaveLength(129);
      for (let i = 0; i < 64; i += 1) {
        // Same phase one tile later, so translating by a tile cannot seam.
        expect(sampled[i]![1]).toBeCloseTo(sampled[i + 64]![1], 5);
      }
    }
  });

  it("dims every band together when intensity drops", () => {
    const full = render(<WaveCard tone="aurora" intensity={1} />);
    const loud = (full.container.querySelector("path")?.getAttribute("d") ?? "");
    full.unmount();
    const quiet = render(<WaveCard tone="aurora" intensity={0.2} />);
    const soft = (quiet.container.querySelector("path")?.getAttribute("d") ?? "");
    expect(soft).not.toEqual(loud);
  });
});

describe("WaveChip", () => {
  it("renders its content", () => {
    render(<WaveChip>Focus</WaveChip>);
    expect(screen.getByText("Focus")).toBeVisible();
  });
});
