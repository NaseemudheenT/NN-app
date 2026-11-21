import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Switch } from "./Switch";

afterEach(cleanup);

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [checked, setChecked] = useState(false);
  return <Switch checked={checked} onCheckedChange={setChecked} label="Reduce motion" disabled={disabled} />;
}

describe("Switch", () => {
  it("uses native checkbox state with switch semantics", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const control = screen.getByRole("switch", { name: "Reduce motion" });
    expect(control).not.toBeChecked();
    await user.click(control);
    expect(control).toBeChecked();
    await user.keyboard(" ");
    expect(control).not.toBeChecked();
  });

  it("does not activate when disabled", async () => {
    const user = userEvent.setup();
    render(<Harness disabled />);
    const control = screen.getByRole("switch", { name: "Reduce motion" });
    expect(control).toBeDisabled();
    await user.click(control);
    expect(control).not.toBeChecked();
  });
});
