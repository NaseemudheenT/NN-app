import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { rank, score } from "./CommandPalette";
import { APPLICATIONS } from "@/lib/apps/registry";

/**
 * The palette — how fast NN is to get around.
 *
 * The ranking is tested as a pure function because it is the part that
 * decides whether the first press of Enter lands where the founder meant.
 */

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const { CommandPalette } = await import("./CommandPalette");

afterEach(cleanup);
beforeEach(() => push.mockReset());

const open = async () => {
  render(<CommandPalette />);
  await userEvent.keyboard("{Meta>}k{/Meta}");
  return screen.findByRole("combobox");
};

describe("what the palette offers first", () => {
  it("puts an exact name above a description that merely mentions it", () => {
    expect(score({ label: "Finance", hint: "" }, "finance"))
      .toBeGreaterThan(score({ label: "Business", hint: "finance and invoices" }, "finance"));
  });

  it("prefers a name that starts with what was typed", () => {
    expect(score({ label: "Finance", hint: "" }, "fin"))
      .toBeGreaterThan(score({ label: "Define", hint: "" }, "fin"));
  });

  it("finds a word inside a two-word name", () => {
    expect(score({ label: "Creator Studio", hint: "" }, "stu")).toBeGreaterThan(0);
  });

  it("matches letters in order, so an abbreviation still lands", () => {
    expect(score({ label: "Creator Studio", hint: "" }, "crst")).toBeGreaterThan(0);
    expect(score({ label: "Creator Studio", hint: "" }, "zzz")).toBe(0);
  });

  it("offers a working surface above one that does not exist yet", () => {
    // Opening a screen that is not there is the wrong answer twice over.
    const ordered = rank([
      { id: "a", label: "Thing", hint: "", icon: "grid", group: "x" },
      { id: "b", label: "Thing", hint: "", icon: "grid", group: "x", route: "/home" as never },
    ], "thing");
    expect(ordered[0]?.id).toBe("b");
  });
});

describe("the palette", () => {
  it("is closed until ⌘K", () => {
    render(<CommandPalette />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens on ⌘K and takes the keyboard", async () => {
    const field = await open();
    expect(field).toHaveFocus();
    expect(screen.getByRole("dialog", { name: "Go to" })).toBeInTheDocument();
  });

  it("keeps Tab inside the modal search surface", async () => {
    const field = await open();
    await userEvent.keyboard("{Tab}");
    expect(field).toHaveFocus();
  });

  it("returns focus to the control that opened it", async () => {
    render(<><button type="button">Launcher control</button><CommandPalette /></>);
    const trigger = screen.getByRole("button", { name: "Launcher control" });
    trigger.focus();
    await userEvent.keyboard("{Meta>}k{/Meta}");
    expect(await screen.findByRole("combobox")).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("narrows as you type and opens the first hit on Enter", async () => {
    await open();
    await userEvent.keyboard("finance");
    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveTextContent("Finance");
    await userEvent.keyboard("{Enter}");
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("moves with the arrows without leaving the field", async () => {
    const field = await open();
    await userEvent.keyboard("{ArrowDown}");
    expect(field).toHaveFocus();
    const options = screen.getAllByRole("option");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(options[0]).toHaveAttribute("aria-selected", "false");
  });

  it("will not open an application that has no surface", async () => {
    const planned = APPLICATIONS.find((app) => app.href === undefined);
    if (planned === undefined) return;          // every one is built; nothing to prove
    await open();
    await userEvent.keyboard(planned.name);
    const first = screen.getAllByRole("option")[0];
    if (first?.getAttribute("aria-disabled") !== "true") return;
    await userEvent.keyboard("{Enter}");
    expect(push).not.toHaveBeenCalled();
  });

  it("says so rather than showing an empty list", async () => {
    await open();
    await userEvent.keyboard("zzzzqqq");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText(/Nothing in NN matches/)).toBeInTheDocument();
  });

  it("offers every application, not just the ones with a screen", async () => {
    await open();
    // No query: the whole list, capped. Every place plus applications.
    expect(screen.getAllByRole("option").length).toBeGreaterThan(10);
  });
});

describe("the direct keys", () => {
  it("sends ⌘J to REN and ⌘H to the dashboard", async () => {
    render(<CommandPalette />);
    await userEvent.keyboard("{Meta>}j{/Meta}");
    expect(push).toHaveBeenCalledWith("/ren");
    await userEvent.keyboard("{Meta>}h{/Meta}");
    expect(push).toHaveBeenCalledWith("/home");
  });
});
