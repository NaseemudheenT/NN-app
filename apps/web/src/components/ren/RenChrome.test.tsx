import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const path = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => path.value }));
vi.mock("@/components/nn/CommandPalette", () => ({
  CommandPalette: () => <div data-testid="command-palette" />,
}));
vi.mock("@/components/nn/NNPanel", () => ({
  NNPanel: () => <div data-testid="dynamic-island" />,
}));
vi.mock("./RenLauncher", () => ({
  RenLauncher: () => <div data-testid="ren-launcher" />,
}));

const { RenChrome } = await import("./RenChrome");

afterEach(cleanup);
beforeEach(() => { path.value = "/"; });

describe("the global NN chrome", () => {
  it("keeps the cinematic entry free of workspace navigation", () => {
    path.value = "/";
    render(<RenChrome />);
    expect(screen.queryByTestId("command-palette")).toBeNull();
    expect(screen.queryByTestId("dynamic-island")).toBeNull();
    expect(screen.queryByTestId("ren-launcher")).toBeNull();
  });

  it("keeps the sign-in door free of controls for an authenticated workspace", () => {
    path.value = "/sign-in";
    render(<RenChrome />);
    expect(screen.queryByTestId("command-palette")).toBeNull();
    expect(screen.queryByTestId("dynamic-island")).toBeNull();
    expect(screen.queryByTestId("ren-launcher")).toBeNull();
  });

  it("mounts the shared navigation once on an application surface", () => {
    path.value = "/home";
    render(<RenChrome />);
    expect(screen.getAllByTestId("command-palette")).toHaveLength(1);
    expect(screen.getAllByTestId("dynamic-island")).toHaveLength(1);
    expect(screen.getAllByTestId("ren-launcher")).toHaveLength(1);
  });

  it("keeps REN's own surface free of a duplicate REN launcher", () => {
    path.value = "/ren/chat";
    render(<RenChrome />);
    expect(screen.getAllByTestId("command-palette")).toHaveLength(1);
    expect(screen.getAllByTestId("dynamic-island")).toHaveLength(1);
    expect(screen.queryByTestId("ren-launcher")).toBeNull();
  });
});
