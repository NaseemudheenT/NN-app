import { canHost, type ModelCapability, type ModelRecord } from "./registry";

/**
 * Which model REN uses for a given piece of work.
 *
 * This is the part that makes "model-independent" mean something. Without it,
 * REN is whichever provider happens to be configured first, and the founder's
 * requirement that REN not *be* ChatGPT or Claude is satisfied only by not
 * saying their names. With it, a model is chosen because it can do the work,
 * on this machine, at an acceptable cost — and swapping one for another is a
 * registry entry, not a rewrite.
 *
 * Three rules, in order, and the order is the design:
 *
 * 1. **Eliminate, then score.** A model that cannot do the job is not a cheap
 *    option, it is not an option. Capability, deployment, health and hardware
 *    are hard filters; nothing about price can buy past them.
 * 2. **Say why.** Every rejection is kept with its reason. An assistant that
 *    silently downgrades to a worse model is one you cannot debug, and REN's
 *    whole contract with the founder is that it reports what actually
 *    happened.
 * 3. **Refuse rather than guess.** When nothing qualifies, the answer is a
 *    refusal carrying the reasons — never the least-bad model dressed up as
 *    a choice. Running a request on a model that cannot serve it produces a
 *    confident wrong answer, which is worse than no answer.
 */

export interface Task {
  /** What the work actually requires. All of these must be present. */
  needs: readonly ModelCapability[];
  /** Rough prompt size. A model whose context cannot hold it is excluded. */
  contextTokens?: number;
  /**
   * How much this piece of work is worth spending on, in cents. Omitted
   * means no ceiling — not "free".
   */
  budgetCents?: number;
  /** Milliseconds the founder is willing to wait before the first token. */
  latencyBudgetMs?: number;
}

export interface Machine {
  vramGb: number;
  ramGb: number;
  diskGb: number;
}

/**
 * What REN is optimising for.
 *
 * Deliberately explicit rather than baked in: answering a question and
 * drafting a long document want different trade-offs, and the founder with
 * no budget wants a different one again.
 */
export interface Weights {
  quality: number;
  reliability: number;
  cost: number;
  latency: number;
}

export const BALANCED: Weights = { quality: 1, reliability: 0.6, cost: 0.5, latency: 0.3 };
/** When the founder is waiting and looking at the screen. */
export const RESPONSIVE: Weights = { quality: 0.7, reliability: 0.5, cost: 0.4, latency: 1 };
/** When there is no money, which is the founder's stated position. */
export const FRUGAL: Weights = { quality: 0.8, reliability: 0.6, cost: 2, latency: 0.3 };

/** What serving one model costs and how fast it answers, as measured. */
export interface Serving {
  /** Cents per thousand tokens. Zero is free — a local model, or a free tier. */
  costPerKTokenCents: number;
  /** Observed milliseconds to first token. Not a vendor's claim. */
  firstTokenMs: number;
  /** 0–1, from observed successes over attempts. */
  reliability: number;
}

export interface Candidate {
  model: ModelRecord;
  serving: Serving;
}

export interface Rejected {
  id: string;
  reason: string;
}

export type Decision =
  | { ok: true; chosen: Candidate; score: number; why: string; rejected: readonly Rejected[] }
  | { ok: false; why: string; rejected: readonly Rejected[] };

/* --------------------------------------------------------------- scoring -- */

/**
 * The best measured score a model has, as a fraction of its own scale.
 *
 * A model with no evaluation is not assumed to be good *or* bad — it gets
 * 0.5, which means a measured model beats it only if the measurement is
 * above average. Treating "unmeasured" as zero would exclude every model NN
 * has not had time to benchmark, including good ones.
 */
export function measuredQuality(model: ModelRecord): number {
  if (model.evaluations.length === 0) return 0.5;
  const fractions = model.evaluations
    .filter((evaluation) => evaluation.outOf > 0)
    .map((evaluation) => evaluation.score / evaluation.outOf);
  if (fractions.length === 0) return 0.5;
  return Math.max(...fractions);
}

