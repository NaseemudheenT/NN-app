import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sheet } from "./Sheet";

afterEach(cleanup);

describe("Sheet", () => {
  it("uses the bottom-sheet placement and retains modal semantics", () => {
    render(<Sheet open onClose={() => {}} title="Choose a date"><button type="button">Today</button></Sheet>);
    const dialog = screen.getByRole("dialog", { name: "Choose a date" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog.parentElement).toHaveAttribute("data-placement", "bottom");
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
  });

  it("keeps the same Escape dismissal contract as Dialog", async () => {
    const onClose = () => {};
    const close = vi.fn(onClose);
    render(<Sheet open onClose={close} title="Filters" />);
    await userEvent.keyboard("{Escape}");
    expect(close).toHaveBeenCalledTimes(1);
  });
});
