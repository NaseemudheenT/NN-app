import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { open } = vi.hoisted(() => ({ open: vi.fn() }));
const theme = vi.hoisted(() => ({
  theme: "system" as string, motion: "system" as string,
  setTheme: vi.fn(), setMotion: vi.fn(),
}));
const session = vi.hoisted(() => ({ user: null as { uid: string; displayName?: string } | null }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/settings" }));
vi.mock("@/components/nn/AppTransition", () => ({
  useAppTransition: () => ({ open, close: vi.fn(), request: null }),
}));
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: session.user }),
  fetchRecoveryState: vi.fn(async () => ({ configured: false, updatedAt: null })),
  setRecoveryPassword: vi.fn(async () => 84),
}));
vi.mock("@/lib/theme", () => ({
  useTheme: () => ({
    theme: theme.theme, setTheme: theme.setTheme,
    motion: theme.motion, setMotion: theme.setMotion,
    resolvedTheme: "dark", reducedMotion: false,
  }),
}));

const { NNSettings } = await import("./NNSettings");

afterEach(cleanup);
beforeEach(() => {
  window.localStorage.clear();
  open.mockClear();
  theme.setTheme.mockClear();
  theme.setMotion.mockClear();
  session.user = null;
});

describe("Settings", () => {
  it("is a grouped list, the way a phone's settings are", () => {
    render(<NNSettings />);
    for (const name of ["Appearance", "REN", "Privacy and security"]) {
      expect(screen.getByRole("heading", { level: 2, name }), name).toBeInTheDocument();
    }
  });

  it("changes the theme and the motion setting for real", async () => {
    render(<NNSettings />);
    const themeControls = screen.getByRole("group", { name: "Theme" });
    await userEvent.click(within(themeControls).getByRole("switch", { name: "Dark appearance" }));
    expect(theme.setTheme).toHaveBeenNthCalledWith(1, "light");
    await userEvent.click(within(themeControls).getByRole("button", { name: "Auto" }));
    expect(theme.setTheme).toHaveBeenNthCalledWith(2, "system");
    await userEvent.click(within(screen.getByRole("group", { name: "Motion" })).getByText("Reduced"));
    expect(theme.setMotion).toHaveBeenCalledWith("reduced");
  });

  it("keeps nothing here that is not a setting", () => {
    // An application is not a preference, and a link to one from Settings is
    // a second front door that has to be kept in step with the first. The
    // glass sliders went the same way: four sliders and a colour picker is a
    // workshop, not a settings page.
    render(<NNSettings />);
    expect(screen.queryByRole("slider")).toBeNull();
    expect(screen.queryByLabelText("Glass tint")).toBeNull();
    expect(screen.queryByRole("heading", { level: 2, name: "Applications" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Files/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Life/ })).toBeNull();
  });

  it("no longer claims voice is unbuilt, because it is built", () => {
    /*
     * This row used to be a disabled switch reading "Not built yet", which
     * was honest at the time. REN now speaks and the voice can be changed by
     * asking it to, so the old row became the opposite of honest.
     *
     * jsdom installs no speech voices, which is exactly the case worth
     * pinning: with nothing to choose between, NN states the fact rather
     * than offering an empty picker.
     */
    render(<NNSettings />);
    expect(screen.queryByText("Not built yet")).toBeNull();
    expect(screen.queryByRole("switch", { name: "Voice" })).toBeNull();
    expect(screen.getByText("This device's own")).toBeInTheDocument();
  });

  it("offers a way back to the first run, per device", () => {
    render(<NNSettings />);
    expect(screen.getByRole("button", { name: /Set up NN again/ })).toBeInTheDocument();
  });

  it("says plainly when nobody is signed in, and offers no way out of a session that does not exist", () => {
    render(<NNSettings />);
    expect(screen.getAllByText("Not signed in").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Sign out here" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign out everywhere" })).toBeNull();
  });

  it("offers sign-out only when there is a session to end", () => {
    session.user = { uid: "owner-1", displayName: "Naseemudheen T" };
    render(<NNSettings onSignOut={vi.fn()} onSignOutEverywhere={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Sign out here" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out everywhere" })).toBeInTheDocument();
  });

  it("opens the profile in place rather than navigating to a page of four lines", async () => {
    session.user = { uid: "owner-abcdef123456", displayName: "Naseemudheen T" };
    render(<NNSettings />);
    // Named, not just "the collapsed one": the recovery password row opens in
    // place too, so there is more than one disclosure in this list now.
    const account = screen.getByRole("button", { name: /Naseemudheen T/ });
    expect(account).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(account);
    expect(screen.getByRole("heading", { level: 2, name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("owner-abcdef…")).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
  });
});

describe("knowing which NN this is", () => {
  /**
   * A deployed web app is the one kind of software that can be replaced
   * underneath you without telling you. A tab opened on Monday still runs
   * Monday's build on Thursday — and the symptom is that something stays
   * broken after it was fixed, which is the most confusing failure there is.
   */

  it("says which release and build it is running", async () => {
    render(<NNSettings />);
    expect(screen.getByRole("heading", { level: 2, name: "About NN" })).toBeInTheDocument();
    expect(screen.getByText("Release")).toBeInTheDocument();
    expect(screen.getByText("Build")).toBeInTheDocument();
  });

  it("keeps the changes folded away until asked", async () => {
    render(<NNSettings />);
    const toggle = screen.getByRole("button", { name: /What's changed/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("listitem").length).toBeGreaterThan(3);
  });

  it("offers no update when there is none", () => {
    // Nothing fetched in jsdom, so no version is known and nothing may be
    // claimed. Offering an update that does not exist is worse than silence.
    render(<NNSettings />);
    expect(screen.queryByRole("button", { name: /Update NN/ })).toBeNull();
  });
});
