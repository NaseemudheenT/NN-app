import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getApplication } from "@/lib/apps/registry";
import { DOMAIN_BLUEPRINTS, inferDomainLayout, NNDomainBlueprint, type DomainModule } from "./NNDomainBlueprint";

vi.mock("@/components/ui/Icon", () => ({
  Icon: ({ name }: { name: string }) => <span aria-hidden="true">{name}</span>,
}));

const college = getApplication("college");
const academy = getApplication("academy");
const formulaEngine = getApplication("formula-engine");
const logicLab = getApplication("logic-lab");
const learningVault = getApplication("learning-vault");
if (!college || !academy || !formulaEngine || !logicLab || !learningVault) throw new Error("Education applications must exist in the registry");

afterEach(cleanup);

describe("NN feature spaces", () => {
  it("selects a screen grammar from each feature rather than the app name", () => {
    const feature = (id: string, title: string): DomainModule => ({
      id, title, description: "", icon: "calendar", regions: [],
    });
    expect(inferDomainLayout("creator-studio", feature("calendar", "Calendar"))).toBe("timeline");
    expect(inferDomainLayout("studio", feature("documents", "Documents"))).toBe("editor");
    expect(inferDomainLayout("finance", feature("ledger", "Ledger"))).toBe("finance");
    expect(inferDomainLayout("travel", feature("places", "Places"))).toBe("map");
  });

  it("assigns a purpose-built screen grammar to every domain module", () => {
    expect(Object.keys(DOMAIN_BLUEPRINTS)).toHaveLength(31);
    for (const [appId, modules] of Object.entries(DOMAIN_BLUEPRINTS)) {
      for (const featureModule of modules) {
        const layout = inferDomainLayout(appId, featureModule);
        expect(layout, `${appId}/${featureModule.id} should have a domain layout`).not.toBe("dashboard");
      }
    }
  });
  it("renders the specialist learning tools through their own screen grammars", () => {
    const cases = [
      { app: formulaEngine, layout: "calculator" },
      { app: logicLab, layout: "board" },
      { app: learningVault, layout: "cards" },
    ];
    for (const item of cases) {
      const { unmount } = render(<NNDomainBlueprint app={item.app} />);
      expect(document.querySelector(`[data-layout="${item.layout}"]`)).toBeInTheDocument();
      unmount();
    }
  });

  it("supports horizontal arrow navigation and associates the selected preview", () => {
    render(<NNDomainBlueprint app={college} />);
    const rail = screen.getByRole("tablist", { name: "College spaces" });
    const semester = within(rail).getByRole("tab", { name: "Semester" });
    expect(semester).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(semester, { key: "ArrowRight" });

    const syllabus = within(rail).getByRole("tab", { name: "Syllabus" });
    expect(syllabus).toHaveAttribute("aria-selected", "true");
    expect(syllabus).toHaveFocus();
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", "college-space-syllabus");
  });

  it("resets the selected space when the founder opens another application", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<NNDomainBlueprint app={college} />);
    await user.click(screen.getByRole("tab", { name: "Syllabus" }));
    expect(screen.getByRole("tab", { name: "Syllabus" })).toHaveAttribute("aria-selected", "true");

    rerender(<NNDomainBlueprint app={academy} />);
    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "Paths" })).toHaveAttribute("aria-selected", "true");
    });
  });
});
