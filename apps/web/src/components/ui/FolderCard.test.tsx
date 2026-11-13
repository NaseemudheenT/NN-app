import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FolderCard, type FolderSheet } from "./FolderCard";
import { LogoReveal } from "./LogoReveal";

const SHEETS: FolderSheet[] = [
  { name: "Life", meta: "Open", icon: "calendar" },
  { name: "Soul", meta: "In development", icon: "sparkle" },
  { name: "Mind", meta: "In development", icon: "graph" },
];

describe("FolderCard", () => {
  it("names itself, its state and how much it holds", () => {
    render(<FolderCard label="Life & wellbeing" sheets={SHEETS} />);
    const panel = screen.getByRole("button", { name: /^Open Life & wellbeing, 3 items$/ });
    expect(panel).toHaveAttribute("aria-expanded", "false");
  });

  it("counts one item in the singular", () => {
    render(<FolderCard label="Archive" sheets={[{ name: "Only" }]} />);
    expect(screen.getByRole("button", { name: /1 item$/ })).toBeInTheDocument();
  });

  it("opens and closes, and says which it will do next", async () => {
    const user = userEvent.setup();
    render(<FolderCard label="Education" sheets={SHEETS} />);

    await user.click(screen.getByRole("button", { name: /^Open Education/ }));
    const open = screen.getByRole("button", { name: /^Close Education/ });
    expect(open).toHaveAttribute("aria-expanded", "true");

    await user.click(open);
    expect(screen.getByRole("button", { name: /^Open Education/ })).toBeInTheDocument();
  });

  it("keeps its contents out of the tab order until it is open", async () => {
    const user = userEvent.setup();
    const { container } = render(<FolderCard label="System" sheets={SHEETS} />);
    const list = container.querySelector('[role="list"]')!;

    // A closed folder's contents are behind glass. Reaching them with Tab
    // would mean focus landing on something the founder cannot see.
    expect(list.hasAttribute("inert")).toBe(true);

    await user.click(screen.getByRole("button", { name: /^Open System/ }));
    expect(list.hasAttribute("inert")).toBe(false);
  });

  it("names a sheet with its state separated, not run together", async () => {
    // Composed from the text inside, "Contacts" + "In development" announced
    // as "ContactsIn development".
    render(<FolderCard label="Life & wellbeing" sheets={SHEETS} />);
    expect(screen.getByRole("button", { name: "Life — Open" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Soul — In development" })).toBeInTheDocument();
  });

  it("falls back to just the name when a sheet has no second line", () => {
    render(<FolderCard label="Plain" sheets={[{ name: "Untitled" }]} />);
    expect(screen.getByRole("button", { name: "Untitled" })).toBeInTheDocument();
  });

  it("reports the chosen sheet with its index in the full list, not the visible slice", async () => {
    const user = userEvent.setup();
    const onSheetSelect = vi.fn();
    // Six sheets, of which the card shows the last four.
    const many: FolderSheet[] = ["A", "B", "C", "D", "E", "F"].map((name) => ({ name }));
    render(<FolderCard label="Money & work" sheets={many} onSheetSelect={onSheetSelect} />);

    await user.click(screen.getByRole("button", { name: /^Open Money & work/ }));
    await user.click(screen.getByRole("button", { name: "F" }));

    expect(onSheetSelect).toHaveBeenCalledTimes(1);
    expect(onSheetSelect.mock.calls[0]![1]).toBe(5);
  });

  it("shows a bounded stack but tells the truth about the total", () => {
    const many: FolderSheet[] = ["A", "B", "C", "D", "E", "F"].map((name) => ({ name }));
    render(<FolderCard label="Knowledge" sheets={many} />);

    // Only the front of the stack is drawn — a crowd of sheets reads as noise.
    expect(screen.queryByRole("button", { name: "A" })).toBeNull();
    expect(screen.getByRole("button", { name: "F" })).toBeInTheDocument();
    // …but the count is never quietly reduced to what happens to be visible.
    expect(screen.getByRole("button", { name: /6 items$/ })).toBeInTheDocument();
  });

  it("says plainly when it is empty rather than looking broken", () => {
    render(<FolderCard label="Mail" sheets={[]} emptyNote="No mail yet." />);
    expect(screen.getByText("No mail yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /0 items$/ })).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<FolderCard label="Travel" sheets={SHEETS} />);
    await user.click(screen.getByRole("button", { name: /^Open Travel/ }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("button", { name: /^Open Travel/ })).toBeInTheDocument();
  });

  it("lets the caller own the open state", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <FolderCard label="Files" sheets={SHEETS} open={false} onOpenChange={onOpenChange} />,
    );
    await user.click(screen.getByRole("button", { name: /^Open Files/ }));

    expect(onOpenChange).toHaveBeenCalledWith(true);
    // Controlled means controlled: it did not move on its own.
    expect(screen.getByRole("button", { name: /^Open Files/ })).toBeInTheDocument();
  });

  it("prefers a caller's own description to counting", () => {
    render(<FolderCard label="Archive" meta="Wed 19 Aug" sheets={SHEETS} />);
    expect(screen.getByRole("button", { name: /Archive, Wed 19 Aug$/ })).toBeInTheDocument();
  });
});

describe("LogoReveal", () => {
  it("reports itself revealed even where there is no WebGL, so nothing waits for ever", async () => {
    // jsdom has no WebGL2 context. This is the same path a browser that
    // refuses one takes — and the entrance must still open.
    const onRevealed = vi.fn();
    render(<LogoReveal onRevealed={onRevealed} />);
    expect(onRevealed).toHaveBeenCalled();
  });

  it("names the brand exactly once, so it is not read out twice", () => {
    // Both paths put "NN" in the accessibility tree: the canvas through a
    // visually-hidden label, the fallback through NNGlassMark's own. Having
    // both at the same time is the bug this guards.
    render(<LogoReveal />);
    expect(screen.getAllByLabelText("NN")).toHaveLength(1);
  });
});
