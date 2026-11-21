import { describe, expect, it } from "vitest";
import { understand } from "./understand";
import { APP_SECTIONS } from "@/lib/apps/sections";
import { APPLICATIONS } from "@/lib/apps/registry";

/**
 * REN's ear.
 *
 * These are the sentences the founder would actually say. The point of each
 * one is not that a regular expression matched — it is that what came out is
 * a plan REN can carry out against something that exists.
 */

function planOf(said: string) {
  const out = understand(said);
  if (out.kind !== "plan") throw new Error(`"${said}" did not produce a plan: ${out.kind}`);
  return out.plan;
}

describe("opening things", () => {
  it("opens an application by name alone", () => {
    expect(planOf("Finance")).toMatchObject({ capability: "open", args: { appId: "finance" } });
  });

  it("understands every way of asking to open one", () => {
    for (const said of [
      "open finance", "go to finance", "take me to finance",
      "show me finance", "launch finance", "switch to finance",
    ]) {
      expect(planOf(said), said).toMatchObject({ capability: "open", args: { appId: "finance" } });
    }
  });

  it("ignores politeness and filler", () => {
    for (const said of ["hey ren, open finance", "please open finance", "can you open finance", "REN, open Finance."]) {
      expect(planOf(said), said).toMatchObject({ capability: "open", args: { appId: "finance" } });
    }
  });

  it("asks rather than guessing when no such application exists", () => {
    const out = understand("open spreadsheets");
    expect(out.kind).toBe("question");
  });

  it("can reach every one of the 34 applications by its own name", () => {
    for (const app of APPLICATIONS) {
      const out = understand(`open ${app.name}`);
      expect(out.kind, app.name).toBe("plan");
      if (out.kind === "plan") expect(out.plan.args.appId, app.name).toBe(app.id);
    }
  });
});

describe("capturing", () => {
  it("files a task under Life and keeps only the title", () => {
    const p = planOf("add a task to call the bank");
    expect(p.capability).toBe("capture");
    expect(p.args.title).toBe("Call the bank");
    expect(p.args.collection).toBeTruthy();
  });

  it("files it under tasks rather than interrogating the founder", () => {
    /*
     * This reverses an earlier decision, deliberately.
     *
     * REN used to ask "Where should \"Buy milk\" go?" and offer "Life,
     * Finance · Transactions, Files" — a question that requires the founder
     * to know NN's collection taxonomy in order to write down milk. The
     * evaluation suite scored it as the failure it is.
     *
     * The old rule was there to stop REN "filing it somewhere plausible",
     * and that fear assumed filing happens unseen. It does not: the plan is
     * shown with its destination and waits for approval — the founder reads
     * "Add \"Buy milk\" to Life · Tasks" and taps Do it or No. A wrong
     * default costs one tap; the question cost every capture.
     */
    const out = understand("add buy milk");
    expect(out.kind).toBe("plan");
    if (out.kind === "plan") {
      expect(out.plan.capability).toBe("capture");
      expect(out.plan.args.collection).toBe("tasks");
      // Still shown and still confirmed — which is what makes the default safe.
      expect(out.plan.consequence).toBe("writes");
      expect(out.plan.summary).toContain("Tasks");
    }
  });

  it("still asks when the verb says a place but the words name nothing", () => {
    // The default is for real titles. "add something" would store a record
    // called "Something" — obedience without comprehension.
    for (const phrase of ["add something", "note this", "remember it"]) {
      expect(understand(phrase).kind, phrase).toBe("question");
    }
  });

  it("sends a note to notes, because the verb already said where", () => {
    const out = understand("note buy milk");
    expect(out.kind).toBe("plan");
    if (out.kind === "plan") expect(out.plan.args.collection).toBe("notes");
  });

  it("asks what, when told only where", () => {
    const out = understand("add");
    expect(out.kind).toBe("question");
  });

  it("writes into a collection some application really owns", () => {
    const owned = new Set(
      Object.values(APP_SECTIONS).flatMap((s) => s.map((x) => x.collection)),
    );
    const p = planOf("note a reflection to Soul");
    expect(owned.has(p.args.collection ?? "")).toBe(true);
  });

  it("declares that capturing changes something", () => {
    expect(planOf("add a task to call the bank").consequence).toBe("writes");
  });
});

describe("searching and reporting", () => {
  it("searches for what was asked", () => {
    expect(planOf("find the lease")).toMatchObject({ capability: "find", args: { text: "the lease" } });
  });

  it("reports on the day", () => {
    for (const said of ["what's on today", "brief me", "catch me up", "status"]) {
      expect(planOf(said).capability, said).toBe("report");
    }
  });
});

describe("appearance", () => {
  it("rethemes NN", () => {
    expect(planOf("make NN darker")).toMatchObject({ capability: "appearance", args: { appearance: "dark" } });
    expect(planOf("switch to light theme")).toMatchObject({ capability: "appearance", args: { appearance: "light" } });
    expect(planOf("make it calm")).toMatchObject({ capability: "appearance", args: { appearance: "calm" } });
  });

  it("costs nothing, so it is never confirmed", () => {
    expect(planOf("make NN darker").consequence).toBe("none");
  });
});

