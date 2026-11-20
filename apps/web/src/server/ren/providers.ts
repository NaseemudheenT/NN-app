/**
 * REN's model gateway.
 *
 * One shape in, one shape out, whichever company's model is answering. NN is
 * the founder's environment for life; the vendor behind REN's language is an
 * implementation detail that must be replaceable without touching a single
 * line of the interface.
 *
 * Three rules this file exists to keep:
 *
 * 1. **Keys never leave the server.** Nothing here is importable from the
 *    browser — the route handler is the only caller — and no key, or any
 *    prefix of one, is ever returned, logged or put in an error message.
 * 2. **No vendor SDKs.** Plain `fetch` against documented HTTP endpoints.
 *    Three SDKs would be three supply chains and three release cadences for
 *    what is, in each case, one POST and a stream of lines.
 * 3. **Honest unavailability.** With no key configured REN says exactly that
 *    rather than failing in a way that looks like the model refused.
 *
 * Adding a provider means adding one entry to {@link PROVIDERS}. Nothing else
 * in NN knows which one answered.
 */

export type ProviderId = "anthropic" | "openai" | "google";

/** A part of a message. Images are data URLs or raw base64 with a media type. */
export type Part =
  | { type: "text"; text: string }
  | { type: "image"; mediaType: string; data: string }
  | { type: "document"; mediaType: string; data: string; name: string };

export interface Message {
  role: "user" | "assistant";
  parts: Part[];
}

/** A function REN may ask NN to run. The model never runs anything itself. */
export interface ToolSpec {
  name: string;
  description: string;
  /** JSON Schema for the arguments. */
  schema: Record<string, unknown>;
}

/** What the gateway emits, in order, while an answer is being produced. */
export type Chunk =
  | { type: "text"; text: string }
  /** The model is asking NN to run a tool. NN decides whether to. */
  | { type: "tool"; id: string; name: string; args: Record<string, unknown> }
  | { type: "done"; stop: "end" | "tool" | "length" }
  | { type: "error"; message: string };

export interface AskOptions {
  system: string;
  messages: Message[];
  tools?: ToolSpec[];
  /** Hard ceiling on the answer, in tokens. */
  maxTokens?: number;
  signal?: AbortSignal | undefined;
}

interface Provider {
  id: ProviderId;
  label: string;
  /** The env var holding this provider's key. Its *name*, never its value. */
  keyVar: string;
  /** Other names the same key is commonly set under. */
  keyAliases?: readonly string[];
  modelVar: string;
  defaultModel: string;
  ask: (key: string, model: string, options: AskOptions) => Promise<Response>;
  parse: (line: string, state: ParseState) => Chunk[];
}

/** Carried across lines of one stream, because tool arguments arrive split. */
export interface ParseState {
  tool?: { id: string; name: string; json: string } | undefined;
  tools: Map<number, { id: string; name: string; json: string }>;
}

export function newParseState(): ParseState {
  return { tools: new Map() };
}

/* ------------------------------------------------------------- anthropic -- */

