import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { APPLICATIONS, GROUPS } from "@/lib/apps/registry";

const { push, open } = vi.hoisted(() => ({ push: vi.fn(), open: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/components/nn/AppTransition", () => ({
  useAppTransition: () => ({ open, close: vi.fn(), request: null }),
}));

const { NNHomePreview } = await import("./NNHome");

afterEach(cleanup);
beforeEach(() => {
  push.mockClear();
  open.mockClear();
});

describe("NN application launcher", () => {
  it("opens on a focused application launcher rather than a metrics dashboard", () => {
    render(<NNHomePreview />);
    expect(screen.getByRole("heading", { level: 1, name: /Welcome back/ })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Find an application" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Today" })).toBeNull();
    expect(screen.queryByText("Open tasks")).toBeNull();
  });

  it("shows all 34 applications in their six canonical groups", () => {
    render(<NNHomePreview />);
    expect(APPLICATIONS).toHaveLength(34);
    expect(GROUPS).toHaveLength(6);
    expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(34);
    for (const group of GROUPS) {
      expect(screen.getByRole("heading", { level: 2, name: group.name })).toBeInTheDocument();
    }
  });

  it("filters application names, groups and descriptions locally", async () => {
    const user = userEvent.setup();
    render(<NNHomePreview />);
    const search = screen.getByRole("searchbox", { name: "Find an application" });

    await user.type(search, "finance");
    expect(screen.getByRole("button", { name: /Open Finance/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open College/ })).toBeNull();

    await user.clear(search);
    await user.type(search, "passkeys");
    expect(screen.getByRole("button", { name: /Open Security Centre/ })).toBeInTheDocument();
  });

  it("shows an honest distinction between dedicated products and core record scaffolds", () => {
    render(<NNHomePreview />);
    const dedicated = APPLICATIONS.filter((app) => app.experience === "dedicated");
    const records = APPLICATIONS.filter((app) => app.experience === "records");

    expect(dedicated.map((app) => app.id).sort()).toEqual(["files", "life", "search"]);
    expect(records).toHaveLength(31);
    expect(screen.getAllByText("DEDICATED")).toHaveLength(3);
    expect(screen.getAllByText("CORE RECORDS")).toHaveLength(31);
  });

  it("opens the selected app through the shared route transition", async () => {
    const user = userEvent.setup();
    render(<NNHomePreview />);
    await user.click(screen.getByRole("button", { name: /Open Life/ }));
    expect(open).toHaveBeenCalledWith("/life", "Life");
  });

  it("keeps settings behind the profile entry", async () => {
    const user = userEvent.setup();
    render(<NNHomePreview />);
    await user.click(screen.getByRole("button", { name: "Profile and settings" }));
    expect(push).toHaveBeenCalledWith("/settings");
  });

  it("explains when a search has no matches and lets the user clear it", async () => {
    const user = userEvent.setup();
    render(<NNHomePreview />);
    await user.type(screen.getByRole("searchbox", { name: "Find an application" }), "not-a-real-app");
    expect(screen.getByText("No applications found")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(34);
  });
});