describe("what REN will not pretend", () => {
  it("says it did not understand, rather than answering anyway", () => {
    const out = understand("write me a poem about the sea");
    expect(out.kind).toBe("unknown");
  });

  it("treats an empty instruction as nothing heard", () => {
    expect(understand("   ").kind).toBe("unknown");
  });

  it("describes only what it can really do", () => {
    const out = understand("what can you do");
    expect(out.kind).toBe("answer");
    if (out.kind === "answer") {
      expect(out.text).toContain("34");
      expect(out.text).toMatch(/ask/);
    }
  });
});

/* -------------------------------------------- completing and discarding -- */

describe("finishing and removing things", () => {
  /**
   * `complete` and `discard` were implemented, confirmed, executed — and
   * unreachable. No tool exposed them to a model and no phrase reached them
   * from speech, so two of REN's seven capabilities were dead code that
   * looked like features. These are the words a founder would actually use.
   */

  it("marks something as done", () => {
    const result = understand("mark the bank task as done");
    expect(result.kind).toBe("plan");
    if (result.kind !== "plan") return;
    expect(result.plan.capability).toBe("complete");
    // The article and the trailing "as done" are grammar, not the title.
    // Capitalised by `titleFrom`; the resolver lowercases both sides, so the
    // case here is presentation, not matching.
    expect(result.plan.args.title).toBe("Bank");
  });

  it("takes the other ways of saying it", () => {
    for (const phrase of ["complete the bank task", "finish the bank task", "tick off the bank task"]) {
      const result = understand(phrase);
      expect(result.kind, phrase).toBe("plan");
      if (result.kind === "plan") expect(result.plan.capability, phrase).toBe("complete");
    }
  });

  it("deletes something, and calls it sensitive", () => {
    const result = understand("delete the bank task");
    expect(result.kind).toBe("plan");
    if (result.kind !== "plan") return;
    expect(result.plan.capability).toBe("discard");
    // A delete is re-authenticated by the device, not merely confirmed.
    expect(result.plan.consequence).toBe("sensitive");
  });

  it("takes the other ways of saying that too", () => {
    for (const phrase of ["remove the bank task", "get rid of the bank task", "throw away the bank task"]) {
      const result = understand(phrase);
      expect(result.kind, phrase).toBe("plan");
      if (result.kind === "plan") expect(result.plan.capability, phrase).toBe("discard");
    }
  });

  it("asks which one rather than guessing when nothing is named", () => {
    const result = understand("delete");
    expect(result.kind).toBe("question");
  });

  it("assumes tasks, because that is what this is nearly always about", () => {
    const result = understand("complete call the bank");
    if (result.kind !== "plan") throw new Error("expected a plan");
    expect(result.plan.args.collection).toBe("tasks");
  });

  it("still adds a note rather than reading 'note' as something to finish", () => {
    // "note" is both a capture verb and a word for the thing being completed.
    const result = understand("note buy milk");
    if (result.kind === "plan") expect(result.plan.capability).toBe("capture");
  });
});

/* ------------------------------------------------------------------ voice -- */

describe("changing REN's voice", () => {
  it("hears a request for a male voice", () => {
    for (const said of ["change to a male voice", "speak in a male voice", "use a man's voice"]) {
      const out = understand(said);
      expect(out.kind, said).toBe("plan");
      if (out.kind === "plan") {
        expect(out.plan.capability, said).toBe("voice");
        expect(out.plan.args.voice, said).toBe("male");
      }
    }
  });

  it("hears a request for a female voice, and does not read it as male", () => {
    // "female" contains "male". The order of the checks is the whole test.
    for (const said of ["change to a female voice", "speak in a female voice"]) {
      const out = understand(said);
      expect(out.kind, said).toBe("plan");
      if (out.kind === "plan") expect(out.plan.args.voice, said).toBe("female");
    }
  });

  it("gives the device its own voice back", () => {
    const out = understand("use the default voice");
    if (out.kind !== "plan") throw new Error("expected a plan");
    expect(out.plan.args.voice).toBe("system");
  });

  it("asks which one when the founder only says 'change your voice'", () => {
    expect(understand("change your voice").kind).toBe("question");
  });

  it("does not confuse a voice with a theme", () => {
    // Both start with "change to a…"; the noun is what separates them.
    const theme = understand("change to a dark theme");
    if (theme.kind === "plan") expect(theme.plan.capability).toBe("appearance");
    const voice = understand("change to a male voice");
    if (voice.kind === "plan") expect(voice.plan.capability).toBe("voice");
  });

  it("costs nothing, so it is never held for confirmation", () => {
    const out = understand("speak in a female voice");
    if (out.kind === "plan") expect(out.plan.consequence).toBe("none");
  });
});
