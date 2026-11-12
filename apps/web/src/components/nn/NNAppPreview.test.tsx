import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { APPLICATIONS } from "@/lib/apps/registry";
import { NNAppPreview, PREVIEW_MODULES } from "./NNAppPreview";

afterEach(cleanup);

describe("NN application workspaces", () => {
  it("defines four feature-specific modules for every planned application", () => {
    const planned = APPLICATIONS.filter((app) => app.availability === "planned");
    expect(Object.keys(PREVIEW_MODULES).sort()).toEqual(planned.map((app) => app.id).sort());
    expect(Object.values(PREVIEW_MODULES).every((modules) => modules.length === 4)).toBe(true);
  });

  it("opens a dedicated module and states the actual implementation boundary", async () => {
    const app = APPLICATIONS.find((item) => item.id === "college");
    if (!app) throw new Error("College application is missing from the registry");
    render(<NNAppPreview app={app} />);
    expect(screen.getByRole("heading", { name: "College" })).toBeInTheDocument();
    expect(screen.getByText("IN DEVELOPMENT")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Subjects" })).toBeInTheDocument();
    expect(screen.getByText("This module is being built.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Timetable/ }));
    expect(screen.getByRole("heading", { name: "Timetable" })).toBeInTheDocument();
    expect(screen.getByText(/Live records, create and edit actions/)).toBeInTheDocument();
    expect(screen.queryByText(/Illustrative content/)).not.toBeInTheDocument();
  });

  it("provides an accessible module selector for every planned application", () => {
    for (const app of APPLICATIONS.filter((item) => item.availability === "planned")) {
      const { unmount } = render(<NNAppPreview app={app} />);
      const navigation = screen.getByRole("navigation", { name: `${app.name} workspace sections` });
      expect(navigation.querySelectorAll("button")).toHaveLength(4);
      unmount();
    }
  });
});
