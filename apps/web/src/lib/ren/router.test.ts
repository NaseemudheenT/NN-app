import { describe, expect, it } from "vitest";
import {
  BALANCED, FRUGAL, RESPONSIVE, chooseModel, disqualify, measuredQuality, score,
  type Candidate, type Machine,
} from "./router";
import { defineModel, type ModelRecord } from "./registry";

/**
 * Which model REN uses, and why.
 *
 * The router is what makes "model-independent" more than a word. These pin
 * the three rules it is built on: eliminate before scoring, keep the reason
 * for every rejection, and refuse rather than return the least-bad option.
 */

const model = (over: Partial<ModelRecord> & { id: string }): ModelRecord =>
  defineModel({
    family: "test", version: "1", licence: "Apache-2.0",
    provenance: "open-weights", capabilities: ["chat", "tools"],
    contextTokens: 32_000, quantisation: "none", vramGb: 0,
    // The registry refuses a deployed model with no endpoint — nothing is
    // serving it — so the helper supplies one unless a test overrides it.
    endpoint: "http://localhost:0/v1",
    deployment: "deployed", health: "healthy", evaluations: [],
    ...over,
  } as ModelRecord);

const serving = (over: Partial<Candidate["serving"]> = {}) => ({
  costPerKTokenCents: 0, firstTokenMs: 400, reliability: 0.99, ...over,
});

const candidate = (over: Partial<ModelRecord> & { id: string }, s = {}): Candidate =>
  ({ model: model(over), serving: serving(s) });

/** This machine, measured 2026-11-20. The numbers are not hypothetical. */
const THIS_MACHINE: Machine = { vramGb: 1.5, ramGb: 8, diskGb: 2.7 };
const SERVER: Machine = { vramGb: 80, ramGb: 256, diskGb: 2_000 };

describe("eliminating before scoring", () => {
  it("refuses a model that cannot do the work, however cheap it is", () => {
    // The rule that matters most. A chat model asked for video does not
    // produce worse video — it produces a paragraph describing one.
    const chat = candidate({ id: "chat/1" }, { costPerKTokenCents: 0 });
    const decision = chooseModel([chat], { needs: ["video"] }, SERVER);
    expect(decision.ok).toBe(false);
    expect(decision.rejected[0]?.reason).toContain("cannot video");
  });

  it("will not use a model that is planned rather than deployed", () => {
    const planned = candidate({ id: "soon/1", deployment: "planned" });
    const decision = chooseModel([planned], { needs: ["chat"] }, SERVER);
    expect(decision.ok).toBe(false);
    expect(decision.rejected[0]?.reason).toContain("planned");
  });

  it("will not use a model that is unreachable", () => {
    const down = candidate({ id: "down/1", health: "unreachable" });
    expect(chooseModel([down], { needs: ["chat"] }, SERVER).ok).toBe(false);
  });

  it("excludes a model whose context cannot hold the prompt", () => {
    const small = candidate({ id: "small/1", contextTokens: 4_000 });
    const decision = chooseModel([small], { needs: ["chat"], contextTokens: 100_000 }, SERVER);
    expect(decision.ok).toBe(false);
    expect(decision.rejected[0]?.reason).toContain("holds 4000 tokens");
  });

  it("excludes a model this machine cannot actually host", () => {
    // Measured, not assumed: 1.5 GB of shared VRAM and 2.7 GB of free disk.
    const big = candidate({ id: "big/70b", vramGb: 40 });
    const decision = chooseModel([big], { needs: ["chat"] }, THIS_MACHINE);
    expect(decision.ok).toBe(false);
    expect(decision.rejected[0]?.reason).toMatch(/VRAM/);
  });

  it("respects a latency budget", () => {
    const slow = candidate({ id: "slow/1" }, { firstTokenMs: 9_000 });
    const decision = chooseModel([slow], { needs: ["chat"], latencyBudgetMs: 1_000 }, SERVER);
    expect(decision.ok).toBe(false);
  });

  it("respects a cost ceiling", () => {
    const dear = candidate({ id: "dear/1" }, { costPerKTokenCents: 50 });
    const decision = chooseModel([dear], { needs: ["chat"], budgetCents: 1 }, SERVER);
    expect(decision.ok).toBe(false);
  });

  it("no amount of cheapness buys past a missing capability", () => {
    const free = candidate({ id: "free/1" }, { costPerKTokenCents: 0 });
    const paid = candidate({ id: "sees/1", capabilities: ["chat", "vision"] }, { costPerKTokenCents: 20 });
    const decision = chooseModel([free, paid], { needs: ["vision"] }, SERVER, FRUGAL);
    expect(decision.ok).toBe(true);
    if (decision.ok) expect(decision.chosen.model.id).toBe("sees/1");
  });
});

