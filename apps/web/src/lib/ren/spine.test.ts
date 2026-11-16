import { describe, expect, it } from "vitest";
import {
  EvidenceError, Ledger, estimated, failed, hostOf, isActionable, isCurrent,
  known, observation, phrase, retrieved, source, unknown, verified,
  type LedgerEntry,
} from "./evidence";
import {
  ModelRegistry, RegistryError, canHost, defineModel, type ModelRecord,
} from "./registry";
import { Task, TaskError, TRANSITIONS, describe as describeState, isTerminal } from "./task";

/**
 * REN's spine — the acceptance tests named in `docs/REN_ARCHITECTURE.md` §17.
 *
 * None of this needs a model, a GPU or a network, which is the point: the
 * parts of REN that decide whether it can be trusted are deterministic, and
 * they are built and proven before there is anything to be intelligent with.
 */

const NOW = "2026-11-17T09:00:00.000Z";
const LATER = "2026-11-17T09:05:00.000Z";

const bbc = source({ url: "https://www.bbc.co.uk/news/x", title: "A report", fetchedAt: NOW });
const reuters = source({ url: "https://reuters.com/y", title: "Another report", fetchedAt: NOW });
const bbcAgain = source({ url: "https://bbc.co.uk/news/z", title: "The same site", fetchedAt: NOW });

/* ------------------------------------------------------------- evidence -- */

describe("what REN knows, and how", () => {
  it("refuses a source that was never fetched from anywhere", () => {
    expect(() => source({ url: "the internet", title: "x", fetchedAt: NOW }))
      .toThrow(EvidenceError);
    expect(() => source({ url: "file:///etc/passwd", title: "x", fetchedAt: NOW }))
      .toThrow(/http/);
  });

  it("refuses a source with no title or no fetch date", () => {
    expect(() => source({ url: "https://a.com", title: "  ", fetchedAt: NOW })).toThrow(/title/);
    expect(() => source({ url: "https://a.com", title: "x", fetchedAt: "yesterday" }))
      .toThrow(/ISO/);
  });

  it("will not build a verified claim out of nothing", () => {
    // The single most important refusal in REN.
    expect(() => verified("The sky is green", {})).toThrow(EvidenceError);
    expect(() => verified("The sky is green", { sources: [] })).toThrow(/independent/);
  });

  it("will not accept one site repeating itself as agreement", () => {
    // Two pages of the same publisher is one source saying something twice,
    // and it is exactly how a confident wrong answer gets built.
    expect(() => verified("A claim", { sources: [bbc, bbcAgain] })).toThrow(/independent/);
    expect(verified("A claim", { sources: [bbc, reuters] }).kind).toBe("verified");
  });

  it("accepts something REN actually did and watched", () => {
    const claim = verified("The file exists", {
      observations: [observation({
        action: "Read /tmp/report.md",
        observed: "1,204 bytes returned",
        at: NOW,
      })],
    });
    expect(claim.kind).toBe("verified");
    expect(phrase(claim)).toContain("1,204 bytes returned");
  });

  it("refuses an observation that observed nothing", () => {
    // "I ran the tests" is not an observation. "14 passed" is.
    expect(() => observation({ action: "Ran the tests", observed: "", at: NOW }))
      .toThrow(/actually observed/);
  });

  it("will not let an estimate hide its uncertainty", () => {
    expect(() => estimated("About 40 GB", "the model card", "")).toThrow(/uncertainty/);
    expect(estimated("About 40 GB", "the model card", "±10 GB").kind).toBe("estimated");
  });

  it("requires a retrieved claim to carry what it was retrieved from", () => {
    expect(() => retrieved("Something", [])).toThrow(/at least one source/);
  });

  it("keeps the real error on a failure", () => {
    expect(() => failed("Deploy", "", NOW)).toThrow(/actual failure/);
    const claim = failed("Deploy", "exit code 1: missing credential", NOW);
    expect(phrase(claim)).toContain("missing credential");
  });

  it("treats not knowing as an answer, not an absence", () => {
    const claim = unknown("What did the market close at?", ["the model's weights"]);
    expect(claim.kind).toBe("unknown");
    expect(phrase(claim)).toMatch(/do not know/);
  });

  it("never lets weights or an estimate speak about the present", () => {
    expect(isCurrent(known("Paris is in France", "qwen/2.5-14b"))).toBe(false);
    expect(isCurrent(estimated("Roughly 40 GB", "the card", "±10"))).toBe(false);
    expect(isCurrent(retrieved("A price", [bbc]))).toBe(true);
    expect(isCurrent(verified("A price", { sources: [bbc, reuters] }))).toBe(true);
  });

  it("only acts on what it verified", () => {
    expect(isActionable(retrieved("Probably fine", [bbc]))).toBe(false);
    expect(isActionable(verified("Fine", { sources: [bbc, reuters] }))).toBe(true);
  });

  it("puts the qualifier in the sentence, where it survives being copied", () => {
    expect(phrase(known("X", "qwen/2.5-14b"))).toMatch(/may be out of date/);
    expect(phrase(retrieved("X", [bbc]))).toContain("bbc.co.uk");
  });

  it("strips www so two spellings of one host are one host", () => {
    expect(hostOf("https://www.bbc.co.uk/a")).toBe(hostOf("https://bbc.co.uk/b"));
  });

  it("keeps an append-only record of everything claimed", () => {
    const ledger = new Ledger();
    ledger.record(known("A", "m"), NOW);
    ledger.record(verified("B", { sources: [bbc, reuters] }), LATER);
    expect(ledger.entries).toHaveLength(2);
    expect(ledger.ofKind("verified")).toHaveLength(1);
    expect(ledger.unsupported).toHaveLength(1);
    // The getter hands out a copy: the history cannot be edited from outside.
    const handedOut = ledger.entries as LedgerEntry[];
    handedOut.length = 0;
    expect(ledger.entries).toHaveLength(2);
  });
});

