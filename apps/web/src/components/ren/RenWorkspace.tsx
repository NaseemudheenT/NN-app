"use client";

import {
  useCallback, useEffect, useMemo, useRef, useState,
  type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { RenOrb, type RenOrbState } from "./RenOrb";
import { RenMarkdown } from "./RenMarkdown";
import {
  readAttachment, useRenConversation,
  type Attachment, type ToolRun, type Turn,
} from "@/lib/ren/conversation";
import { useAuth } from "@/lib/auth";
import styles from "./RenWorkspace.module.css";
import { ownerFirstName, ownerInitial } from "@/lib/nn/owner";

/**
 * REN, full screen.
 *
 * The founder asked for a page rather than a panel, and the difference is
 * not size: a panel is something you consult beside your work, and a page is
 * somewhere you work. REN is the second. Long answers, code, documents,
 * photographs and a conversation that holds its shape all need the room.
 *
 * What is deliberately *not* here:
 *
 * - No typing dots pretending to be thought. The orb shows the real state.
 * - No "REN is thinking…" while nothing is in flight.
 * - No invented capability in the empty state. The prompts below are things
 *   REN can genuinely do on this deployment, and when no model is configured
 *   the page says exactly that instead of accepting a message it cannot
 *   answer.
 */

const OPENERS = [
  { icon: "sparkle", text: "Explain this photograph", hint: "Attach an image and ask" },
  { icon: "book", text: "Teach me this, step by step", hint: "Any subject, at your pace" },
  { icon: "grid", text: "Write the code for", hint: "Any language, with the reasoning" },
  { icon: "check", text: "Add a task to my day", hint: "REN writes it into NN itself" },
] as const;

export function RenWorkspace({ workspaceId, handoffId }: { workspaceId?: string; handoffId?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const firstName = ownerFirstName(user?.displayName);
  const ren = useRenConversation(firstName, workspaceId);
  const delegatedTaskStarted = useRef(false);

  const [draft, setDraft] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [refused, setRefused] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  const last = ren.turns[ren.turns.length - 1];
  const orbState: RenOrbState = ren.busy
    ? last?.role === "ren" && last.text !== "" ? "speaking" : "thinking"
    : "idle";

  const ready = ren.providers.length > 0;

  useEffect(() => {
    if (!handoffId || !workspaceId || !ren.specialist || !ready || ren.busy || delegatedTaskStarted.current) return;
    const key = `nn:ren:handoff:${handoffId}`;
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) return;
      const handoff = JSON.parse(raw) as { appId?: unknown; task?: unknown };
      window.sessionStorage.removeItem(key);
      if (handoff.appId !== workspaceId || typeof handoff.task !== "string" || !handoff.task.trim()) return;
      delegatedTaskStarted.current = true;
      ren.send(handoff.task.slice(0, 4000), []);
    } catch {
      window.sessionStorage.removeItem(key);
    }
  }, [handoffId, workspaceId, ready, ren.busy, ren.send, ren.specialist]);

  /* Follows the answer as it streams, but only while the founder is already
     at the bottom — yanking the view back while they are reading something
     further up is the single most hated behaviour a chat interface has. */
  const pinned = useRef(true);
  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    const onScroll = () => {
      pinned.current = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 120;
    };
    thread.addEventListener("scroll", onScroll, { passive: true });
    return () => thread.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const thread = threadRef.current;
    if (thread && pinned.current) thread.scrollTop = thread.scrollHeight;
  });

  const grow = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 260)}px`;
  }, []);
  useEffect(grow, [draft, grow]);

  const attach = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files ?? []);
    event.target.value = "";
    const accepted: Attachment[] = [];
    const rejected: string[] = [];
    for (const file of picked) {
      const read = await readAttachment(file);
      if (read) accepted.push(read);
      else rejected.push(file.name);
    }
    setFiles((previous) => [...previous, ...accepted]);
    setRefused(
      rejected.length > 0
        ? `REN cannot read ${rejected.join(", ")}. Images, PDFs and text files only.`
        : null,
    );
  }, []);

  const submit = useCallback(() => {
    if (!ready || ren.busy) return;
    if (draft.trim() === "" && files.length === 0) return;
    ren.send(draft, files);
    setDraft("");
    setFiles([]);
    setRefused(null);
  }, [draft, files, ready, ren]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift-Enter is a newline. The founder writes long things.
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  /**
   * What the header says under REN's name.
   *
   * Never the model, and never another company's. REN is NN's own
   * intelligence and the only identity on this screen; which engine carries
   * its language is infrastructure, the way the database is, and putting a
   * vendor's name where REN's state belongs would make REN look like a
   * wrapper around someone else's assistant. The founder was explicit about
   * this. The deployment detail still exists — it is in the setup card
   * below, and in the deployment guide, where an operator needs it.
   */
  const badge = useMemo(() => {
    if (ren.specialist) return `${ren.specialist.workspace} specialist`;
    if (!ren.checked) return null;
    if (!ready) return "Language not connected";
    if (ren.busy) return last?.role === "ren" && last.text !== "" ? "Answering" : "Thinking";
    return "Ready";
  }, [ren.busy, ren.checked, last, ready, ren.specialist]);

  return (
    <div className={styles.root}>
      <header className={styles.bar}>
        <button
          type="button"
          className={styles.back}
          onClick={() => router.push("/home")}
          aria-label="Back to NN"
        >
          <Icon name="close" size={16} />
        </button>

        <div className={styles.identity}>
          <RenOrb state={orbState} size={34} />
          <div>
            <strong>REN</strong>
            {badge ? <span data-dim={!ready || undefined}>{badge}</span> : null}
          </div>
        </div>

        <div className={styles.barActions}>
          <button
            type="button"
            className={styles.ghost}
            onClick={ren.clear}
            disabled={ren.turns.length === 0}
          >
            New
          </button>
        </div>
      </header>

      <div className={styles.thread} ref={threadRef}>
        {ren.turns.length === 0 ? (
          <div className={styles.welcome}>
            <RenOrb state={ready ? "idle" : "idle"} size={132} />
            <h1>Good to see you, {firstName}.</h1>
            <p>
              {ready
                ? ren.specialist
                  ? `I'm the dedicated ${ren.specialist.workspace} specialist. I work only with this workspace's information and records; REN coordinates anything outside it.`
                  : "Ask me anything, or tell me to do something in NN. I can reason across your work, teach, research, plan and coordinate the workspace specialists."
                : "My language is not connected on this deployment yet. Everything else about me is already here — I just cannot speak until NN is given an engine to think with."}
            </p>
            {ready ? (
              <ul className={styles.openers}>
                {OPENERS.map((opener) => (
                  <li key={opener.text}>
                    <button
                      type="button"
                      className={styles.opener}
                      onClick={() => { setDraft(`${opener.text} `); inputRef.current?.focus(); }}
                    >
                      <Icon name={opener.icon} size={17} />
                      <span>
                        <strong>{opener.text}</strong>
                        <small>{opener.hint}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.setup} role="status">
                {/* Operator detail, shown only while REN cannot speak. It names
                    variables rather than companies: this is a deployment step,
                    not REN's identity. */}
                <p>
                  <strong>To connect it:</strong> set <code>GOOGLE_API_KEY</code>,{" "}
                  <code>ANTHROPIC_API_KEY</code> or <code>OPENAI_API_KEY</code> in NN&apos;s
                  environment and redeploy. The key is read on the server only — it never reaches
                  this page, and it is never logged.
                </p>
                {/* Named because "add an API key" is not actionable advice to
                    someone who has decided not to spend money on this. Google
                    AI Studio issues a Gemini key on a free tier with no card,
                    which is enough for one person's assistant. */}
                <p>
                  <strong>Free option:</strong> a Gemini key from{" "}
                  <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                    aistudio.google.com/apikey
                  </a>{" "}
                  costs nothing and needs no card. NN accepts it under{" "}
                  <code>GOOGLE_API_KEY</code>, <code>GEMINI_API_KEY</code> or{" "}
                  <code>GOOGLE_AI_API_KEY</code> — whichever you paste it into.
                </p>
              </div>
            )}
          </div>
        ) : (
          ren.turns.map((turn) => (
            <TurnView
              key={turn.id}
              turn={turn}
              initial={ownerInitial(user?.displayName)}
              onApprove={(toolId) => ren.approve(turn.id, toolId)}
              onDecline={(toolId) => ren.decline(turn.id, toolId)}
            />
          ))
        )}
      </div>

      <div className={styles.composer}>
        {files.length > 0 ? (
          <ul className={styles.files}>
            {files.map((file) => (
              <li key={file.id}>
                {file.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={file.preview} alt="" />
                ) : (
                  <Icon name="file" size={15} />
                )}
                <span>{file.name}</span>
                <button
                  type="button"
                  className={styles.fileRemove}
                  aria-label={`Remove ${file.name}`}
                  onClick={() => {
                    if (file.preview) URL.revokeObjectURL(file.preview);
                    setFiles((previous) => previous.filter((entry) => entry.id !== file.id));
                  }}
                >
                  <Icon name="close" size={13} />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {refused ? <p className={styles.refused} role="status">{refused}</p> : null}

        <div className={styles.field}>
          <button
            type="button"
            className={styles.attach}
            aria-label="Attach a file"
            onClick={() => pickerRef.current?.click()}
            disabled={!ready}
          >
            <Icon name="plus" size={18} />
          </button>
          <input
            ref={pickerRef}
            type="file"
            multiple
            accept="image/*,application/pdf,text/*,.md,.csv,.json,.ts,.tsx,.js,.py"
            className={styles.srOnly}
            onChange={(event) => { void attach(event); }}
          />
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            placeholder={ready ? `Ask REN anything, ${firstName}…` : "REN cannot speak yet"}
            disabled={!ready}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={onKeyDown}
            aria-label="Message REN"
          />
          {ren.busy ? (
            <button type="button" className={styles.stop} onClick={ren.stop} aria-label="Stop">
              <Icon name="minus" size={18} />
            </button>
          ) : (
            <button
              type="button"
              className={styles.send}
              onClick={submit}
              disabled={!ready || (draft.trim() === "" && files.length === 0)}
              aria-label="Send"
            >
              <Icon name="check" size={18} />
            </button>
          )}
        </div>
        <p className={styles.note}>
          REN acts only with your permission, and never reports work it has not done.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ turn -- */

function TurnView({ turn, initial, onApprove, onDecline }: {
  turn: Turn;
  /** The founder's own letter, for the turn they spoke. */
  initial: string;
  onApprove: (toolId: string) => void;
  onDecline: (toolId: string) => void;
}) {
  if (turn.role === "founder") {
    return (
      <article className={styles.founder}>
        <div className={styles.bubble}>
          {turn.attachments.length > 0 ? (
            <ul className={styles.sent}>
              {turn.attachments.map((file) => (
                <li key={file.id}>
                  {file.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.preview} alt={file.name} />
                  ) : (
                    <><Icon name="file" size={14} /> {file.name}</>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          {turn.text ? <p>{turn.text}</p> : null}
        </div>
        <span className={styles.who} aria-hidden="true">{initial}</span>
      </article>
    );
  }

  return (
    <article className={styles.answer}>
      <span className={styles.mark} aria-hidden="true">
        <RenOrb state={turn.streaming ? "thinking" : "idle"} size={26} />
      </span>
      <div className={styles.body}>
        {turn.text ? <RenMarkdown text={turn.text} /> : null}

        {turn.tools.map((run) => (
          <ToolCard key={run.id} run={run} onApprove={onApprove} onDecline={onDecline} />
        ))}

        {turn.streaming && turn.text === "" && turn.tools.length === 0 ? (
          <p className={styles.waiting}>
            <span /><span /><span />
            <span className={styles.srOnly}>REN is answering</span>
          </p>
        ) : null}

        {turn.fault ? (
          <p className={styles.fault} role="status">{turn.fault}</p>
        ) : null}
      </div>
    </article>
  );
}

const STATUS: Record<ToolRun["status"], string> = {
  proposed: "Waiting for you",
  running: "Running",
  done: "Done",
  failed: "Did not work",
  declined: "You said no",
};

/**
 * One thing REN wants to do, or has done.
 *
 * The consequence is shown before the button, never after: the founder
 * decides knowing whether this writes to their records, and a card that
 * said "Add a task" without saying it writes would be asking for consent it
 * had not actually obtained.
 */
function ToolCard({ run, onApprove, onDecline }: {
  run: ToolRun;
  onApprove: (toolId: string) => void;
  onDecline: (toolId: string) => void;
}) {
  return (
    <div className={styles.tool} data-status={run.status}>
      <Icon
        name={run.status === "done" ? "check" : run.status === "failed" ? "close" : "sparkle"}
        size={15}
      />
      <div>
        <strong>{run.plan.summary}</strong>
        <small>
          {STATUS[run.status]}
          {run.plan.consequence !== "none" && run.status === "proposed"
            ? run.plan.consequence === "sensitive"
              ? " · this deletes, and needs your passkey"
              : " · this writes to your records"
            : ""}
          {run.said ? ` · ${run.said}` : ""}
        </small>
      </div>
      {run.status === "proposed" ? (
        <div className={styles.toolActions}>
          <button type="button" className={styles.toolButton} onClick={() => onDecline(run.id)}>
            No
          </button>
          <button
            type="button"
            className={styles.toolButtonPrimary}
            onClick={() => onApprove(run.id)}
          >
            Do it
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default RenWorkspace;
