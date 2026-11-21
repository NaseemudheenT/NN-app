import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NNAppLauncher } from "./NNAppLauncher";

const { open } = vi.hoisted(() => ({ open: vi.fn() }));
vi.mock("@/components/nn/AppTransition", () => ({ useAppTransition: () => ({ open, travelling: false }) }));
vi.mock("@/components/ui/Icon", () => ({ Icon: ({ name }: { name: string }) => <span aria-hidden="true">{name}</span> }));
vi.mock("@/components/ui/NNLogo", () => ({ NNLogo: () => <span aria-hidden="true">NN</span> }));
beforeEach(() => open.mockClear());
afterEach(() => cleanup());

describe("NN Home discovery", () => {
  it("shows all 34 applications in their six product families", () => {
    render(<NNAppLauncher />);
    expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(34);
    for (const family of ["Life & wellbeing", "Education", "Money & work", "Creation & communication", "Knowledge & insight", "System"]) {
      expect(screen.getByRole("heading", { name: family })).toBeInTheDocument();
    }
  });
  it("opens the selected app through the shared transition", () => {
    render(<NNAppLauncher />);
    fireEvent.click(screen.getByRole("button", { name: /Open College/ }));
    expect(open).toHaveBeenCalledWith("/apps/college", "College");
  });
  it("opens a family index from its group header", () => {
    render(<NNAppLauncher />);
    fireEvent.click(screen.getByRole("button", { name: "View all Education applications" }));
    expect(open).toHaveBeenCalledWith("/family/education", "Education");
  });
  it("filters by app name, family and description, and announces empty results", () => {
    render(<NNAppLauncher />);
    const search = screen.getByRole("searchbox", { name: "Search applications" });
    fireEvent.change(search, { target: { value: "passkeys" } });
    expect(screen.getByRole("button", { name: /Open Security Centre/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open College/ })).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: "nothing-matches-this" } });
    expect(screen.getByRole("status")).toHaveTextContent("No applications found");
  });
  it("clears the query with Escape and the clear control", () => {
    render(<NNAppLauncher />);
    const search = screen.getByRole("searchbox", { name: "Search applications" });
    fireEvent.change(search, { target: { value: "finance" } });
    fireEvent.keyDown(search, { key: "Escape" });
    expect(search).toHaveValue("");
    fireEvent.change(search, { target: { value: "college" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(search).toHaveValue("");
    expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(34);
  });
  it("focuses launcher search with slash without stealing input keystrokes", () => {
    render(<NNAppLauncher />);
    const search = screen.getByRole("searchbox", { name: "Search applications" });
    fireEvent.keyDown(document, { key: "/" });
    expect(search).toHaveFocus();
    search.blur();
    fireEvent.keyDown(search, { key: "/" });
    expect(search).not.toHaveFocus();
  });
  it("keeps global Search and Settings as explicit destinations", () => {
    render(<NNAppLauncher />);
    fireEvent.click(screen.getByRole("button", { name: "Search all NN" }));
    expect(open).toHaveBeenLastCalledWith("/search", "Search");
    fireEvent.click(screen.getByRole("button", { name: "Profile and settings" }));
    expect(open).toHaveBeenLastCalledWith("/settings", "Settings");
  });
});