describe("refusing rather than guessing", () => {
  it("returns a refusal with the reasons, not the least-bad model", () => {
    const decision = chooseModel(
      [candidate({ id: "a/1" }), candidate({ id: "b/1" })],
      { needs: ["image"] }, SERVER,
    );
    expect(decision.ok).toBe(false);
    expect(decision.rejected).toHaveLength(2);
    if (!decision.ok) expect(decision.why).toContain("image");
  });

  it("says plainly when nothing is registered at all", () => {
    const decision = chooseModel([], { needs: ["chat"] }, SERVER);
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.why).toContain("No models are registered");
  });

  it("keeps a reason for every model it passed over", () => {
    // An assistant that silently downgrades is one you cannot debug.
    const decision = chooseModel(
      [candidate({ id: "ok/1" }), candidate({ id: "planned/1", deployment: "planned" })],
      { needs: ["chat"] }, SERVER,
    );
    expect(decision.ok).toBe(true);
    expect(decision.rejected.map((r) => r.id)).toEqual(["planned/1"]);
  });
});

describe("what the weights actually change", () => {
  const fast = candidate({ id: "fast/1" }, { firstTokenMs: 200, costPerKTokenCents: 3 });
  const cheap = candidate({ id: "cheap/1" }, { firstTokenMs: 2_500, costPerKTokenCents: 0 });

  it("picks the quick one when the founder is waiting", () => {
    const decision = chooseModel([fast, cheap], { needs: ["chat"] }, SERVER, RESPONSIVE);
    expect(decision.ok && decision.chosen.model.id).toBe("fast/1");
  });

  it("picks the free one when there is no money", () => {
    // The founder's stated position, so this is the default that matters.
    const decision = chooseModel([fast, cheap], { needs: ["chat"] }, SERVER, FRUGAL);
    expect(decision.ok && decision.chosen.model.id).toBe("cheap/1");
  });

  it("explains the choice against the runner-up", () => {
    const decision = chooseModel([fast, cheap], { needs: ["chat"] }, SERVER, BALANCED);
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.why).toMatch(/scored -?\d+\.\d+ against/);
      expect(decision.why).toContain("cheap/1");
    }
  });

  it("gives the same answer every time for the same inputs", () => {
    // A router that picks differently on identical input cannot be debugged.
    const tie = [candidate({ id: "b/1" }), candidate({ id: "a/1" })];
    const first = chooseModel(tie, { needs: ["chat"] }, SERVER);
    const second = chooseModel([...tie].reverse(), { needs: ["chat"] }, SERVER);
    expect(first.ok && first.chosen.model.id).toBe("a/1");
    expect(second.ok && second.chosen.model.id).toBe("a/1");
  });
});

describe("how quality is counted", () => {
  it("treats an unmeasured model as average, not as bad", () => {
    // Zero would exclude every model NN has not had time to benchmark.
    expect(measuredQuality(model({ id: "new/1" }))).toBe(0.5);
  });

  it("takes the best measured result, on its own scale", () => {
    const measured = model({
      id: "m/1",
      evaluations: [
        { suite: "mmlu", score: 70, outOf: 100, at: "2026-01-01", on: "local" },
        { suite: "gsm8k", score: 8, outOf: 10, at: "2026-01-01", on: "local" },
      ],
    });
    expect(measuredQuality(measured)).toBeCloseTo(0.8);
  });

  it("ignores an evaluation with no scale", () => {
    // `defineModel` refuses this outright, which is the stronger guarantee.
    // The filter still earns its place for a record that did not come
    // through it — one read back out of Firestore, say — so this builds the
    // record directly rather than pretending the registry would allow it.
    const broken = {
      ...model({ id: "m/2" }),
      evaluations: [{ suite: "x", score: 99, outOf: 0, at: "2026-01-01", on: "local" }],
    };
    expect(measuredQuality(broken)).toBe(0.5);
  });

  it("scores a measured model above an unmeasured one, all else equal", () => {
    const good = candidate({
      id: "good/1",
      evaluations: [{ suite: "mmlu", score: 90, outOf: 100, at: "2026-01-01", on: "local" }],
    });
    const unknown = candidate({ id: "unknown/1" });
    expect(score(good, BALANCED)).toBeGreaterThan(score(unknown, BALANCED));
  });
});

describe("this machine, measured", () => {
  it("cannot host a 7B model, and says why in a sentence", () => {
    // 2.7 GB free on 2026-11-20. This is the fact the plan has to respect.
    const sevenB = candidate({ id: "llama/7b-q4", vramGb: 0 });
    const reason = disqualify(sevenB, { needs: ["chat"] }, THIS_MACHINE);
    expect(reason).toContain("2.7 GB free");
  });

  it("can still route to something served elsewhere", () => {
    // vramGb 0 with the weights off this machine: a hosted endpoint.
    const hosted = candidate({ id: "hosted/1", vramGb: 0 });
    const roomy: Machine = { vramGb: 0, ramGb: 8, diskGb: 50 };
    expect(chooseModel([hosted], { needs: ["chat"] }, roomy).ok).toBe(true);
  });
});