/**
 * The blueprint's objective, with cost and latency normalised.
 *
 * Both are divided by a reference rather than used raw, because a score that
 * mixes cents with milliseconds has no meaning — doubling the latency weight
 * would otherwise be indistinguishable from changing the time unit.
 */
export function score(candidate: Candidate, weights: Weights): number {
  const COST_REFERENCE_CENTS = 1;      // a cent per thousand tokens
  const LATENCY_REFERENCE_MS = 1_000;  // a second to first token

  return (
    weights.quality * measuredQuality(candidate.model)
    + weights.reliability * candidate.serving.reliability
    - weights.cost * (candidate.serving.costPerKTokenCents / COST_REFERENCE_CENTS)
    - weights.latency * (candidate.serving.firstTokenMs / LATENCY_REFERENCE_MS)
  );
}

/* ---------------------------------------------------------------- choice -- */

/** Why this candidate cannot do this task, or null when it can. */
export function disqualify(
  candidate: Candidate,
  task: Task,
  machine: Machine,
): string | null {
  const { model, serving } = candidate;

  if (model.deployment !== "deployed") {
    return `${model.id} is ${model.deployment}, not deployed.`;
  }
  if (model.health === "unreachable") {
    return `${model.id} is unreachable.`;
  }

  const missing = task.needs.filter((need) => !model.capabilities.includes(need));
  if (missing.length > 0) {
    // The rule that matters most. A chat model asked to generate video does
    // not produce worse video; it produces a paragraph describing one.
    return `${model.id} cannot ${missing.join(" or ")}.`;
  }

  if (task.contextTokens !== undefined && model.contextTokens < task.contextTokens) {
    return `${model.id} holds ${model.contextTokens} tokens; this needs ${task.contextTokens}.`;
  }

  const hosted = canHost(model, machine);
  if (!hosted.ok) return hosted.reason;

  if (task.latencyBudgetMs !== undefined && serving.firstTokenMs > task.latencyBudgetMs) {
    return `${model.id} answers in about ${serving.firstTokenMs}ms; the budget is ${task.latencyBudgetMs}ms.`;
  }

  if (task.budgetCents !== undefined && serving.costPerKTokenCents > task.budgetCents) {
    return `${model.id} costs ${serving.costPerKTokenCents}c per thousand tokens; the budget is ${task.budgetCents}c.`;
  }

  return null;
}

export function chooseModel(
  candidates: readonly Candidate[],
  task: Task,
  machine: Machine,
  weights: Weights = BALANCED,
): Decision {
  const rejected: Rejected[] = [];
  const eligible: Candidate[] = [];

  for (const candidate of candidates) {
    const why = disqualify(candidate, task, machine);
    if (why === null) eligible.push(candidate);
    else rejected.push({ id: candidate.model.id, reason: why });
  }

  if (eligible.length === 0) {
    return {
      ok: false,
      why:
        candidates.length === 0
          ? "No models are registered, so there is nothing to run this on."
          : `Nothing registered can do this: ${task.needs.join(", ")}.`,
      rejected,
    };
  }

  const ranked = eligible
    .map((candidate) => ({ candidate, value: score(candidate, weights) }))
    // A stable tie-break, so the same inputs always give the same model. A
    // router that picks differently on identical input cannot be debugged.
    .sort((a, b) => b.value - a.value || a.candidate.model.id.localeCompare(b.candidate.model.id));

  const best = ranked[0]!;
  const runnerUp = ranked[1];

  const why =
    runnerUp === undefined
      ? `${best.candidate.model.id} is the only registered model that can do this.`
      : `${best.candidate.model.id} scored ${best.value.toFixed(2)} against `
        + `${runnerUp.candidate.model.id} at ${runnerUp.value.toFixed(2)}.`;

  return { ok: true, chosen: best.candidate, score: best.value, why, rejected };
}
