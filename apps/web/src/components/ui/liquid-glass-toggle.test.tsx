import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LiquidToggle } from "./liquid-glass-toggle";

describe("LiquidToggle", () => {
  it("toggles its uncontrolled value and reports the change", () => {
    const onCheckedChange = vi.fn();
    render(<LiquidToggle label="Dark mode" onCheckedChange={onCheckedChange} />);

    const toggle = screen.getByRole("switch", { name: "Dark mode" });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("does not mutate a controlled value without its owner", () => {
    const onCheckedChange = vi.fn();
    render(<LiquidToggle checked={false} label="Controlled" onCheckedChange={onCheckedChange} />);

    const toggle = screen.getByRole("switch", { name: "Controlled" });
    fireEvent.click(toggle);

    expect(onCheckedChange).toHaveBeenCalledWith(true);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("supports arrow-key state changes", () => {
    const onCheckedChange = vi.fn();
    render(<LiquidToggle checked={false} label="Keyboard toggle" onCheckedChange={onCheckedChange} />);

    fireEvent.keyDown(screen.getByRole("switch", { name: "Keyboard toggle" }), {
      key: "ArrowRight",
    });

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("does not change when disabled", () => {
    const onCheckedChange = vi.fn();
    render(<LiquidToggle disabled label="Unavailable" onCheckedChange={onCheckedChange} />);

    const toggle = screen.getByRole("switch", { name: "Unavailable" });
    expect(toggle).toBeDisabled();
    fireEvent.click(toggle);
    expect(onCheckedChange).not.toHaveBeenCalled();
  });

  it("submits its named checkbox value when on", () => {
    render(<LiquidToggle checked name="darkMode" value="enabled" label="Dark mode" />);
    const input = document.querySelector<HTMLInputElement>('input[name="darkMode"]');

    expect(input).not.toBeNull();
    expect(input).toBeChecked();
    expect(input).toHaveValue("enabled");
  });
});
