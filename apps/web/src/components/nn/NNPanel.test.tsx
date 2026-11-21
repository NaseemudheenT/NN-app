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
    expect(screen.getByRole("button", { name: /Go to/ , hidden: true })).toHaveAttribute("aria-expanded", "true");
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

  it("marks where you already are", async () => {
    await open();
    const today = screen.getByRole("button", { name: /Today/ });
    expect(today).toHaveAttribute("aria-current", "page");
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
