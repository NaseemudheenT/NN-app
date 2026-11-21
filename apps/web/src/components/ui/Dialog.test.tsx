import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Dialog } from "./Dialog";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

function Harness() {
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open dialog</button>
      <button type="button" onClick={() => setRevision((value) => value + 1)}>
        Rerender owner {revision}
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Confirm action" description="Review this action.">
        <label>
          First field
          <input aria-label="First field" />
        </label>
        <button type="button">Last control</button>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("moves focus into the modal and locks background scrolling", async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    expect(screen.getByRole("dialog", { name: "Confirm action" })).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("textbox", { name: "First field" })).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("contains forward and reverse keyboard focus", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    const first = screen.getByRole("textbox", { name: "First field" });
    const last = screen.getByRole("button", { name: "Last control" });

    last.focus();
    await user.keyboard("{Tab}");
    expect(first).toHaveFocus();

    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(last).toHaveFocus();
  });

  it("closes on Escape, restores focus and unlocks scrolling", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes on a backdrop pointer press, not a press inside the panel", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    const panel = screen.getByRole("dialog");
    const backdrop = panel.parentElement!;

    fireEvent.pointerDown(panel);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.pointerDown(backdrop);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the active field focused when its owner re-renders", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "Open dialog" }));
    const first = screen.getByRole("textbox", { name: "First field" });
    expect(first).toHaveFocus();

    await user.click(screen.getByRole("button", { name: /Rerender owner/ }));
    expect(first).toHaveFocus();
    expect(document.body.style.overflow).toBe("hidden");
  });
});
