"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Icon } from "@/components/ui/Icon";
import { RenOrb } from "./RenOrb";
import { useRenOperator } from "@/lib/ren/operator";
import { understand } from "@/lib/ren/understand";
import { needsConfirmation, type RenPlan } from "@/lib/ren/capabilities";
import { REN_INITIAL, renReduce, type RenEvent, type RenMachine } from "@/lib/ren/state";
import { Task, describe as describeTask } from "@/lib/ren/task";
import { makeEars, say, silence, voiceSupport, type Ears } from "@/lib/ren/voice";
import styles from "./RenConsole.module.css";

/**
 * REN, full screen.
 *
 * The founder's brief is explicit that opening REN must not open a chat. A
 * chat is a place you compose a message; this is a place you speak to an
 * assistant and watch it work. So this screen has one subject — REN itself —
 * and everything else on it reports something REN is actually doing.
 *
 * What makes that true rather than decorative:
 *
 * - **The orb's state is the state machine's**, and the machine refuses
 *   illegal transitions. REN cannot show "working" without work in flight,
 *   or "speaking" without something to say.
 * - **The microphone is only open while it says it is open.** There is no
 *   wake word and no ambient listening; the founder opens it and closes it.
 * - **Nothing invents progress.** A task's line comes from the task engine,
 *   which cannot reach `completed` except through verification.
 * - **Anything with a consequence waits for a button.** A plan that writes
 *   is shown in full and held until the founder approves it.
 *
 * What REN can do here today is the deterministic half: it hears a request,
 * matches it against the capability registry, carries it out with the
 * founder's own session, verifies the result and reports it. There is no
 * language model behind it yet — the screen says so plainly rather than
 * implying a mind that is not connected.
 */

type Approval = { plan: RenPlan; said: string };

interface Turn {
  id: number;
  from: "founder" | "ren";
  text: string;
}

