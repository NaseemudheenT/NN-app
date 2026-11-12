import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { APPLICATIONS } from "@/lib/apps/registry";
import { NNAppPreview, PREVIEW_MODULES } from "./NNAppPreview";

afterEach(cleanup);

describe("NN application design previews", () => {
  it("provides a dedicated four-module interface map for every planned application", () => {
    const planned = APPLICATIONS.filter((app) => app.availability === "planned");
    expect(Object.keys(PREVIEW_MODULES).sort()).toEqual(planned.map((app) => app.id).sort());
    expect(Object.values(PREVIEW_MODULES).every((modules) => modules.length === 4)).toBe(true);
  });

  it("keeps preview workspaces explicitly disconnected and interactive tabs local", async () => {
    const app = APPLICATIONS.find((item) => item.id === "college");
    if (!app) throw new Error("College application is missing from the registry");
    render(<NNAppPreview app={app} related={[]} />);
    expect(screen.getByText("Interface preview — not an operational application.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "workspace" }));
    expect(screen.getByText("NO LIVE RECORDS")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "architecture" }));
    expect(screen.getByText("Owner-scoped")).toBeInTheDocument();
  });
});
