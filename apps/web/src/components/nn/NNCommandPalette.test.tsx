import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NNCommandPalette } from "./NNCommandPalette";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("NN command palette", () => {
  beforeEach(() => push.mockClear());

  it("opens with the global keyboard shortcut and focuses search", async () => {
    render(<NNCommandPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    expect(screen.getByRole("dialog", { name: "NN command palette" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Search NN" })).toHaveFocus();
  });

  it("filters only real routes and opens the selected destination", async () => {
    render(<NNCommandPalette />);
    fireEvent.keyDown(document, { key: "k", metaKey: true });
    const input = screen.getByRole("combobox", { name: "Search NN" });
    await userEvent.type(input, "work");
    expect(screen.getByRole("option", { name: /Workspace/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Design system/ })).not.toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Enter" });
    expect(push).toHaveBeenCalledWith("/workspace");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows a truthful empty state and closes with Escape", () => {
    render(<NNCommandPalette />);
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    fireEvent.change(screen.getByRole("combobox", { name: "Search NN" }), { target: { value: "not-an-app" } });
    expect(screen.getByText("No matching destination")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