const anthropic: Provider = {
  id: "anthropic",
  label: "Claude",
  keyVar: "ANTHROPIC_API_KEY",
  modelVar: "ANTHROPIC_MODEL",
  defaultModel: "claude-opus-5",
  ask: (key, model, options) =>
    fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      ...(options.signal ? { signal: options.signal } : {}),
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 4096,
        stream: true,
        system: options.system,
        ...(options.tools?.length
          ? {
              tools: options.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.schema,
              })),
            }
          : {}),
        messages: options.messages.map((message) => ({
          role: message.role,
          content: message.parts.map((part) =>
            part.type === "text"
              ? { type: "text", text: part.text }
              : part.type === "image"
                ? {
                    type: "image",
                    source: { type: "base64", media_type: part.mediaType, data: part.data },
                  }
                : {
                    type: "document",
                    source: { type: "base64", media_type: part.mediaType, data: part.data },
                  },
          ),
        })),
      }),
    }),
  parse: (line, state) => {
    const event = json(line);
    if (!event) return [];
    const type = str(event, "type");
    if (type === "content_block_start") {
      const block = obj(event, "content_block");
      if (block && str(block, "type") === "tool_use") {
        state.tool = { id: str(block, "id") ?? "", name: str(block, "name") ?? "", json: "" };
      }
      return [];
    }
    if (type === "content_block_delta") {
      const delta = obj(event, "delta");
      if (!delta) return [];
      const text = str(delta, "text");
      if (text !== undefined) return [{ type: "text", text }];
      const partial = str(delta, "partial_json");
      if (partial !== undefined && state.tool) state.tool.json += partial;
      return [];
    }
    if (type === "content_block_stop" && state.tool) {
      const tool = state.tool;
      state.tool = undefined;
      return [{ type: "tool", id: tool.id, name: tool.name, args: args(tool.json) }];
    }
    if (type === "message_delta") {
      const reason = str(obj(event, "delta") ?? {}, "stop_reason");
      if (reason === "tool_use") return [{ type: "done", stop: "tool" }];
      if (reason === "max_tokens") return [{ type: "done", stop: "length" }];
      return [];
    }
    if (type === "message_stop") return [{ type: "done", stop: "end" }];
    if (type === "error") {
      return [{ type: "error", message: str(obj(event, "error") ?? {}, "message") ?? "The model failed." }];
    }
    return [];
  },
};

/* ---------------------------------------------------------------- openai -- */

const openai: Provider = {
  id: "openai",
  label: "ChatGPT",
  keyVar: "OPENAI_API_KEY",
  modelVar: "OPENAI_MODEL",
  defaultModel: "gpt-4o",
  ask: (key, model, options) =>
    fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      ...(options.signal ? { signal: options.signal } : {}),
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 4096,
        stream: true,
        ...(options.tools?.length
          ? {
              tools: options.tools.map((tool) => ({
                type: "function",
                function: { name: tool.name, description: tool.description, parameters: tool.schema },
              })),
            }
          : {}),
        messages: [
          { role: "system", content: options.system },
          ...options.messages.map((message) => ({
            role: message.role,
            content: message.parts.map((part) =>
              part.type === "text"
                ? { type: "text", text: part.text }
                : {
                    type: "image_url",
                    image_url: { url: `data:${part.mediaType};base64,${part.data}` },
                  },
            ),
          })),
        ],
      }),
    }),
  parse: (line, state) => {
    if (line === "[DONE]") {
      // Any tool calls finish here: OpenAI streams their arguments in pieces
      // and never says a given call is complete, only that the turn is.
      const out: Chunk[] = [];
      for (const call of state.tools.values()) {
        out.push({ type: "tool", id: call.id, name: call.name, args: args(call.json) });
      }
      state.tools.clear();
      out.push({ type: "done", stop: out.length > 0 ? "tool" : "end" });
      return out;
    }
    const event = json(line);
    if (!event) return [];
    const choice = (arr(event, "choices") ?? [])[0];
    if (!choice) return [];
    const delta = obj(choice, "delta");
    if (!delta) return [];
    const out: Chunk[] = [];
    const text = str(delta, "content");
    if (text) out.push({ type: "text", text });
    for (const call of arr(delta, "tool_calls") ?? []) {
      const index = num(call, "index") ?? 0;
      const fn = obj(call, "function") ?? {};
      const existing = state.tools.get(index) ?? { id: "", name: "", json: "" };
      state.tools.set(index, {
        id: str(call, "id") ?? existing.id,
        name: str(fn, "name") ?? existing.name,
        json: existing.json + (str(fn, "arguments") ?? ""),
      });
    }
    return out;
  },
};

/* ---------------------------------------------------------------- google -- */

/**
 * A tool schema Gemini will actually accept.
 *
 * Google's function declarations take a *subset* of JSON Schema — an OpenAPI
 * 3 flavour — and reject anything outside it outright rather than ignoring
 * it. `additionalProperties: false` is the one NN hits: every tool schema
 * carries it, correctly, because it is what stops Anthropic and OpenAI
 * inventing an argument that does not exist. Sent to Gemini it produces
 *
 *   Invalid JSON payload received. Unknown name "additionalProperties"
 *
 * and a flat 400 — so REN could hold a conversation but could not do
 * anything, which is the worse half to lose.
 *
 * Stripped here rather than at the tool definitions, because this is a
 * vendor difference and this file exists to resolve those before anything
 * leaves it. The other providers keep the keyword and keep the guarantee.
 */
