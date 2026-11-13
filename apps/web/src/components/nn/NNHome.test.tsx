import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  APPLICATIONS,
  GROUPS,
  applicationsInFamily,
  familySlug,
} from "@/lib/apps/registry";
import { NNHomePreview } from "./NNHome";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/home",
}));

afterEach(cleanup);
beforeEach(() => push.mockClear());

/** The folder shows the front of the stack; the key reaches the rest. */
const MAX_SHEETS = 4;

describe("NN Home dashboard", () => {
  it("shows one folder per family, and the folders account for all 34 applications", () => {
    render(<NNHomePreview />);

    let counted = 0;
    for (const family of GROUPS) {
      const apps = applicationsInFamily(family.name);
      counted += apps.length;
      expect(
        screen.getByRole("button", {
          name: new RegExp(`^Open ${escape(family.name)}, ${apps.length} applications$`),
        }),
        family.name,
      ).toBeInTheDocument();
    }

    expect(counted).toBe(APPLICATIONS.length);
    expect(GROUPS).toHaveLength(6);
  });

  it("gives every family a key to the rest of it, so the preview hides nothing", async () => {
    const user = userEvent.setup();
    render(<NNHomePreview />);

    for (const family of GROUPS) {
      const apps = applicationsInFamily(family.name);
      const key = screen.getByRole("button", {
        name: `Open all ${apps.length} in ${family.name}`,
      });
      await user.click(key);
      expect(push).toHaveBeenLastCalledWith(`/family/${familySlug(family.name)}`);
    }

    expect(push).toHaveBeenCalledTimes(GROUPS.length);
  });

  it("keeps a closed folder's contents out of the tab order", () => {
    const { container } = render(<NNHomePreview />);
    const lists = container.querySelectorAll('[role="list"]');
    expect(lists.length).toBe(GROUPS.length);
    // Closed, the sheets are behind glass; reaching them with Tab would put
    // focus on something that cannot be seen.
    for (const list of lists) expect(list.hasAttribute("inert")).toBe(true);
  });

  it("opens a folder and routes each sheet to a real destination", async () => {
    const user = userEvent.setup();
    render(<NNHomePreview />);

    for (const family of GROUPS) {
      const apps = applicationsInFamily(family.name);
      // The ordering the dashboard uses: whatever works sits nearest the glass.
      const ordered = [...apps].sort(
        (a, b) => Number(a.href !== undefined) - Number(b.href !== undefined),
      );
      const shown = ordered.slice(Math.max(0, ordered.length - MAX_SHEETS));

      await user.click(
        screen.getByRole("button", {
          name: new RegExp(`^Open ${escape(family.name)},`),
        }),
      );

      const contents = screen.getByRole("list", { name: `${family.name} contents` });
      for (const app of shown) {
        const label = `${app.name} — ${app.href ? "Ready" : "In development"}`;
        const sheet = within(contents).getByRole("button", { name: label });
        await user.click(sheet);
        // A real destination either way — never a dead control.
        expect(push).toHaveBeenLastCalledWith(app.href ?? app.overviewHref);
      }
    }
  });

  it("puts the applications that actually work at the front of each stack", () => {
    render(<NNHomePreview />);

    // Life and Search are the two with real surfaces; both must be visible
    // without opening a family page.
    for (const name of ["Life", "Search"]) {
      const app = APPLICATIONS.find((entry) => entry.name === name)!;
      const contents = screen.getByRole("list", { name: `${app.group} contents` });
      expect(
        within(contents).getByRole("button", { name: `${app.name} — Ready` }),
      ).toBeInTheDocument();
    }
  });

  it("supports keyboard activation", async () => {
    const user = userEvent.setup();
    render(<NNHomePreview />);

    const folder = screen.getByRole("button", { name: /^Open Life & wellbeing,/ });
    folder.focus();
    await user.keyboard("{Enter}");

    const contents = screen.getByRole("list", { name: "Life & wellbeing contents" });
    const life = within(contents).getByRole("button", { name: "Life — Ready" });
    life.focus();
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/life");
  });
});

/** Family names contain `&`, which is not regex-special, but spaces are. */
function escape(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
