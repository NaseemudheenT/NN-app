import { describe, expect, it } from "vitest";
import { parseInline, parseMarkdown, safeHref } from "./markdown";
import { REN_TOOLS, planFromToolCall } from "./tools";
import { availableProviders, geminiSchema } from "@/server/ren/providers";
import { systemPrompt } from "@/server/ren/prompt";
import { APPLICATIONS } from "@/lib/apps/registry";
import { CAPABILITIES } from "./capabilities";

describe("REN's Markdown", () => {
  it("keeps a fenced block whole, with its language", () => {
    const blocks = parseMarkdown("Before\n\n```ts\nconst a = 1;\n\nconst b = 2;\n```\n\nAfter");
    expect(blocks.map((b) => b.type)).toEqual(["p", "code", "p"]);
    const code = blocks[1];
    expect(code).toMatchObject({ type: "code", language: "ts" });
    // The blank line inside the fence is part of the code, not a paragraph break.
    expect(code?.type === "code" ? code.text : "").toBe("const a = 1;\n\nconst b = 2;");
  });

  it("treats an unclosed fence as code to the end", () => {
    // A model cut off mid-block was writing code. Showing the rest as prose
    // reflows it and destroys the indentation.
    const blocks = parseMarkdown("```py\ndef f():\n    return 1");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: "code", language: "py" });
  });

  it("reads bold before emphasis, so ** is never two empty *", () => {
    expect(parseInline("a **bold** b")).toEqual([
      { type: "text", text: "a " },
      { type: "strong", text: "bold" },
      { type: "text", text: " b" },
    ]);
  });

  it("does not look inside inline code for other syntax", () => {
    expect(parseInline("`a*b*c`")).toEqual([{ type: "code", text: "a*b*c" }]);
  });

  it("groups consecutive list items into one list", () => {
    const blocks = parseMarkdown("- one\n- two\n- three");
    expect(blocks).toHaveLength(1);
    const list = blocks[0];
    expect(list).toMatchObject({ type: "list", ordered: false });
    expect(list?.type === "list" ? list.items : []).toHaveLength(3);
  });

  it("refuses a link scheme that could run something", () => {
    // REN's text comes from a model that reads the founder's own documents.
    expect(safeHref("https://example.com")).toBe("https://example.com");
    expect(safeHref("/home")).toBe("/home");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("  JavaScript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,<script>")).toBeNull();
  });

  it("never produces an HTML string for markup in the source", () => {
    const parts = parseInline("<img src=x onerror=alert(1)>");
    // One text node, carrying the characters. Nothing is interpreted.
    expect(parts).toEqual([{ type: "text", text: "<img src=x onerror=alert(1)>" }]);
  });
});

describe("REN's tools", () => {
  it("offers only capabilities NN can actually run", () => {
    // Every tool resolves to a real plan. A name here that NN cannot run is a
    // model confidently reaching for a hand that is not there.
    for (const tool of REN_TOOLS) {
      const required = (tool.schema["required"] as string[]) ?? [];
      const args: Record<string, unknown> = {};
      // Fill each required argument with the first value the schema allows,
      // so the call is well-formed and only the *name* is under test.
      const properties = tool.schema["properties"] as Record<string, { enum?: string[] }>;
      for (const key of required) {
        const choices = properties[key]?.enum;
        args[key] = choices ? choices[0] : "something";
      }
      const result = planFromToolCall(tool.name, args);
      expect(result.ok, `${tool.name} is offered but does not resolve to a plan`).toBe(true);
    }
  });

  it("offers every capability NN can run, so none is unreachable", () => {
    // The inverse, and the one that was failing silently: `complete` and
    // `discard` were implemented, confirmed and executed — and exposed
    // nowhere, so no model could ever call them. A capability with no tool
    // is dead code that looks like a feature.
    const reachable = new Set(
      REN_TOOLS.flatMap((tool) => {
        const properties = tool.schema["properties"] as Record<string, { enum?: string[] }>;
        const args: Record<string, unknown> = {};
        for (const key of (tool.schema["required"] as string[]) ?? []) {
          const choices = properties[key]?.enum;
          args[key] = choices ? choices[0] : "something";
        }
        const result = planFromToolCall(tool.name, args);
        return result.ok ? [result.plan.capability] : [];
      }),
    );
    for (const id of Object.keys(CAPABILITIES)) {
      expect(reachable.has(id as never), `no tool reaches the "${id}" capability`).toBe(true);
    }
  });

  it("names every real application, so a model cannot invent a destination", () => {
    const open = REN_TOOLS.find((t) => t.name === "open_application");
    const properties = open?.schema["properties"] as Record<string, { enum?: string[] }>;
    expect(properties["appId"]?.enum).toHaveLength(APPLICATIONS.length);
  });

  it("turns a well-formed call into a plan", () => {
    const made = planFromToolCall("open_application", { appId: "finance" });
    expect(made.ok).toBe(true);
    expect(made.ok && made.plan).toMatchObject({ capability: "open", consequence: "none" });
  });

  it("refuses an application that does not exist, in a sentence REN can read out", () => {
    const made = planFromToolCall("open_application", { appId: "crypto-casino" });
    expect(made.ok).toBe(false);
    expect(made.ok === false && made.why).toContain("crypto-casino");
  });

  it("refuses a tool NN does not have", () => {
    expect(planFromToolCall("send_email", { to: "x" }).ok).toBe(false);
  });

  it("will not write a record with no title", () => {
    expect(planFromToolCall("capture_record", { collection: "tasks" }).ok).toBe(false);
  });

  it("can write the six things the founder asks for most", () => {
    // Life and Files declare their collections on the registry entry rather
    // than in APP_SECTIONS. Deriving the list from sections alone left REN
    // unable to add a task — which is the first thing anyone would ask it.
    const capture = REN_TOOLS.find((t) => t.name === "capture_record");
    const properties = capture?.schema["properties"] as Record<string, { enum?: string[] }>;
    const collections = properties["collection"]?.enum ?? [];
    for (const name of ["tasks", "calendar_events", "reminders", "notes", "goals", "documents"]) {
      expect(collections, name).toContain(name);
    }
  });

  it("marks writing as writing, so NN knows to ask first", () => {
    const made = planFromToolCall("capture_record", { collection: "tasks", title: "Call the bank" });
    expect(made.ok && made.plan.consequence).toBe("writes");
  });
});

