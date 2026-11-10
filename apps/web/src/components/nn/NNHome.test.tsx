import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { APPLICATIONS } from "@/lib/apps/registry";
import { NNHomePreview } from "./NNHome";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

afterEach(cleanup);
beforeEach(() => push.mockClear());

describe("NN Home dashboard", () => {
  it("renders every registered application exactly once", () => {
    render(<NNHomePreview />);
    expect(screen.getAllByRole("button")).toHaveLength(APPLICATIONS.length);
    for (const app of APPLICATIONS) {
      expect(screen.getByRole("button", { name: new RegExp(app.name) })).toBeInTheDocument();
    }
  });

  it("opens the real route for the operational Life application", async () => {
    const user = userEvent.setup();
    render(<NNHomePreview />);
    await user.click(screen.getByRole("button", { name: "Life. Open application" }));
    expect(push).toHaveBeenCalledWith("/life");
  });

  it("opens an honest design overview for an application still in development", async () => {
    const user = userEvent.setup();
    render(<NNHomePreview />);
    await user.click(screen.getByRole("button", { name: /College.*currently in development/ }));
    expect(push).toHaveBeenCalledWith("/apps/college");
  });

  it("supports keyboard activation for application cards", async () => {
    const user = userEvent.setup();
    render(<NNHomePreview />);
    const card = screen.getByRole("button", { name: "Life. Open application" });
    card.focus();
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/life");
  });
});