/* ------------------------------------------------------------- registry -- */

const QWEN: ModelRecord = {
  id: "qwen/2.5-14b-instruct",
  family: "qwen",
  version: "2.5-14b-instruct",
  licence: "Apache-2.0",
  provenance: "open-weights",
  capabilities: ["chat", "reasoning", "code", "tools"],
  contextTokens: 32_768,
  quantisation: "awq",
  vramGb: 16,
  deployment: "planned",
  health: "unknown",
  evaluations: [],
};

describe("the models REN may think with", () => {
  it("refuses a model whose licence nobody checked", () => {
    expect(() => defineModel({ ...QWEN, licence: "  " })).toThrow(/licence/);
  });

  it("refuses a model that will not say what hardware it needs", () => {
    expect(() => defineModel({ ...QWEN, vramGb: Number.NaN })).toThrow(/VRAM/);
    expect(() => defineModel({ ...QWEN, contextTokens: 0 })).toThrow(/context length/);
    expect(() => defineModel({ ...QWEN, quantisation: "" })).toThrow(/none/);
  });

  it("refuses to call a model deployed when nothing is serving it", () => {
    expect(() => defineModel({ ...QWEN, deployment: "deployed" })).toThrow(/no endpoint/);
  });

  it("refuses a score with no scale and no hardware behind it", () => {
    expect(() => defineModel({
      ...QWEN,
      evaluations: [{ suite: "code", score: 7, outOf: 0, at: NOW, on: "L4" }],
    })).toThrow(/scale/);
    expect(() => defineModel({
      ...QWEN,
      evaluations: [{ suite: "code", score: 7, outOf: 10, at: NOW, on: "" }],
    })).toThrow(/hardware/);
  });

  it("records where weights came from, and NN has trained none of them", () => {
    // Downloading open weights is not training a model. The field exists so
    // that distinction is written down rather than blurred in a summary.
    expect(QWEN.provenance).toBe("open-weights");
  });

  it("returns nothing — not a substitute — when it cannot serve a capability", () => {
    // The whole independence guarantee is here. There is no fallback branch
    // to a proprietary assistant because there is nothing else to return.
    const registry = new ModelRegistry();
    registry.register(QWEN);
    expect(registry.selectFor("chat")).toBeNull();
    expect(registry.selectFor("video")).toBeNull();
    expect(registry.servable("chat")).toEqual([]);
  });

  it("serves a model only when it is deployed, reachable and healthy", () => {
    const registry = new ModelRegistry();
    registry.register({
      ...QWEN,
      deployment: "deployed",
      endpoint: "https://inference.nn.internal/v1",
    });
    expect(registry.selectFor("chat")).toBeNull();      // health still unknown
    registry.setHealth(QWEN.id, "healthy");
    expect(registry.selectFor("chat")?.id).toBe(QWEN.id);
    registry.setHealth(QWEN.id, "unreachable");
    expect(registry.selectFor("chat")).toBeNull();
  });

  it("prefers the model that measured better, and an unmeasured one last", () => {
    const registry = new ModelRegistry();
    const base = { deployment: "deployed" as const, health: "healthy" as const,
      endpoint: "https://inference.nn.internal/v1" };
    registry.register({ ...QWEN, ...base });
    registry.register({
      ...QWEN, ...base, id: "deepseek/v3-code", family: "deepseek", version: "v3-code",
    });
    registry.recordEvaluation("deepseek/v3-code", {
      suite: "code", score: 8, outOf: 10, at: NOW, on: "1x L4 24GB",
    });
    expect(registry.selectFor("code")?.id).toBe("deepseek/v3-code");
  });

  it("refuses to register the same model twice", () => {
    const registry = new ModelRegistry();
    registry.register(QWEN);
    expect(() => registry.register(QWEN)).toThrow(RegistryError);
  });

  it("knows this machine cannot host it, on disk alone", () => {
    // Measured on the founder's machine on 2026-11-17: Intel HD 6000 with no
    // CUDA, 8 GB RAM, and 3.0 GB free. The report says this is a hard stop;
    // this is the hard stop.
    const here = { vramGb: 1.5, ramGb: 8, diskGb: 3 };
    const verdict = canHost(QWEN, here);
    expect(verdict.ok).toBe(false);
    if (!verdict.ok) expect(verdict.reason).toMatch(/VRAM/);

    const cpuOnly = { ...QWEN, vramGb: 0 };
    const onDisk = canHost(cpuOnly, here);
    expect(onDisk.ok).toBe(false);
    if (!onDisk.ok) expect(onDisk.reason).toMatch(/disk/);
  });

  it("allows a rented GPU that actually fits, with headroom", () => {
    expect(canHost(QWEN, { vramGb: 24, ramGb: 32, diskGb: 100 }).ok).toBe(true);
    // 16 GB of weights does not fit in 16 GB: the KV cache lives there too.
    expect(canHost(QWEN, { vramGb: 16, ramGb: 32, diskGb: 100 }).ok).toBe(false);
  });
});