const GEMINI_REJECTS = new Set([
  "additionalProperties", "$schema", "$id", "$ref", "definitions",
  "const", "examples", "default", "exclusiveMinimum", "exclusiveMaximum",
]);

export function geminiSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(geminiSchema);
  if (value === null || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    if (GEMINI_REJECTS.has(key)) continue;
    out[key] = geminiSchema(inner);
  }
  return out;
}



const google: Provider = {
  id: "google",
  label: "Gemini",
  keyVar: "GOOGLE_API_KEY",
  /*
   * Google's own documentation uses GEMINI_API_KEY in some places and
   * GOOGLE_API_KEY in others, and NN's own `.env.example` shipped
   * GOOGLE_AI_API_KEY — so the founder had three plausible names and only
   * one of them worked, silently. A key pasted into any of them is the same
   * key; refusing two of the three teaches nothing and costs an evening.
   */
  keyAliases: ["GOOGLE_AI_API_KEY", "GEMINI_API_KEY"],
  modelVar: "GOOGLE_MODEL",
  /*
   * Verified against the live model list on 2026-11-20, because the previous
   * default was not: `gemini-2.0-flash` answers 404 "no longer available",
   * and `gemini-2.5-flash` answers 404 "no longer available to new users".
   * REN would have failed on its first word with a key that was perfectly
   * good. Model ids retire; this one is checked, does tool calls, and
   * streams. `GOOGLE_MODEL` overrides it without a code change.
   */
  defaultModel: "gemini-3.5-flash-lite",
  ask: (key, model, options) =>
    fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        ...(options.signal ? { signal: options.signal } : {}),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: options.system }] },
          generationConfig: { maxOutputTokens: options.maxTokens ?? 4096 },
          ...(options.tools?.length
            ? {
                tools: [
                  {
                    functionDeclarations: options.tools.map((tool) => ({
                      name: tool.name,
                      description: tool.description,
                      parameters: geminiSchema(tool.schema),
                    })),
                  },
                ],
              }
            : {}),
          contents: options.messages.map((message) => ({
            role: message.role === "assistant" ? "model" : "user",
            parts: message.parts.map((part) =>
              part.type === "text"
                ? { text: part.text }
                : { inlineData: { mimeType: part.mediaType, data: part.data } },
            ),
          })),
        }),
      },
    ),
  parse: (line) => {
    const event = json(line);
    if (!event) return [];
    const candidate = (arr(event, "candidates") ?? [])[0];
    if (!candidate) return [];
    const out: Chunk[] = [];
    for (const part of arr(obj(candidate, "content") ?? {}, "parts") ?? []) {
      const text = str(part, "text");
      if (text) out.push({ type: "text", text });
      const call = obj(part, "functionCall");
      if (call) {
        out.push({
          type: "tool",
          id: `${str(call, "name") ?? "tool"}-${out.length}`,
          name: str(call, "name") ?? "",
          args: (obj(call, "args") ?? {}) as Record<string, unknown>,
        });
      }
    }
    const reason = str(candidate, "finishReason");
    if (reason) {
      out.push({ type: "done", stop: reason === "MAX_TOKENS" ? "length" : "end" });
    }
    return out;
  },
};

export const PROVIDERS: readonly Provider[] = [anthropic, openai, google];

/* ----------------------------------------------------------------- shape -- */
/* Small readers so a malformed line from a provider can never throw inside
   the stream. A stream that dies mid-answer looks to the founder like REN
   stopped talking, which is the one failure mode worth this much care. */

