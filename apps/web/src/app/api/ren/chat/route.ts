import { NextResponse, type NextRequest } from "next/server";
import { callerUid } from "@/server/auth/session";
import { adminConfigured } from "@/server/admin";
import { systemPrompt } from "@/server/ren/prompt";
import { ask, availableProviders, type Message, type Part, type ProviderId } from "@/server/ren/providers";
import { REN_TOOLS, toolsForSpecialist } from "@/lib/ren/tools";
import { specialistForRoute, specialistInstructions } from "@/lib/ren/specialists";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/* Long answers are the normal case, not the exception. */
export const maxDuration = 120;

/**
 * REN's language.
 *
 * The browser sends a conversation; this streams back an answer, and any
 * tools REN wants NN to run. The founder's session is required: REN is one
 * person's intelligence and this endpoint is one person's endpoint.
 *
 * Tools are *proposed* here and *executed* in the browser, as the founder.
 * That is deliberate. If NN ran REN's tools on the server it would need
 * privileges the founder's own session does not have, and the Firestore
 * rules would stop being the real boundary. REN gets the founder's hands,
 * never a master key.
 */

/** Roughly 12 MB of base64 — several photographs, or a long document. */
const MAX_BODY = 12 * 1024 * 1024;
/** Enough history to be useful without resending a whole day every turn. */
const MAX_MESSAGES = 40;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const uid = adminConfigured() ? await callerUid(request) : null;
  if (!uid) return NextResponse.json({ providers: [] }, { status: 401 });
  // Labels and model names only. Never a key, and never a hint about one.
  return NextResponse.json({ providers: availableProviders() });
}

export async function POST(request: NextRequest): Promise<Response> {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "NN has no server credentials." }, { status: 503 });
  }
  const uid = await callerUid(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY) {
    return NextResponse.json({ error: "That is too large for one message." }, { status: 413 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Unreadable request." }, { status: 400 });
  }
  if (body === null || typeof body !== "object") {
    return NextResponse.json({ error: "Unreadable request." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;

  const available = availableProviders();
  if (available.length === 0) {
    return NextResponse.json(
      {
        error:
          "No model provider is configured on this deployment, so REN has no language yet. " +
          "Add GOOGLE_API_KEY, ANTHROPIC_API_KEY or OPENAI_API_KEY to NN's environment. "
          + "A Gemini key from aistudio.google.com/apikey is free and needs no card.",
      },
      { status: 503 },
    );
  }

  const wanted = typeof input["provider"] === "string" ? input["provider"] : undefined;
  const chosen = available.find((p) => p.id === wanted) ?? available[0];
  if (!chosen) {
    return NextResponse.json({ error: "No model provider is available." }, { status: 503 });
  }

  const messages = readMessages(input["messages"]);
  if (messages.length === 0) {
    return NextResponse.json({ error: "There is nothing to answer." }, { status: 400 });
  }

  const currentRoute = typeof input["route"] === "string" ? input["route"] : "NN";
  const specialist = specialistForRoute(currentRoute);
  const activeTools = specialist ? toolsForSpecialist(specialist) : REN_TOOLS;
  const system = systemPrompt({
    route: currentRoute,
    specialistInstructions: specialist ? specialistInstructions(specialist) : undefined,
    firstName: typeof input["firstName"] === "string" ? input["firstName"] : undefined,
    localTime: typeof input["localTime"] === "string" ? input["localTime"] : undefined,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (value: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
      };
      send({ type: "provider", id: chosen.id, label: chosen.label, model: chosen.model });
      if (specialist) {
        send({ type: "specialist", id: specialist.id, appId: specialist.appId, name: specialist.name });
      }
      try {
        for await (const chunk of ask(
          chosen.id as ProviderId,
          {
            system,
            messages,
            tools: activeTools.map((tool) => ({
              name: tool.name,
              description: tool.description,
              schema: tool.schema,
            })),
            maxTokens: 8192,
            signal: request.signal,
          },
        )) {
          send(chunk);
        }
      } catch (error) {
        // The founder sees a sentence; the detail stays in the server log.
        console.error("REN: the answer stream failed.", (error as Error)?.name);
        send({ type: "error", message: "REN lost the connection to the model." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store, no-transform",
      connection: "keep-alive",
    },
  });
}

/* ------------------------------------------------------------------ shape -- */

/**
 * Reads the conversation off the wire, keeping only what is well-formed.
 *
 * A malformed part is dropped rather than rejected: the founder losing a
 * whole message because one attachment arrived oddly is worse than REN
 * answering without it and saying so.
 */
function readMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) return [];
  const out: Message[] = [];
  for (const entry of value.slice(-MAX_MESSAGES)) {
    if (entry === null || typeof entry !== "object") continue;
    const message = entry as Record<string, unknown>;
    const role = message["role"] === "assistant" ? "assistant" : "user";
    const parts = readParts(message["parts"]);
    if (parts.length === 0) continue;
    out.push({ role, parts });
  }
  // A conversation has to start with the founder for every provider here.
  while (out.length > 0 && out[0]?.role === "assistant") out.shift();
  return out;
}

function readParts(value: unknown): Part[] {
  if (!Array.isArray(value)) return [];
  const out: Part[] = [];
  for (const entry of value) {
    if (entry === null || typeof entry !== "object") continue;
    const part = entry as Record<string, unknown>;
    const type = part["type"];
    if (type === "text" && typeof part["text"] === "string" && part["text"].trim() !== "") {
      out.push({ type: "text", text: part["text"] });
    } else if (
      (type === "image" || type === "document") &&
      typeof part["mediaType"] === "string" &&
      typeof part["data"] === "string" &&
      part["data"].length > 0
    ) {
      out.push(
        type === "image"
          ? { type: "image", mediaType: part["mediaType"], data: part["data"] }
          : {
              type: "document",
              mediaType: part["mediaType"],
              data: part["data"],
              name: typeof part["name"] === "string" ? part["name"] : "document",
            },
      );
    }
  }
  return out;
}
