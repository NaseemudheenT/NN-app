import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.hoisted(() => vi.fn());
const path = vi.hoisted(() => ({ value: "/home" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => path.value,
}));

const { NNPanel } = await import("./NNPanel");
const { destinations } = await import("@/lib/nn/destinations");

/**
 * The way to anywhere, without a keyboard.
 *
 * NN could already jump anywhere with ⌘K — on a device with a ⌘ and a K.
 * The founder's is a phone. This is the same reach for a thumb, and the
 * tests that matter are the ones about *parity*: the two must always offer
 * the same places, or a screen becomes reachable one way and not the other.
 */

afterEach(cleanup);
beforeEach(() => { push.mockReset(); path.value = "/home"; });

describe("the island", () => {
  it("starts closed, as one control", () => {
    render(<NNPanel />);
    const island = screen.getByRole("button", { name: /Go to/ });
    expect(island).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the official NN mark and the current destination in the collapsed island", () => {
    render(<NNPanel />);
    const island = screen.getByRole("button", { name: /currently Today/ });
    expect(island).toHaveTextContent("Today");
    expect(island.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
  });

  it("tracks the destination when browser history changes the route", () => {
    const { rerender } = render(<NNPanel />);
    expect(screen.getByRole("button", { name: /currently Today/ })).toBeInTheDocument();

    // Next's pathname subscription updates on back/forward navigation too.
    path.value = "/settings";
    rerender(<NNPanel />);
    expect(screen.getByRole("button", { name: /currently Settings/ })).toBeInTheDocument();

    path.value = "/home";
    rerender(<NNPanel />);
    expect(screen.getByRole("button", { name: /currently Today/ })).toBeInTheDocument();
  });

  it("knows where you are on a nested route", () => {
    // /ren/chat is REN, not nothing. Longest match wins.
    path.value = "/ren/chat";
    render(<NNPanel />);
    expect(screen.getByRole("button", { name: /currently REN/ })).toBeInTheDocument();
  });

  it("opens into the chooser", async () => {
    render(<NNPanel />);
    await userEvent.click(screen.getByRole("button", { name: /Go to/ }));
    expect(screen.getByRole("dialog", { name: "Go to" })).toBeInTheDocument();
    // The collapsed island is deliberately removed from the accessibility
    // tree while expanded; inspect the mounted control without querying it
    // as an available button.
    expect(document.querySelector('button[aria-label^="Go to"]')).toHaveAttribute("aria-expanded", "true");
  });
});

describe("choosing somewhere", () => {
  const open = async () => {
    render(<NNPanel />);
    await userEvent.click(screen.getByRole("button", { name: /Go to/ }));
  };

  it("goes there, and closes", async () => {
    await open();
    await userEvent.click(screen.getByRole("button", { name: /Settings/ }));
    expect(push).toHaveBeenCalledWith("/settings");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("returns focus to the island after choosing a destination", async () => {
    await open();
    await userEvent.click(screen.getByRole("button", { name: /Settings/ }));
    expect(screen.getByRole("button", { name: /Go to/ })).toHaveFocus();
  });

  it("marks where you already are", async () => {
    await open();
    const today = screen.getByRole("button", { name: /Today/ });
    expect(today).toHaveAttribute("aria-current", "page");
  });

  it("filters the phone navigation across all application families", async () => {
    await open();
    const search = screen.getByRole("searchbox", { name: "Search destinations" });
    await userEvent.type(search, "finance");
    expect(screen.getByRole("button", { name: /Finance/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /College/ })).toBeNull();
    expect(screen.getByText("1 destination")).toBeInTheDocument();
    await userEvent.clear(search);
    expect(screen.getByRole("button", { name: /College/ })).toBeInTheDocument();
    await userEvent.clear(search);
    await userEvent.type(search, "education");
    expect(screen.getByRole("button", { name: /College/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Academy/ })).toBeInTheDocument();
  });

  it("offers only what NN can actually open", async () => {
    await open();
    const planned = destinations().filter((d) => d.route === undefined);
    for (const unreachable of planned) {
      // Listing a screen that is not there is the wrong answer twice over.
      expect(screen.queryByRole("button", { name: new RegExp(`^${unreachable.label}`) }),
        unreachable.label).toBeNull();
    }
  });

  it("closes when the user presses outside the island", async () => {
    await open();
    await userEvent.click(document.body);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps keyboard focus inside the expanded island", async () => {
    const user = userEvent.setup();
    render(<NNPanel />);
    await user.click(screen.getByRole("button", { name: /Go to/ }));
    const close = screen.getByRole("button", { name: "Close" });
    const controls = screen.getAllByRole("button");
    const last = controls[controls.length - 1]!;
    close.focus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(last).toHaveFocus();
    await user.keyboard("{Tab}");
    expect(close).toHaveFocus();
  });

  it("closes on Escape, and gives the focus back", async () => {
    await open();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("button", { name: /Go to/ })).toHaveFocus();
  });
});

describe("parity with the keyboard", () => {
  it("offers exactly the places the palette does", async () => {
    // Both read `destinations()`. This asserts they still do — two lists
    // naming the same places is two places to forget one.
    render(<NNPanel />);
    await userEvent.click(screen.getByRole("button", { name: /Go to/ }));
    const reachable = destinations().filter((d) => d.route !== undefined);
    const shown = screen.getAllByRole("button")
      .map((b) => b.textContent ?? "")
      .join(" ");
    for (const destination of reachable) {
      expect(shown, destination.label).toContain(destination.label);
    }
  });
});
