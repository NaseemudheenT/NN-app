import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Coverflow, type CoverflowCard } from "./Coverflow";

const CARDS: CoverflowCard[] = [
  { id: "/life", title: "Life", icon: "calendar" },
  { id: "/search", title: "Search", icon: "search" },
  { id: "/home", title: "Home", icon: "grid" },
];

describe("Coverflow", () => {
  it("does not report a selection just for mounting", async () => {
    // A launcher opened an application the instant it appeared, because the
    // carousel announced its first card as though the founder had chosen it.
    const onSelect = vi.fn();
    render(<Coverflow cards={CARDS} onSelect={onSelect} label="Surfaces" />);
    await waitFor(() => expect(screen.getByRole("region")).toBeInTheDocument());
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("reports a selection once the centred card actually changes", async () => {
    const onSelect = vi.fn();
    render(<Coverflow cards={CARDS} onSelect={onSelect} label="Surfaces" />);
    const frame = screen.getByRole("region").querySelector<HTMLElement>("[tabindex]")!;

    fireEvent.keyDown(frame, { key: "ArrowRight" });
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith("/search"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("offers no arrow buttons unless they are asked for", () => {
    // The founder's instruction: the dashboard carousel moves by touch, not
    // by pressing arrows.
    render(<Coverflow cards={CARDS} curve={19} label="The arc" />);
    expect(screen.queryByRole("button", { name: /previous/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /next/i })).toBeNull();
  });

  it("names itself for assistive technology as a carousel", () => {
    render(<Coverflow cards={CARDS} label="Available NN surfaces" />);
    const region = screen.getByRole("region", { name: "Available NN surfaces" });
    expect(region).toHaveAttribute("aria-roledescription", "carousel");
  });

  it("renders nothing rather than an empty frame when there are no cards", () => {
    const { container } = render(<Coverflow cards={[]} label="Empty" />);
    expect(container.firstChild).toBeNull();
  });
});
