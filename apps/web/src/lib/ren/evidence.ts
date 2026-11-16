/**
 * What REN knows, and how it knows it.
 *
 * This is the most important file in REN. Everything else — research, coding,
 * tools, memory — produces claims, and a claim REN cannot support is worse
 * than no answer at all. So a claim is not a string here. It is a value whose
 * *kind* is part of its type, and whose evidence is required by the
 * constructor that builds it.
 *
 * The point is to make a dishonest claim unrepresentable rather than
 * discouraged. There is no way to produce a `verified` claim without handing
 * over the evidence that verified it; there is no way to produce a
 * `retrieved` claim without a source that was actually fetched; and `unknown`
 * is a first-class answer rather than a failure to produce one.
 *
 * The six kinds, from the founder's brief §15:
 *
 * - **known** — from the model's own weights. Never presented as current.
 * - **retrieved** — fetched from a named source, with the date it carried.
 * - **verified** — agreed by two independent sources, or actually executed
 *   and observed.
 * - **estimated** — reasoned, with the uncertainty stated.
 * - **unknown** — not enough evidence, and REN says which places it looked.
 * - **failed** — something was attempted and did not succeed.
 *
 * Nothing here talks to a model, a network or a database. It is the vocabulary
 * the rest of REN is obliged to speak.
 */

/* ---------------------------------------------------------------- source -- */

export interface Source {
  /** Where it came from. Must be http(s) — a claim cannot cite a thought. */
  url: string;
  title: string;
  /** The date the document itself states, when it states one. */
  publishedAt?: string;
  /** When REN actually fetched it. Not when it was summarised. */
  fetchedAt: string;
}

export class EvidenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvidenceError";
  }
}

const ISO = /^\d{4}-\d{2}-\d{2}(?:T[\d:.]+(?:Z|[+-]\d{2}:\d{2}))?$/;

/** The host a source came from, for independence checks. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    throw new EvidenceError(`A source must have a real URL. Got: ${url}`);
  }
}

export function source(input: Source): Source {
  const host = hostOf(input.url);
  if (!input.url.startsWith("http://") && !input.url.startsWith("https://")) {
    throw new EvidenceError(`A source must be fetched over http(s). Got: ${input.url}`);
  }
  if (host.length === 0) throw new EvidenceError("A source must name a host.");
  if (input.title.trim().length === 0) {
    throw new EvidenceError("A source must carry the title of what was fetched.");
  }
  if (!ISO.test(input.fetchedAt)) {
    throw new EvidenceError(`fetchedAt must be an ISO date. Got: ${input.fetchedAt}`);
  }
  if (input.publishedAt !== undefined && !ISO.test(input.publishedAt)) {
    throw new EvidenceError(`publishedAt must be an ISO date. Got: ${input.publishedAt}`);
  }
  return input;
}

/* ----------------------------------------------------------- observation -- */

/**
 * Something REN did and watched the result of.
 *
 * This is the other way a claim becomes verified, and the stronger one: a test
 * that ran, a file that exists afterwards, a route that changed, an HTTP
 * response that arrived. `observed` is what was actually seen — not what was
 * expected, and not a restatement of `action`.
 */
export interface Observation {
  action: string;
  observed: string;
  at: string;
}

export function observation(input: Observation): Observation {
  if (input.action.trim().length === 0) {
    throw new EvidenceError("An observation must say what was attempted.");
  }
  if (input.observed.trim().length === 0) {
    throw new EvidenceError(
      "An observation must say what was actually observed. " +
        "If nothing was observed, the claim is `unknown` or `failed`, not `verified`.",
    );
  }
  if (!ISO.test(input.at)) {
    throw new EvidenceError(`An observation must be dated. Got: ${input.at}`);
  }
  return input;
}

/* ----------------------------------------------------------------- claim -- */

export type Claim =
  | { kind: "known"; statement: string; model: string }
  | { kind: "retrieved"; statement: string; sources: readonly Source[] }
  | {
      kind: "verified";
      statement: string;
      sources: readonly Source[];
      observations: readonly Observation[];
    }
  | { kind: "estimated"; statement: string; basis: string; uncertainty: string }
  | { kind: "unknown"; question: string; looked: readonly string[] }
  | { kind: "failed"; attempted: string; error: string; at: string };

export type ClaimKind = Claim["kind"];

/** Every kind, in the order they appear in the brief. */
export const CLAIM_KINDS: readonly ClaimKind[] = [
  "known", "retrieved", "verified", "estimated", "unknown", "failed",
];

function requireStatement(statement: string): string {
  if (statement.trim().length === 0) {
    throw new EvidenceError("A claim must actually say something.");
  }
  return statement;
}

/**
 * From the model's own weights.
 *
 * Carries the model that produced it, because weights have a cut-off and two
 * models disagree. Never rendered as current — `isCurrent` is false for this
 * kind and the surface is expected to mark it.
 */
export function known(statement: string, model: string): Claim {
  if (model.trim().length === 0) {
    throw new EvidenceError("A `known` claim must name the model it came from.");
  }
  return { kind: "known", statement: requireStatement(statement), model };
}

/** Fetched. At least one source, each of which was really retrieved. */
export function retrieved(statement: string, sources: readonly Source[]): Claim {
  if (sources.length === 0) {
    throw new EvidenceError(
      "A `retrieved` claim must carry at least one source. Without one it is `known`.",
    );
  }
  return {
    kind: "retrieved",
    statement: requireStatement(statement),
    sources: sources.map(source),
  };
}

