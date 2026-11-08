"use client";

import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { LiquidButton } from "@/components/ui/LiquidButton";
import { REN_STATUS } from "@/lib/ren/state";
import { resolveIntent } from "@/lib/ren/intents";
import { useRen } from "./RenProvider";
import { RenMark } from "./RenMark";
import styles from "./RenPanel.module.css";

/**
 * REN's expanded surface.
 *
 * Everything on it is wired. There is no mute button, no language selector
 * and no microphone control here yet, because voice is not built — a control
 * that looks live and does nothing is worse than its absence, and the panel
 * says in one line exactly where the boundary is.
 *
 * Navigation is verified, not assumed. REN asks the router to move, waits for
 * the route to actually change, and only then reports success. If the route
 * does not change it says so.
 */

interface Turn {
  id: number;
  role: "founder" | "ren";
  text: string;
}

const NAV_TIMEOUT_MS = 4000;

export function RenPanel() {
  const { machine, open, page, level, dismiss, send } = useRen();
  const router = useRouter();
  const pathname = usePathname();
  const id = useId().replace(/:/g, "");

  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const turnId = useRef(0);

  /** A navigation REN has asked for but not yet seen happen. */
  const pending = useRef<{ to: string; label: string; timer: number } | null>(null);

  const say = useCallback((text: string) => {
    turnId.current += 1;
    setTurns((t) => [...t, { id: turnId.current, role: "ren", text }]);
  }, []);

  /* Verification. REN claims an action worked only once the route has
     actually changed — the router resolving is not the same as arriving. */
  useEffect(() => {
    const job = pending.current;
    if (!job) return;
    if (pathname !== job.to) return;
    window.clearTimeout(job.timer);
    pending.current = null;
    say(`Opened ${job.label}.`);
    send({ type: "respond", text: `Opened ${job.label}.` });
    send({ type: "settle", confirmed: true });
  }, [pathname, say, send]);

  /* Clear a stranded job if REN is dismissed mid-navigation. */
  useEffect(() => {
    if (open) return;
    if (pending.current) {
      window.clearTimeout(pending.current.timer);
      pending.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  /* Keep the newest turn in view without yanking the whole page. */
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [turns]);

  const run = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0) return;

      turnId.current += 1;
      setTurns((t) => [...t, { id: turnId.current, role: "founder", text: trimmed }]);
      setDraft("");
      send({ type: "process" });

      const intent = resolveIntent(trimmed, {
        pageName: page.name,
        pageSummary: page.summary,
      });

      if (intent.kind === "navigate") {
        if (intent.to === pathname) {
          const here = `You are already on ${intent.label}.`;
          say(here);
          send({ type: "respond", text: here });
          send({ type: "settle", confirmed: true });
          return;
        }
        const timer = window.setTimeout(() => {
          pending.current = null;
          const failure = `I asked NN to open ${intent.label} and it did not arrive.`;
          say(failure);
          send({ type: "fail", reason: failure });
        }, NAV_TIMEOUT_MS);
        pending.current = { to: intent.to, label: intent.label, timer };
        router.push(intent.to as Parameters<typeof router.push>[0]);
        return;
      }

      say(intent.text);
      send({ type: "respond", text: intent.text });
      send({ type: "settle", confirmed: true });
    },
    [page.name, page.summary, pathname, router, say, send],
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    run(draft);
  };

  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation" onPointerDown={dismiss}>
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button type="button" className={styles.close} onClick={dismiss} aria-label="Close REN">
          <Icon name="close" size={18} />
        </button>

        <div className={styles.identity}>
          <RenMark state={machine.state} size={96} level={level} />
          <h2 className={styles.title} id={`${id}-title`}>
            REN
          </h2>
          <p className={styles.status} aria-live="polite">
            {REN_STATUS[machine.state]}
          </p>
          <p className={styles.where}>You are on {page.name}.</p>
        </div>

        {turns.length > 0 ? (
          <div className={styles.log} ref={logRef} aria-live="polite" aria-label="Conversation">
            {turns.map((turn) => (
              <p key={turn.id} className={styles.turn} data-role={turn.role}>
                {turn.text}
              </p>
            ))}
          </div>
        ) : page.suggestions.length > 0 ? (
          <div className={styles.suggestions}>
            {page.suggestions.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => run(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}

        {machine.error !== null ? (
          <p className={styles.error} role="status">
            {machine.error}
          </p>
        ) : null}

        <form className={styles.field} onSubmit={onSubmit}>
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask REN, or name anywhere in NN…"
            aria-label="Ask REN"
            autoComplete="off"
          />
          <LiquidButton
            size="sm"
            shape="rounded"
            variant="accent"
            onClick={() => run(draft)}
            disabled={draft.trim().length === 0}
          >
            Send
          </LiquidButton>
        </form>

        <p className={styles.boundary}>
          REN can open any part of NN, tell you where you are, and retheme it. Reasoning,
          memory and voice are designed and switched off — they need a model provider you
          have not connected.
        </p>
      </div>
    </div>
  );
}
