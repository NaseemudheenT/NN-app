import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getApplication } from "@/lib/apps/registry";
import { NNDomainBlueprint } from "./NNDomainBlueprint";

vi.mock("@/components/ui/Icon", () => ({
  Icon: ({ name }: { name: string }) => <span aria-hidden="true">{name}</span>,
}));

const college = getApplication("college");
const academy = getApplication("academy");
if (!college || !academy) throw new Error("Education applications must exist in the registry");

afterEach(cleanup);

describe("NN feature spaces", () => {
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