describe("the shape Gemini will accept", () => {
  it("drops additionalProperties, which Gemini rejects outright", () => {
    // Verified against the live API on 2026-11-20: sending it produces
    // `Unknown name "additionalProperties"` and a flat 400, so REN could
    // talk but could not act — the worse half to lose.
    const cleaned = geminiSchema({
      type: "object",
      properties: { appId: { type: "string", enum: ["finance"] } },
      required: ["appId"],
      additionalProperties: false,
    }) as Record<string, unknown>;
    expect(cleaned).not.toHaveProperty("additionalProperties");
    expect(cleaned).toMatchObject({ type: "object", required: ["appId"] });
  });

  it("strips it at every depth, not just the top", () => {
    const cleaned = JSON.stringify(geminiSchema({
      type: "object",
      properties: {
        nested: { type: "object", properties: {}, additionalProperties: false },
        list: { type: "array", items: { type: "object", additionalProperties: false } },
      },
    }));
    expect(cleaned).not.toContain("additionalProperties");
  });

  it("keeps everything Gemini does understand", () => {
    const cleaned = geminiSchema({
      type: "object",
      properties: { text: { type: "string", description: "What to search for." } },
      required: ["text"],
    });
    expect(cleaned).toEqual({
      type: "object",
      properties: { text: { type: "string", description: "What to search for." } },
      required: ["text"],
    });
  });

  it("leaves NN's real tools callable after cleaning", () => {
    for (const tool of REN_TOOLS) {
      const cleaned = JSON.stringify(geminiSchema(tool.schema));
      expect(cleaned, tool.name).not.toContain("additionalProperties");
      // The enumerations are the whole reason a model cannot invent a
      // destination; losing them to over-eager stripping would be worse.
      const original = JSON.stringify(tool.schema);
      if (original.includes('"enum"')) expect(cleaned, tool.name).toContain('"enum"');
    }
  });

  it("does not strip the keyword from the other providers", () => {
    // Anthropic and OpenAI both honour it, and it is what stops them
    // inventing an argument NN has no field for.
    const anthropicTool = REN_TOOLS.find((t) => t.name === "capture_record");
    expect(JSON.stringify(anthropicTool?.schema)).toContain("additionalProperties");
  });
});

describe("REN's model gateway", () => {
  it("reports nothing configured when no key is set", () => {
    expect(availableProviders({})).toEqual([]);
  });

  it("ignores a key that is obviously a placeholder", () => {
    expect(availableProviders({ ANTHROPIC_API_KEY: "  " })).toEqual([]);
    expect(availableProviders({ OPENAI_API_KEY: "todo" })).toEqual([]);
  });

  it("returns a label and a model, and never any part of the key", () => {
    const found = availableProviders({
      ANTHROPIC_API_KEY: "sk-ant-not-a-real-key-0000",
    });
    expect(found).toEqual([{ id: "anthropic", label: "Claude", model: "claude-opus-5" }]);
    expect(JSON.stringify(found)).not.toContain("sk-ant");
  });

  it("takes the Gemini key under any of the names Google uses for it", () => {
    // Google's docs say GEMINI_API_KEY in some places and GOOGLE_API_KEY in
    // others, and NN's own .env.example shipped GOOGLE_AI_API_KEY. Three
    // plausible names, one of which worked, and no error from the other two
    // — just a REN that stayed dead.
    for (const name of ["GOOGLE_API_KEY", "GOOGLE_AI_API_KEY", "GEMINI_API_KEY"]) {
      const found = availableProviders({ [name]: "AIza-not-a-real-key-000000" });
      expect(found.map((p) => p.id), name).toEqual(["google"]);
    }
  });

  it("still ignores a placeholder set under an alias", () => {
    expect(availableProviders({ GOOGLE_AI_API_KEY: "todo" })).toEqual([]);
    expect(availableProviders({ GEMINI_API_KEY: "   " })).toEqual([]);
  });

  it("lets the deployment choose the model without a code change", () => {
    const found = availableProviders({
      ANTHROPIC_API_KEY: "sk-ant-not-a-real-key-0000",
      ANTHROPIC_MODEL: "claude-sonnet-5",
    });
    expect(found[0]?.model).toBe("claude-sonnet-5");
  });
});

describe("REN's brief", () => {
  it("tells REN where the founder is", () => {
    expect(systemPrompt({ route: "/finance" })).toContain("/finance");
  });

  it("holds REN to the founder's hardest rule", () => {
    const prompt = systemPrompt({ route: "/home" });
    expect(prompt).toContain("Never say you have done something unless a tool result confirmed it");
    expect(prompt).toContain("You cannot predict the future");
  });

  it("lists every application, so REN knows what NN holds", () => {
    const prompt = systemPrompt({ route: "/home" });
    for (const app of APPLICATIONS) expect(prompt, app.name).toContain(app.name);
  });
});
