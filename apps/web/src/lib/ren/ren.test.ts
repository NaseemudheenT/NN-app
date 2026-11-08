import { describe, expect, it } from "vitest";
import {
  REN_INITIAL,
  REN_STATES,
  RenTransitionError,
  renIsEngaged,
  renReduce,
  renTryReduce,
  type RenMachine,
} from "./state";
import { resolveIntent } from "./intents";
import { describePage } from "./context";

/** Drives the machine through a list of events, failing loudly on a refusal. */
function run(events: Parameters<typeof renReduce>[1][], from: RenMachine = REN_INITIAL) {
  return events.reduce((m, e) => renReduce(m, e), from);
}

describe("REN state machine", () => {
  it("starts idle, disengaged and silent", () => {
    expect(REN_INITIAL.state).toBe("idle");
    expect(REN_INITIAL.utterance).toBe("");
    expect(REN_INITIAL.error).toBeNull();
    expect(renIsEngaged("idle")).toBe(false);
  });

  it("is engaged in every state except idle", () => {
    for (const state of REN_STATES) {
      expect(renIsEngaged(state)).toBe(state !== "idle");
    }
  });

  it("separates being idle from having the surface closed", () => {
    // Returning to idle after an answer must not imply the panel should go
    // away — the founder is still reading it.
    const settled = run([
      { type: "summon", via: "touch" },
      { type: "process" },
      { type: "respond", text: "Opened the workspace." },
      { type: "settle", confirmed: true },
      { type: "dismiss" },
    ]);
    expect(settled.state).toBe("idle");
    expect(renIsEngaged(settled.state)).toBe(false);
  });

  it("walks the full summon-to-complete path", () => {
    const m = run([
      { type: "summon", via: "keyboard" },
      { type: "ready", listening: true },
      { type: "process" },
      { type: "respond", text: "Opened the workspace." },
      { type: "settle", confirmed: true },
    ]);
    expect(m.state).toBe("complete");
    expect(m.trigger).toBe("keyboard");
  });

  it("remembers how it was summoned", () => {
    expect(run([{ type: "summon", via: "voice" }]).trigger).toBe("voice");
    expect(run([{ type: "summon", via: "touch" }]).trigger).toBe("touch");
  });

  it("opens without listening when voice is unavailable", () => {
    const m = run([{ type: "summon", via: "touch" }, { type: "ready", listening: false }]);
    expect(m.state).toBe("idle");
  });

  it("refuses to speak with nothing to say", () => {
    const thinking = run([{ type: "summon", via: "touch" }, { type: "process" }]);
    // An empty utterance would show "Speaking" over silence.
    expect(() => renReduce(thinking, { type: "respond", text: "   " })).toThrow(RenTransitionError);
    expect(renReduce(thinking, { type: "respond", text: "Done." }).state).toBe("speaking");
  });

  it("will not show a completion it did not earn", () => {
    // settle is reachable only from thinking or speaking — never from idle,
    // so REN cannot flash a tick for work it never did.
    expect(() => renReduce(REN_INITIAL, { type: "settle", confirmed: true })).toThrow();
    const listening = run([{ type: "summon", via: "voice" }, { type: "ready", listening: true }]);
    expect(() => renReduce(listening, { type: "settle", confirmed: true })).toThrow();
  });

  it("sends a failure back to idle, not to complete", () => {
    const thinking = run([{ type: "summon", via: "touch" }, { type: "process" }]);
    const failed = renReduce(thinking, { type: "fail", reason: "Route never arrived." });
    expect(failed.state).toBe("idle");
    expect(failed.error).toBe("Route never arrived.");
    expect(failed.utterance).toBe("");
  });

  it("clears a stale error on the next good transition", () => {
    const failed = renReduce(
      run([{ type: "summon", via: "touch" }, { type: "process" }]),
      { type: "fail", reason: "nope" },
    );
    expect(renReduce(failed, { type: "summon", via: "touch" }).error).toBeNull();
  });

  it("cannot be summoned while already busy", () => {
    const thinking = run([{ type: "summon", via: "touch" }, { type: "process" }]);
    expect(() => renReduce(thinking, { type: "summon", via: "touch" })).toThrow(RenTransitionError);
  });

  it("can always be dismissed, from any state", () => {
    for (const state of REN_STATES) {
      const m: RenMachine = { ...REN_INITIAL, state };
      expect(renReduce(m, { type: "dismiss" }).state).toBe("idle");
    }
  });

  it("drops the utterance when it stops speaking", () => {
    const speaking = run([
      { type: "summon", via: "touch" },
      { type: "process" },
      { type: "respond", text: "Here it is." },
    ]);
    expect(speaking.utterance).toBe("Here it is.");
    expect(renReduce(speaking, { type: "settle", confirmed: true }).utterance).toBe("");
  });

  it("reports a refusal instead of throwing, when asked to", () => {
    const refused = renTryReduce(REN_INITIAL, { type: "respond", text: "hi" });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.reason).toContain("idle");

    const accepted = renTryReduce(REN_INITIAL, { type: "summon", via: "touch" });
    expect(accepted.ok).toBe(true);
  });

  it("never mutates the machine it was given", () => {
    const before = { ...REN_INITIAL };
    renReduce(REN_INITIAL, { type: "summon", via: "touch" });
    expect(REN_INITIAL).toEqual(before);
  });
});

