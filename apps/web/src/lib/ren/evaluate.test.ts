import { describe, expect, it } from "vitest";
import {
  EvaluationError, asEvaluation, report, runSuite, type Suite,
} from "./evaluate";
import { defineModel } from "./registry";
import { measuredQuality } from "./router";
import { SUITES, UNDERSTANDING_SUITE, NATURAL_SPEECH_SUITE } from "./suites";
import { understand } from "./understand";

/**
 * The harness that measures REN.
 *
 * Its own failure modes are the interesting part: a measurement you can
 * make green by deleting cases is worse than no measurement, because it
 * carries the authority of a number.
 */

const suite = (cases: Suite<string, string>["cases"]): Suite<string, string> =>
  ({ name: "t/suite", measures: "a test", cases });

const echo = (input: string) => input;

describe("the rules the harness enforces", () => {
  it("refuses an empty suite rather than scoring it 0/0", async () => {
    // 0/0 reads as "nothing wrong" and is the easiest way to make a
    // dashboard green: delete the cases.
    await expect(runSuite(suite([]), echo, "here")).rejects.toBeInstanceOf(EvaluationError);
  });

  it("refuses a run that will not say where it happened", async () => {
    const one = suite([{ id: "a", input: "x", expects: "x", accepts: (o) => o === "x" }]);
    await expect(runSuite(one, echo, "   ")).rejects.toBeInstanceOf(EvaluationError);
  });

  it("refuses two cases with the same name", async () => {
    const clash = suite([
      { id: "a", input: "x", expects: "x", accepts: () => true },
      { id: "a", input: "y", expects: "y", accepts: () => true },
    ]);
    await expect(runSuite(clash, echo, "here")).rejects.toBeInstanceOf(EvaluationError);
  });

  it("refuses a case weighted to nothing", async () => {
    // Neutralising a case is deleting it while leaving it on screen.
    const zero = suite([
      { id: "a", input: "x", expects: "x", accepts: () => true, weight: 0 },
    ]);
    await expect(runSuite(zero, echo, "here")).rejects.toBeInstanceOf(EvaluationError);
  });

  it("counts a case that throws as a failure, and keeps the message", async () => {
    const boom = suite([{ id: "a", input: "x", expects: "x", accepts: () => true }]);
    const result = await runSuite(boom, () => { throw new Error("engine offline"); }, "here");
    expect(result.score).toBe(0);
    expect(result.failures[0]?.threw).toBe("engine offline");
  });

  it("carries the scale, never a bare number", async () => {
    const two = suite([
      { id: "a", input: "x", expects: "x", accepts: (o) => o === "x" },
      { id: "b", input: "y", expects: "z", accepts: (o) => o === "z" },
    ]);
    const result = await runSuite(two, echo, "here");
    expect(result).toMatchObject({ score: 1, outOf: 2, fraction: 0.5 });
  });

  it("says what it expected when something fails", async () => {
    const one = suite([{ id: "a", input: "x", expects: "the letter z", accepts: (o) => o === "z" }]);
    const result = await runSuite(one, echo, "here");
    expect(report(result)).toContain("the letter z");
    expect(report(result)).toContain("got x");
  });

  it("honours weights when a case genuinely matters more", async () => {
    const weighted = suite([
      { id: "big", input: "x", expects: "x", accepts: (o) => o === "x", weight: 3 },
      { id: "small", input: "y", expects: "z", accepts: (o) => o === "z" },
    ]);
    const result = await runSuite(weighted, echo, "here");
    expect(result).toMatchObject({ score: 3, outOf: 4 });
  });
});

describe("what a run becomes", () => {
  it("produces a record the registry will accept", async () => {
    const one = suite([{ id: "a", input: "x", expects: "x", accepts: (o) => o === "x" }]);
    const result = await runSuite(one, echo, "this machine");
    const evaluation = asEvaluation(result);

    // The registry refuses an evaluation with no scale; this must survive it.
    const model = defineModel({
      id: "t/1", family: "t", version: "1", licence: "Apache-2.0",
      provenance: "open-weights", capabilities: ["chat"], contextTokens: 8_000,
      quantisation: "none", vramGb: 0, endpoint: "http://localhost:0/v1",
      deployment: "deployed", health: "healthy", evaluations: [evaluation],
    });
    expect(model.evaluations).toHaveLength(1);
    // And the router's quality term now reads a real number instead of 0.5.
    expect(measuredQuality(model)).toBe(1);
  });
});

describe("REN, measured", () => {
  it("understands the commands it claims to understand", async () => {
    // The suite REN is expected to pass. A regression here is a real one.
    const result = await runSuite(
      UNDERSTANDING_SUITE, understand, "no model; deterministic matcher only",
    );
    expect(result.fraction, report(result)).toBe(1);
  });

  it("is honest about ordinary speech being out of reach without a model", async () => {
    // Deliberately asserted as a *range*, not a target. This is the number
    // that says what connecting a model would actually buy; if it ever
    // reaches 1 without one, the suite has stopped being hard enough.
    const result = await runSuite(
      NATURAL_SPEECH_SUITE, understand, "no model; deterministic matcher only",
    );
    expect(result.fraction).toBeGreaterThan(0);
    expect(result.fraction, "the hard suite is no longer hard").toBeLessThan(0.8);
  });

  it("never acts on a word that names nothing", async () => {
    // "mark it as done" resolved to a record called "It" and planned to
    // complete whatever came back. The same path reaches delete.
    for (const phrase of ["mark it as done", "delete that", "remove this"]) {
      const result = understand(phrase);
      expect(result.kind, phrase).not.toBe("plan");
    }
  });

  it("keeps every suite uniquely named, so results can be compared over time", () => {
    const names = SUITES.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