/* ----------------------------------------------------------------- task -- */

describe("what REN is doing", () => {
  const task = () => new Task("t1", "Find out what the GPU would cost", NOW);

  it("will not start without recording what was actually asked", () => {
    expect(() => new Task("t1", "   ", NOW)).toThrow(/what was actually asked/);
  });

  it("refuses an illegal move loudly rather than ignoring it", () => {
    const t = task();
    expect(() => t.moveTo("executing", LATER)).toThrow(TaskError);
    expect(t.state).toBe("created");
  });

  it("cannot be completed without passing through verification", () => {
    // The acceptance test named in the architecture document. Reaching the
    // end of the work is not the same as the work having worked.
    const t = task();
    t.moveTo("understanding", NOW);
    t.moveTo("planning", NOW);
    t.moveTo("executing", NOW);
    expect(t.canMoveTo("completed")).toBe(false);
    expect(() => t.moveTo("completed", LATER)).toThrow(/cannot go from executing to completed/);
  });

  it("cannot be completed without what verification established", () => {
    const t = task();
    t.moveTo("understanding", NOW);
    t.moveTo("planning", NOW);
    t.moveTo("executing", NOW);
    t.moveTo("verifying", NOW);
    expect(() => t.moveTo("completed", LATER)).toThrow(/without what verification established/);

    t.moveTo("completed", LATER, {
      claim: verified("The quote is $0.80 an hour", { sources: [bbc, reuters] }),
    });
    expect(t.state).toBe("completed");
    expect(t.outcome?.kind).toBe("verified");
  });

  it("cannot fail or be cancelled without a reason", () => {
    const t = task();
    t.moveTo("understanding", NOW);
    expect(() => t.moveTo("failed", LATER)).toThrow(/without saying why/);
    t.moveTo("failed", LATER, { note: "No pricing page responded." });
    expect(t.journal.at(-1)?.note).toBe("No pricing page responded.");
  });

  it("is finished once it is finished", () => {
    const t = task();
    t.moveTo("cancelled", LATER, { note: "The founder changed their mind." });
    expect(isTerminal(t.state)).toBe(true);
    expect(() => t.moveTo("understanding", LATER)).toThrow(/finished task is finished/);
  });

  it("waits for approval, and executing is the only way out of it", () => {
    const t = task();
    t.moveTo("understanding", NOW);
    t.moveTo("planning", NOW);
    t.moveTo("waiting_for_approval", NOW);
    expect(t.canMoveTo("verifying")).toBe(false);
    expect(t.canMoveTo("executing")).toBe(true);
  });

  it("will not let verification be walked away from", () => {
    // Cancelling out of `verifying` would leave work done and unchecked,
    // which is the one state REN must never be able to report from.
    expect(TRANSITIONS.verifying).not.toContain("cancelled");
    expect(TRANSITIONS.verifying).toEqual(["completed", "failed"]);
  });

  it("survives a restart with its history intact", () => {
    const t = task();
    t.moveTo("understanding", NOW);
    t.moveTo("planning", LATER);
    const restored = Task.restore(t.snapshot);
    expect(restored.state).toBe("planning");
    expect(restored.journal).toHaveLength(3);
    expect(restored.request).toBe(t.request);
    restored.moveTo("executing", LATER);
    expect(restored.state).toBe("executing");
  });

  it("refuses a snapshot that never began", () => {
    expect(() => Task.restore({
      id: "x", request: "y", state: "executing", journal: [],
    })).toThrow(/no beginning/);
  });

  it("says what it is doing in the founder's words, not NN's", () => {
    expect(describeState("verifying")).toBe("Checking it actually worked.");
    expect(describeState("completed")).toBe("Done, and checked.");
  });
});
