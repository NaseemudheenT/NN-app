import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NNIsland } from "./NNIsland";

vi.mock("@/components/ui/NNLogo", () => ({ NNLogo: () => <span>NN</span> }));
vi.mock("@/components/ui/Icon", () => ({ Icon: () => <span aria-hidden="true" /> }));

afterEach(cleanup);

function openIsland(callbacks = {
  onHome: vi.fn(),
  onSearch: vi.fn(),
  onSettings: vi.fn(),
  onRen: vi.fn(),
}) {
  render(<NNIsland title="College" {...callbacks} />);
  fireEvent.click(screen.getByRole("button", { name: "Open NN control panel" }));
  return callbacks;
}

describe("NN Dynamic Island", () => {
  it("expands to reveal the active workspace and all quick destinations", () => {
    openIsland();
    expect(screen.getByRole("region", { name: "NN control panel" })).toBeInTheDocument();
    expect(screen.getAllByText("College").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /NN Home/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Search/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Settings/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ask REN/ })).toBeInTheDocument();
  });

  it("opens NN Home and closes the panel after an action", () => {
    const callbacks = openIsland();
    fireEvent.click(screen.getByRole("button", { name: /NN Home/ }));
    expect(callbacks.onHome).toHaveBeenCalledOnce();
    expect(screen.queryByRole("region", { name: "NN control panel" })).not.toBeInTheDocument();
  });

  it("opens Settings and REN through their own actions", () => {
    const callbacks = openIsland();
    fireEvent.click(screen.getByRole("button", { name: /Settings/ }));
    expect(callbacks.onSettings).toHaveBeenCalledOnce();

    cleanup();
    openIsland(callbacks);
    fireEvent.click(screen.getByRole("button", { name: /Ask REN/ }));
    expect(callbacks.onRen).toHaveBeenCalledOnce();
  });

  it("closes on Escape", () => {
    openIsland();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "NN control panel" })).not.toBeInTheDocument();
  });
});
