import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { APPLICATIONS, GROUPS } from "@/lib/apps/registry";

const { push, open } = vi.hoisted(() => ({ push: vi.fn(), open: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/home",
}));

vi.mock("@/components/nn/AppTransition", () => ({
  useAppTransition: () => ({ open, close: vi.fn(), request: null }),
}));

/* Signed out and unconfigured on purpose: this is the state the design route
   actually renders in, and it is the one where a dashboard is most tempted to
   show a confident zero for data it never read. */
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/lib/firebase", () => ({
  firebaseAvailable: () => false,
  getFirebase: () => ({ db: {} }),
}));

const { NNHomePreview } = await import("./NNHome");

afterEach(cleanup);
beforeEach(() => {
  push.mockClear();
  open.mockClear();
  window.localStorage.clear();
});

describe("NN dashboard", () => {
  it("opens on Today", () => {
    render(<NNHomePreview />);
    expect(screen.getByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument();
  });

  it("offers its views and REN, and the nav is one tab stop rather than five", () => {
    render(<NNHomePreview />);
    // Rendered three times — rail, mobile nav and dock — so scope to one.
    const nav = screen.getAllByRole("navigation", { name: "Dashboard views" })[0]!;
    const buttons = within(nav).getAllByRole("button");
    // No "System": it opened a fourth surface that overlapped Settings and
    // gave the dashboard a third way in. Settings carries it now.
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Today — What NN has for you",
      "Applications — All thirty-four",
      "REN — Your intelligence",
      "Activity — Everything recorded",
    ]);
    // Roving tab index: arrows move within the dock, Tab moves past it.
    expect(buttons.filter((b) => b.tabIndex === 0)).toHaveLength(1);
  });

  it("leaves the dashboard for REN, and stays on it for a view", async () => {
    // REN sits in the dock but is not a view: it is the only item that
    // navigates, and choosing it must not quietly reset the open view.
    render(<NNHomePreview />);
    const nav = screen.getAllByRole("navigation", { name: "Dashboard views" })[0]!;
    await userEvent.click(within(nav).getByRole("button", { name: "REN — Your intelligence" }));
    expect(push).toHaveBeenCalledWith("/ren");

    push.mockClear();
    await userEvent.click(
      within(nav).getByRole("button", { name: "Activity — Everything recorded" }),
    );
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1, name: "Activity" })).toBeInTheDocument();
  });

  it("shows an em dash, never a zero, for a count it could not read", () => {
    render(<NNHomePreview />);
    const glance = screen.getByRole("list", { name: "Today at a glance" });
    const counters = within(glance).getAllByRole("listitem");
    expect(counters.map((c) => c.querySelector("span")?.textContent)).toEqual([
      "Open tasks", "Scheduled", "Notes", "Goals",
    ]);
    for (const counter of counters) {
      // A zero would be a claim NN counted and found none. It did not count.
      expect(within(counter).getByText("\u2014")).toBeInTheDocument();
      expect(within(counter).queryByText("0")).toBeNull();
      expect(within(counter).getByText("Not readable")).toBeInTheDocument();
    }
  });

  it("says why a panel is empty instead of looking empty", () => {
    render(<NNHomePreview />);
    const notices = screen.getAllByRole("status");
    expect(notices.length).toBeGreaterThan(0);
    expect(notices[0]!.textContent).toContain("no Firebase configuration");
  });

  it("reaches every one of the 34 applications from the Applications view", async () => {
    render(<NNHomePreview />);
    await userEvent.click(
      screen.getAllByRole("button", { name: "Applications — All thirty-four" })[0]!,
    );

    const carousel = screen.getByRole("group", { name: "NN applications" });
    const names = within(carousel)
      .getByRole("list", { name: "All nn applications" })
      .querySelectorAll("button");
    expect(names).toHaveLength(APPLICATIONS.length);
    expect(APPLICATIONS).toHaveLength(34);
  });

  it("no longer stacks a second launcher under the carousel", async () => {
    // The Applications view used to repeat all six families as a list below
    // the carousel — the same thirty-four applications, reached a second way.
    // The founder asked for it gone: the carousel is the launcher.
    render(<NNHomePreview />);
    await userEvent.click(
      screen.getAllByRole("button", { name: "Applications — All thirty-four" })[0]!,
    );
    // Matched on the family row's own shape — "Education 6 applications ·
    // 3 ready" — rather than the family name.
    expect(screen.queryAllByRole("button", { name: /\d+ applications · \d+ ready/ })).toEqual([]);
    expect(GROUPS.length).toBeGreaterThan(0);
  });

  it("puts the founder's own things in the top bar, and no material control", () => {
    render(<NNHomePreview />);
    // The glass belongs in Settings. A floating "Adjust glass" panel in the
    // chrome of a personal environment is a control shown for its own sake.
    expect(screen.queryByRole("button", { name: /Adjust glass/ })).toBeNull();
    expect(screen.getByRole("button", { name: /profile and settings/ })).toBeInTheDocument();
  });

  it("offers exactly one way into Settings", async () => {
    // Three, before: a gear beside the profile, the profile itself, and a
    // "System" item in both navigation panels that went somewhere else
    // entirely. The founder counted them and asked for two of them gone.
    render(<NNHomePreview />);
    expect(screen.queryByRole("button", { name: "Settings" })).toBeNull();
    const ways = screen.getAllByRole("button", { name: /settings/i });
    expect(ways).toHaveLength(1);

    await userEvent.click(ways[0]!);
    expect(push).toHaveBeenCalledWith("/settings");
    // Settings is the panel behind the screen you are already on. Travelling
    // to it was theatre for a page of switches. Applications still fly.
    expect(open).not.toHaveBeenCalled();
  });
});
