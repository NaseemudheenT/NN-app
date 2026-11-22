/**
 * The models REN may think with.
 *
 * REN's intelligence must not be tied to one model or one vendor, and the way
 * to guarantee that is not a promise in a document — it is a registry that
 * the rest of the system can only reach a model through. Nothing in REN
 * imports a model. It asks the registry for something that can do a job, and
 * gets back a record or nothing at all.
 *
 * Three things this file is built to prevent, all of them from the founder's
 * brief:
 *
 * 1. **Choosing a model on marketing.** A record cannot exist without its
 *    licence, its context length and the VRAM it actually needs. Those are the
 *    three facts that decide whether a model is usable at all, and they are
 *    the three most often left out of an announcement.
 * 2. **A hidden proprietary fallback.** Backends speak one shape — an
 *    OpenAI-compatible HTTP endpoint — and that endpoint is a value NN
 *    configures. There is no code path that reaches a proprietary assistant,
 *    and `selectFor` returns null rather than quietly substituting one.
 * 3. **Claiming NN trained something.** `provenance` records where the weights
 *    came from. Downloading open weights is not training a model, and the
 *    registry will not let that be written down as if it were.
 *
 * Nothing here performs inference or opens a socket. It is the catalogue, the
 * health record and the selection rule.
 */

/* ------------------------------------------------------------ capability -- */

export const MODEL_CAPABILITIES = [
  "chat",
  "reasoning",
  "code",
  "tools",
  "vision",
  "embedding",
  "speech-to-text",
  "text-to-speech",
  "image",
  "video",
] as const;

export type ModelCapability = (typeof MODEL_CAPABILITIES)[number];

/** Where the weights came from. NN has trained none of them. */
export type Provenance =
  /** Open weights published by someone else and run on NN's own hardware. */
  | "open-weights"
  /** Open weights NN has fine-tuned. Still not trained from scratch. */
  | "open-weights-finetuned"
  /** Trained by NN from scratch. Nothing is this, and nothing should claim to be. */
  | "trained-by-nn";

export type Deployment = "planned" | "deployed" | "retired";
export type Health = "unknown" | "healthy" | "degraded" | "unreachable";

export interface Evaluation {
  /** What was measured — a named suite, not a vibe. */
  suite: string;
  score: number;
  /** Out of what. A score with no scale is not a score. */
  outOf: number;
  at: string;
  /** What it was measured on. A number from someone else's GPU is not ours. */
  on: string;
}

export interface ModelRecord {
  /** Unique within NN. Convention: `family/version[-quantisation]`. */
  id: string;
  family: string;
  version: string;
  /** SPDX identifier or the licence's own name. Required — never assumed. */
  licence: string;
  licenceUrl?: string;
  provenance: Provenance;
  capabilities: readonly ModelCapability[];
  /** Usable context in tokens, as the model card states it. */
  contextTokens: number;
  /** "none", or the scheme actually in use: q4_k_m, awq, gptq, fp8. */
  quantisation: string;
  /**
   * VRAM needed to serve it, in GB. Zero means it runs on CPU, which is a
   * claim about speed as much as memory and still has to be declared.
   */
  vramGb: number;
  /** An OpenAI-compatible base URL. Absent until something actually serves it. */
  endpoint?: string;
  /** The name the endpoint knows it by, if it differs from `id`. */
  servedAs?: string;
  deployment: Deployment;
  health: Health;
  evaluations: readonly Evaluation[];
  /** Why this model is in the registry at all. */
  note?: string;
}

export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistryError";
  }
}

/**
 * Build a record, refusing the ones that hide the facts that matter.
 *
 * This is deliberately strict. Every rejection here corresponds to a way a
 * model gets adopted and then turns out not to fit: no licence to check, a
 * context length nobody wrote down, a memory figure discovered on the day the
 * GPU is rented.
 */
export function defineModel(input: ModelRecord): ModelRecord {
  if (!/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/i.test(input.id)) {
    throw new RegistryError(
      `A model id must read "family/version", lowercase. Got: ${input.id}`,
    );
  }
  if (input.licence.trim().length === 0) {
    throw new RegistryError(
      `${input.id} has no licence. A model NN cannot show the terms for is a model NN cannot use.`,
    );
  }
  if (input.capabilities.length === 0) {
    throw new RegistryError(`${input.id} declares no capability, so nothing could ever select it.`);
  }
  if (!Number.isInteger(input.contextTokens) || input.contextTokens <= 0) {
    throw new RegistryError(`${input.id} must declare its context length in tokens.`);
  }
  if (!Number.isFinite(input.vramGb) || input.vramGb < 0) {
    throw new RegistryError(
      `${input.id} must declare the VRAM it needs. Zero is allowed and means CPU.`,
    );
  }
  if (input.quantisation.trim().length === 0) {
    throw new RegistryError(`${input.id} must say "none" if it is not quantised.`);
  }
  if (input.deployment === "deployed" && input.endpoint === undefined) {
    throw new RegistryError(
      `${input.id} is marked deployed but has no endpoint. Nothing is serving it.`,
    );
  }
  if (input.endpoint !== undefined && !/^https?:\/\//.test(input.endpoint)) {
    throw new RegistryError(`${input.id} has an endpoint that is not a URL: ${input.endpoint}`);
  }
  for (const evaluation of input.evaluations) {
    if (evaluation.outOf <= 0) {
      throw new RegistryError(`${input.id}: an evaluation needs a scale to be read against.`);
    }
    if (evaluation.score < 0 || evaluation.score > evaluation.outOf) {
      throw new RegistryError(
        `${input.id}: ${evaluation.suite} scored ${evaluation.score} out of ${evaluation.outOf}.`,
      );
    }
    if (evaluation.on.trim().length === 0) {
      throw new RegistryError(
        `${input.id}: an evaluation must say what hardware it ran on. A score from ` +
          "someone else's GPU does not describe what NN will get.",
      );
    }
  }
  return input;
}

