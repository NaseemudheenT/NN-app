import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * REN's operating surface — acceptance tests A and B from the founder's
 * expansion brief, plus the honesty rules that make the rest of it worth
 * having.
 *
 * jsdom has no speech engine, which is the useful half of the environment
 * here: it is exactly what Firefox and a locked-down browser look like, so
 * these run the path a founder takes when the microphone is unavailable and
 * prove it is a complete path rather than a degraded one.
 */

const run = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/lib/ren/operator", () => ({ useRenOperator: () => ({ run, ready: true }) }));
// The orb is a ray-marched WebGL2 sphere and jsdom has no GL. Its own
// fallback is tested where it lives; here it would only add noise.
vi.mock("./RenOrb", () => ({
  RenOrb: ({ state }: { state: string }) => <div data-testid="orb" data-state={state} />,
}));

const { RenConsole } = await import("./RenConsole");

afterEach(cleanup);
beforeEach(() => {
  run.mockReset();
  push.mockReset();
  run.mockResolvedValue({ ok: true, said: "Opened Finance." });
});

/* ------------------------------------------------------------- TEST A -- */

describe("opening REN", () => {
  it("is an operating surface, not a chat window", () => {
    // The brief's first requirement: opening REN must not open a
    // conversation. There is no composer, no thread, no send button — the
    // controls are a microphone and a stop.
    render(<RenConsole />);
    expect(screen.getByRole("button", { name: /Tap and speak|No microphone/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stop" })).toBeInTheDocument();
    expect(screen.getByTestId("orb")).toBeInTheDocument();
    expect(screen.queryByRole("log")).toBeNull();
  });

  it("reaches the chat only because the founder asked for it", async () => {
    render(<RenConsole />);
    await userEvent.click(screen.getByRole("button", { name: /Chat/ }));
    expect(push).toHaveBeenCalledWith("/ren/chat");
  });

  it("shows REN's real state, and starts at rest", () => {
    render(<RenConsole />);
    expect(screen.getByTestId("orb")).toHaveAttribute("data-state", "idle");
  });

  it("says plainly that it has no microphone here rather than offering a dead button", () => {
    // jsdom has no speech engine, which is what Firefox looks like too.
    render(<RenConsole />);
    expect(screen.getByRole("button", { name: /No microphone/ })).toBeDisabled();
    expect(screen.getByText(/no speech engine/i)).toBeInTheDocument();
  });

  it("offers typing as a complete path, not a consolation", () => {
    render(<RenConsole />);
    expect(screen.getByLabelText("Type to REN")).toBeInTheDocument();
  });
});

/* -------------------------------------------------------- what REN does -- */

describe("a turn", () => {
  const ask = async (text: string) => {
    await userEvent.type(screen.getByLabelText("Type to REN"), text);
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
  };

  it("carries out something with no consequence, and reports what happened", async () => {
    render(<RenConsole />);
    await ask("open finance");
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
    // What REN says is the operator's own account of the outcome, not a
    // sentence composed about it.
    expect(await screen.findByText("Opened Finance.")).toBeInTheDocument();
  });

  it("holds anything that writes until the founder approves it", async () => {
    render(<RenConsole />);
    await ask("add a task to call the bank");
    // Nothing has run. The plan is on screen with its consequence named.
    expect(run).not.toHaveBeenCalled();
    expect(await screen.findByRole("button", { name: "Do it" })).toBeInTheDocument();
    expect(screen.getByText(/writes to your records/i)).toBeInTheDocument();
  });

  it("runs it once approved, and not before", async () => {
    render(<RenConsole />);
    await ask("add a task to call the bank");
    await userEvent.click(await screen.findByRole("button", { name: "Do it" }));
    await waitFor(() => expect(run).toHaveBeenCalledTimes(1));
  });

  it("changes nothing when the founder declines", async () => {
    render(<RenConsole />);
    await ask("add a task to call the bank");
    await userEvent.click(await screen.findByRole("button", { name: "No" }));
    expect(run).not.toHaveBeenCalled();
    expect(await screen.findByText(/Nothing was changed/)).toBeInTheDocument();
  });

  it("admits what it did not understand instead of answering anyway", async () => {
    // The failure mode of every assistant built the other way round: a
    // confident sentence about something that did not happen.
    render(<RenConsole />);
    await ask("what is the capital of Peru");
    expect(run).not.toHaveBeenCalled();
    expect(await screen.findByText(/did not understand/)).toBeInTheDocument();
  });

  it("reports a failure as a failure", async () => {
    run.mockResolvedValue({ ok: false, said: "I could not reach your records." });
    render(<RenConsole />);
    await ask("open finance");
    expect(await screen.findByText("I could not reach your records.")).toBeInTheDocument();
  });

  it("says it has no model rather than implying a mind that is not connected", () => {
    render(<RenConsole />);
    expect(screen.getByText(/No language model is connected/)).toBeInTheDocument();
  });
});
