"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { needsConfirmation, type RenPlan } from "./capabilities";
import { planFromToolCall } from "./tools";
import { useRenOperator } from "./operator";
import { specialistForApp, specialistForRoute, type WorkspaceSpecialist } from "./specialists";
import { getApplication } from "@/lib/apps/registry";

/**
 * One conversation with REN.
 *
 * Holds the turns, streams the answer, and runs the tools REN asks for — in
 * the browser, as the founder, so NN's security rules are still the only
 * thing deciding what may be touched.
 *
 * Two decisions worth knowing:
 *
 * **Tool results go back as plain text.** The three model APIs each have
 * their own shape for a tool result, and carrying all three would put vendor
 * detail into the one file that is supposed to be free of it. Instead NN
 * tells REN what happened in a sentence — "NN ran open_application and the
 * result was: Opened Finance." — which every model understands and which is
 * also exactly what the founder sees. One account of events, not two.
 *
 * **Nothing that writes runs on its own.** A tool with a consequence is
 * proposed and waits. The founder presses the button, or it does not happen.
 */

export interface Attachment {
  id: string;
  kind: "image" | "document";
  mediaType: string;
  /** base64, with no data: prefix. */
  data: string;
  name: string;
  /** An object URL for showing a thumbnail. Revoked when the turn is dropped. */
  preview?: string | undefined;
}

export interface ToolRun {
  id: string;
  name: string;
  plan: RenPlan;
  status: "proposed" | "running" | "done" | "failed" | "declined";
  said: string;
}

export interface Turn {
  id: string;
  role: "founder" | "ren";
  text: string;
  attachments: Attachment[];
  tools: ToolRun[];
  /** Set on a REN turn that could not be produced. */
  fault?: string | undefined;
  streaming: boolean;
}

export interface ProviderChoice {
  id: string;
  label: string;
  model: string;
}

const TEXT_LIKE = /^(text\/|application\/(json|xml|javascript|typescript|x-yaml))/;

export interface RenConversation {
  turns: Turn[];
  providers: ProviderChoice[];
  /** Which model answered the last turn, as it named itself. */
  answeredBy: ProviderChoice | null;
  /** null while NN has not asked yet; [] means none is configured. */
  checked: boolean;
  busy: boolean;
  send: (text: string, attachments: Attachment[]) => void;
  stop: () => void;
  approve: (turnId: string, toolId: string) => void;
  decline: (turnId: string, toolId: string) => void;
  clear: () => void;
  choose: (id: string) => void;
  chosen: string | null;
  specialist: WorkspaceSpecialist | null;
}

let counter = 0;
const nextId = () => `t${Date.now().toString(36)}-${(counter += 1).toString(36)}`;

