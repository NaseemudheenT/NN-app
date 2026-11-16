import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LiquidNav, NAV_FRAG, place, type LiquidNavItem } from "./LiquidNav";
import { RenMark } from "./RenMark";

/**
 * The rail and the dock are the same component turned ninety degrees, and
 * for a long time only one of them worked. jsdom has no layout and no WebGL,
 * so neither the shader nor the spring can be exercised here — what can be
 * locked down is the arithmetic that turns the physics into screen space,
 * and the shader source itself, which is just a string.
 */

const ITEMS: readonly LiquidNavItem[] = [
  { id: "today", label: "Today", icon: "calendar" },
  { id: "apps", label: "Applications", icon: "grid" },
  { id: "ren", label: "REN", icon: "sparkle", mark: "ren" },
];

describe("LiquidNav — which way the water flows", () => {
  it("leaves a horizontal dock's coordinates alone", () => {
    expect(place(0, 140, 27)).toEqual([140, 27]);
  });

  it("turns a vertical rail's travel into a y, not an x", () => {
    // This is the whole bug: every item in a vertical nav shares an
    // offsetLeft, so a rail driven by the dock's maths had a target that
    // never moved and a selection that teleported with no water behind it.
    expect(place(1, 140, 27)).toEqual([27, 140]);
  });

  it("round-trips: mapping screen space back gives the physics back", () => {
    const [x, y] = place(1, 93, 31);
    expect(place(1, x, y)).toEqual([93, 31]);
  });
});

describe("LiquidNav — the shader", () => {
  it("rounds the pill by its short side, not its height", () => {
    // sdRB with a radius larger than the half-width does not round the
    // corners, it collapses the rectangle into a lens: a vertical rail drawn
    // that way pinched shut at the top and bottom and left the first and
    // last items sitting outside their own water.
    expect(NAV_FRAG).toContain("min(h.x,h.y)");
    expect(NAV_FRAG).not.toMatch(/sdRB\(p-uPill\.xy-h,h,h\.y\)/);
  });

  it("refracts in a band set by the short side", () => {
    // Given the long side instead, the rail's edge lens was 96px wide on a
    // 56px-wide pill — the liquid went everywhere, which is what the founder
    // reported seeing.
    expect(NAV_FRAG).toContain("lens(dp,uMinor*.36)");
  });

  it("declares every uniform it reads, and reads every one it declares", () => {
    const declared = [...NAV_FRAG.matchAll(/uniform\s+\w+\s+(u\w+)/g)].map((m) => m[1]!);
    expect(declared).toContain("uAxis");
    expect(declared).toContain("uMinor");
    for (const name of declared) {
      // Once in the declaration, at least once in the body.
      const uses = NAV_FRAG.split(new RegExp(`\\b${name}\\b`)).length - 1;
      expect(uses, `${name} is declared but never read`).toBeGreaterThan(1);
    }
  });
});

describe("LiquidNav — what it shows", () => {
  it("names every item for assistive technology, labels hidden or not", () => {
    render(<LiquidNav items={ITEMS} activeId="today" onSelect={vi.fn()} compact />);
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Applications" })).toBeInTheDocument();
  });

  it("marks the open surface as the current page", () => {
    render(<LiquidNav items={ITEMS} activeId="apps" onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Applications" }))
      .toHaveAttribute("aria-current", "page");
  });

  it("gives REN its own mark rather than a glyph", () => {
    const { container } = render(
      <LiquidNav items={ITEMS} activeId="today" onSelect={vi.fn()} />,
    );
    const ren = screen.getByRole("button", { name: "REN" });
    // The orb's body, not an icon path: four stacked circles on the 40 grid.
    expect(ren.querySelectorAll("circle[r='13']").length).toBeGreaterThanOrEqual(4);
    expect(container.querySelector("[fill='url(#nn-ren-body)']")).toBeTruthy();
  });
});

describe("REN's mark", () => {
  it("uses the shared definitions rather than its own copy of them", () => {
    // IconDefs is mounted once in the root layout. A per-instance copy would
    // put the whole orb's gradient set in the document five times over.
    const { container } = render(<RenMark />);
    const used = [...container.querySelectorAll("*")].flatMap((node) =>
      [node.getAttribute("fill"), node.getAttribute("stroke")].filter(
        (value): value is string => !!value?.startsWith("url("),
      ),
    );
    expect(used).toContain("url(#nn-ren-body)");
    expect(used).toContain("url(#nn-ren-rim)");
    expect(used).toContain("url(#nn-ren-shade)");
    expect(used).toContain("url(#nn-ren-gloss)");
    expect(used).toContain("url(#nn-ren-ring)");
    expect(container.querySelector("defs")).toBeNull();
  });

  it("is decorative — REN is named by the control it sits in", () => {
    const { container } = render(<RenMark />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });

  it("renders at the size it is given", () => {
    const { container } = render(<RenMark size={44} />);
    expect(container.querySelector("svg")).toHaveAttribute("width", "44");
  });
});
