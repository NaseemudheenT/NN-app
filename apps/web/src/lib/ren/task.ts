import type { Claim } from "./evidence";

/**
 * What REN is doing, and how far it has got.
 *
 * REN's existing six-state machine (`state.ts`) describes its *presence* —
 * idle, listening, speaking. This describes its *work*, which is a different
 * thing with a different lifetime: a task outlives a conversation, survives a
 * reload, waits for approval, and can fail.
 *
 * The transitions are deliberately narrow, and two of them carry the whole
 * point of the file:
 *
 * - **`completed` can only be reached through `verifying`.** REN cannot
 *   report a task done without passing through the step that checks it did
 *   anything. This is the founder's brief §15 turned into a type.
 * - **`failed` requires the actual error.** A failure with a tidied-up
 *   message is a different kind of lie, so the reason is required and kept.
 *
 * Everything is append-only. A task's journal is the evidence that the
 * sequence actually happened, and a mutable one proves nothing.
 */

export const TASK_STATES = [
  "created",
  "understanding",
  "planning",
  "waiting_for_approval",
  "executing",
  "verifying",
  "completed",
  "failed",
  "cancelled",
] as const;

export type TaskState = (typeof TASK_STATES)[number];

export const TERMINAL_STATES: readonly TaskState[] = ["completed", "failed", "cancelled"];

export function isTerminal(state: TaskState): boolean {
  return TERMINAL_STATES.includes(state);
}

/**
 * The only moves there are.
 *
 * Note what is missing: nothing reaches `completed` except `verifying`, and
 * nothing leaves a terminal state. A task that has finished has finished.
 */
export const TRANSITIONS: Record<TaskState, readonly TaskState[]> = {
  created: ["understanding", "cancelled"],
  understanding: ["planning", "failed", "cancelled"],
  // Straight to executing when nothing it plans to do needs asking about.
  planning: ["waiting_for_approval", "executing", "failed", "cancelled"],
  waiting_for_approval: ["executing", "failed", "cancelled"],
  executing: ["verifying", "failed", "cancelled"],
  // No cancelling here: the work is done, and whether it worked is a fact to
  // be established rather than a question to walk away from.
  verifying: ["completed", "failed"],
  completed: [],
  failed: [],
  cancelled: [],
};

export class TaskError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskError";
  }
}

export interface JournalEntry {
  state: TaskState;
  at: string;
  /** Why the task moved. Required on failure and cancellation. */
  note?: string;
  /** What REN established at this step, when it established anything. */
  claim?: Claim;
}

const ISO = /^\d{4}-\d{2}-\d{2}(?:T[\d:.]+(?:Z|[+-]\d{2}:\d{2}))?$/;

export interface TaskSnapshot {
  id: string;
  /** What the founder actually asked, verbatim. Never a paraphrase. */
  request: string;
  state: TaskState;
  journal: readonly JournalEntry[];
}

/**
 * One piece of work.
 *
 * Constructed from a request and advanced one legal step at a time. It holds
 * no model, no network and no database handle: a task is a record of what
 * happened, and the things that make it happen are passed what they need.
 */
export class Task {
  readonly id: string;
  readonly request: string;
  #state: TaskState = "created";
  readonly #journal: JournalEntry[] = [];

  constructor(id: string, request: string, at: string) {
    if (id.trim().length === 0) throw new TaskError("A task must have an id.");
    if (request.trim().length === 0) {
      throw new TaskError("A task must record what was actually asked for.");
    }
    if (!ISO.test(at)) throw new TaskError(`A task must be dated. Got: ${at}`);
    this.id = id;
    this.request = request;
    this.#journal.push({ state: "created", at });
  }

  get state(): TaskState {
    return this.#state;
  }

  get journal(): readonly JournalEntry[] {
    return [...this.#journal];
  }

  get snapshot(): TaskSnapshot {
    return { id: this.id, request: this.request, state: this.#state, journal: this.journal };
  }

  /** Whether a move is legal, without attempting it. */
  canMoveTo(next: TaskState): boolean {
    return TRANSITIONS[this.#state].includes(next);
  }

  /**
   * Advance. Throws on an illegal move rather than ignoring it.
   *
   * Refusing loudly is the point: a state machine that silently drops a bad
   * transition leaves the task looking fine and behaving wrongly, which is the
   * failure mode that is hardest to find afterwards.
   */
  moveTo(next: TaskState, at: string, detail?: { note?: string; claim?: Claim }): TaskState {
    if (!ISO.test(at)) throw new TaskError(`A transition must be dated. Got: ${at}`);
    if (isTerminal(this.#state)) {
      throw new TaskError(
        `Task ${this.id} is ${this.#state} and cannot move again. A finished task is finished.`,
      );
    }
    if (!this.canMoveTo(next)) {
      throw new TaskError(
        `Task ${this.id} cannot go from ${this.#state} to ${next}. ` +
          `Legal from here: ${TRANSITIONS[this.#state].join(", ") || "nothing"}.`,
      );
    }
    if ((next === "failed" || next === "cancelled") && !detail?.note?.trim()) {
      throw new TaskError(
        `Task ${this.id} cannot be marked ${next} without saying why. ` +
          "A failure without a reason tells the founder nothing.",
      );
    }
    if (next === "completed" && detail?.claim === undefined) {
      throw new TaskError(
        `Task ${this.id} cannot be completed without what verification established. ` +
          "Reaching the end of the work is not the same as the work having worked.",
      );
    }
    this.#state = next;
    const entry: JournalEntry = {
      state: next,
      at,
      ...(detail?.note !== undefined ? { note: detail.note } : {}),
      ...(detail?.claim !== undefined ? { claim: detail.claim } : {}),
    };
    this.#journal.push(entry);
    return next;
  }

  /** The claim the task finished on, if it finished. */
  get outcome(): Claim | null {
    const last = this.#journal[this.#journal.length - 1];
    return last?.claim ?? null;
  }

  /** Rebuild from a stored snapshot, so a task survives a restart. */
  static restore(snapshot: TaskSnapshot): Task {
    const first = snapshot.journal[0];
    if (first === undefined || first.state !== "created") {
      throw new TaskError(`Task ${snapshot.id} has no beginning in its journal.`);
    }
    const task = new Task(snapshot.id, snapshot.request, first.at);
    task.#journal.length = 0;
    task.#journal.push(...snapshot.journal);
    task.#state = snapshot.state;
    return task;
  }
}

/**
 * What a surface may truthfully say a task is doing.
 *
 * Separate from the state name because the founder reads this, and "verifying"
 * is NN's word rather than theirs. Every string here is something the state
 * actually guarantees.
 */
export function describe(state: TaskState): string {
  switch (state) {
    case "created": return "Received.";
    case "understanding": return "Working out what you want.";
    case "planning": return "Planning how to do it.";
    case "waiting_for_approval": return "Waiting for you to approve it.";
    case "executing": return "Doing it.";
    case "verifying": return "Checking it actually worked.";
    case "completed": return "Done, and checked.";
    case "failed": return "Failed.";
    case "cancelled": return "Cancelled.";
  }
}