/**
 * Verified: agreed by two *independent* sources, or observed directly.
 *
 * Independence is checked by host. Two pages of the same site repeating each
 * other is one source saying something twice, which is how a confident wrong
 * answer is built — so it is refused here rather than discovered later.
 */
export function verified(
  statement: string,
  evidence: { sources?: readonly Source[]; observations?: readonly Observation[] },
): Claim {
  const sources = (evidence.sources ?? []).map(source);
  const observations = (evidence.observations ?? []).map(observation);

  const hosts = new Set(sources.map((s) => hostOf(s.url)));
  const byObservation = observations.length >= 1;
  const byAgreement = hosts.size >= 2;

  if (!byObservation && !byAgreement) {
    throw new EvidenceError(
      "A `verified` claim needs either something REN actually observed, or " +
        `agreement between two independent sources. Got ${observations.length} ` +
        `observation(s) and ${hosts.size} distinct host(s).`,
    );
  }
  return { kind: "verified", statement: requireStatement(statement), sources, observations };
}

/** Reasoned, with the uncertainty said out loud rather than implied. */
export function estimated(statement: string, basis: string, uncertainty: string): Claim {
  if (basis.trim().length === 0) {
    throw new EvidenceError("An `estimated` claim must say what it is reasoning from.");
  }
  if (uncertainty.trim().length === 0) {
    throw new EvidenceError(
      "An `estimated` claim must state its uncertainty. An estimate presented " +
        "without one is being passed off as a fact.",
    );
  }
  return { kind: "estimated", statement: requireStatement(statement), basis, uncertainty };
}

/**
 * Not enough evidence.
 *
 * `looked` is where REN actually went. An empty list is allowed and means REN
 * did not look — which is a different and more honest answer than implying a
 * search happened.
 */
export function unknown(question: string, looked: readonly string[] = []): Claim {
  return { kind: "unknown", question: requireStatement(question), looked };
}

/** Attempted and did not succeed. The real error, not a tidied one. */
export function failed(attempted: string, error: string, at: string): Claim {
  if (error.trim().length === 0) {
    throw new EvidenceError("A `failed` claim must carry the actual failure.");
  }
  if (!ISO.test(at)) throw new EvidenceError(`A failure must be dated. Got: ${at}`);
  return { kind: "failed", attempted: requireStatement(attempted), error, at };
}

/* --------------------------------------------------------------- reading -- */

/** Whether a claim may be presented as describing the world right now. */
export function isCurrent(claim: Claim): boolean {
  // Weights have a cut-off and an estimate is not an observation. Only
  // something fetched or observed can speak about the present.
  return claim.kind === "retrieved" || claim.kind === "verified";
}

/** Whether REN may act on this without asking first. */
export function isActionable(claim: Claim): boolean {
  return claim.kind === "verified";
}

/**
 * How REN says it.
 *
 * The qualifier is part of the sentence rather than a badge beside it,
 * because a badge is lost the moment the text is copied, read aloud or
 * summarised — and the qualifier is the part that must survive.
 */
export function phrase(claim: Claim): string {
  switch (claim.kind) {
    case "known":
      return `${claim.statement} — from what I was trained on, which may be out of date.`;
    case "retrieved": {
      const first = claim.sources[0]!;
      const rest = claim.sources.length - 1;
      const where = rest > 0 ? `${hostOf(first.url)} and ${rest} other source${rest > 1 ? "s" : ""}`
        : hostOf(first.url);
      return `${claim.statement} — according to ${where}.`;
    }
    case "verified": {
      if (claim.observations.length > 0) {
        return `${claim.statement} — I checked: ${claim.observations[0]!.observed}.`;
      }
      const hosts = [...new Set(claim.sources.map((s) => hostOf(s.url)))];
      return `${claim.statement} — confirmed by ${hosts.join(" and ")}.`;
    }
    case "estimated":
      return `${claim.statement} — an estimate from ${claim.basis}. ${claim.uncertainty}`;
    case "unknown":
      return claim.looked.length > 0
        ? `I do not know. I looked in ${claim.looked.join(", ")} and did not find enough to answer "${claim.question}".`
        : `I do not know, and I have not looked: ${claim.question}`;
    case "failed":
      return `I could not do it. ${claim.attempted} failed: ${claim.error}`;
  }
}

/* ---------------------------------------------------------------- ledger -- */

export interface LedgerEntry {
  claim: Claim;
  at: string;
}

/**
 * An append-only record of what REN has claimed.
 *
 * Append-only on purpose: a claim that turns out to be wrong is superseded by
 * a later one, never edited. The history of what REN said is part of what
 * makes it auditable, and a mutable one proves nothing.
 */
export class Ledger {
  readonly #entries: LedgerEntry[] = [];

  record(claim: Claim, at: string): LedgerEntry {
    if (!ISO.test(at)) throw new EvidenceError(`A ledger entry must be dated. Got: ${at}`);
    const entry: LedgerEntry = { claim, at };
    this.#entries.push(entry);
    return entry;
  }

  get entries(): readonly LedgerEntry[] {
    return [...this.#entries];
  }

  /** Everything of one kind — "what has REN failed at", "what is unverified". */
  ofKind(kind: ClaimKind): readonly LedgerEntry[] {
    return this.#entries.filter((e) => e.claim.kind === kind);
  }

  /** Nothing unsupported was asserted: no `known` claim about a live matter. */
  get unsupported(): readonly LedgerEntry[] {
    return this.#entries.filter((e) => e.claim.kind === "known" || e.claim.kind === "estimated");
  }
}
