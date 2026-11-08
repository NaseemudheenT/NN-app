/**
 * REN's state machine.
 *
 * Six states, and the only way between them is a transition this file allows.
 * That matters more than it sounds: REN's state is shown to the founder as a
 * claim about what is happening — "listening", "working", "speaking" — and a
 * claim it cannot back up is a lie told by an animation.
 *
 * So the machine is deliberately strict. `speaking` cannot be entered without
 * something to say. `complete` cannot be entered without a confirmed result.
 * An illegal transition is refused and reported, never quietly applied.
 */

export type RenState =
  /** Present, not engaged. A slow breath. */
  | "idle"
  /** Summoned. Rings expanding, the mark lighting up. */
  | "awakening"
  /** Microphone open, reacting to real input level. */
  | "listening"
  /** Working. Something is genuinely in flight. */
  | "thinking"
  /** Speaking aloud, or streaming a reply. */
  | "speaking"
  /** A task finished and was confirmed. Brief, then back to idle. */
  | "complete";

export const REN_STATES: readonly RenState[] = [
  "idle",
  "awakening",
  "listening",
  "thinking",
  "speaking",
  "complete",
];

/** How REN was summoned. Recorded because it changes what happens next. */
export type RenTrigger = "voice" | "touch" | "keyboard";

export type RenEvent =
  | { type: "summon"; via: RenTrigger }
  /** The surface is open and usable. Goes to listening only if voice is live. */
  | { type: "ready"; listening: boolean }
  | { type: "listen" }
  | { type: "process" }
  /** Requires the text REN is about to say. No text, no speaking state. */
  | { type: "respond"; text: string }
  /** Requires a confirmed outcome. */
  | { type: "settle"; confirmed: true }
  | { type: "fail"; reason: string }
  | { type: "dismiss" };

export interface RenMachine {
  state: RenState;
  /** How the current session was opened. Null when idle. */
  trigger: RenTrigger | null;
  /** What REN is currently saying. Empty unless state is "speaking". */
  utterance: string;
  /** Set only by `fail`. Cleared by the next successful transition. */
  error: string | null;
}

export const REN_INITIAL: RenMachine = {
  state: "idle",
  trigger: null,
  utterance: "",
  error: null,
};

/** Which states each event may be applied from. Everything else is refused. */
const ALLOWED: Record<RenEvent["type"], readonly RenState[]> = {
  summon: ["idle", "complete"],
  ready: ["awakening"],
  listen: ["awakening", "thinking", "speaking", "complete"],
  process: ["awakening", "listening", "speaking", "complete"],
  respond: ["thinking", "listening"],
  settle: ["thinking", "speaking"],
  fail: ["awakening", "listening", "thinking", "speaking"],
  dismiss: ["idle", "awakening", "listening", "thinking", "speaking", "complete"],
};

export class RenTransitionError extends Error {
  constructor(
    readonly from: RenState,
    readonly event: RenEvent["type"],
  ) {
    super(`REN cannot ${event} while ${from}.`);
    this.name = "RenTransitionError";
  }
}

/**
 * Applies an event. Returns the next machine, or throws for an illegal move.
 *
 * Throwing rather than ignoring is the point: a caller that drives REN into a
 * state it has no business being in has a bug, and silently absorbing it would
 * leave the founder looking at an animation that means nothing.
 */
export function renReduce(machine: RenMachine, event: RenEvent): RenMachine {
  const allowed = ALLOWED[event.type];
  if (!allowed.includes(machine.state)) {
    throw new RenTransitionError(machine.state, event.type);
  }

  switch (event.type) {
    case "summon":
      return { state: "awakening", trigger: event.via, utterance: "", error: null };

    case "ready":
      return { ...machine, state: event.listening ? "listening" : "idle", error: null };

    case "listen":
      return { ...machine, state: "listening", utterance: "", error: null };

    case "process":
      return { ...machine, state: "thinking", utterance: "", error: null };

    case "respond": {
      // An empty utterance would put REN in "speaking" with nothing to say.
      const text = event.text.trim();
      if (text.length === 0) throw new RenTransitionError(machine.state, "respond");
      return { ...machine, state: "speaking", utterance: text, error: null };
    }

    case "settle":
      return { ...machine, state: "complete", utterance: "", error: null };

    case "fail":
      // Failure returns to idle rather than to "complete". REN does not get to
      // show a success flourish for something that did not work.
      return { state: "idle", trigger: null, utterance: "", error: event.reason };

    case "dismiss":
      return { state: "idle", trigger: null, utterance: "", error: null };
  }
}

/** Non-throwing form, for callers that would rather branch than catch. */
export function renTryReduce(
  machine: RenMachine,
  event: RenEvent,
): { ok: true; machine: RenMachine } | { ok: false; reason: string } {
  try {
    return { ok: true, machine: renReduce(machine, event) };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * True while REN is doing something — waking, listening, working, speaking or
 * confirming. Deliberately NOT the same question as "is the panel open": REN
 * sits idle with its surface open the whole time the founder is reading a
 * reply or typing the next thing. Conflating the two made REN close itself a
 * second after every answer.
 */
export function renIsEngaged(state: RenState): boolean {
  return state !== "idle";
}

/** What REN says it is doing. Shown verbatim and read by assistive tech. */
export const REN_STATUS: Record<RenState, string> = {
  idle: "Ready",
  awakening: "Waking",
  listening: "Listening",
  thinking: "Working",
  speaking: "Speaking",
  complete: "Done",
};

/** How long the completion flourish lasts before REN returns to idle. */
export const REN_COMPLETE_MS = 1100;
