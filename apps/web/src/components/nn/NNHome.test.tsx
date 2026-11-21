import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { APPLICATIONS } from "@/lib/apps/registry";

const { push, open } = vi.hoisted(() => ({ push: vi.fn(), open: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/home",
}));
vi.mock("@/components/nn/AppTransition", () => ({
  useAppTransition: () => ({ open, travelling: false }),
}));
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
});

describe("NN Home launcher", () => {
  it("opens as a focused application launcher", () => {
    render(<NNHomePreview />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("main", { name: "NN application launcher" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Find an application" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Open / })).toHaveLength(APPLICATIONS.length);
  });

  it("shows all 34 registered applications grouped by their canonical family", () => {
    render(<NNHomePreview />);
    expect(APPLICATIONS).toHaveLength(34);
    for (const app of APPLICATIONS) {
      expect(screen.getByRole("button", { name: `Open ${app.name}` })).toBeInTheDocument();
    }
  });

  it("filters the launcher without removing the application registry", async () => {
    const user = userEvent.setup();
    render(<NNHomePreview />);
    await user.type(screen.getByRole("searchbox", { name: "Find an application" }), "college");
    expect(screen.getByRole("button", { name: "Open College" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Finance" })).toBeNull();
    expect(APPLICATIONS).toHaveLength(34);
  });

  it("opens the selected application through the shared transition", async () => {
    const user = userEvent.setup();
    render(<NNHomePreview />);
    const app = APPLICATIONS.find((entry) => entry.name === "College")!;
    await user.click(screen.getByRole("button", { name: "Open College" }));
    expect(open).toHaveBeenCalledWith(app.href ?? app.overviewHref, "College");
  });

  it("routes profile settings through the single profile entry", async () => {
    const user = userEvent.setup();
    render(<NNHomePreview />);
    await user.click(screen.getByRole("button", { name: "Profile and settings" }));
    expect(push).toHaveBeenCalledWith("/settings");
    expect(within(screen.getByRole("main", { name: "NN application launcher" })).getByRole("searchbox")).toBeInTheDocument();
  });
});
