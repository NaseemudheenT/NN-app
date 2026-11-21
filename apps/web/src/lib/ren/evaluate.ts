import type { Evaluation } from "./registry";

/**
 * How REN is measured.
 *
 * The registry has carried an `evaluations` field since it was written and
 * nothing has ever filled it, so `measuredQuality` returns 0.5 for every
 * model and the router's quality term has been decorative. This is the other
 * half: the thing that produces the numbers.
 *
 * The founder's brief is unambiguous about why it exists — *"Never claim
 * superior intelligence without fair, reproducible evidence"*, *"Prove every
 * capability works"*. A capability nobody measured is a capability nobody can
 * defend, and NN has already shipped two of those.
 *
 * Four rules the harness enforces rather than suggests:
 *
 * 1. **A score carries its scale.** `7` is not a result; `7/10` is. The
 *    registry refuses an evaluation with `outOf: 0` for the same reason.
 * 2. **A score carries where it ran.** A number from someone else's GPU is
 *    not ours, and a number from a model that was not connected is not a
 *    number at all.
 * 3. **An empty suite fails.** A suite with no cases otherwise scores 0/0,
 *    which reads as "nothing wrong" and is the easiest way to make a
 *    dashboard green by deleting tests.
 * 4. **A failure says what it expected.** A red line that does not tell you
 *    what it wanted costs more time than it saves.
 */

/** What a single case asks of the subject, and what counts as right. */
export interface Case<Input, Output> {
  /** Unique within the suite. Shown in the report. */
  id: string;
  input: Input;
  /** What the subject should produce, described for a human. */
  expects: string;
  /** True when the output is acceptable. Must not throw. */
  accepts: (output: Output) => boolean;
  /**
   * Weight. Defaults to 1. Use sparingly — a weighted suite is harder to
   * read, and most cases really are equally important.
   */
  weight?: number;
}

export interface Suite<Input, Output> {
  /** Stable name. Becomes `Evaluation.suite`, so it is compared over time. */
  name: string;
  /** What this suite is actually testing, in one sentence. */
  measures: string;
  cases: readonly Case<Input, Output>[];
}

export interface CaseResult {
  id: string;
  passed: boolean;
  expects: string;
  /** What actually came back, for a failure. Never shown for a pass. */
  got?: string;
  /** Set when the subject threw. A crash is a failure, never a skip. */
  threw?: string;
  weight: number;
}

export interface SuiteResult {
  suite: string;
  measures: string;
  score: number;
  outOf: number;
  /** 0–1. The number the router's quality term reads. */
  fraction: number;
  at: string;
  on: string;
  cases: readonly CaseResult[];
  failures: readonly CaseResult[];
}

export class EvaluationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvaluationError";
  }
}

/** A short, safe rendering of whatever the subject returned. */
function describe(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value.slice(0, 160);
  try {
    return JSON.stringify(value)?.slice(0, 160) ?? String(value);
  } catch {
    return Object.prototype.toString.call(value);
  }
}

/**
 * Runs a suite against a subject and reports what happened.
 *
 * `on` is required and not defaulted: an evaluation that does not say where
 * it ran cannot be compared with one that does, and quietly stamping
 * "unknown" would make that mistake invisible.
 *
 * The subject may throw. A case that throws fails, with the message kept —
 * swallowing it would turn a crash into a silent zero and a crash is the
 * most informative failure there is.
 */
export async function runSuite<Input, Output>(
  suite: Suite<Input, Output>,
  subject: (input: Input) => Output | Promise<Output>,
  on: string,
  now: Date = new Date(),
): Promise<SuiteResult> {
  if (suite.cases.length === 0) {
    throw new EvaluationError(
      `The suite "${suite.name}" has no cases. An empty suite scores 0/0, `
      + "which reads as nothing being wrong.",
    );
  }
  if (on.trim().length === 0) {
    throw new EvaluationError(
      `The suite "${suite.name}" was run without saying what it ran on.`,
    );
  }

  const seen = new Set<string>();
  const results: CaseResult[] = [];

  for (const testCase of suite.cases) {
    if (seen.has(testCase.id)) {
      throw new EvaluationError(
        `The suite "${suite.name}" has two cases called "${testCase.id}".`,
      );
    }
    seen.add(testCase.id);

    const weight = testCase.weight ?? 1;
    if (!(weight > 0)) {
      throw new EvaluationError(
        `Case "${testCase.id}" has a weight of ${weight}; a case that counts `
        + "for nothing should be deleted, not neutralised.",
      );
    }

    try {
      const output = await subject(testCase.input);
      const passed = testCase.accepts(output);
      results.push(
        passed
          ? { id: testCase.id, passed: true, expects: testCase.expects, weight }
          : {
            id: testCase.id, passed: false, expects: testCase.expects,
            got: describe(output), weight,
          },
      );
    } catch (error) {
      results.push({
        id: testCase.id,
        passed: false,
        expects: testCase.expects,
        threw: error instanceof Error ? error.message : String(error),
        weight,
      });
    }
  }

  const outOf = results.reduce((total, result) => total + result.weight, 0);
  const score = results.reduce(
    (total, result) => total + (result.passed ? result.weight : 0), 0,
  );

  return {
    suite: suite.name,
    measures: suite.measures,
    score,
    outOf,
    fraction: score / outOf,
    at: now.toISOString(),
    on: on.trim(),
    cases: results,
    failures: results.filter((result) => !result.passed),
  };
}

/** The registry's shape, so a run can be recorded against a model. */
export function asEvaluation(result: SuiteResult): Evaluation {
  return {
    suite: result.suite,
    score: result.score,
    outOf: result.outOf,
    at: result.at,
    on: result.on,
  };
}

/** A run, as a few lines a person can read. */
export function report(result: SuiteResult): string {
  const percent = (result.fraction * 100).toFixed(1);
  const lines = [
    `${result.suite}: ${result.score}/${result.outOf} (${percent}%) on ${result.on}`,
    `  ${result.measures}`,
  ];
  for (const failure of result.failures) {
    lines.push(
      `  FAILED ${failure.id} — expected ${failure.expects}; `
      + (failure.threw !== undefined ? `threw ${failure.threw}` : `got ${failure.got}`),
    );
  }
  return lines.join("\n");
}
