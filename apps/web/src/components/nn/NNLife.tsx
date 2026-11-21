"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc, collection, doc, limit, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc, type Timestamp,
} from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { NNAppIcon } from "@/components/ui/NNAppIcon";
import { firebaseAvailable, getFirebase } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import styles from "./NNLife.module.css";

interface LifeTask {
  id: string;
  title: string;
  status: "open" | "done" | string;
  priority?: "low" | "normal" | "high" | string;
  dueAt?: Timestamp | null;
  estimateMinutes?: number | null;
  updatedAt?: Timestamp;
}

type LoadState = "loading" | "ready" | "unconfigured" | "denied" | "error";

function formatDue(value?: Timestamp | null): string {
  if (!value) return "No due date";
  const date = value.toDate();
  const today = new Date();
  const sameDay = date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
  return sameDay
    ? `Today · ${date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`
    : date.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

export function NNLife() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [tasks, setTasks] = useState<LifeTask[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [draft, setDraft] = useState("");
  const [dueDraft, setDueDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingTask, setPendingTask] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState<"today" | "tasks">("today");
  const [hour, setHour] = useState<number | null>(null);
  const [dateLabel, setDateLabel] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const sync = () => {
      const now = new Date();
      setHour(now.getHours());
      setDateLabel(new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(now));
    };
    sync();
    const timer = window.setInterval(sync, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!uid) return;
    if (!firebaseAvailable()) {
      setLoadState("unconfigured");
      return;
    }

    let unsubscribe: (() => void) | undefined;
    try {
      const { db } = getFirebase();
      const tasksRef = collection(db, "users", uid, "tasks");
      const tasksQuery = query(tasksRef, orderBy("updatedAt", "desc"), limit(50));
      unsubscribe = onSnapshot(
        tasksQuery,
        (snapshot) => {
          setTasks(snapshot.docs.map((item) => ({
            id: item.id,
            ...(item.data() as Omit<LifeTask, "id">),
          })));
          setLoadState("ready");
          setError("");
        },
        (reason) => {
          setLoadState(reason.code === "permission-denied" ? "denied" : "error");
          setError(reason.code === "permission-denied"
            ? "NN could not access your task records. Your session or permissions may need attention."
            : "Tasks could not be loaded. Check your connection and try again.");
        },
      );
    } catch {
      setLoadState("unconfigured");
      setError("NN's data connection is not configured.");
    }
    return () => unsubscribe?.();
  }, [uid, retryKey]);

  const openTasks = useMemo(() => tasks.filter((task) => task.status !== "done"), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.status === "done"), [tasks]);
  const visibleTasks = view === "today" ? openTasks.slice(0, 8) : tasks;
  const noVisibleTasks = view === "today" ? openTasks.length === 0 : tasks.length === 0;
  const greeting = hour === null ? "Your day, in one place" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  async function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.trim();
    if (!uid || !title || saving) return;
    setSaving(true);
    setError("");
    try {
      const { db } = getFirebase();
      const dueAt = dueDraft ? new Date(dueDraft) : null;
      await addDoc(collection(db, "users", uid, "tasks"), {
        title,
        status: "open",
        priority: "normal",
        dueAt: dueAt && Number.isFinite(dueAt.getTime()) ? dueAt : null,
        estimateMinutes: null,
        parentId: null,
        dependsOn: [],
        projectId: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        schemaVersion: 1,
      });
      setDraft("");
      setDueDraft("");
    } catch {
      setError("The task could not be saved. Nothing was added.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task: LifeTask) {
    if (!uid || pendingTask) return;
    setPendingTask(task.id);
    setError("");
    try {
      const { db } = getFirebase();
      await updateDoc(doc(db, "users", uid, "tasks", task.id), {
        status: task.status === "done" ? "open" : "done",
        updatedAt: serverTimestamp(),
      });
    } catch {
      setError("That change could not be saved. Your task was left unchanged.");
    } finally {
      setPendingTask(null);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <NNAppIcon appId="life" icon="calendar" size={42} label="Life" />
            <div>
              <p className={styles.eyebrow}>NN APPLICATION</p>
              <p className={styles.brandName}>Life</p>
            </div>
          </div>
          <div className={styles.headerMeta}>
            <span className={styles.liveMark} />
            <span>PRIVATE SPACE</span>
          </div>
        </header>

        <section className={styles.hero}>
          <div>
            <p className={styles.date}>{dateLabel || "Today"}</p>
            <h1>{view === "today" ? greeting : "Your tasks"}</h1>
            <p className={styles.lede}>
              {view === "today" ? "A clear view of what matters today." : "Keep the next action visible. The rest can wait."}
            </p>
          </div>
          <div className={styles.summary}>
            <div>
              <strong>{openTasks.length}</strong>
              <span>Open</span>
            </div>
            <div>
              <strong>{completedTasks.length}</strong>
              <span>Completed</span>
            </div>
          </div>
        </section>

        <nav className={styles.tabs} aria-label="Life views">
          <button type="button" aria-current={view === "today" ? "page" : undefined} onClick={() => setView("today")}>Today</button>
          <button type="button" aria-current={view === "tasks" ? "page" : undefined} onClick={() => setView("tasks")}>Tasks</button>
        </nav>

        <div className={styles.grid}>
          <section className={styles.primary}>
            <div className={styles.panelHeading}>
              <div>
                <p className={styles.eyebrow}>{view === "today" ? "YOUR NEXT ACTIONS" : "TASK LIST"}</p>
                <h2>{view === "today" ? "Today" : "All tasks"}</h2>
              </div>
              <span className={styles.count}>{openTasks.length} OPEN</span>
            </div>

            <form className={styles.createForm} onSubmit={(event) => void createTask(event)}>
              <label className={styles.srOnly} htmlFor="nn-life-task">New task</label>
              <input
                id="nn-life-task"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Add a task…"
                maxLength={180}
              />
              <label className={styles.srOnly} htmlFor="nn-life-due">Due date</label>
              <input
                id="nn-life-due"
                className={styles.dateInput}
                type="datetime-local"
                value={dueDraft}
                onChange={(event) => setDueDraft(event.target.value)}
                aria-label="Optional due date"
              />
              <button type="submit" disabled={saving || !draft.trim()}>
                <Icon name={saving ? "clock" : "plus"} size={16} />
                {saving ? "Saving" : "Add"}
              </button>
            </form>

            {error ? <p className={styles.error} role="alert">{error}</p> : null}

            {loadState === "loading" ? (
              <div className={styles.loading} aria-busy="true">
                <span /><span /><span />
                <p>Loading your tasks…</p>
              </div>
            ) : loadState === "unconfigured" || loadState === "denied" || loadState === "error" ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}><Icon name="shield" size={22} /></span>
                <h3>{loadState === "denied" ? "Access needs attention" : loadState === "unconfigured" ? "Data connection unavailable" : "Could not load tasks"}</h3>
                <p>{error || "NN could not connect to your private task records."}</p>
                {loadState === "error" ? (
                  <button className={styles.retry} type="button" onClick={() => { setLoadState("loading"); setError(""); setRetryKey((value) => value + 1); }}>Try again</button>
                ) : null}
              </div>
            ) : noVisibleTasks ? (
              <div className={styles.emptyState}>
                <span className={styles.emptyIcon}><Icon name="check" size={22} /></span>
                <h3>Nothing waiting on you.</h3>
                <p>Add a task when something needs your attention. Your list stays clear until then.</p>
              </div>
            ) : (
              <div className={styles.taskList}>
                {visibleTasks.map((task) => (
                  <article className={styles.task} data-completed={task.status === "done"} key={task.id}>
                    <button
                      type="button"
                      className={styles.complete}
                      aria-label={task.status === "done" ? `Reopen ${task.title}` : `Complete ${task.title}`}
                      disabled={pendingTask === task.id}
                      onClick={() => void toggleTask(task)}
                    >
                      {task.status === "done" ? <Icon name="check" size={14} /> : null}
                    </button>
                    <div className={styles.taskCopy}>
                      <strong>{task.title}</strong>
                      <span>{formatDue(task.dueAt)}</span>
                    </div>
                    <span className={styles.priority} data-priority={task.priority ?? "normal"}>{task.priority ?? "normal"}</span>
                  </article>
                ))}
              </div>
            )}

            {view === "today" && openTasks.length > 8 ? (
              <button className={styles.viewAll} type="button" onClick={() => setView("tasks")}>
                View all {openTasks.length} tasks <Icon name="expand" size={15} />
              </button>
            ) : null}
          </section>

          <aside className={styles.secondary}>
            <section className={styles.sidePanel}>
              <p className={styles.eyebrow}>LIFE MODULES</p>
              <h2>One connected day.</h2>
              <p className={styles.sideCopy}>Tasks are connected to your private NN account. Calendar, reminders, notes, habits and goals will join this space as their real services are completed.</p>
              <div className={styles.moduleList}>
                {["Calendar", "Reminders", "Notes", "Habits", "Goals", "Routines", "Reviews"].map((name) => (
                  <div className={styles.moduleRow} key={name}>
                    <span>{name}</span>
                    <span>In development</span>
                  </div>
                ))}
              </div>
            </section>
            <section className={styles.sidePanel}>
              <p className={styles.eyebrow}>DATA OWNERSHIP</p>
              <h2>Your records stay yours.</h2>
              <p className={styles.sideCopy}>This view reads and writes only to your authenticated account. NN&apos;s security rules enforce ownership independently of the interface.</p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
