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
  it("renders every registered application exactly once with an honest availability state", () => {
    render(<NNHomePreview />);
    expect(screen.getAllByRole("button")).toHaveLength(APPLICATIONS.length);

    for (const app of APPLICATIONS) {
      const isAvailable = app.availability === "available" && Boolean(app.href);
      const name = isAvailable
        ? new RegExp(`^${app.name}\\. Open application$`)
        : new RegExp(`^${app.name}\\. Open application workspace; currently in development$`);
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }

    expect(screen.getAllByText("READY")).toHaveLength(1);
    expect(screen.getAllByText("IN DEVELOPMENT")).toHaveLength(APPLICATIONS.length - 1);
  });

  it("routes every application card to its real app or its honest workspace", async () => {
    const user = userEvent.setup();
    render(<NNHomePreview />);

    for (const app of APPLICATIONS) {
      const isAvailable = app.availability === "available" && Boolean(app.href);
      const destination = isAvailable ? app.href : app.overviewHref;
      const label = isAvailable
        ? new RegExp(`^${app.name}\\. Open application$`)
        : new RegExp(`^${app.name}\\. Open application workspace; currently in development$`);
      await user.click(screen.getByRole("button", { name: label }));
      expect(push).toHaveBeenLastCalledWith(destination);
    }

    expect(push).toHaveBeenCalledTimes(APPLICATIONS.length);
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
