"use client";

import {
  useCallback, useEffect, useRef, useState, type FormEvent,
} from "react";
import { Icon } from "@/components/ui/Icon";
import { understand, type Understanding } from "@/lib/ren/understand";
import { needsReauthentication, type RenPlan } from "@/lib/ren/capabilities";
import { useRenOperator } from "@/lib/ren/operator";
import { useRen } from "./RenProvider";
import { RenOrb } from "./RenOrb";
import styles from "./RenConsole.module.css";

/**
 * REN.
 *
 * Deliberately not a chat. A chat surface makes the conversation the product
 * and the work incidental; REN is the other way round. The orb is the
 * subject, what REN is doing is one line beneath it, and the record of what
 * REN has actually done is a list of things that happened to NN — not a
 * transcript of two people talking.
 *
 * The sequence is always the same, and it is the safety model:
 *
 *   hear → resolve into a plan → show its cost → act → verify → report
 *
 * Nothing skips a step. A plan that writes is shown to the founder with what
 * it will change before it runs. A plan that deletes is shown, and then the
 * device asks for the founder's face or fingerprint before REN is allowed to
 * touch anything. And REN reports only what it observed — a record id that
 * came back, a route the browser actually reached.
 */

interface Entry {
  id: number;
  /** What REN did, or tried to. */
  text: string;
  tone: "did" | "failed" | "said" | "asked";
}

export function RenConsole() {
  const { machine, open, page, level, dismiss, send } = useRen();
  const operator = useRenOperator();

  const [draft, setDraft] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pending, setPending] = useState<RenPlan | null>(null);
  const [working, setWorking] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);

  const note = useCallback((text: string, tone: Entry["tone"]) => {
    nextId.current += 1;
    setEntries((list) => [...list.slice(-7), { id: nextId.current, text, tone }]);
  }, []);

  useEffect(() => { if (open) inputRef.current?.focus(); }, [open]);

  // A plan awaiting confirmation takes focus: it is a question, and leaving
  // focus in the field would let the founder type past it without answering.
  useEffect(() => { if (pending) confirmRef.current?.focus(); }, [pending]);

  // Keep the newest line in view without yanking the page around it.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [entries]);

  const perform = useCallback(async (plan: RenPlan) => {
    setPending(null);
    setWorking(true);
    send({ type: "process" });

    const outcome = await operator.run(plan);
    setWorking(false);

    if (outcome.ok && outcome.said === "report") {
      // The surfaces hold the live records; REN reads them from where they
      // already are rather than fetching a second, different truth.
      note(
        `You are on ${page.name}. Everything NN holds is in its applications — ` +
        `say "open Life" or "what's on today" from the dashboard.`,
        "said",
      );
    } else {
      note(outcome.said, outcome.ok ? "did" : "failed");
    }

    send({ type: "respond", text: outcome.said });
    // REN must never show a success flourish for work that did not happen.
    if (outcome.ok) send({ type: "settle", confirmed: true });
    else send({ type: "fail", reason: outcome.said });
  }, [note, operator, page.name, send]);

  const take = useCallback((result: Understanding) => {
    switch (result.kind) {
      case "plan":
        if (result.plan.consequence === "none") {
          void perform(result.plan);
        } else {
          // Consequence is shown before it is paid, never after.
          setPending(result.plan);
          send({ type: "process" });
        }
        return;
      case "question":
        note(result.hint ? `${result.ask} ${result.hint}` : result.ask, "asked");
        send({ type: "respond", text: result.ask });
        send({ type: "settle", confirmed: true });
        return;
      case "answer":
        note(result.text, "said");
        send({ type: "respond", text: result.text });
        send({ type: "settle", confirmed: true });
        return;
      default:
        note(
          `I did not understand "${result.heard}". I can open any application, ` +
          `add a record, search, report on your day, or change how NN looks.`,
          "failed",
        );
        send({ type: "fail", reason: "Not understood." });
    }
  }, [note, perform, send]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const said = draft.trim();
    if (!said || working) return;
    setDraft("");
    note(said, "said");
    take(understand(said));
  };

  if (!open) return null;

  const status = pending
    ? "Waiting for you"
    : working
      ? "Working"
      : machine.state === "idle"
        ? "Ready"
        : machine.state.charAt(0).toUpperCase() + machine.state.slice(1);

  return (
    <div className={styles.scrim} onPointerDown={(e) => { if (e.target === e.currentTarget) dismiss(); }}>
      <section className={styles.console} aria-label="REN" role="dialog" aria-modal="true">
        <button type="button" className={styles.close} onClick={dismiss} aria-label="Close REN">
          <Icon name="close" size={18} />
        </button>

        <div className={styles.stage}>
          <RenOrb state={machine.state} size={168} level={level} />
        </div>

        <p className={styles.status} aria-live="polite">{status}</p>
        <p className={styles.where}>{page.name}</p>

        {/* What REN has actually done. A record of changes to NN, not a
            transcript — which is why there are no speaker names. */}
        {entries.length > 0 ? (
          <div className={styles.log} ref={logRef} role="log" aria-label="What REN has done">
            {entries.map((entry) => (
              <p key={entry.id} className={styles.entry} data-tone={entry.tone}>
                {entry.tone === "did" ? <Icon name="check" size={14} /> : null}
                {entry.tone === "failed" ? <Icon name="shield" size={14} /> : null}
                <span>{entry.text}</span>
              </p>
            ))}
          </div>
        ) : null}

        {pending ? (
          <div className={styles.confirm} role="group" aria-label="Confirm this action">
            <p className={styles.consequence}>
              <strong>{pending.summary}</strong>
              <span>
                {needsReauthentication(pending)
                  ? "Your device will ask for your face or fingerprint first."
                  : "This changes one of your records."}
              </span>
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                ref={confirmRef}
                className={styles.go}
                onClick={() => void perform(pending)}
              >
                {needsReauthentication(pending) ? "Confirm with Face ID" : "Do it"}
              </button>
              <button
                type="button"
                className={styles.stop}
                onClick={() => {
                  setPending(null);
                  note("Cancelled. Nothing was changed.", "said");
                  send({ type: "fail", reason: "Cancelled." });
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <form className={styles.field} onSubmit={submit}>
            <input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Tell REN what to do"
              aria-label="Tell REN what to do"
              autoComplete="off"
              spellCheck={false}
              maxLength={300}
              disabled={working}
            />
            <button type="submit" disabled={!draft.trim() || working} aria-label="Send to REN">
              <Icon name="sparkle" size={16} />
            </button>
          </form>
        )}

        {/* What REN can do, stated rather than hidden behind discovery. */}
        <ul className={styles.can} aria-label="What REN can do">
          {[
            "open Finance",
            "add a task to call the bank",
            "find the lease",
            "what's on today",
            "make NN calm",
          ].map((example) => (
            <li key={example}>
              <button type="button" onClick={() => { note(example, "said"); take(understand(example)); }}>
                {example}
              </button>
            </li>
          ))}
        </ul>

        <p className={styles.boundary}>
          {operator.ready
            ? "I act with your hands: everything I touch, you could touch. Anything that changes a record I ask about first."
            : "You are not signed in, so I can move you around NN but cannot read or write your records."}
        </p>
      </section>
    </div>
  );
}

export default RenConsole;