export function RenConsole() {
  const router = useRouter();
  const operator = useRenOperator();

  const [machine, dispatch] = useReducer(
    (state: RenMachine, event: RenEvent) => {
      try {
        return renReduce(state, event);
      } catch {
        // A refused transition is a bug in this component, not something to
        // show the founder. Log it and leave REN where it was, rather than
        // crashing the screen they are speaking to.
        if (process.env.NODE_ENV !== "production") {
          console.error(`REN: refused ${event.type} while ${state.state}`);
        }
        return state;
      }
    },
    REN_INITIAL,
  );

  const support = useMemo(() => voiceSupport(), []);
  const [heard, setHeard] = useState("");
  const [turns, setTurns] = useState<readonly Turn[]>([]);
  const [fault, setFault] = useState<string | null>(null);
  const [approval, setApproval] = useState<Approval | null>(null);
  const [task, setTask] = useState<Task | null>(null);
  const [, bump] = useState(0);
  const earsRef = useRef<Ears | null>(null);
  const turnId = useRef(0);

  const add = useCallback((from: Turn["from"], text: string) => {
    turnId.current += 1;
    const id = turnId.current;
    setTurns((was) => [...was.slice(-8), { id, from, text }]);
  }, []);

  /** REN says something aloud and on screen, and the orb follows. */
  const speak = useCallback((text: string) => {
    add("ren", text);
    dispatch({ type: "respond", text });
    if (support.speaking) {
      say(text, { onDone: () => dispatch({ type: "settle", confirmed: true }) });
    } else {
      dispatch({ type: "settle", confirmed: true });
    }
  }, [add, support.speaking]);

  /** Runs a plan the founder has either approved or that needs no approval. */
  const carryOut = useCallback(async (plan: RenPlan) => {
    const job = new Task(`t${Date.now()}`, plan.summary, new Date().toISOString());
    setTask(job);
    const now = () => new Date().toISOString();
    job.moveTo("understanding", now());
    job.moveTo("planning", now());
    job.moveTo("executing", now());
    bump((n) => n + 1);

    const outcome = await operator.run(plan);

    job.moveTo("verifying", now());
    if (outcome.ok) {
      job.moveTo("completed", now(), {
        claim: {
          kind: "verified",
          statement: outcome.said,
          sources: [],
          observations: [{ action: plan.summary, observed: outcome.said, at: now() }],
        },
      });
    } else {
      job.moveTo("failed", now(), { note: outcome.said });
    }
    bump((n) => n + 1);
    speak(outcome.said);
  }, [operator, speak]);

  /** One complete turn: what was said, what REN made of it, what happened. */
  const consider = useCallback(async (text: string) => {
    add("founder", text);
    setHeard("");
    dispatch({ type: "process" });

    const reading = understand(text);
    switch (reading.kind) {
      case "answer":
        speak(reading.text);
        return;
      case "question":
        speak(reading.ask);
        return;
      case "unknown":
        speak(
          `I did not understand "${reading.heard}". I can open any of the ` +
          "thirty-four applications, capture a task, note, reminder, event or " +
          "goal, search your records, and change how NN looks.",
        );
        return;
      case "plan":
        if (needsConfirmation(reading.plan)) {
          setApproval({ plan: reading.plan, said: text });
          dispatch({ type: "respond", text: reading.plan.summary });
          dispatch({ type: "settle", confirmed: true });
          return;
        }
        await carryOut(reading.plan);
    }
  }, [add, carryOut, speak]);

  /* The microphone. Created once, opened only on a gesture. */
  useEffect(() => {
    if (!support.listening) return;
    const ears = makeEars(
      ({ text, final }) => {
        setHeard(text);
        if (final) void consider(text);
      },
      (reason) => {
        setFault(reason);
        dispatch({ type: "fail", reason });
      },
    );
    earsRef.current = ears;
    return () => {
      ears?.dispose();
      earsRef.current = null;
    };
  }, [support.listening, consider]);

  const listening = machine.state === "listening";

  const toggleMic = useCallback(() => {
    setFault(null);
    silence();
    if (listening) {
      earsRef.current?.stop();
      dispatch({ type: "dismiss" });
      return;
    }
    // `summon` then `ready` is how the machine opens: it refuses `listen`
    // from idle, which is what stops a surface claiming to hear you before
    // the microphone has actually been asked for.
    dispatch({ type: "summon", via: "touch" });
    dispatch({ type: "ready", listening: true });
    earsRef.current?.start();
  }, [listening]);

  /** The stop the brief requires: ends speech, the microphone and the turn. */
  const stop = useCallback(() => {
    silence();
    earsRef.current?.stop();
    setHeard("");
    setApproval(null);
    dispatch({ type: "dismiss" });
  }, []);

  useEffect(() => () => { silence(); }, []);

  const status =
    fault !== null ? fault
      : approval !== null ? "Waiting for you."
        : machine.state === "listening" ? "Listening."
          : machine.state === "thinking" ? "Working."
            : machine.state === "speaking" ? "Speaking."
              : support.listening ? "Ready." : "Ready — type to me.";

  return (
    <main className={styles.room}>
      <div className={styles.sky} aria-hidden="true" />

      <header className={styles.bar}>
        <button
          type="button"
          className={styles.quiet}
          onClick={() => router.push("/home" as Route)}
          aria-label="Back to NN"
        >
          <Icon name="grid" size={17} />
          <span>NN</span>
        </button>
        <div className={styles.barRight}>
          <button
            type="button"
            className={styles.quiet}
            onClick={() => router.push("/ren/chat" as Route)}
          >
            <Icon name="file" size={16} />
            <span>Chat</span>
          </button>
          <button
            type="button"
            className={styles.quiet}
            onClick={() => router.push("/settings" as Route)}
            aria-label="REN settings and permissions"
          >
            <Icon name="settings" size={16} />
          </button>
        </div>
      </header>

      <div className={styles.stage}>
        <RenOrb state={machine.state} size={190} />

        <p className={styles.status} role="status" data-fault={fault !== null || undefined}>
          {status}
        </p>

        {heard.length > 0 ? <p className={styles.heard}>{heard}</p> : null}

        {/* What REN can actually do, said once, where it cannot be missed.
            A screen that looks like a mind and has none is the thing the
            founder's brief refuses most explicitly. */}
        <p className={styles.honest}>
          No language model is connected, so I cannot hold a conversation yet.
          I can open applications, capture records, search them and change how
          NN looks — and I will tell you when I have not understood.
        </p>
      </div>

      {turns.length > 0 ? (
        <ol className={styles.turns} aria-label="This conversation">
          {turns.map((turn) => (
            <li key={turn.id} data-from={turn.from}>{turn.text}</li>
          ))}
        </ol>
      ) : null}

      {task !== null && task.state !== "completed" && task.state !== "cancelled" ? (
        <p className={styles.task}>
          <span className={styles.taskDot} data-state={task.state} aria-hidden="true" />
          {task.request} — {describeTask(task.state)}
        </p>
      ) : null}

      {approval !== null ? (
        <section className={styles.approval} aria-live="polite">
          <h2>{approval.plan.summary}</h2>
          <p>
            {approval.plan.consequence === "sensitive"
              ? "This cannot be undone, and your device will ask to confirm it is you."
              : "This writes to your records."}
          </p>
          <div className={styles.approvalRow}>
            <button
              type="button"
              className={styles.approve}
              onClick={() => {
                const { plan } = approval;
                setApproval(null);
                dispatch({ type: "summon", via: "touch" });
                dispatch({ type: "ready", listening: false });
                dispatch({ type: "process" });
                void carryOut(plan);
              }}
            >
              Do it
            </button>
            <button
              type="button"
              className={styles.decline}
              onClick={() => { setApproval(null); speakDeclined(speak); }}
            >
              No
            </button>
          </div>
        </section>
      ) : null}

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.mic}
          data-live={listening || undefined}
          disabled={!support.listening}
          aria-pressed={listening}
          onClick={toggleMic}
        >
          <Icon name="mic" size={26} />
          <span className={styles.micLabel}>
            {!support.listening ? "No microphone" : listening ? "Listening — tap to stop" : "Tap and speak"}
          </span>
        </button>

        <button type="button" className={styles.stop} onClick={stop}>
          Stop
        </button>
      </div>

      {support.reason !== null ? <p className={styles.note}>{support.reason}</p> : null}

      <TypeToRen onSend={(text) => void consider(text)} />
    </main>
  );
}

/** Declining is a real outcome and REN says so rather than falling silent. */
function speakDeclined(speak: (text: string) => void): void {
  speak("Left alone. Nothing was changed.");
}

/**
 * Typing, which is not a lesser path.
 *
 * Firefox has no recogniser, iOS Safari's needs a fresh gesture every time,
 * and a founder on a train does not want to talk out loud. The same `consider`
 * runs either way, so what REN can do never depends on how it was asked.
 */
function TypeToRen({ onSend }: { onSend: (text: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className={styles.typing}
      onSubmit={(event) => {
        event.preventDefault();
        const text = value.trim();
        if (text.length === 0) return;
        setValue("");
        onSend(text);
      }}
    >
      <input
        className={styles.typeField}
        value={value}
        onChange={(event) => setValue(event.currentTarget.value)}
        placeholder="Or type to REN"
        aria-label="Type to REN"
        autoComplete="off"
      />
      <button type="submit" className={styles.typeSend} aria-label="Send" disabled={value.trim().length === 0}>
        <Icon name="check" size={18} />
      </button>
    </form>
  );
}

export default RenConsole;