export function useRenConversation(firstName?: string, workspaceId?: string): RenConversation {
  const pathname = usePathname();
  const requestedSpecialist = workspaceId ? specialistForApp(workspaceId) : specialistForRoute(pathname ?? "/");
  const specialist = requestedSpecialist?.status === "active" ? requestedSpecialist : null;
  const specialistRoute = specialist
    ? (getApplication(specialist.appId)?.href ?? pathname ?? "/")
    : (pathname ?? "/");
  const operator = useRenOperator();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [providers, setProviders] = useState<ProviderChoice[]>([]);
  const [checked, setChecked] = useState(false);
  const [answeredBy, setAnsweredBy] = useState<ProviderChoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  // Refs, because the streaming loop outlives the render that started it and
  // must not close over a stale conversation.
  const turnsRef = useRef<Turn[]>([]);
  turnsRef.current = turns;
  const operatorRef = useRef(operator);
  operatorRef.current = operator;
  /* `streamInto` runs the tools REN asks for, and running a tool starts
     another `streamInto` to report the result. Holding one side in a ref is
     what keeps that honest cycle from becoming a dependency cycle neither
     callback can be built without. */
  const runToolsRef = useRef<(renId: string, runs: ToolRun[]) => Promise<void>>(
    async () => {},
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/ren/chat", { credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : { providers: [] }))
      .then((body: unknown) => {
        if (cancelled) return;
        const list = (body as { providers?: unknown })?.providers;
        setProviders(Array.isArray(list) ? (list as ProviderChoice[]) : []);
        setChecked(true);
      })
      .catch(() => { if (!cancelled) setChecked(true); });
    return () => { cancelled = true; };
  }, []);

  const patch = useCallback((id: string, change: (turn: Turn) => Turn) => {
    setTurns((previous) => previous.map((turn) => (turn.id === id ? change(turn) : turn)));
  }, []);

  /**
   * Streams one answer into `renId`, and returns the tools REN asked for.
   *
   * Does not run them: deciding what may run is the caller's job, because
   * the answer to "may this run" is different for reading and for writing.
   */
  const streamInto = useCallback(
    async (renId: string, history: Turn[]): Promise<void> => {
      const controller = new AbortController();
      abort.current = controller;
      const asked: ToolRun[] = [];

      try {
        const response = await fetch("/api/ren/chat", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            provider: chosen ?? undefined,
            route: specialistRoute,
            firstName,
            localTime: new Date().toLocaleString(),
            messages: history.map((turn) => ({
              role: turn.role === "founder" ? "user" : "assistant",
              parts: [
                ...(turn.text.trim() !== "" ? [{ type: "text", text: turn.text }] : []),
                ...turn.attachments.map((file) => ({
                  type: file.kind,
                  mediaType: file.mediaType,
                  data: file.data,
                  name: file.name,
                })),
              ],
            })),
          }),
        });

        if (!response.ok || !response.body) {
          const message = await readFault(response);
          patch(renId, (turn) => ({ ...turn, streaming: false, fault: message }));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let cut = buffer.indexOf("\n\n");
          while (cut !== -1) {
            const frame = buffer.slice(0, cut).trim();
            buffer = buffer.slice(cut + 2);
            cut = buffer.indexOf("\n\n");
            if (!frame.startsWith("data:")) continue;
            const chunk = safeParse(frame.slice(5).trim());
            if (!chunk) continue;

            if (chunk["type"] === "provider") {
              setAnsweredBy({
                id: String(chunk["id"] ?? ""),
                label: String(chunk["label"] ?? ""),
                model: String(chunk["model"] ?? ""),
              });
            } else if (chunk["type"] === "text" && typeof chunk["text"] === "string") {
              text += chunk["text"];
              patch(renId, (turn) => ({ ...turn, text }));
            } else if (chunk["type"] === "tool") {
              const made = planFromToolCall(
                String(chunk["name"] ?? ""),
                (chunk["args"] ?? {}) as Record<string, unknown>,
                specialist?.appId,
              );
              const run: ToolRun = made.ok
                ? {
                    id: String(chunk["id"] ?? nextId()),
                    name: String(chunk["name"] ?? ""),
                    plan: made.plan,
                    status: needsConfirmation(made.plan) ? "proposed" : "running",
                    said: "",
                  }
                : {
                    id: String(chunk["id"] ?? nextId()),
                    name: String(chunk["name"] ?? ""),
                    plan: {
                      capability: "report",
                      args: {},
                      summary: made.why,
                      consequence: "none",
                    },
                    status: "failed",
                    said: made.why,
                  };
              asked.push(run);
              patch(renId, (turn) => ({ ...turn, tools: [...turn.tools, run] }));
            } else if (chunk["type"] === "error" && typeof chunk["message"] === "string") {
              patch(renId, (turn) => ({ ...turn, fault: chunk["message"] as string }));
            }
          }
        }
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          patch(renId, (turn) => ({ ...turn, fault: "REN lost its connection." }));
        }
      } finally {
        abort.current = null;
        patch(renId, (turn) => ({ ...turn, streaming: false }));
      }

      // Anything harmless runs straight away; anything with a consequence is
      // already sitting as "proposed" and waits for the founder.
      const automatic = asked.filter((run) => run.status === "running");
      if (automatic.length > 0) await runToolsRef.current(renId, automatic);
    },
    [chosen, firstName, specialist, specialistRoute, patch],
  );

  /**
   * Runs tools and tells REN what actually happened.
   *
   * The follow-up turn is REN's: the founder did not say anything, NN did.
   * Sending it as a founder turn would put words in their mouth, and that is
   * the kind of small dishonesty that compounds.
   */
  const runTools = useCallback(
    async (renId: string, runs: ToolRun[]): Promise<void> => {
      const outcomes: string[] = [];
      for (const run of runs) {
        patch(renId, (turn) => ({
          ...turn,
          tools: turn.tools.map((t) => (t.id === run.id ? { ...t, status: "running" } : t)),
        }));
        const outcome = await operatorRef.current.run(run.plan);
        patch(renId, (turn) => ({
          ...turn,
          tools: turn.tools.map((t) =>
            t.id === run.id
              ? { ...t, status: outcome.ok ? "done" : "failed", said: outcome.said }
              : t,
          ),
        }));
        outcomes.push(`${run.name}: ${outcome.ok ? "done" : "failed"} — ${outcome.said}`);
      }

      if (outcomes.length === 0 || runs.some((run) => run.plan.capability === "delegate")) return;
      const report: Turn = {
        id: nextId(),
        role: "founder",
        text:
          "NN ran the tools you asked for. These are the real results — say what they mean, " +
          "and do not claim anything they do not say:\n" + outcomes.join("\n"),
        attachments: [],
        tools: [],
        streaming: false,
      };
      const answer: Turn = {
        id: nextId(), role: "ren", text: "", attachments: [], tools: [], streaming: true,
      };
      // The report is REN's own working, not something the founder said, so
      // it is kept out of the transcript and only sent.
      setTurns((previous) => [...previous, answer]);
      await streamInto(answer.id, [...turnsRef.current, report]);
    },
    [patch, streamInto],
  );
  runToolsRef.current = runTools;

  const send = useCallback(
    (text: string, attachments: Attachment[]) => {
      if (busy) return;
      if (text.trim() === "" && attachments.length === 0) return;
      const founder: Turn = {
        id: nextId(), role: "founder", text, attachments, tools: [], streaming: false,
      };
      const answer: Turn = {
        id: nextId(), role: "ren", text: "", attachments: [], tools: [], streaming: true,
      };
      const history = [...turnsRef.current, founder];
      setTurns([...history, answer]);
      setBusy(true);
      void streamInto(answer.id, history).finally(() => setBusy(false));
    },
    [busy, streamInto],
  );

  const stop = useCallback(() => { abort.current?.abort(); }, []);

  const approve = useCallback(
    (turnId: string, toolId: string) => {
      const turn = turnsRef.current.find((t) => t.id === turnId);
      const run = turn?.tools.find((t) => t.id === toolId);
      if (!run || run.status !== "proposed") return;
      setBusy(true);
      void runTools(turnId, [run]).finally(() => setBusy(false));
    },
    [runTools],
  );

  const decline = useCallback((turnId: string, toolId: string) => {
    setTurns((previous) =>
      previous.map((turn) =>
        turn.id === turnId
          ? {
              ...turn,
              tools: turn.tools.map((t) =>
                t.id === toolId
                  ? { ...t, status: "declined", said: "You said no. Nothing was changed." }
                  : t,
              ),
            }
          : turn,
      ),
    );
  }, []);

  const clear = useCallback(() => {
    for (const turn of turnsRef.current) {
      for (const file of turn.attachments) if (file.preview) URL.revokeObjectURL(file.preview);
    }
    setTurns([]);
    setAnsweredBy(null);
  }, []);

  return {
    turns, providers, answeredBy, checked, busy,
    send, stop, approve, decline, clear,
    choose: setChosen, chosen, specialist,
  };
}

/* ------------------------------------------------------------------ files -- */

/** Whether NN will send this file to a model, and as what. */
export function attachmentKind(type: string): "image" | "document" | null {
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf" || TEXT_LIKE.test(type)) return "document";
  return null;
}

/** Reads a file into the shape the gateway wants, or refuses it honestly. */
export async function readAttachment(file: File): Promise<Attachment | null> {
  const kind = attachmentKind(file.type);
  if (!kind) return null;
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  // Chunked: spreading a few million bytes into String.fromCharCode at once
  // overflows the call stack on a large photograph.
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return {
    id: nextId(),
    kind,
    mediaType: file.type,
    data: btoa(binary),
    name: file.name,
    preview: kind === "image" ? URL.createObjectURL(file) : undefined,
  };
}

/* ------------------------------------------------------------------ shape -- */

function safeParse(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text);
    return value !== null && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

async function readFault(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    const message = (body as { error?: unknown })?.error;
    if (typeof message === "string") return message;
  } catch { /* the body was not JSON; the status is enough */ }
  return response.status === 401
    ? "REN needs you signed in before it can answer."
    : `REN could not reach its model (${response.status}).`;
}
