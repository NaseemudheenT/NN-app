import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FlipCard } from "./FlipCard";

/**
 * A card with a back — as a control, not as an effect.
 *
 * The reference this is adapted from turns on hover, which on a phone is a
 * card that turns twice per tap and lands where it started. These pin the
 * behaviour that makes it work on the founder's actual device, and the
 * behaviour that stops a screen reader reading both sides at once.
 */

afterEach(cleanup);

const card = () => (
  <FlipCard label="Spent" hint="Detail" front={<p>4h 20m</p>} back={<p>Across six sessions</p>} />
);

describe("turning the card", () => {
  it("is one button, not a div that happens to be clickable", () => {
    render(card());
    expect(screen.getByRole("button", { name: /Spent/ })).toBeInTheDocument();
  });

  it("starts showing the front", () => {
    render(card());
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("turns on a press — which is what a phone can actually do", async () => {
    render(card());
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("turns back", async () => {
    render(card());
    await userEvent.click(screen.getByRole("button"));
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("takes the keyboard, because a button does", async () => {
    render(card());
    await userEvent.tab();
    expect(screen.getByRole("button")).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    await userEvent.keyboard(" ");
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("hides the face that is turned away", async () => {
    // Both faces are in the DOM at all times — that is how the turn works.
    // Only one may be readable, or every card is announced twice.
    const { container } = render(card());
    const faces = container.querySelectorAll("[class*='face']");
    expect(faces).toHaveLength(2);
    const hidden = () => [...container.querySelectorAll("[aria-hidden='true'][inert]")].length;
    expect(hidden()).toBe(1);
    await userEvent.click(screen.getByRole("button"));
    expect(hidden()).toBe(1);
  });

  it("says there is a back, rather than waiting to be discovered", () => {
    render(card());
    expect(screen.getByText("Detail")).toBeInTheDocument();
  });

  it("keeps the card's height when both faces are positioned out of flow", () => {
    // Without the in-flow sizer the card collapses to nothing.
    const { container } = render(card());
    expect(container.querySelector("[class*='sizer']")).toBeTruthy();
  });
});

describe("the material rules a DOM cannot show", () => {
  const css = readFileSync(resolve(process.cwd(), "src/components/ui/FlipCard.module.css"), "utf8");

  it("hides the far face, or the back shows through as mirror writing", () => {
    expect(css).toMatch(/backface-visibility:\s*hidden/);
    expect(css).toMatch(/-webkit-backface-visibility:\s*hidden/);
  });

  it("keeps depth through the whole chain", () => {
    // Flatten it anywhere and every lifted child collapses onto the face.
    expect((css.match(/transform-style:\s*preserve-3d/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it("only flips on hover where a real pointer exists", () => {
    // The phone rule. A synthesised hover plus a press is two flips.
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
  });

  it("never lands on the front while it reports showing the back", () => {
    // Carrying the turn on to a full 360 puts the front in view while
    // `aria-pressed` still says "showing detail" — sight and screen reader
    // disagreeing about the same card.
    expect(css).not.toContain("rotateY(360deg)");
  });

  it("does not spin for anyone who asked it not to", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toMatch(/prefers-reduced-motion[\s\S]*?transform:\s*none/);
    expect(css).toContain('data-motion="reduced"');
  });
});
