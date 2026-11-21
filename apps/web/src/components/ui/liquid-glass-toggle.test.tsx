import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LiquidToggle } from "./liquid-glass-toggle";

afterEach(cleanup);

describe("LiquidToggle", () => {
  it("exposes a labelled switch and reports controlled changes", async () => {
    const onCheckedChange = vi.fn();
    render(<LiquidToggle checked={false} onCheckedChange={onCheckedChange} label="Dark appearance" />);
    const toggle = screen.getByRole("switch", { name: "Dark appearance" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    await userEvent.click(toggle);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("updates its own state when uncontrolled", async () => {
    const user = userEvent.setup();
    render(<LiquidToggle defaultChecked label="Reduced motion" />);
    const toggle = screen.getByRole("switch", { name: "Reduced motion" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    toggle.focus();
    await user.keyboard(" ");
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("does not change when disabled", async () => {
    const onCheckedChange = vi.fn();
    render(<LiquidToggle disabled onCheckedChange={onCheckedChange} label="Dark appearance" />);
    const toggle = screen.getByRole("switch", { name: "Dark appearance" });
    expect(toggle).toBeDisabled();
    await userEvent.click(toggle);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
