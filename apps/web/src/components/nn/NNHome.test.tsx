import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { APPLICATIONS, GROUPS, applicationsInFamily } from "@/lib/apps/registry";

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

  it("offers its four views, and the nav is one tab stop rather than four", () => {
    render(<NNHomePreview />);
    // Rendered three times — rail, mobile nav and dock — so scope to one.
    const nav = screen.getAllByRole("navigation", { name: "Dashboard views" })[0]!;
    const buttons = within(nav).getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Today — What NN has for you",
      "Applications — All thirty-four",
      "Activity — Everything recorded",
      "System — The environment itself",
    ]);
    // Roving tab index: arrows move within the dock, Tab moves past it.
    expect(buttons.filter((b) => b.tabIndex === 0)).toHaveLength(1);
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

  // Seven clicks, each re-rendering a tree that mounts a thirty-four card
  // carousel. That is genuinely slow in jsdom — it passes in under a second
  // alone and overran vitest's five-second default only under full-suite
  // load. The budget is raised to match the work, not to hide a hang.
  it("opens each family at a route that exists", { timeout: 25_000 }, async () => {
    render(<NNHomePreview />);
    await userEvent.click(
      screen.getAllByRole("button", { name: "Applications — All thirty-four" })[0]!,
    );

    for (const family of GROUPS) {
      open.mockClear();
      const apps = applicationsInFamily(family.name);
      const ready = apps.filter((app) => app.href !== undefined).length;
      await userEvent.click(
        screen.getByRole("button", {
          name: `${family.name} ${apps.length} applications · ${ready} ready`,
        }),
      );
      expect(open, family.name).toHaveBeenCalledWith(`/family/${family.slug}`, family.name);
    }
  });




  it("puts the founder's own things in the top bar, and no material control", () => {
    render(<NNHomePreview />);
    // The glass belongs in Settings. A floating "Adjust glass" panel in the
    // chrome of a personal environment is a control shown for its own sake.
    expect(screen.queryByRole("button", { name: /Adjust glass/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /profile and settings/ })).toBeInTheDocument();
  });

  it("opens Settings from either control", async () => {
    render(<NNHomePreview />);
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(open).toHaveBeenCalledWith("/settings", "Settings");
  });

  it("reports the session honestly when nobody is signed in", async () => {
    render(<NNHomePreview />);
    await userEvent.click(
      screen.getAllByRole("button", { name: "System — The environment itself" })[0]!,
    );
    expect(screen.getByText("Not signed in")).toBeInTheDocument();
    // Sign-out must not be offered when there is no session to end.
    expect(screen.getByRole("button", { name: "Sign out here" })).toBeDisabled();
  });
});
