import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dock, type DockItem } from "./Dock";

const ITEMS: readonly DockItem[] = [
  { id: "today", label: "Today", icon: "calendar" },
  { id: "apps", label: "Applications", icon: "grid" },
  { id: "ren", label: "REN", icon: "sparkle" },
];

describe("Dock", () => {
  it("exposes every destination as a named button", () => {
    render(<Dock items={ITEMS} activeId="today" onSelect={vi.fn()} />);
    expect(screen.getByRole("navigation", { name: "Application dock" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Applications" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "REN" })).toBeInTheDocument();
  });

  it("marks only the active destination as the current page", () => {
    render(<Dock items={ITEMS} activeId="apps" onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Applications" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Today" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: "REN" })).not.toHaveAttribute("aria-current");
  });

  it("selects the destination when activated", () => {
    const onSelect = vi.fn();
    render(<Dock items={ITEMS} activeId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "REN" }));
    expect(onSelect).toHaveBeenCalledExactlyOnceWith("ren");
  });
});
