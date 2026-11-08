import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Coverflow } from "@/components/ui/Coverflow";
import { LiquidButton, LiquidGlassDefs } from "@/components/ui/LiquidButton";
import { NNWorkspace } from "./NNWorkspace";

/**
 * The cinematic layer under test.
 *
 * Motion is forced off for the whole file: NN's reduced-motion switch makes
 * every settle synchronous, so these assert real behaviour rather than racing
 * an animation frame that jsdom never schedules convincingly.
 */
beforeEach(() => {
  document.documentElement.dataset["motion"] = "reduced";
});
afterEach(() => {
  delete document.documentElement.dataset["motion"];
  cleanup();
});

describe("LiquidButton", () => {
  it("renders its label above both glass plates", () => {
    const { container } = render(<LiquidButton>Enter NN</LiquidButton>);
    const button = screen.getByRole("button", { name: "Enter NN" });
    expect(button).toBeInTheDocument();
    // Edge, refraction, label: remove any one and it stops being glass.
    expect(container.querySelectorAll("span")).toHaveLength(3);
  });

  it("refracts through the one shared filter, never a per-button copy", () => {
    render(
      <>
        <LiquidGlassDefs />
        <LiquidButton>One</LiquidButton>
        <LiquidButton>Two</LiquidButton>
      </>,
    );
    // A duplicated id would leave the browser resolving whichever it saw last.
    expect(document.querySelectorAll("#nn-liquid-glass")).toHaveLength(1);
  });

  it("blocks interaction and announces itself while loading", () => {
    render(<LiquidButton loading>Save</LiquidButton>);
    const button = screen.getByRole("button", { name: /Save/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(within(button).getByText("Working")).toBeInTheDocument();
  });

  it("does not fire when disabled", async () => {
    let clicks = 0;
    render(
      <LiquidButton disabled onClick={() => { clicks += 1; }}>
        Send
      </LiquidButton>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Send" })).catch(() => {});
    expect(clicks).toBe(0);
  });

  it("becomes a link when given a destination", () => {
    render(<LiquidButton href="/design">Design</LiquidButton>);
    expect(screen.getByRole("link", { name: "Design" })).toHaveAttribute("href", "/design");
  });

  it("stays a button when a destination would be unreachable anyway", () => {
    render(<LiquidButton href="/design" disabled>Design</LiquidButton>);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Design" })).toBeDisabled();
  });
});

const CARDS = [
  { id: "life", title: "NN Life", subtitle: "3 today", icon: "calendar" as const },
  { id: "college", title: "NN College", subtitle: "CAT-II in 6 days", icon: "book" as const },
  { id: "finance", title: "NN Finance", subtitle: "Nov budget", icon: "wallet" as const },
];

describe("Coverflow", () => {
  it("announces each card's place in the ring", () => {
    render(<Coverflow cards={CARDS} label="Applications" />);
    expect(screen.getByRole("region", { name: "Applications" })).toBeInTheDocument();
    expect(screen.getByLabelText("1 of 3: NN Life")).toBeInTheDocument();
    expect(screen.getByLabelText("3 of 3: NN Finance")).toBeInTheDocument();
  });

  it("moves with the arrow keys", async () => {
    const seen: string[] = [];
    render(<Coverflow cards={CARDS} onSelect={(id) => seen.push(id)} />);
    const frame = screen.getByRole("region").querySelector("[tabindex]");
    expect(frame).not.toBeNull();
    (frame as HTMLElement).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(seen.at(-1)).toBe("college");
    await userEvent.keyboard("{ArrowRight}");
    expect(seen.at(-1)).toBe("finance");
    await userEvent.keyboard("{ArrowLeft}");
    expect(seen.at(-1)).toBe("college");
  });

  it("wraps round the ring rather than stopping at the end", async () => {
    const seen: string[] = [];
    render(<Coverflow cards={CARDS} onSelect={(id) => seen.push(id)} />);
    const frame = screen.getByRole("region").querySelector("[tabindex]") as HTMLElement;
    frame.focus();
    await userEvent.keyboard("{ArrowLeft}");
    // One step back from the first card is the last one, not a dead end.
    expect(seen.at(-1)).toBe("finance");
  });

  it("jumps straight to a card from the pagination", async () => {
    const seen: string[] = [];
    render(<Coverflow cards={CARDS} showPagination onSelect={(id) => seen.push(id)} />);
    await userEvent.click(screen.getByRole("button", { name: "Go to NN Finance" }));
    expect(seen.at(-1)).toBe("finance");
  });

  it("renders nothing rather than dividing by an empty ring", () => {
    const { container } = render(<Coverflow cards={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("NNWorkspace", () => {
  it("opens on Today and says who it is for", () => {
    render(<NNWorkspace userName="Founder" />);
    expect(screen.getByRole("heading", { level: 1, name: "Today" })).toBeInTheDocument();
    expect(screen.getByText("Good evening, Founder.")).toBeInTheDocument();
  });

  it("labels its sample content honestly", () => {
    render(<NNWorkspace />);
    expect(screen.getByText(/Illustrative content — not real data/)).toBeInTheDocument();
  });

  it("presents REN as designed and switched off", () => {
    render(<NNWorkspace />);
    expect(screen.getByRole("heading", { name: "REN" })).toBeInTheDocument();
    expect(screen.getByText("Not active")).toBeInTheDocument();
    // The surface exists and accepts text; the actions do not.
    expect(screen.getByLabelText("Ask REN")).toBeEnabled();
    expect(screen.getByRole("button", { name: /Send to REN/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Speak to REN/ })).toBeDisabled();
  });

  it("gives REN exactly three capabilities, and marks which one works", () => {
    render(<NNWorkspace />);
    const caps = screen.getByRole("heading", { name: "REN" }).closest("section");
    expect(caps).not.toBeNull();
    const labels = within(caps as HTMLElement)
      .getAllByText(/^(Text|Voice|Appearance)$/)
      .map((node) => node.textContent);
    expect(labels).toEqual(["Text", "Voice", "Appearance"]);
    // Appearance is the only one wired; the other two are surfaces.
    expect(within(caps as HTMLElement).getByRole("button", { name: /Appearance/ })).toBeEnabled();
  });

  it("keeps appearance out of the workspace chrome — it belongs to REN", async () => {
    render(<NNWorkspace />);
    expect(screen.queryByRole("button", { name: "Adjust glass" })).not.toBeInTheDocument();
    const appearance = screen.getByRole("button", { name: /Appearance/ });
    await userEvent.click(appearance);
    expect(screen.getByRole("complementary", { name: "Glass appearance" })).toBeInTheDocument();
  });

  it("changes view from the dock", async () => {
    render(<NNWorkspace />);
    const docks = screen.getAllByRole("button", { name: "Insight" });
    await userEvent.click(docks[0] as HTMLElement);
    expect(screen.getByRole("heading", { level: 1, name: "Insight" })).toBeInTheDocument();
  });

  it("filters the timeline and offers a way back from an empty result", async () => {
    render(<NNWorkspace />);
    await userEvent.click((screen.getAllByRole("button", { name: "Timeline" })[0]) as HTMLElement);
    const search = screen.getByLabelText("Search the timeline");
    await userEvent.type(search, "python");
    expect(screen.getByText("Python — unit 4 exercises")).toBeInTheDocument();
    expect(screen.queryByText("Engineering Mathematics")).not.toBeInTheDocument();

    await userEvent.clear(search);
    await userEvent.type(search, "zzzz");
    expect(screen.getByText("Nothing matches that")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Show everything" }));
    expect(screen.getByText("Engineering Mathematics")).toBeInTheDocument();
  });

  it("exposes the material controls and writes them to the surface", async () => {
    const { container } = render(<NNWorkspace />);
    await userEvent.click(screen.getByRole("button", { name: /Appearance/ }));
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--gw-blur")).toBe("24px");

    await userEvent.click(screen.getByRole("button", { name: "Solid" }));
    expect(root.style.getPropertyValue("--gw-blur")).toBe("32px");
    expect(root.style.getPropertyValue("--gw-opacity")).toBe("0.86");

    await userEvent.click(screen.getByRole("button", { name: "Reset appearance" }));
    expect(root.style.getPropertyValue("--gw-blur")).toBe("24px");
  });

  it("keeps a nonsensical material setting out of the surface", async () => {
    const { container } = render(<NNWorkspace glass={{ blur: 9999, opacity: -4, tint: "not-a-colour" }} />);
    const root = container.firstElementChild as HTMLElement;
    // Bounded, not trusted: blur caps at 40, opacity floors at 0.08, and an
    // unparseable tint falls back rather than poisoning every pane.
    expect(root.style.getPropertyValue("--gw-blur")).toBe("40px");
    expect(root.style.getPropertyValue("--gw-opacity")).toBe("0.08");
    expect(root.style.getPropertyValue("--gw-tint")).toBe("#9CC8FF");
  });

  it("closes the material panel on Escape and returns focus to its trigger", async () => {
    render(<NNWorkspace />);
    const trigger = screen.getByRole("button", { name: /Appearance/ });
    await userEvent.click(trigger);
    expect(screen.getByRole("complementary", { name: "Glass appearance" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("complementary", { name: "Glass appearance" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("offers an export only where there is something to export", async () => {
    render(<NNWorkspace />);
    expect(screen.queryByRole("button", { name: /Export CSV/ })).not.toBeInTheDocument();
    await userEvent.click((screen.getAllByRole("button", { name: "Timeline" })[0]) as HTMLElement);
    expect(screen.getByRole("button", { name: /Export CSV/ })).toBeInTheDocument();
  });

  it("describes the chart for anyone who cannot see it", () => {
    render(<NNWorkspace />);
    const chart = screen.getByRole("img", { name: /spent against/i });
    expect(chart).toBeInTheDocument();
    // The per-point series is readable too, not just the summary.
    expect(within(chart).getByText(/1 Nov: spent/)).toBeInTheDocument();
  });
});
