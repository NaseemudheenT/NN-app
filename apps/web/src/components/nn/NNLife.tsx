"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc, collection, doc, getDocs, limit, orderBy, query, Timestamp, updateDoc, serverTimestamp,
  type Firestore, type QueryDocumentSnapshot,
} from "firebase/firestore";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { Icon, type IconName } from "@/components/ui/Icon";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { useAuth } from "@/lib/auth";
import { firebaseAvailable, getFirebase } from "@/lib/firebase";
import styles from "./NNLife.module.css";

type LifeTab = "today" | "calendar" | "tasks" | "reminders" | "notes" | "goals";
type RecordData = Record<string, unknown> & { id: string };
type LifeData = { tasks: RecordData[]; calendar_events: RecordData[]; reminders: RecordData[]; notes: RecordData[]; goals: RecordData[] };
type CollectionName = keyof LifeData;
const TABS: readonly { id: LifeTab; label: string; icon: IconName }[] = [
  { id: "today", label: "Today", icon: "grid" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "tasks", label: "Tasks", icon: "check" },
  { id: "reminders", label: "Reminders", icon: "clock" },
  { id: "notes", label: "Notes", icon: "file" },
  { id: "goals", label: "Goals", icon: "graph" },
];
const EMPTY: LifeData = { tasks: [], calendar_events: [], reminders: [], notes: [], goals: [] };
const metadata = () => ({ schemaVersion: 1, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
const localDateTime = (date = new Date()) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const dateLabel = (date = new Date()) => new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(date);
function asDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    const date = (value.toDate as () => Date)();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}
function formatTime(value: unknown): string {
  const date = asDate(value);
  return date ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date) : "Time not set";
}
function formatDate(value: unknown): string {
  const date = asDate(value);
  return date ? new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" }).format(date) : "Date not set";
}
function titleOf(item: RecordData): string {
  return typeof item.title === "string" && item.title.trim() ? item.title : "Untitled";
}
async function readCollection(db: Firestore, uid: string, name: CollectionName): Promise<{ items: RecordData[]; fromCache: boolean }> {
  const ref = collection(db, "users", uid, name);
  const result = await getDocs(query(ref, orderBy("updatedAt", "desc"), limit(40)));
  return {
    items: result.docs.map((item: QueryDocumentSnapshot) => ({ id: item.id, ...item.data() }) as RecordData),
    fromCache: result.metadata.fromCache,
  };
}
function LifeSurface() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.uid;
  const [tab, setTab] = useState<LifeTab>("today");
  const [data, setData] = useState<LifeData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [eventStart, setEventStart] = useState(localDateTime());
  const [eventEnd, setEventEnd] = useState(localDateTime(new Date(Date.now() + 60 * 60 * 1000)));
  const [reminderTitle, setReminderTitle] = useState("");
  const [reminderAt, setReminderAt] = useState(localDateTime(new Date(Date.now() + 60 * 60 * 1000)));

  const load = useCallback(async () => {
    if (!uid) { setLoading(false); setError("Visual preview only — connect the NN development Firebase environment and sign in to load or save personal records."); return; }
    if (!firebaseAvailable()) { setError("Firebase is not configured for this environment. Your data has not been loaded."); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const db = getFirebase().db;
      const names: CollectionName[] = ["tasks", "calendar_events", "reminders", "notes", "goals"];
      const results = await Promise.all(names.map((name) => readCollection(db, uid, name)));
      const next = { ...EMPTY };
      let cacheOnly = false;
      results.forEach((result, index) => {
        const name = names[index];
        if (name) next[name] = result.items;
        cacheOnly ||= result.fromCache;
      });
      setData(next);
      setOffline(cacheOnly || !navigator.onLine);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "NN could not load your Life data.");
    } finally { setLoading(false); }
  }, [uid]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const online = () => setOffline(false);
    const offlineNow = () => setOffline(true);
    window.addEventListener("online", online);
    window.addEventListener("offline", offlineNow);
    return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offlineNow); };
  }, []);

  const todayTasks = useMemo(() => data.tasks.filter((item) => item.status !== "done" && item.status !== "completed"), [data.tasks]);
  const todayEvents = useMemo(() => data.calendar_events.filter((item) => {
    const date = asDate(item.start);
    return date?.toDateString() === new Date().toDateString();
  }).sort((a, b) => (asDate(a.start)?.getTime() ?? 0) - (asDate(b.start)?.getTime() ?? 0)), [data.calendar_events]);
  const completedTasks = data.tasks.filter((item) => item.status === "done" || item.status === "completed").length;

  const save = async (action: () => Promise<unknown>, success: string) => {
    if (!uid) return;
    if (!navigator.onLine) {
      setError("You are offline. NN can show cached records, but reconnect before creating or changing data so the save can be confirmed.");
      return;
    }
    setBusy(true); setError(null); setNotice(null);
    try {
      await action();
      setNotice(success);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "NN could not save this item. Nothing was reported as saved.");
    } finally { setBusy(false); }
  };
  const createTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title || !uid) return;
    const dueAt = taskDue ? Timestamp.fromDate(new Date(taskDue)) : null;
    void save(() => addDoc(collection(getFirebase().db, "users", uid, "tasks"), {
      ...metadata(), title, status: "open", priority: "normal", dueAt, estimateMinutes: null, parentId: null, dependsOn: [],
    }), "Task added to NN Life.");
    setTaskTitle(""); setTaskDue("");
  };
  const createNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = noteTitle.trim();
    if (!title || !uid) return;
    void save(() => addDoc(collection(getFirebase().db, "users", uid, "notes"), {
      ...metadata(), title, format: "markdown", body: noteBody.trim(), folderId: null, tags: [], pinned: false, linkedIds: [],
    }), "Note saved to NN Life.");
    setNoteTitle(""); setNoteBody("");
  };
  const createEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = eventTitle.trim();
    const start = new Date(eventStart);
    const end = new Date(eventEnd);
    if (!title || !uid || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      setError("Enter a title and a valid end time after the start time."); return;
    }
    void save(() => addDoc(collection(getFirebase().db, "users", uid, "calendar_events"), {
      ...metadata(), calendarId: null, title, start: Timestamp.fromDate(start), end: Timestamp.fromDate(end),
      allDay: false, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, rrule: null, exdates: [],
      location: null, travelMinutes: 0, status: "scheduled",
    }), "Event added to your calendar.");
    setEventTitle("");
  };
  const createReminder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = reminderTitle.trim();
    const fireAt = new Date(reminderAt);
    if (!title || !uid || Number.isNaN(fireAt.getTime())) { setError("Enter a reminder title and valid time."); return; }
    void save(() => addDoc(collection(getFirebase().db, "users", uid, "reminders"), {
      ...metadata(), title, fireAt: Timestamp.fromDate(fireAt), rrule: null,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, state: "scheduled", attempts: 0,
      snoozedUntil: null, escalation: null,
    }), "Reminder scheduled in NN Life.");
    setReminderTitle("");
  };
  const toggleTask = (item: RecordData) => {
    if (!uid) return;
    const nextStatus = item.status === "done" || item.status === "completed" ? "open" : "done";
    void save(() => updateDoc(doc(getFirebase().db, "users", uid, "tasks", item.id), { status: nextStatus, updatedAt: serverTimestamp() }), nextStatus === "done" ? "Task completed." : "Task reopened.");
  };

  const greeting = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(new Date());
  const firstName = user?.displayName?.trim().split(/\s+/)[0] || "Founder";
  const heading = greeting.toLowerCase().includes("am") ? "A clear start." : greeting.toLowerCase().includes("pm") ? "Make today count." : "Welcome back.";
  const renderTask = (item: RecordData) => (
    <article className={`${styles.record} nn-glass-card`} key={item.id}>
      <button className={styles.checkButton} onClick={() => toggleTask(item)} aria-label={item.status === "done" ? "Reopen task" : "Complete task"}>
        <span className={item.status === "done" || item.status === "completed" ? styles.checked : ""}>{item.status === "done" || item.status === "completed" ? "✓" : ""}</span>
      </button>
      <div className={styles.recordMain}><strong>{titleOf(item)}</strong><small>{item.dueAt ? `Due ${formatDate(item.dueAt)} · ${formatTime(item.dueAt)}` : "No due date"}</small></div>
      <span className={styles.priority}>{typeof item.priority === "string" ? item.priority : "normal"}</span>
    </article>
  );
  return <main className={styles.root}>
    <header className={styles.topbar}>
      <button className={styles.brand} onClick={() => router.push("/home")}><Icon name="grid" size={18}/><span>NN <i>/</i> LIFE</span></button>
      <div className={styles.topRight}><span className={styles.private}><i/> PRIVATE SPACE</span><button className={styles.refresh} onClick={() => void load()} aria-label="Refresh Life data" title="Refresh"><Icon name="clock" size={16}/></button><span className={styles.avatar}>{firstName.slice(0,1).toUpperCase()}</span></div>
    </header>
    <div className={styles.layout}>
      <div className={styles.breadcrumb}><button onClick={() => router.push("/home")}>NN HOME</button><span>/</span><span>LIFE</span><span className={styles.date}>{dateLabel()}</span></div>
      <section className={`${styles.hero} nn-glass-card`}>
        <div className={styles.heroCopy}><p className={styles.kicker}>YOUR PERSONAL DAYSPACE</p><h1>{heading}<br/><em>{firstName}.</em></h1><p className={styles.sub}>A thoughtful place for what matters today—and the things you&apos;re building over time.</p></div>
        <div className={styles.orbit} aria-hidden="true"><div className={styles.orbitRing}/><div className={styles.orbitCore}><Icon name="calendar" size={32}/></div><span className={styles.orbitDot}/></div>
        <div className={styles.heroMeta}><span>01 <i>/</i> DAILY OVERVIEW</span><span>{offline ? "OFFLINE / CACHED" : "PERSONAL DATA SPACE"}</span></div>
      </section>
      <nav className={styles.tabs} aria-label="Life sections">{TABS.map((item) => <button key={item.id} className={tab === item.id ? styles.tabActive : styles.tab} onClick={() => setTab(item.id)} aria-current={tab === item.id ? "page" : undefined}><Icon name={item.icon} size={16}/><span>{item.label}</span>{item.id === "tasks" && todayTasks.length > 0 ? <small>{todayTasks.length}</small> : null}</button>)}</nav>
      {error ? <div className={styles.error} role="alert"><Icon name="shield" size={17}/><span>{error}</span><button onClick={() => void load()}>Retry</button></div> : null}
      {notice ? <div className={styles.notice} role="status"><Icon name="check" size={16}/>{notice}<button onClick={() => setNotice(null)} aria-label="Dismiss"><Icon name="close" size={14}/></button></div> : null}
      {loading ? <div className={styles.loading}><span/><p>Opening your personal data…</p></div> : null}
      {!loading && tab === "today" ? <section className={styles.dashboard}>
        <div className={styles.mainColumn}>
          <GlassPanel tier={2} padding="lg" className={styles.panel}>
            <div className={styles.panelHead}><div><p className={styles.label}>YOUR SCHEDULE</p><h2>Today, in focus.</h2></div><button className={styles.inlineAction} onClick={() => setTab("calendar")}>Open calendar ↗</button></div>
            {todayEvents.length ? todayEvents.map((item) => <article className={styles.event} key={item.id}><time>{formatTime(item.start)}</time><span/><div><strong>{titleOf(item)}</strong><small>{formatTime(item.start)} — {formatTime(item.end)}</small></div></article>) : <div className={styles.emptyInline}><span className={styles.emptyIcon}><Icon name="calendar" size={19}/></span><div><strong>Your day is open.</strong><small>No events scheduled for today.</small></div><button onClick={() => setTab("calendar")}>Add event</button></div>}
          </GlassPanel>
          <GlassPanel tier={2} padding="lg" className={styles.panel}>
            <div className={styles.panelHead}><div><p className={styles.label}>NEXT ACTIONS</p><h2>Things to move forward.</h2></div><button className={styles.inlineAction} onClick={() => setTab("tasks")}>All tasks ↗</button></div>
            {todayTasks.slice(0,5).map(renderTask)}
            {todayTasks.length === 0 ? <div className={styles.emptyInline}><span className={styles.emptyIcon}><Icon name="check" size={19}/></span><div><strong>Nothing waiting on you.</strong><small>Add a task when something needs your attention.</small></div><button onClick={() => setTab("tasks")}>Create task</button></div> : null}
          </GlassPanel>
        </div>
        <div className={styles.sideColumn}>
          <GlassPanel tier={3} padding="lg" className={styles.focusPanel}><p className={styles.label}>LIFE AT A GLANCE</p><div className={styles.metric}><strong>{todayTasks.length}</strong><span>Open tasks</span></div><div className={styles.metric}><strong>{todayEvents.length}</strong><span>Events today</span></div><div className={styles.metric}><strong>{completedTasks}</strong><span>Completed tasks</span></div><div className={styles.focusFoot}>Numbers are read from your NN records.</div></GlassPanel>
          <GlassPanel tier={2} padding="lg" className={styles.quickPanel}><p className={styles.label}>QUICK CAPTURE</p><h2>Get it out of your head.</h2><p>Capture a task or thought without leaving your day.</p><button onClick={() => setTab("tasks")}><Icon name="plus" size={15}/> New task</button><button onClick={() => setTab("notes")}><Icon name="file" size={15}/> New note</button></GlassPanel>
        </div>
      </section> : null}
      {!loading && tab === "tasks" ? <section className={styles.singleColumn}>
        <GlassPanel tier={2} padding="lg" className={styles.panel}><div className={styles.panelHead}><div><p className={styles.label}>TASK MANAGEMENT</p><h2>Move one thing forward.</h2></div><span className={styles.count}>{todayTasks.length} OPEN</span></div>
          <form className={styles.captureForm} onSubmit={createTask}><input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="What needs to get done?" aria-label="Task title" required maxLength={160}/><input type="datetime-local" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} aria-label="Task due date"/><button disabled={busy || !taskTitle.trim()}><Icon name="plus" size={16}/> Add task</button></form>
          <div className={styles.list}>{data.tasks.map(renderTask)}{data.tasks.length === 0 ? <EmptyState icon="check" title="A clean slate." body="Your tasks will appear here once you add the first one."/> : null}</div>
        </GlassPanel>
      </section> : null}
      {!loading && tab === "calendar" ? <section className={styles.singleColumn}><GlassPanel tier={2} padding="lg" className={styles.panel}><div className={styles.panelHead}><div><p className={styles.label}>CALENDAR</p><h2>Make room for what matters.</h2></div><span className={styles.count}>{data.calendar_events.length} EVENTS LOADED</span></div>
        <form className={styles.captureForm} onSubmit={createEvent}><input value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} placeholder="Event title" aria-label="Event title" required maxLength={160}/><input type="datetime-local" value={eventStart} onChange={(e) => setEventStart(e.target.value)} aria-label="Event starts" required/><input type="datetime-local" value={eventEnd} onChange={(e) => setEventEnd(e.target.value)} aria-label="Event ends" required/><button disabled={busy || !eventTitle.trim()}><Icon name="plus" size={16}/> Add event</button></form>
        <div className={styles.list}>{data.calendar_events.map((item) => <article className={styles.record} key={item.id}><span className={styles.recordGlyph}><Icon name="calendar" size={17}/></span><div className={styles.recordMain}><strong>{titleOf(item)}</strong><small>{formatDate(item.start)} · {formatTime(item.start)} — {formatTime(item.end)}</small></div><span className={styles.priority}>{typeof item.status === "string" ? item.status : "scheduled"}</span></article>)}{data.calendar_events.length === 0 ? <EmptyState icon="calendar" title="Your calendar is open." body="Create your first event. It will be stored in your private NN account."/> : null}</div>
      </GlassPanel></section> : null}
      {!loading && tab === "reminders" ? <section className={styles.singleColumn}><GlassPanel tier={2} padding="lg" className={styles.panel}><div className={styles.panelHead}><div><p className={styles.label}>REMINDERS</p><h2>Remember at the right moment.</h2></div><span className={styles.count}>{data.reminders.length} SAVED</span></div>
        <form className={styles.captureForm} onSubmit={createReminder}><input value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} placeholder="What should NN remind you?" aria-label="Reminder title" required maxLength={160}/><input type="datetime-local" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} aria-label="Reminder time" required/><button disabled={busy || !reminderTitle.trim()}><Icon name="plus" size={16}/> Schedule</button></form>
        <div className={styles.list}>{data.reminders.map((item) => <article className={styles.record} key={item.id}><span className={styles.recordGlyph}><Icon name="clock" size={17}/></span><div className={styles.recordMain}><strong>{titleOf(item)}</strong><small>{formatDate(item.fireAt)} · {formatTime(item.fireAt)}</small></div><span className={styles.priority}>{typeof item.state === "string" ? item.state : "scheduled"}</span></article>)}{data.reminders.length === 0 ? <EmptyState icon="clock" title="No reminders yet." body="Add a reminder and it will be stored in your private NN account. Delivery requires the notification service."/> : null}</div>
      </GlassPanel></section> : null}
      {!loading && tab === "notes" ? <section className={styles.notesLayout}><GlassPanel tier={2} padding="lg" className={styles.panel}><p className={styles.label}>QUICK NOTE</p><h2>Save the thought.</h2><form className={styles.noteForm} onSubmit={createNote}><input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Give this note a title" aria-label="Note title" required maxLength={160}/><textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Write freely. Your original note is kept in NN." aria-label="Note content" rows={7}/><button disabled={busy || !noteTitle.trim()}><Icon name="plus" size={16}/> Save note</button></form></GlassPanel><div className={styles.notesList}><div className={styles.panelHead}><div><p className={styles.label}>YOUR NOTES</p><h2>Thoughts, collected.</h2></div><span className={styles.count}>{data.notes.length} LOADED</span></div>{data.notes.map((item) => <GlassPanel key={item.id} tier={2} padding="md" className={styles.noteCard}><strong>{titleOf(item)}</strong><p>{typeof item.body === "string" ? item.body : ""}</p><small>{formatDate(item.updatedAt)}</small></GlassPanel>)}{data.notes.length === 0 ? <EmptyState icon="file" title="Your notes begin here." body="The first note you save will appear in this space."/> : null}</div></section> : null}
      {!loading && tab === "goals" ? <section className={styles.singleColumn}><GlassPanel tier={2} padding="lg" className={styles.panel}><div className={styles.panelHead}><div><p className={styles.label}>LONG-TERM DIRECTION</p><h2>Progress with purpose.</h2></div><span className={styles.count}>{data.goals.length} GOALS</span></div><div className={styles.list}>{data.goals.map((item) => { const progress = typeof item.progress === "number" ? item.progress : 0; const target = typeof item.target === "number" ? item.target : 0; const pct = target > 0 ? Math.min(100, Math.max(0, progress / target * 100)) : 0; return <article className={styles.goal} key={item.id}><div><strong>{titleOf(item)}</strong><small>{progress} / {target || "—"} {typeof item.unit === "string" ? item.unit : ""}</small></div><div className={styles.progress}><span style={{ width: `${pct}%` }}/></div></article>; })}{data.goals.length === 0 ? <EmptyState icon="graph" title="Give your ambition a shape." body="Goals you create in NN will be tracked here. No sample goals are inserted."/> : null}</div></GlassPanel></section> : null}
      <footer className={styles.footer}><span>NN LIFE · PERSONAL OPERATING ENVIRONMENT</span><span>{offline ? "LOCAL CACHE / SYNC PENDING" : "OWNER-SCOPED FIRESTORE DATA"}</span></footer>
    </div>
    <div className={styles.dock}><button onClick={() => router.push("/home")} aria-label="NN Home"><Icon name="grid" size={19}/></button><button className={styles.dockCurrent} aria-current="page"><Icon name="calendar" size={19}/><span>Life</span></button><button onClick={() => setTab("tasks")} aria-label="Tasks"><Icon name="check" size={19}/></button><button onClick={() => setTab("notes")} aria-label="Notes"><Icon name="file" size={19}/></button></div>
  </main>;
}
function EmptyState({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return <div className={styles.emptyState}><span><Icon name={icon} size={21}/></span><strong>{title}</strong><p>{body}</p></div>;
}
export function NNLifePreview() { return <LifeSurface />; }
function LifePage() { return <RequireOwner><LifeSurface/></RequireOwner>; }
export default LifePage;