function json(line: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(line);
    return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
function str(o: Record<string, unknown>, k: string): string | undefined {
  const v = o[k];
  return typeof v === "string" ? v : undefined;
}
function num(o: Record<string, unknown>, k: string): number | undefined {
  const v = o[k];
  return typeof v === "number" ? v : undefined;
}
function obj(o: Record<string, unknown>, k: string): Record<string, unknown> | undefined {
  const v = o[k];
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}
function arr(o: Record<string, unknown>, k: string): Record<string, unknown>[] | undefined {
  const v = o[k];
  return Array.isArray(v) ? (v.filter((e) => e !== null && typeof e === "object") as Record<string, unknown>[]) : undefined;
}
function args(text: string): Record<string, unknown> {
  const parsed = json(text.trim() === "" ? "{}" : text);
  return parsed ?? {};
}

/* -------------------------------------------------------------- selection -- */

/** Only what this file reads: names to values. Not the whole process. */
export type Env = Record<string, string | undefined>;

export interface Available {
  id: ProviderId;
  label: string;
  model: string;
}

/**
 * Which providers this deployment can actually reach.
 *
 * Returns labels and model names only — never a key, and never whether a key
 * is *almost* right. The sign-in screen learned the same lesson: a caller may
 * know that a capability exists, never anything about the secret behind it.
 */

/**
 * The key for a provider, under whichever name it was set.
 *
 * Returns the trimmed value, or null when nothing usable is configured. The
 * length floor catches the placeholder case — an empty string, a stray
 * "todo" — which otherwise produces a confident request and a 401.
 */
function keyFor(provider: Provider, env: Env): string | null {
  for (const name of [provider.keyVar, ...(provider.keyAliases ?? [])]) {
    const value = env[name];
    if (typeof value === "string" && value.trim().length >= 8) return value.trim();
  }
  return null;
}

export function availableProviders(env: Env = process.env): Available[] {
  const out: Available[] = [];
  for (const provider of PROVIDERS) {
    const key = keyFor(provider, env);
    if (key === null) continue;
    out.push({
      id: provider.id,
      label: provider.label,
      model: env[provider.modelVar]?.trim() || provider.defaultModel,
    });
  }
  return out;
}

export function providerById(id: ProviderId): Provider | undefined {
  return PROVIDERS.find((provider) => provider.id === id);
}

/**
 * Ask a provider, and emit NN's own chunk shape.
 *
 * The caller gets an async iterable it can forward straight to the browser;
 * every vendor difference — event names, where tool arguments accumulate,
 * how a turn ends — is resolved before anything leaves this file.
 */
export async function* ask(
  id: ProviderId,
  options: AskOptions,
  env: Env = process.env,
): AsyncGenerator<Chunk> {
  const provider = providerById(id);
  if (!provider) {
    yield { type: "error", message: "No such model provider." };
    return;
  }
  const key = keyFor(provider, env);
  if (key === null) {
    yield { type: "error", message: `${provider.label} is not configured on this deployment.` };
    return;
  }
  const model = env[provider.modelVar]?.trim() || provider.defaultModel;

  let response: Response;
  try {
    response = await provider.ask(key.trim(), model, options);
  } catch (error) {
    // Never the raw error: a fetch failure can carry the request headers.
    console.error(`REN: ${provider.label} could not be reached.`, (error as Error)?.name);
    yield { type: "error", message: `${provider.label} could not be reached.` };
    return;
  }

  if (!response.ok || !response.body) {
    // The body may name the account. Status is enough for the founder to act.
    console.error(`REN: ${provider.label} answered ${response.status}.`);
    yield {
      type: "error",
      message:
        response.status === 401 || response.status === 403
          ? `${provider.label} rejected this deployment's key.`
          : response.status === 429
            ? `${provider.label} is rate limiting NN. Try again shortly.`
            : `${provider.label} answered ${response.status}.`,
    };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const state = newParseState();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let cut = buffer.indexOf("\n");
    while (cut !== -1) {
      const line = buffer.slice(0, cut).trim();
      buffer = buffer.slice(cut + 1);
      cut = buffer.indexOf("\n");
      if (!line.startsWith("data:")) continue;
      for (const chunk of provider.parse(line.slice(5).trim(), state)) yield chunk;
    }
  }
}
