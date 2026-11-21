import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const open = vi.hoisted(() => vi.fn());
vi.mock("@/components/nn/AppTransition", () => ({
  useAppTransition: () => ({ open }),
}));

const { AppShell } = await import("./AppShell");

afterEach(() => {
  cleanup();
  open.mockReset();
});

describe("the shared application header", () => {
  it("reserves the centre lane for the global Dynamic Island", () => {
    render(<AppShell title="Finance"><p>Finance content</p></AppShell>);
    const clearance = screen.getByTestId("island-clearance");
    expect(clearance).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open NN Home" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Search NN" })).toBeInTheDocument();
  });

  it("returns to Home through the shared transition", async () => {
    render(<AppShell title="Finance"><p>Finance content</p></AppShell>);
    await userEvent.click(screen.getByRole("button", { name: "Open NN Home" }));
    expect(open).toHaveBeenCalledWith("/home", "NN Home");
  });

  it("opens global search through the shared transition", async () => {
    render(<AppShell title="Finance"><p>Finance content</p></AppShell>);
    await userEvent.click(screen.getByRole("button", { name: "Search NN" }));
    expect(open).toHaveBeenCalledWith("/search", "Search");
  });
});
