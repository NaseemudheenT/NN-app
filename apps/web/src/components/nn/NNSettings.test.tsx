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
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: session.user }) }));
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
    for (const name of ["Appearance", "REN", "Privacy and security", "Applications"]) {
      expect(screen.getByRole("heading", { level: 2, name }), name).toBeInTheDocument();
    }
  });

  it("changes the theme and the motion setting for real", async () => {
    render(<NNSettings />);
    await userEvent.click(within(screen.getByRole("group", { name: "Theme" })).getByText("Light"));
    expect(theme.setTheme).toHaveBeenCalledWith("light");
    await userEvent.click(within(screen.getByRole("group", { name: "Motion" })).getByText("Reduced"));
    expect(theme.setMotion).toHaveBeenCalledWith("reduced");
  });

  it("keeps the glass on this device, because the room is", async () => {
    const { unmount } = render(<NNSettings />);
    await userEvent.click(screen.getByRole("button", { name: "Solid" }));
    expect(window.localStorage.getItem("nn.glass")).toContain('"blur":32');

    unmount();
    render(<NNSettings />);
    expect(screen.getByText("32 px")).toBeInTheDocument();
  });

  it("offers the four values NN's surfaces actually read", () => {
    render(<NNSettings />);
    expect(screen.getAllByRole("slider")).toHaveLength(4);
    expect(screen.getByLabelText("Glass tint")).toBeInTheDocument();
  });

  it("does not offer a switch for something NN cannot do", () => {
    render(<NNSettings />);
    // Voice is not built. The row says so and the switch is off and disabled,
    // rather than being absent or, worse, flippable.
    const voice = screen.getByRole("switch", { name: "Voice" });
    expect(voice).toBeDisabled();
    expect(voice).not.toBeChecked();
    expect(screen.getByText("Not built yet")).toBeInTheDocument();
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
    const account = screen.getByRole("button", { expanded: false });
    await userEvent.click(account);
    expect(screen.getByRole("heading", { level: 2, name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("owner-abcdef…")).toBeInTheDocument();
    expect(open).not.toHaveBeenCalled();
  });
});