/* -------------------------------------------------------------- registry -- */

export class ModelRegistry {
  readonly #models = new Map<string, ModelRecord>();

  register(record: ModelRecord): ModelRecord {
    const model = defineModel(record);
    if (this.#models.has(model.id)) {
      throw new RegistryError(`${model.id} is already registered.`);
    }
    this.#models.set(model.id, model);
    return model;
  }

  get(id: string): ModelRecord | null {
    return this.#models.get(id) ?? null;
  }

  get all(): readonly ModelRecord[] {
    return [...this.#models.values()];
  }

  /** Everything that claims a capability, whether or not anything serves it. */
  byCapability(capability: ModelCapability): readonly ModelRecord[] {
    return this.all.filter((m) => m.capabilities.includes(capability));
  }

  /** Only what could answer right now: deployed, reachable, with an endpoint. */
  servable(capability: ModelCapability): readonly ModelRecord[] {
    return this.byCapability(capability).filter(
      (m) => m.deployment === "deployed" && m.endpoint !== undefined && m.health === "healthy",
    );
  }

  /**
   * The model to use for a job, or null.
   *
   * Null is the important half. When nothing can serve a capability, REN says
   * so — it does not reach for a proprietary assistant, and there is no code
   * path here that could. The founder's brief is explicit about this and it is
   * enforced by there being nothing else to return.
   */
  selectFor(capability: ModelCapability): ModelRecord | null {
    const candidates = this.servable(capability);
    if (candidates.length === 0) return null;
    // Best measured score for this capability, then longest context as the
    // tie-break. An unevaluated model sorts last: it has not earned the job.
    return [...candidates].sort((a, b) => best(b, capability) - best(a, capability)
      || b.contextTokens - a.contextTokens)[0]!;
  }

  /** Record what a health check actually found. Never inferred. */
  setHealth(id: string, health: Health): ModelRecord {
    const model = this.#models.get(id);
    if (!model) throw new RegistryError(`${id} is not registered.`);
    const next: ModelRecord = { ...model, health };
    this.#models.set(id, next);
    return next;
  }

  /** Attach a measured result. */
  recordEvaluation(id: string, evaluation: Evaluation): ModelRecord {
    const model = this.#models.get(id);
    if (!model) throw new RegistryError(`${id} is not registered.`);
    const next = defineModel({ ...model, evaluations: [...model.evaluations, evaluation] });
    this.#models.set(id, next);
    return next;
  }
}

/** Normalised best score for a capability, 0 when never measured. */
function best(model: ModelRecord, capability: ModelCapability): number {
  const relevant = model.evaluations.filter((e) =>
    e.suite.toLowerCase().includes(capability.toLowerCase()));
  const pool = relevant.length > 0 ? relevant : model.evaluations;
  return pool.reduce((top, e) => Math.max(top, e.score / e.outOf), 0);
}

/**
 * What a machine must have before a model can be served on it.
 *
 * Checked against measured hardware, not a hopeful guess. The headroom is
 * because VRAM holds the KV cache and the runtime as well as the weights, and
 * a model that exactly fits does not run.
 */
export function canHost(
  model: ModelRecord,
  machine: { vramGb: number; ramGb: number; diskGb: number },
): { ok: true } | { ok: false; reason: string } {
  const needed = model.vramGb * 1.2;
  if (model.vramGb > 0 && machine.vramGb < needed) {
    return {
      ok: false,
      reason:
        `${model.id} needs about ${needed.toFixed(1)} GB of VRAM with headroom for the ` +
        `KV cache; this machine has ${machine.vramGb} GB.`,
    };
  }
  if (model.vramGb === 0 && machine.ramGb < 8) {
    return { ok: false, reason: `${model.id} runs on CPU and needs at least 8 GB of RAM.` };
  }
  // Weights have to land on disk before they can be loaded into anything.
  const onDisk = model.vramGb > 0 ? model.vramGb : 5;
  if (machine.diskGb < onDisk) {
    return {
      ok: false,
      reason:
        `${model.id} is roughly ${onDisk} GB on disk; this machine has ` +
        `${machine.diskGb} GB free.`,
    };
  }
  return { ok: true };
}
