import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  AppTile, Button, Dialog, Dock, FloatingWindow, GlassPanel, Icon, NNLogo, NN_MARK_PATH,
  Switch, TextField,
} from "./index";

/* ------------------------------------------------------- brand lock ------ */

describe("NN mark", () => {
  // The founder approved this exact geometry. If this test fails, the brand was
  // changed — which requires founder approval, not a code review.
  const APPROVED =
    "M0 0 H12 L32 46 V0 H44 V76 H32 L12 30 V76 H0 Z " +
    "M50 0 H62 L82 46 V0 H94 V76 H82 L62 30 V76 H50 Z";

  it("geometry is unchanged from the approved Concept A", () => {
    expect(NN_MARK_PATH).toBe(APPROVED);
  });

  it("is labelled for assistive technology by default", () => {
    render(<NNLogo />);
    expect(screen.getByRole("img", { name: "NN" })).toBeInTheDocument();
  });

  it("is hidden from assistive technology when decorative", () => {
    const { container } = render(<NNLogo decorative />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("renders at the requested height and keeps the 94:76 ratio", () => {
    const { container } = render(<NNLogo size={76} decorative />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("height", "76");
    expect(svg).toHaveAttribute("width", "94");
  });

  it("is not square — the two forms are separated by a gap", () => {
    const { container } = render(<NNLogo decorative />);
    expect(container.querySelector("svg")).toHaveAttribute("viewBox", "0 0 94 76");
  });
});

/* ----------------------------------------------------------- Button ------ */

describe("Button", () => {
  it("fires onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not fire when disabled", async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Save</Button>);
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("blocks interaction and announces busy while loading", async () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    const btn = screen.getByRole("button", { name: /Save/ });
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toBeDisabled();
    await userEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveAttribute("type", "button");
  });
});

/* -------------------------------------------------------- TextField ------ */

describe("TextField", () => {
  it("associates its label with the control", () => {
    render(<TextField label="Email address" />);
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
  });

  it("keeps the label available to screen readers when hidden", () => {
    render(<TextField label="Search" hideLabel />);
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
  });

  it("exposes an error as an alert and marks the field invalid", () => {
    render(<TextField label="Email" error="Not a valid address." />);
    const field = screen.getByLabelText("Email");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Not a valid address.");
    expect(field.getAttribute("aria-describedby")).toBe(screen.getByRole("alert").id);
  });

  it("shows a hint when there is no error, and hides it when there is", () => {
    const { rerender } = render(<TextField label="Email" hint="We never share this." />);
    expect(screen.getByText("We never share this.")).toBeInTheDocument();
    rerender(<TextField label="Email" hint="We never share this." error="Bad." />);
    expect(screen.queryByText("We never share this.")).toBeNull();
  });

  it("renders a textarea when multiline", () => {
    render(<TextField label="Note" multiline />);
    expect(screen.getByLabelText("Note").tagName).toBe("TEXTAREA");
  });

  it("accepts typed input", async () => {
    render(<TextField label="Email" />);
    const field = screen.getByLabelText("Email");
    await userEvent.type(field, "a@b.co");
    expect(field).toHaveValue("a@b.co");
  });
});

/* ------------------------------------------------------------ Switch ----- */

describe("Switch", () => {
  it("reports its state through the switch role", () => {
    render(<Switch label="Notifications" checked onCheckedChange={() => {}} />);
    expect(screen.getByRole("switch", { name: "Notifications" })).toBeChecked();
  });

  it("reports the new value when toggled", async () => {
    const onChange = vi.fn();
    render(<Switch label="Quiet hours" checked={false} onCheckedChange={onChange} />);
    await userEvent.click(screen.getByRole("switch", { name: "Quiet hours" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not change when disabled", async () => {
    const onChange = vi.fn();
    render(<Switch label="Locked" checked={false} onCheckedChange={onChange} disabled />);
    await userEvent.click(screen.getByRole("switch", { name: "Locked" }));
    expect(onChange).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------ Dialog ----- */

describe("Dialog", () => {
  const open = (onClose = vi.fn()) => {
    render(
      <Dialog open onClose={onClose} title="Confirm" description="Are you sure?"
              footer={<button type="button">Confirm</button>}>
        <button type="button">Inside</button>
      </Dialog>,
    );
    return onClose;
  };

  it("renders nothing while closed", () => {
    render(<Dialog open={false} onClose={() => {}} title="Confirm" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a modal labelled by its title and described by its description", () => {
    open();
    const dlg = screen.getByRole("dialog");
    expect(dlg).toHaveAttribute("aria-modal", "true");
    expect(within(dlg).getByRole("heading", { name: "Confirm" })).toBeInTheDocument();
    expect(dlg).toHaveAccessibleDescription("Are you sure?");
  });

  it("closes on Escape", async () => {
    const onClose = open();
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes when the backdrop is clicked but not the panel", async () => {
    const onClose = open();
    await userEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    const backdrop = screen.getByRole("dialog").parentElement;
    expect(backdrop).not.toBeNull();
    if (backdrop !== null) await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("moves focus inside and traps Tab within the panel", async () => {
    open();
    const inside = screen.getByRole("button", { name: "Inside" });
    const confirm = screen.getByRole("button", { name: "Confirm" });
    expect(inside).toHaveFocus();
    await userEvent.tab();
    expect(confirm).toHaveFocus();
    await userEvent.tab();            // wraps back to the first control
    expect(inside).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(confirm).toHaveFocus();
  });

  it("locks background scrolling while open and restores it on close", () => {
    const { unmount } = render(<Dialog open onClose={() => {}} title="X" />);
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

/* -------------------------------------------------- launcher + dock ------ */

describe("AppTile", () => {
  it("is a button that reports its app name and fires onClick", async () => {
    const onClick = vi.fn();
    render(<AppTile name="NN College" icon="book" description="Exams" onClick={onClick} />);
    const tile = screen.getByRole("button", { name: /NN College/ });
    await userEvent.click(tile);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(tile).toHaveTextContent("Exams");
  });

  it("hides the description in compact form", () => {
    render(<AppTile name="NN Life" icon="calendar" description="Routine" compact />);
    expect(screen.queryByText("Routine")).toBeNull();
  });
});

describe("Dock", () => {
  const items = [
    { id: "orin", label: "ORIN", icon: "sparkle" as const },
    { id: "life", label: "NN Life", icon: "calendar" as const },
  ];

  it("marks the active item and reports selection", async () => {
    const onSelect = vi.fn();
    render(<Dock items={items} activeId="orin" onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: "ORIN" })).toHaveAttribute("aria-current", "true");
    await userEvent.click(screen.getByRole("button", { name: "NN Life" }));
    expect(onSelect).toHaveBeenCalledWith("life");
  });

  it("is a labelled navigation landmark", () => {
    render(<Dock items={items} activeId={null} onSelect={() => {}} />);
    expect(screen.getByRole("navigation", { name: "Application dock" })).toBeInTheDocument();
  });
});

/* ------------------------------------------------- panels and icons ------ */

describe("GlassPanel", () => {
  it("applies a distinct class per tier", () => {
    const { container: c1 } = render(<GlassPanel tier={1}>a</GlassPanel>);
    const { container: c3 } = render(<GlassPanel tier={3}>a</GlassPanel>);
    expect(c1.firstElementChild?.className).not.toBe(c3.firstElementChild?.className);
  });

  it("passes through DOM attributes", () => {
    render(<GlassPanel data-testid="p">a</GlassPanel>);
    expect(screen.getByTestId("p")).toHaveTextContent("a");
  });
});

describe("Icon", () => {
  it("is hidden from assistive technology unless given a title", () => {
    const { container } = render(<Icon name="search" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });

  it("is exposed as an image when given a title", () => {
    render(<Icon name="search" title="Search" />);
    expect(screen.getByRole("img", { name: "Search" })).toBeInTheDocument();
  });
});

/* --------------------------------------------------- FloatingWindow ------ */

describe("FloatingWindow", () => {
  const base = {
    title: "NN Life", x: 10, y: 10, width: 300, height: 200,
    focused: true, minimized: false,
  } as const;

  const renderWin = (over: Partial<Parameters<typeof FloatingWindow>[0]> = {}) => {
    const handlers = {
      onMove: vi.fn(), onFocus: vi.fn(), onToggleMinimize: vi.fn(),
      onToggleMaximize: vi.fn(), onClose: vi.fn(),
    };
    render(<FloatingWindow {...base} {...handlers} {...over}><p>Body</p></FloatingWindow>);
    return handlers;
  };

  it("is a region labelled by its title", () => {
    renderWin();
    expect(screen.getByRole("region", { name: "NN Life" })).toBeInTheDocument();
  });

  it("positions itself from its coordinates", () => {
    renderWin();
    const win = screen.getByRole("region", { name: "NN Life" });
    expect(win).toHaveStyle({ left: "10px", top: "10px", width: "300px" });
  });

  it("each window control calls exactly its own handler", async () => {
    const h = renderWin();
    await userEvent.click(screen.getByRole("button", { name: "Minimise NN Life" }));
    expect(h.onToggleMinimize).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Maximise NN Life" }));
    expect(h.onToggleMaximize).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Close NN Life" }));
    expect(h.onClose).toHaveBeenCalledTimes(1);
    expect(h.onMove).not.toHaveBeenCalled();
  });

  it("offers Restore instead of Minimise once minimised", () => {
    renderWin({ minimized: true });
    expect(screen.getByRole("button", { name: "Restore NN Life" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Minimise NN Life" })).toBeNull();
  });

  it("survives a full drag lifecycle where pointer capture is unavailable", () => {
    const h = renderWin();
    const bar = screen.getByText("NN Life").parentElement;
    expect(bar).not.toBeNull();
    if (bar === null) return;
    // jsdom implements no pointer-capture API at all — the same situation as
    // older Safari. The drag must still work and must not throw.
    fireEvent.pointerDown(bar, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(bar, { clientX: 90, clientY: 80, pointerId: 1 });
    fireEvent.pointerUp(bar, { pointerId: 1 });
    expect(h.onFocus).toHaveBeenCalled();
    // jsdom's fallback pointer event carries no coordinates. The window must
    // never be moved to NaN as a result — it should simply not move.
    for (const call of h.onMove.mock.calls) {
      expect(Number.isFinite(call[0])).toBe(true);
      expect(Number.isFinite(call[1])).toBe(true);
    }
  });

  it("raises focus when the window is clicked", async () => {
    const h = renderWin({ focused: false });
    await userEvent.click(screen.getByText("Body"));
    expect(h.onFocus).toHaveBeenCalled();
  });
});