const CTX = { pageName: "the workspace", pageSummary: "Time spent against planned." };

describe("REN intents", () => {
  it("opens a named destination", () => {
    const intent = resolveIntent("take me to the workspace", CTX);
    expect(intent).toEqual({ kind: "navigate", to: "/workspace", label: "the workspace" });
  });

  it("ignores case and punctuation", () => {
    expect(resolveIntent("Open the Design System, please!", CTX)).toMatchObject({
      kind: "navigate",
      to: "/design",
    });
  });

  it("prefers the longest matching phrase", () => {
    // "cinematic layer" must win over a bare word that also appears.
    expect(resolveIntent("show me the cinematic layer", CTX)).toMatchObject({
      to: "/design/cinematic",
    });
  });

  it("matches whole words only", () => {
    // "homeward" must not trigger "home".
    expect(resolveIntent("homeward bound", CTX).kind).toBe("unhandled");
  });

  it("answers where the founder is, from live context", () => {
    const intent = resolveIntent("where am I?", CTX);
    expect(intent.kind).toBe("answer");
    if (intent.kind === "answer") {
      expect(intent.text).toContain("the workspace");
      expect(intent.text).toContain("Time spent against planned.");
    }
  });

  it("says plainly what it cannot do, rather than inventing an answer", () => {
    const intent = resolveIntent("transfer two thousand rupees to my landlord", CTX);
    expect(intent.kind).toBe("unhandled");
    if (intent.kind === "unhandled") expect(intent.text).toContain("cannot");
  });

  it("handles empty and whitespace input", () => {
    expect(resolveIntent("", CTX).kind).toBe("unhandled");
    expect(resolveIntent("   ", CTX).kind).toBe("unhandled");
  });

  it("never routes anywhere outside its own list", () => {
    const probes = ["open /etc/passwd", "go to https://example.com", "navigate to admin"];
    for (const probe of probes) {
      const intent = resolveIntent(probe, CTX);
      if (intent.kind === "navigate") expect(intent.to.startsWith("/")).toBe(true);
    }
  });
});

describe("REN page context", () => {
  it("knows each part of NN by name", () => {
    expect(describePage("/").name).toBe("the entrance");
    expect(describePage("/workspace").name).toBe("the workspace");
    expect(describePage("/design").name).toBe("the design system");
    expect(describePage("/design/cinematic").name).toBe("the cinematic system");
  });

  it("falls back rather than guessing at an unknown route", () => {
    const ctx = describePage("/something/unknown");
    expect(ctx.name).toBe("NN");
    expect(ctx.path).toBe("/something/unknown");
  });

  it("survives a null path", () => {
    expect(describePage(null).path).toBe("/");
  });

  it("offers suggestions only where they mean something", () => {
    expect(describePage("/offline").suggestions).toHaveLength(0);
    expect(describePage("/workspace").suggestions.length).toBeGreaterThan(0);
  });
});
