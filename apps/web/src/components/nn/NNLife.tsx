"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, Timestamp, updateDoc, serverTimestamp, writeBatch,
  type Firestore, type QueryDocumentSnapshot,
} from "firebase/firestore";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { Icon, type IconName } from "@/components/ui/Icon";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Dialog } from "@/components/ui/Dialog";
import { useAuth } from "@/lib/auth";
import { firebaseAvailable, getFirebase } from "@/lib/firebase";
import { useClock } from "@/lib/clock";
import styles from "./NNLife.module.css";
import { ownerFirstName } from "@/lib/nn/owner";
import { buildCalendarGrid, calendarDateKey } from "@/lib/nn/calendar-grid";
import { buildLifeEditPatch, type EditableLifeCollection, type LifeEditDraft } from "@/lib/nn/life-edit";
import { habitPeriodKey, isHabitDueOn } from "@/lib/nn/life-periods";

type LifeTab = "today" | "calendar" | "tasks" | "reminders" | "notes" | "goals" | "habits" | "routines" | "focus" | "reviews";
export type LifePreviewTab = "habits" | "routines" | "focus" | "reviews";
type RecordData = Record<string, unknown> & { id: string };
type LifeData = { tasks: RecordData[]; calendar_events: RecordData[]; reminders: RecordData[]; notes: RecordData[]; goals: RecordData[]; habits: RecordData[]; habit_checkins: RecordData[]; routines: RecordData[]; routine_runs: RecordData[]; focus_sessions: RecordData[]; reviews: RecordData[] };
type CollectionName = keyof LifeData;
const TABS: readonly { id: LifeTab; label: string; icon: IconName }[] = [
  { id: "today", label: "Today", icon: "grid" },
  { id: "calendar", label: "Calendar", icon: "calendar" },
  { id: "tasks", label: "Tasks", icon: "check" },
  { id: "reminders", label: "Reminders", icon: "clock" },
  { id: "notes", label: "Notes", icon: "file" },
  { id: "goals", label: "Goals", icon: "graph" },
  { id: "habits", label: "Habits", icon: "pulse" },
  { id: "routines", label: "Routines", icon: "flow" },
  { id: "focus", label: "Focus", icon: "bolt" },
  { id: "reviews", label: "Reviews", icon: "book" },
];
export function LifePreviewCanvas({ module }: { module: LifePreviewTab }) {
  if (module === "habits") return (
    <div className={styles.previewCanvas} data-preview="habits" role="group" aria-label="Habit check-in layout preview">
      <div className={styles.canvasHeading}><span>WEEKLY RHYTHM</span><strong>Check-in matrix</strong></div>
      <div className={styles.habitMatrix}>
        {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
          <div className={styles.habitDay} data-habit-day={day + index} key={day + index}><span>{day}</span><i aria-hidden="true"/></div>
        ))}
      </div>
      <div className={styles.canvasFoot}><span>HABIT ROWS</span><i/><i/><i/></div>
    </div>
  );
  if (module === "routines") return (
    <div className={styles.previewCanvas} data-preview="routines" role="group" aria-label="Routine sequence layout preview">
      <div className={styles.canvasHeading}><span>ROUTINE BUILDER</span><strong>Sequence and timing</strong></div>
      <div className={styles.routineSequence}>
        {["01", "02", "03"].map((step) => (
          <div className={styles.routineStep} key={step}><span>{step}</span><i/><strong>Step title</strong><small>Optional time window</small></div>
        ))}
      </div>
    </div>
  );
  if (module === "focus") return (
    <div className={styles.previewCanvas} data-preview="focus" role="group" aria-label="Focus session layout preview">
      <div className={styles.canvasHeading}><span>ATTENTION SPACE</span><strong>Session workspace</strong></div>
      <div className={styles.focusWorkspace}>
        <div className={styles.focusDial}><div><strong>READY</strong><span>SESSION TIMER</span></div></div>
        <div className={styles.focusIntent}><span>SESSION INTENTION</span><i/><i/><i/><small>NO SESSION RUNNING</small></div>
      </div>
    </div>
  );
  return (
    <div className={styles.previewCanvas} data-preview="reviews" role="group" aria-label="Reflection review layout preview">
      <div className={styles.canvasHeading}><span>REVIEW WORKSPACE</span><strong>Reflect and reset</strong></div>
      <div className={styles.reviewPrompts}>
        {["Wins", "Lessons", "Next move"].map((prompt) => (
          <div className={styles.reviewPrompt} key={prompt}><strong>{prompt}</strong><i/><i/><i/></div>
        ))}
      </div>
    </div>
  );
}

export function parseRoutineSteps(value: string): string[] { return value.split(/\r?\n/).map((step) => step.trim()).filter(Boolean).slice(0, 20); }
export function focusRemainingSeconds(end: Date, now: number): number { return Math.max(0, Math.ceil((end.getTime() - now) / 1000)); }
const EMPTY_EDIT_DRAFT: LifeEditDraft = { title: "", body: "", dueAt: "", start: "", end: "", fireAt: "", target: "1", unit: "", cadence: "daily", steps: "", wins: "", lessons: "", nextStep: "" };
const EMPTY: LifeData = { tasks: [], calendar_events: [], reminders: [], notes: [], goals: [], habits: [], habit_checkins: [], routines: [], routine_runs: [], focus_sessions: [], reviews: [] };
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
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState("");

  const swipeStart = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const moveTab = (direction: -1 | 1) => {
    const currentIndex = TABS.findIndex((item) => item.id === tab);
    const next = TABS[Math.max(0, Math.min(TABS.length - 1, currentIndex + direction))];
    if (next) setTab(next.id);
  };
  const beginTabSwipe = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "touch") return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("button, a, input, textarea, select, [contenteditable=\"true\"], .swipeShell")) return;
    swipeStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const endTabSwipe = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < 52 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    moveTab(dx < 0 ? 1 : -1);
  };
  const [data, setData] = useState<LifeData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ name: CollectionName; id: string; success: string } | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{ name: EditableLifeCollection; id: string; original: RecordData } | null>(null);
  const [historyNote, setHistoryNote] = useState<RecordData | null>(null);
  const [historyEntries, setHistoryEntries] = useState<RecordData[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editDraft, setEditDraft] = useState<LifeEditDraft>(EMPTY_EDIT_DRAFT);
  const [offline, setOffline] = useState(false);
  const [busy, setBusy] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDue, setTaskDue] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  // Empty until mounted: a datetime-local seeded from the clock renders one
  // value on the server and a different one in the browser, and React throws
  // the form away when it finds them disagreeing.
  const [eventStart, setEventStart] = useState("");
  const [eventEnd, setEventEnd] = useState("");
  const [reminderTitle, setReminderTitle] = useState("");
  const [goalTitle, setGoalTitle] = useState("");
  const [goalTarget, setGoalTarget] = useState("1");
  const [goalUnit, setGoalUnit] = useState("");
  const [reminderAt, setReminderAt] = useState("");
  const [habitTitle, setHabitTitle] = useState("");
  const [habitCadence, setHabitCadence] = useState("daily");
  const [routineTitle, setRoutineTitle] = useState("");
  const [routineSteps, setRoutineSteps] = useState("");
  const [routineCadence, setRoutineCadence] = useState("daily");
  const [focusIntention, setFocusIntention] = useState("");
  const [focusMinutes, setFocusMinutes] = useState("25");
  const [reviewWins, setReviewWins] = useState("");
  const [reviewLessons, setReviewLessons] = useState("");
  const [reviewNext, setReviewNext] = useState("");
  const [focusTick, setFocusTick] = useState(0);
  // Null until mounted. Everything below that depends on what time it is
  // reads this, so the server and the browser's first render always agree.
  const clock = useClock(60_000);
  const calendarAnchor = clock === null ? null : new Date(clock);
  const calendarMonth = calendarAnchor
    ? new Date(calendarAnchor.getFullYear(), calendarAnchor.getMonth() + calendarOffset, 1)
    : null;
  const calendarMonthLabel = calendarMonth
    ? new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(calendarMonth)
    : "Calendar";
  const calendarDays = useMemo(() => {
    if (clock === null) return [];
    const anchor = new Date(clock);
    const month = new Date(anchor.getFullYear(), anchor.getMonth() + calendarOffset, 1);
    const eventDates = data.calendar_events
      .map((item) => asDate(item.start))
      .filter((date): date is Date => date !== null);
    return buildCalendarGrid(month.getFullYear(), month.getMonth(), anchor, eventDates);
  }, [clock, calendarOffset, data.calendar_events]);
  const selectedDateKey = selectedCalendarDay || (calendarAnchor ? calendarDateKey(calendarAnchor) : "");
  const selectedCalendarEvents = useMemo(() => data.calendar_events
    .filter((item) => {
      const date = asDate(item.start);
      return date !== null && calendarDateKey(date) === selectedDateKey;
    })
    .sort((a, b) => (asDate(a.start)?.getTime() ?? 0) - (asDate(b.start)?.getTime() ?? 0)),
  [data.calendar_events, selectedDateKey]);
  const selectedDateParts = selectedDateKey.split("-").map(Number);
  const selectedDateLabel = selectedDateParts.length === 3 && selectedDateParts.every(Number.isFinite)
    ? new Date(selectedDateParts[0] ?? 0, (selectedDateParts[1] ?? 1) - 1, selectedDateParts[2] ?? 1)
      .toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
    : "Select a day";
  const shiftCalendarMonth = (direction: -1 | 1) => {
    if (!calendarAnchor) return;
    const nextMonth = new Date(
      calendarAnchor.getFullYear(),
      calendarAnchor.getMonth() + calendarOffset + direction,
      1,
    );
    setCalendarOffset((current) => current + direction);
    setSelectedCalendarDay(calendarDateKey(nextMonth));
  };
  const selectCalendarDay = (key: string, year: number, month: number) => {
    if (calendarAnchor) {
      const offset = (year - calendarAnchor.getFullYear()) * 12 + month - calendarAnchor.getMonth();
      setCalendarOffset(offset);
    }
    setSelectedCalendarDay(key);
  };
  const resetCalendar = () => {
    setCalendarOffset(0);
    setSelectedCalendarDay(calendarAnchor ? calendarDateKey(calendarAnchor) : "");
  };


  useEffect(() => {
    const hour = new Date(Date.now() + 60 * 60 * 1000);
    setEventStart(localDateTime());
    setEventEnd(localDateTime(hour));
    setReminderAt(localDateTime(hour));
  }, []);

  const load = useCallback(async () => {
    if (!uid) { setLoading(false); setError("Visual preview only — connect the NN development Firebase environment and sign in to load or save personal records."); return; }
    if (!firebaseAvailable()) { setError("Firebase is not configured for this environment. Your data has not been loaded."); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const db = getFirebase().db;
      const names: CollectionName[] = ["tasks", "calendar_events", "reminders", "notes", "goals", "habits", "habit_checkins", "routines", "routine_runs", "focus_sessions", "reviews"];
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
  const todayEvents = useMemo(() => {
    if (clock === null) return [];
    const today = new Date(clock).toDateString();
    return data.calendar_events
      .filter((item) => asDate(item.start)?.toDateString() === today)
      .sort((a, b) => (asDate(a.start)?.getTime() ?? 0) - (asDate(b.start)?.getTime() ?? 0));
  }, [data.calendar_events, clock]);
  const completedTasks = data.tasks.filter((item) => item.status === "done" || item.status === "completed").length;

  const save = async (action: () => Promise<unknown>, success: string): Promise<boolean> => {
    if (!uid) return false;
    if (!navigator.onLine) {
      setError("You are offline. NN can show cached records, but reconnect before creating or changing data so the save can be confirmed.");
      return false;
    }
    setBusy(true); setError(null); setNotice(null);
    try {
      await action();
      setNotice(success);
      await load();
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "NN could not save this item. Nothing was reported as saved.");
      return false;
    } finally { setBusy(false); }
  };
  const createTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title || !uid) return;
    const dueAt = taskDue ? Timestamp.fromDate(new Date(taskDue)) : null;
    void save(() => addDoc(collection(getFirebase().db, "users", uid, "tasks"), {
      ...metadata(), title, status: "open", priority: "normal", dueAt, estimateMinutes: null, parentId: null, dependsOn: [],
    }), "Task added to NN Life.").then((saved) => {
      if (saved) { setTaskTitle(""); setTaskDue(""); }
    });
  };
  const createNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = noteTitle.trim();
    if (!title || !uid) return;
    void save(() => addDoc(collection(getFirebase().db, "users", uid, "notes"), {
      ...metadata(), title, format: "markdown", body: noteBody.trim(), folderId: null, tags: [], pinned: false, linkedIds: [],
    }), "Note saved to NN Life.").then((saved) => {
      if (saved) { setNoteTitle(""); setNoteBody(""); }
    });
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
    }), "Event added to your calendar.").then((saved) => {
      if (saved) setEventTitle("");
    });
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
    }), "Reminder saved in NN Life. Delivery is not enabled until the notification service is connected.").then((saved) => {
      if (saved) setReminderTitle("");
    });
  };
  const createGoal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = goalTitle.trim();
    const target = Number(goalTarget);
    if (!title || !uid || !Number.isFinite(target) || target <= 0) {
      setError("Enter a goal title and a target greater than zero.");
      return;
    }
    void save(() => addDoc(collection(getFirebase().db, "users", uid, "goals"), {
      ...metadata(), title, progress: 0, target, unit: goalUnit.trim(), status: "active",
    }), "Goal created in NN Life.").then((saved) => {
      if (saved) { setGoalTitle(""); setGoalTarget("1"); setGoalUnit(""); }
    });
  };
  const openEdit = (name: EditableLifeCollection, item: RecordData) => {
    const dateField = (value: unknown) => { const date = asDate(value); return date ? localDateTime(date) : ""; };
    setPendingEdit({ name, id: item.id, original: item });
    setEditDraft({
      ...EMPTY_EDIT_DRAFT,
      title: titleOf(item),
      body: typeof item.body === "string" ? item.body : "",
      dueAt: dateField(item.dueAt),
      start: dateField(item.start),
      end: dateField(item.end),
      fireAt: dateField(item.fireAt),
      target: String(item.target ?? "1"),
      unit: typeof item.unit === "string" ? item.unit : "",
      cadence: typeof item.cadence === "string" ? item.cadence : "daily",
      steps: Array.isArray(item.steps) ? item.steps.filter((step): step is string => typeof step === "string").join("\n") : "",
      wins: typeof item.wins === "string" ? item.wins : "",
      lessons: typeof item.lessons === "string" ? item.lessons : "",
      nextStep: typeof item.nextStep === "string" ? item.nextStep : "",
    });
  };

  const submitEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uid || !pendingEdit || busy) return;
    const selected = pendingEdit;
    const result = buildLifeEditPatch(selected.name, editDraft, Intl.DateTimeFormat().resolvedOptions().timeZone);
    if (!result.ok) { setError(result.error); return; }
    const saveEdit = () => {
      const db = getFirebase().db;
      const recordRef = doc(db, "users", uid, selected.name, selected.id);
      if (selected.name === "notes") {
        const batch = writeBatch(db);
        const versionRef = doc(collection(db, "users", uid, "notes", selected.id, "versions"));
        batch.set(versionRef, {
          ...metadata(),
          title: titleOf(selected.original),
          body: typeof selected.original.body === "string" ? selected.original.body : "",
          format: typeof selected.original.format === "string" ? selected.original.format : "markdown",
        });
        batch.update(recordRef, { ...result.patch, updatedAt: serverTimestamp() });
        return batch.commit();
      }
      return updateDoc(recordRef, { ...result.patch, updatedAt: serverTimestamp() });
    };
    void save(saveEdit, selected.name === "notes" ? "Note updated. Previous version saved." : "Changes saved.")
      .then((saved) => { if (saved) setPendingEdit(null); });
  };

  const openNoteHistory = async (note: RecordData) => {
    if (!uid) return;
    setHistoryNote(note);
    setHistoryEntries([]);
    setHistoryLoading(true);
    try {
      const db = getFirebase().db;
      const versions = await getDocs(query(
        collection(db, "users", uid, "notes", note.id, "versions"),
        orderBy("createdAt", "desc"),
        limit(20),
      ));
      setHistoryEntries(versions.docs.map((version) => ({ id: version.id, ...version.data() }) as RecordData));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "NN could not load this note's history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const deleteRecord = (name: CollectionName, id: string, success: string) => {
    if (!uid) return;
    setPendingDelete({ name, id, success });
  };
  const confirmDelete = () => {
    if (!uid || !pendingDelete || busy) return;
    const selected = pendingDelete;
    void save(() => deleteDoc(doc(getFirebase().db, "users", uid, selected.name, selected.id)), selected.success)
      .then((saved) => { if (saved) setPendingDelete(null); });
  };

  const toggleTask = (item: RecordData) => {
    if (!uid) return;
    const nextStatus = item.status === "done" || item.status === "completed" ? "open" : "done";
    void save(() => updateDoc(doc(getFirebase().db, "users", uid, "tasks", item.id), { status: nextStatus, updatedAt: serverTimestamp() }), nextStatus === "done" ? "Task completed." : "Task reopened.");
  };

  const adjustGoal = (item: RecordData, direction: -1 | 1) => {
    if (!uid || busy) return;
    const current = typeof item.progress === "number" ? item.progress : 0;
    const next = Math.max(0, current + direction);
    void save(
      () => updateDoc(doc(getFirebase().db, "users", uid, "goals", item.id), {
        progress: next,
        updatedAt: serverTimestamp(),
      }),
      `Goal progress updated to ${next}${typeof item.unit === "string" && item.unit ? ` ${item.unit}` : ""}.`,
    );
  };

  const createHabit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = habitTitle.trim();
    if (!title || !uid) return;
    void save(() => addDoc(collection(getFirebase().db, "users", uid, "habits"), {
      ...metadata(), title, cadence: habitCadence, status: "active",
    }), "Habit created.").then((saved) => { if (saved) setHabitTitle(""); });
  };

  const checkInHabit = (habit: RecordData) => {
    if (!uid || !clock) return;
    const dateKey = calendarDateKey(new Date(clock));
    const cadence = typeof habit.cadence === "string" ? habit.cadence : "daily";
    const today = new Date(clock);
    if (!isHabitDueOn(today, cadence)) { setNotice("This habit is scheduled for weekdays. Check in Monday to Friday."); return; }
    const periodKey = habitPeriodKey(today, cadence);
    const alreadyChecked = data.habit_checkins.some((entry) => entry.habitId === habit.id && (entry.periodKey === periodKey || (!entry.periodKey && entry.dateKey === dateKey)));
    if (alreadyChecked) { setNotice(cadence === "weekly" ? "This habit is already checked in for this week." : "This habit is already checked in for today."); return; }
    void save(() => addDoc(collection(getFirebase().db, "users", uid, "habit_checkins"), {
      ...metadata(), habitId: habit.id, dateKey, periodKey, checkedAt: Timestamp.fromDate(new Date(clock)), status: "completed",
    }), "Habit checked in for today.");
  };

  const createRoutine = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = routineTitle.trim();
    if (!title || !uid) return;
    const steps = parseRoutineSteps(routineSteps);
    void save(() => addDoc(collection(getFirebase().db, "users", uid, "routines"), {
      ...metadata(), title, steps, cadence: routineCadence, status: "active",
    }), "Routine saved.").then((saved) => { if (saved) { setRoutineTitle(""); setRoutineSteps(""); setRoutineCadence("daily"); } });
  };

  const runRoutine = (routine: RecordData) => {
    if (!uid || busy) return;
    const now = new Date();
    const cadence = typeof routine.cadence === "string" ? routine.cadence : "daily";
    if (!isHabitDueOn(now, cadence)) { setNotice("This routine is scheduled for weekdays. Run it Monday to Friday."); return; }
    const periodKey = habitPeriodKey(now, cadence);
    const alreadyRun = data.routine_runs.some((run) => {
      if (run.routineId !== routine.id) return false;
      if (run.periodKey === periodKey) return true;
      const startedAt = asDate(run.startedAt);
      return !run.periodKey && startedAt !== null && habitPeriodKey(startedAt, cadence) === periodKey;
    });
    if (alreadyRun) { setNotice(cadence === "weekly" ? "This routine is already completed for this week." : "This routine is already completed for today."); return; }
    void save(() => addDoc(collection(getFirebase().db, "users", uid, "routine_runs"), {
      ...metadata(), routineId: routine.id, title: titleOf(routine), cadence, periodKey,
      startedAt: Timestamp.fromDate(now), status: "completed", completedAt: Timestamp.fromDate(now),
    }), "Routine completion recorded.");
  };

  const startFocusSession = () => {
    const minutes = Number(focusMinutes);
    if (!uid || !focusIntention.trim() || !Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
      setError("Enter a focus intention and a duration between 1 and 180 minutes."); return;
    }
    const startedAt = new Date();
    void save(() => addDoc(collection(getFirebase().db, "users", uid, "focus_sessions"), {
      ...metadata(), intention: focusIntention.trim(), plannedMinutes: minutes, startedAt: Timestamp.fromDate(startedAt),
      endsAt: Timestamp.fromDate(new Date(startedAt.getTime() + minutes * 60_000)), status: "active",
    }), "Focus session started.").then((saved) => { if (saved) setFocusIntention(""); });
  };

  const finishFocusSession = (session: RecordData, status: "completed" | "cancelled") => {
    if (!uid) return;
    const endedAt = new Date();
    const startedAt = asDate(session.startedAt);
    const actualMinutes = startedAt ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60_000)) : 0;
    void save(() => updateDoc(doc(getFirebase().db, "users", uid, "focus_sessions", session.id), {
      status, endedAt: Timestamp.fromDate(endedAt), actualMinutes, updatedAt: serverTimestamp(),
    }), status === "completed" ? "Focus session completed." : "Focus session cancelled.");
  };

  const createReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uid || (!reviewWins.trim() && !reviewLessons.trim() && !reviewNext.trim())) {
      setError("Add at least one reflection before saving."); return;
    }
    void save(() => addDoc(collection(getFirebase().db, "users", uid, "reviews"), {
      ...metadata(), cadence: "weekly", periodKey: habitPeriodKey(new Date(), "weekly"),
      wins: reviewWins.trim(), lessons: reviewLessons.trim(), nextStep: reviewNext.trim(),
    }), "Reflection saved.").then((saved) => { if (saved) { setReviewWins(""); setReviewLessons(""); setReviewNext(""); } });
  };

  const activeFocus = data.focus_sessions.find((session) => session.status === "active");
  const focusEnd = activeFocus ? asDate(activeFocus.endsAt) : null;
  const focusRemaining = focusEnd ? focusRemainingSeconds(focusEnd, focusTick) : 0;
  const activeFocusId = activeFocus?.id;
  useEffect(() => {
    if (!activeFocusId) return;
    const update = () => setFocusTick(Date.now());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [activeFocusId]);

  const firstName = ownerFirstName(user?.displayName);
  // "Welcome back" until the browser says what time it is there — which is
  // also what the server renders, so the two always agree on first paint.
  const hour = clock === null ? null : new Date(clock).getHours();
  const heading = hour === null ? "Welcome back." : hour < 12 ? "A clear start." : "Make today count.";
  const renderTask = (item: RecordData) => (
    <SwipeToDelete key={item.id} onDelete={() => deleteRecord("tasks", item.id, "Task deleted.")}>
      <article className={`${styles.record} nn-glass-card`}>
        <button className={styles.checkButton} onClick={() => toggleTask(item)} aria-label={item.status === "done" ? "Reopen task" : "Complete task"}>
          <span className={item.status === "done" || item.status === "completed" ? styles.checked : ""}>{item.status === "done" || item.status === "completed" ? "✓" : ""}</span>
        </button>
        <div className={styles.recordMain}><strong>{titleOf(item)}</strong><small>{item.dueAt ? `Due ${formatDate(item.dueAt)} · ${formatTime(item.dueAt)}` : "No due date"}</small></div>
        <button type="button" className={styles.inlineAction} onClick={() => openEdit("tasks", item)}>Edit</button>
        <span className={styles.priority}>{typeof item.priority === "string" ? item.priority : "normal"}</span>
      </article>
    </SwipeToDelete>
  );
  return <>
  <main className={styles.root}>
    <header className={styles.topbar}>
      <button className={styles.brand} onClick={() => router.push("/home")}><Icon name="grid" size={18}/><span>NN <i>/</i> LIFE</span></button>
      <div className={styles.topRight}><span className={styles.private}><i/> PRIVATE SPACE</span><button className={styles.refresh} onClick={() => void load()} aria-label="Refresh Life data" title="Refresh"><Icon name="clock" size={16}/></button><span className={styles.avatar}>{firstName.slice(0,1).toUpperCase()}</span></div>
    </header>
    <div className={styles.layout} onPointerDown={beginTabSwipe} onPointerUp={endTabSwipe} onPointerCancel={() => { swipeStart.current = null; }}>
      <div className={styles.breadcrumb}><button onClick={() => router.push("/home")}>NN HOME</button><span>/</span><span>LIFE</span><span className={styles.date}>{clock === null ? "" : dateLabel(new Date(clock))}</span></div>
      <section className={`${styles.hero} nn-glass-card`}>
        <div className={styles.heroCopy}><p className={styles.kicker}>YOUR PERSONAL DAYSPACE</p><h1>{heading}<br/><em>{firstName}.</em></h1><p className={styles.sub}>A thoughtful place for what matters today—and the things you&apos;re building over time.</p></div>
        <div className={styles.orbit} aria-hidden="true"><div className={styles.orbitRing}/><div className={styles.orbitCore+" "+styles.iconSurface}><Icon name="calendar" size={32}/></div><span className={styles.orbitDot}/></div>
        <div className={styles.heroMeta}><span>01 <i>/</i> DAILY OVERVIEW</span><span>{offline ? "OFFLINE / CACHED" : "PERSONAL DATA SPACE"}</span></div>
      </section>
      <nav className={styles.tabs} aria-label="Life sections">
        {TABS.map((item) => <button key={item.id} className={tab === item.id ? styles.tabActive : styles.tab} onClick={() => setTab(item.id)} aria-current={tab === item.id ? "page" : undefined}><Icon name={item.icon} size={16}/><span>{item.label}</span>{item.id === "tasks" && todayTasks.length > 0 ? <small>{todayTasks.length}</small> : null}</button>)}
      </nav>
      {error ? <div className={styles.error} role="alert"><Icon name="shield" size={17}/><span>{error}</span><button onClick={() => void load()}>Retry</button></div> : null}
      {notice ? <div className={styles.notice} role="status"><Icon name="check" size={16}/>{notice}<button onClick={() => setNotice(null)} aria-label="Dismiss"><Icon name="close" size={14}/></button></div> : null}
      {loading ? <div className={styles.loading}><span/><p>Opening your personal data…</p></div> : null}
      {!loading && tab === "today" ? <section className={styles.dashboard}>
        <div className={styles.mainColumn}>
          <GlassPanel tier={2} padding="lg" className={styles.panel}>
            <div className={styles.panelHead}><div><p className={styles.label}>YOUR SCHEDULE</p><h2>Today, in focus.</h2></div><button className={styles.inlineAction} onClick={() => setTab("calendar")}>Open calendar</button></div>
            {todayEvents.length ? todayEvents.map((item) => <SwipeToDelete key={item.id} onDelete={() => deleteRecord("calendar_events", item.id, "Calendar event deleted.")}><article className={styles.event}><time>{formatTime(item.start)}</time><span/><div><strong>{titleOf(item)}</strong><small>{formatTime(item.start)} — {formatTime(item.end)}</small></div></article></SwipeToDelete>) : <div className={styles.emptyInline}><span className={styles.emptyIcon+" "+styles.iconSurface}><Icon name="calendar" size={19}/></span><div><strong>Your day is open.</strong><small>No events scheduled for today.</small></div><button onClick={() => setTab("calendar")}>Add event</button></div>}
          </GlassPanel>
          <GlassPanel tier={2} padding="lg" className={styles.panel}>
            <div className={styles.panelHead}><div><p className={styles.label}>NEXT ACTIONS</p><h2>Things to move forward.</h2></div><button className={styles.inlineAction} onClick={() => setTab("tasks")}>All tasks</button></div>
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
        <section className={styles.calendarSurface} aria-label="Monthly calendar">
          <div className={styles.calendarToolbar}>
            <button type="button" aria-label="Previous month" onClick={() => shiftCalendarMonth(-1)}>‹</button>
            <h3>{calendarMonthLabel}</h3>
            <button type="button" aria-label="Next month" onClick={() => shiftCalendarMonth(1)}>›</button>
            <button type="button" className={styles.calendarToday} onClick={resetCalendar}>Today</button>
          </div>
          <div className={styles.calendarWeekdays} aria-hidden="true">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className={styles.calendarGrid} role="grid" aria-label={calendarMonthLabel}>
            {calendarDays.map((day) => <button
              type="button"
              role="gridcell"
              key={day.key}
              className={styles.calendarDay}
              data-outside={!day.inMonth || undefined}
              data-selected={selectedDateKey === day.key || undefined}
              data-today={day.isToday || undefined}
              aria-selected={selectedDateKey === day.key}
              aria-label={dateLabel(day.date) + (day.eventCount ? ", " + day.eventCount + " events" : "")}
              onClick={() => selectCalendarDay(day.key, day.date.getFullYear(), day.date.getMonth())}
            >
              <span>{day.day}</span>
              {day.eventCount > 0 ? <small>{day.eventCount}</small> : <i/>}
            </button>)}
          </div>
        </section>
        <div className={styles.calendarEventsHead}>
          <div><p className={styles.label}>SELECTED DAY</p><h3>{selectedDateLabel}</h3></div>
          <span className={styles.count}>{selectedCalendarEvents.length} EVENTS</span>
        </div>
        <div className={styles.list}>{selectedCalendarEvents.map((item) => <SwipeToDelete key={item.id} onDelete={() => deleteRecord("calendar_events", item.id, "Calendar event deleted.")}><article className={styles.record + " nn-glass-card"}><span className={styles.recordGlyph + " " + styles.iconSurface}><Icon name="calendar" size={17}/></span><div className={styles.recordMain}><strong>{titleOf(item)}</strong><small>{formatDate(item.start)} · {formatTime(item.start)} — {formatTime(item.end)}</small></div><button type="button" className={styles.inlineAction} onClick={() => openEdit("calendar_events", item)}>Edit</button><span className={styles.priority}>{typeof item.status === "string" ? item.status : "scheduled"}</span></article></SwipeToDelete>)}{selectedCalendarEvents.length === 0 ? <EmptyState icon="calendar" title="Nothing scheduled for this day." body="Choose another date or add an event to this day. Your other events remain on the calendar."/> : null}</div>
      </GlassPanel></section> : null}
      {!loading && tab === "reminders" ? <section className={styles.singleColumn}><GlassPanel tier={2} padding="lg" className={styles.panel}><div className={styles.panelHead}><div><p className={styles.label}>REMINDERS</p><h2>Remember at the right moment.</h2></div><span className={styles.count}>{data.reminders.length} SAVED</span></div>
        <form className={styles.captureForm} onSubmit={createReminder}><input value={reminderTitle} onChange={(e) => setReminderTitle(e.target.value)} placeholder="What should NN remind you?" aria-label="Reminder title" required maxLength={160}/><input type="datetime-local" value={reminderAt} onChange={(e) => setReminderAt(e.target.value)} aria-label="Reminder time" required/><button disabled={busy || !reminderTitle.trim()}><Icon name="plus" size={16}/> Save reminder</button></form>
        <div className={styles.list}>{data.reminders.map((item) => <SwipeToDelete key={item.id} onDelete={() => deleteRecord("reminders", item.id, "Reminder deleted.")}><article className={`${styles.record} nn-glass-card`}><span className={styles.recordGlyph}><Icon name="clock" size={17}/></span><div className={styles.recordMain}><strong>{titleOf(item)}</strong><small>{formatDate(item.fireAt)} · {formatTime(item.fireAt)}</small></div><button type="button" className={styles.inlineAction} onClick={() => openEdit("reminders", item)}>Edit</button><span className={styles.priority}>{typeof item.state === "string" ? item.state : "scheduled"}</span></article></SwipeToDelete>)}{data.reminders.length === 0 ? <EmptyState icon="clock" title="No reminders yet." body="Add a reminder and it will be stored in your private NN account. Delivery requires the notification service."/> : null}</div>
      </GlassPanel></section> : null}
      {!loading && tab === "notes" ? <section className={styles.notesLayout}><GlassPanel tier={2} padding="lg" className={styles.panel}><p className={styles.label}>QUICK NOTE</p><h2>Save the thought.</h2><form className={styles.noteForm} onSubmit={createNote}><input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} placeholder="Give this note a title" aria-label="Note title" required maxLength={160}/><textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Write freely. Your original note is kept in NN." aria-label="Note content" rows={7}/><button disabled={busy || !noteTitle.trim()}><Icon name="plus" size={16}/> Save note</button></form></GlassPanel><div className={styles.notesList}><div className={styles.panelHead}><div><p className={styles.label}>YOUR NOTES</p><h2>Thoughts, collected.</h2></div><span className={styles.count}>{data.notes.length} LOADED</span></div>{data.notes.map((item) => <SwipeToDelete key={item.id} onDelete={() => deleteRecord("notes", item.id, "Note deleted.")}><GlassPanel tier={2} padding="md" className={styles.noteCard}><strong>{titleOf(item)}</strong><p>{typeof item.body === "string" ? item.body : ""}</p><small>{formatDate(item.updatedAt)}</small><div className={styles.noteActions}><button type="button" className={styles.inlineAction} onClick={() => openEdit("notes", item)}>Edit</button><button type="button" className={styles.inlineAction} onClick={() => void openNoteHistory(item)}>History</button></div></GlassPanel></SwipeToDelete>)}{data.notes.length === 0 ? <EmptyState icon="file" title="Your notes begin here." body="The first note you save will appear in this space."/> : null}</div></section> : null}
      {!loading && tab === "habits" ? <section className={styles.singleColumn}>
        <GlassPanel tier={2} padding="lg" className={styles.panel}>
          <div className={styles.panelHead}><div><p className={styles.label}>DAILY PRACTICE</p><h2>Small actions, repeated.</h2></div><span className={styles.count}>{data.habits.filter((habit) => habit.status !== "archived").length} HABITS</span></div>
          <form className={styles.captureForm} onSubmit={createHabit}>
            <input value={habitTitle} onChange={(e) => setHabitTitle(e.target.value)} placeholder="Name a habit" aria-label="Habit name" required maxLength={120}/>
            <select value={habitCadence} onChange={(e) => setHabitCadence(e.target.value)} aria-label="Habit cadence"><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option></select>
            <button disabled={busy || !habitTitle.trim()}><Icon name="plus" size={16}/> Add habit</button>
          </form>
          <div className={styles.list}>{data.habits.filter((habit) => habit.status !== "archived").map((habit) => {
            const dateKey = clock === null ? "" : calendarDateKey(new Date(clock));
            const cadence = typeof habit.cadence === "string" ? habit.cadence : "daily";
            const periodKey = clock === null ? "" : habitPeriodKey(new Date(clock), cadence);
            const checked = data.habit_checkins.some((entry) => entry.habitId === habit.id && (entry.periodKey === periodKey || (!entry.periodKey && entry.dateKey === dateKey)));
            const count = data.habit_checkins.filter((entry) => entry.habitId === habit.id).length;
            return <article className={styles.record} key={habit.id}><span className={styles.recordGlyph}><Icon name="check" size={17}/></span><div className={styles.recordMain}><strong>{titleOf(habit)}</strong><small>{String(habit.cadence ?? "daily")} · {count} recorded check-ins</small></div><button type="button" className={styles.inlineAction} onClick={() => openEdit("habits", habit)}>Edit</button><button type="button" className={styles.inlineAction} disabled={busy || checked} onClick={() => checkInHabit(habit)}>{checked ? "Done today" : "Check in"}</button></article>;
          })}{data.habits.length === 0 ? <EmptyState icon="check" title="Start with one practice." body="Create a habit, then record each real check-in. NN does not generate streaks or past activity."/> : null}</div>
        </GlassPanel>
      </section> : null}
      {!loading && tab === "routines" ? <section className={styles.notesLayout}>
        <GlassPanel tier={2} padding="lg" className={styles.panel}><p className={styles.label}>REPEATABLE SYSTEMS</p><h2>Build a useful rhythm.</h2><form className={styles.noteForm} onSubmit={createRoutine}><input value={routineTitle} onChange={(e) => setRoutineTitle(e.target.value)} placeholder="Routine name" aria-label="Routine name" required maxLength={120}/><select value={routineCadence} onChange={(e) => setRoutineCadence(e.target.value)} aria-label="Routine cadence"><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option></select><textarea value={routineSteps} onChange={(e) => setRoutineSteps(e.target.value)} placeholder={"One step per line\nPrepare\nExecute\nReview"} aria-label="Routine steps" rows={5}/><button disabled={busy || !routineTitle.trim()}><Icon name="plus" size={16}/> Save routine</button></form></GlassPanel>
        <div className={styles.notesList}><div className={styles.panelHead}><div><p className={styles.label}>YOUR ROUTINES</p><h2>Ready when you are.</h2></div><span className={styles.count}>{data.routines.length} SAVED</span></div>{data.routines.map((routine) => {const steps = Array.isArray(routine.steps) ? routine.steps.filter((step): step is string => typeof step === "string") : []; const runs = data.routine_runs.filter((run) => run.routineId === routine.id).length; return <GlassPanel key={routine.id} tier={2} padding="md" className={styles.noteCard}><strong>{titleOf(routine)}</strong><ol className={styles.routineList}>{steps.map((step,index) => <li key={index}>{step}</li>)}</ol><small>{String(routine.cadence ?? "daily")} · {runs} recorded completions</small><button type="button" className={styles.inlineAction} onClick={() => openEdit("routines", routine)}>Edit</button><button type="button" className={styles.inlineAction} disabled={busy} onClick={() => runRoutine(routine)}>Mark complete</button></GlassPanel>;})}{data.routines.length === 0 ? <EmptyState icon="calendar" title="Design your first routine." body="Add a short sequence you can repeat. Completions are recorded only when you mark them."/> : null}</div>
      </section> : null}
      {!loading && tab === "focus" ? <section className={styles.singleColumn}><GlassPanel tier={2} padding="lg" className={styles.panel}><p className={styles.label}>ATTENTION SPACE</p><h2>Protect time for one thing.</h2>
        {activeFocus ? <div className={styles.focusSession} role="status"><span className={styles.focusCountdown}>{String(Math.floor(focusRemaining / 60)).padStart(2,"0")}:{String(focusRemaining % 60).padStart(2,"0")}</span><strong>{String(activeFocus.intention ?? "Focus session")}</strong><small>{focusRemaining === 0 ? "Planned time reached — finish when ready." : "Session in progress"}</small><div className={styles.focusActions}><button type="button" disabled={busy} onClick={() => finishFocusSession(activeFocus,"completed")}>Complete</button><button type="button" className={styles.inlineAction} disabled={busy} onClick={() => finishFocusSession(activeFocus,"cancelled")}>Cancel</button></div></div>
        : <form className={styles.captureForm} onSubmit={(event) => { event.preventDefault(); startFocusSession(); }}><input value={focusIntention} onChange={(e) => setFocusIntention(e.target.value)} placeholder="What will you focus on?" aria-label="Focus intention" required maxLength={160}/><select value={focusMinutes} onChange={(e) => setFocusMinutes(e.target.value)} aria-label="Focus duration"><option value="15">15 minutes</option><option value="25">25 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select><button disabled={busy || !focusIntention.trim()}><Icon name="bolt" size={16}/> Start focus</button></form>}
        <div className={styles.list}>{data.focus_sessions.filter((session) => session.status !== "active").slice(0,12).map((session) => <article className={styles.record} key={session.id}><span className={styles.recordGlyph}><Icon name="clock" size={17}/></span><div className={styles.recordMain}><strong>{String(session.intention ?? "Focus session")}</strong><small>{String(session.status ?? "saved")} · {Number(session.actualMinutes ?? 0)} minutes recorded</small></div></article>)}</div>
      </GlassPanel></section> : null}
      {!loading && tab === "reviews" ? <section className={styles.notesLayout}>
        <GlassPanel tier={2} padding="lg" className={styles.panel}><p className={styles.label}>WEEKLY REFLECTION</p><h2>Notice what matters.</h2><form className={styles.noteForm} onSubmit={createReview}><textarea value={reviewWins} onChange={(e) => setReviewWins(e.target.value)} placeholder="Wins — what moved forward?" aria-label="Review wins" rows={3}/><textarea value={reviewLessons} onChange={(e) => setReviewLessons(e.target.value)} placeholder="Lessons — what did you learn?" aria-label="Review lessons" rows={3}/><textarea value={reviewNext} onChange={(e) => setReviewNext(e.target.value)} placeholder="Next step — what matters now?" aria-label="Review next step" rows={3}/><button disabled={busy || (!reviewWins.trim() && !reviewLessons.trim() && !reviewNext.trim())}><Icon name="plus" size={16}/> Save reflection</button></form></GlassPanel>
        <div className={styles.notesList}><div className={styles.panelHead}><div><p className={styles.label}>PAST REFLECTIONS</p><h2>Your own words.</h2></div><span className={styles.count}>{data.reviews.length} SAVED</span></div>{data.reviews.map((review) => <GlassPanel key={review.id} tier={2} padding="md" className={styles.noteCard}><small>{String(review.periodKey ?? "Reflection")}</small><button type="button" className={styles.inlineAction} onClick={() => openEdit("reviews", review)}>Edit</button>{typeof review.wins === "string" && review.wins ? <p><strong>Wins</strong><br/>{review.wins}</p> : null}{typeof review.lessons === "string" && review.lessons ? <p><strong>Lessons</strong><br/>{review.lessons}</p> : null}{typeof review.nextStep === "string" && review.nextStep ? <p><strong>Next step</strong><br/>{review.nextStep}</p> : null}</GlassPanel>)}{data.reviews.length === 0 ? <EmptyState icon="file" title="Make space to reflect." body="Your saved reflections will appear here. No sample entries are added."/> : null}</div>
      </section> : null}

      {!loading && tab === "goals" ? <section className={styles.singleColumn}><GlassPanel tier={2} padding="lg" className={styles.panel}><div className={styles.panelHead}><div><p className={styles.label}>LONG-TERM DIRECTION</p><h2>Progress with purpose.</h2></div><span className={styles.count}>{data.goals.length} GOALS</span></div><form className={styles.captureForm} onSubmit={createGoal}><input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder="What are you working towards?" aria-label="Goal title" required maxLength={160}/><input type="number" min="0.01" step="any" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)} aria-label="Goal target" required/><input value={goalUnit} onChange={(e) => setGoalUnit(e.target.value)} placeholder="Unit (optional)" aria-label="Goal unit" maxLength={32}/><button disabled={busy || !goalTitle.trim()}><Icon name="plus" size={16}/> Add goal</button></form><div className={styles.list}>{data.goals.map((item) => { const progress = typeof item.progress === "number" ? item.progress : 0; const target = typeof item.target === "number" ? item.target : 0; const pct = target > 0 ? Math.min(100, Math.max(0, progress / target * 100)) : 0; return <SwipeToDelete key={item.id} onDelete={() => deleteRecord("goals", item.id, "Goal deleted.")}><article className={styles.goal}><div className={styles.goalTop}><strong>{titleOf(item)}</strong><small>{progress} / {target || "—"} {typeof item.unit === "string" ? item.unit : ""}</small></div><button type="button" className={styles.inlineAction} onClick={() => openEdit("goals", item)}>Edit goal</button><div className={styles.progress} role="progressbar" aria-label={`${titleOf(item)} progress`} aria-valuemin={0} aria-valuemax={target || 1} aria-valuenow={Math.min(progress, target || progress)}><span style={{ width: `${pct}%` }}/></div><div className={styles.goalActions}><button type="button" aria-label={`Decrease ${titleOf(item)} progress`} disabled={busy || progress <= 0} onClick={() => adjustGoal(item, -1)}>−</button><span>UPDATE PROGRESS</span><button type="button" aria-label={`Increase ${titleOf(item)} progress`} disabled={busy} onClick={() => adjustGoal(item, 1)}>+</button></div></article></SwipeToDelete>; })}{data.goals.length === 0 ? <EmptyState icon="graph" title="Give your ambition a shape." body="Goals you create in NN will be tracked here. No sample goals are inserted."/> : null}</div></GlassPanel></section> : null}
      <footer className={styles.footer}><span>NN LIFE · PERSONAL OPERATING ENVIRONMENT</span><span>{offline ? "LOCAL CACHE / SYNC PENDING" : "OWNER-SCOPED FIRESTORE DATA"}</span></footer>
    </div>
    <div className={styles.dock}><button onClick={() => router.push("/home")} aria-label="NN Home"><Icon name="grid" size={19}/></button><button className={styles.dockCurrent} aria-current="page"><Icon name="calendar" size={19}/><span>Life</span></button><button onClick={() => setTab("tasks")} aria-label="Tasks"><Icon name="check" size={19}/></button><button onClick={() => setTab("notes")} aria-label="Notes"><Icon name="file" size={19}/></button></div>
  </main>
  <Dialog
    open={historyNote !== null}
    onClose={() => setHistoryNote(null)}
    title="Note history"
    description="Immutable snapshots are created before each saved edit. The latest version is the note currently open."
  >
    {historyLoading ? <div className={styles.loading}><span/><p>Loading note history…</p></div> : historyEntries.length ? <div className={styles.historyList}>{historyEntries.map((version) => <article key={version.id} className={styles.historyEntry}><div><strong>{titleOf(version)}</strong><small>{formatDate(version.createdAt)}</small></div><p>{typeof version.body === "string" ? version.body : ""}</p></article>)}</div> : <EmptyState icon="clock" title="No earlier versions." body="An earlier version will appear here after you edit and save this note."/>}
  </Dialog>
  <Dialog
    open={pendingEdit !== null}
    onClose={() => setPendingEdit(null)}
    title="Edit record"
    description="Changes are saved to your private NN Life workspace."
    footer={<div className={styles.deleteDialogActions}>
      <button type="button" className={styles.deleteCancel} onClick={() => setPendingEdit(null)}>Cancel</button>
      <button type="submit" form="life-edit-form" className={styles.deleteConfirm} disabled={busy}>Save changes</button>
    </div>}
  >
    <form id="life-edit-form" className={styles.noteForm} onSubmit={submitEdit}>
      <input value={editDraft.title} onChange={(event) => setEditDraft((draft) => ({ ...draft, title: event.target.value }))} aria-label="Edit title" required maxLength={160}/>
      {pendingEdit?.name === "tasks" ? <input type="datetime-local" aria-label="Edit task due date" value={editDraft.dueAt} onChange={(event) => setEditDraft((draft) => ({ ...draft, dueAt: event.target.value }))}/> : null}
      {pendingEdit?.name === "calendar_events" ? <><input type="datetime-local" aria-label="Edit event start" required value={editDraft.start} onChange={(event) => setEditDraft((draft) => ({ ...draft, start: event.target.value }))}/><input type="datetime-local" aria-label="Edit event end" required value={editDraft.end} onChange={(event) => setEditDraft((draft) => ({ ...draft, end: event.target.value }))}/></> : null}
      {pendingEdit?.name === "reminders" ? <input type="datetime-local" aria-label="Edit reminder time" required value={editDraft.fireAt} onChange={(event) => setEditDraft((draft) => ({ ...draft, fireAt: event.target.value }))}/> : null}
      {pendingEdit?.name === "notes" ? <textarea aria-label="Edit note content" rows={7} value={editDraft.body} onChange={(event) => setEditDraft((draft) => ({ ...draft, body: event.target.value }))}/> : null}
      {pendingEdit?.name === "goals" ? <><input type="number" min="0.01" step="any" aria-label="Edit goal target" value={editDraft.target} onChange={(event) => setEditDraft((draft) => ({ ...draft, target: event.target.value }))}/><input aria-label="Edit goal unit" value={editDraft.unit} onChange={(event) => setEditDraft((draft) => ({ ...draft, unit: event.target.value }))}/></> : null}
      {pendingEdit?.name === "habits" ? <select aria-label="Edit habit cadence" value={editDraft.cadence} onChange={(event) => setEditDraft((draft) => ({ ...draft, cadence: event.target.value }))}><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option></select> : null}
      {pendingEdit?.name === "routines" ? <><select aria-label="Edit routine cadence" value={editDraft.cadence} onChange={(event) => setEditDraft((draft) => ({ ...draft, cadence: event.target.value }))}><option value="daily">Daily</option><option value="weekdays">Weekdays</option><option value="weekly">Weekly</option></select><textarea aria-label="Edit routine steps" rows={5} value={editDraft.steps} onChange={(event) => setEditDraft((draft) => ({ ...draft, steps: event.target.value }))}/></> : null}
      {pendingEdit?.name === "reviews" ? <><textarea aria-label="Edit review wins" rows={3} value={editDraft.wins} onChange={(event) => setEditDraft((draft) => ({ ...draft, wins: event.target.value }))}/><textarea aria-label="Edit review lessons" rows={3} value={editDraft.lessons} onChange={(event) => setEditDraft((draft) => ({ ...draft, lessons: event.target.value }))}/><textarea aria-label="Edit review next step" rows={3} value={editDraft.nextStep} onChange={(event) => setEditDraft((draft) => ({ ...draft, nextStep: event.target.value }))}/></> : null}
    </form>
  </Dialog>
  <Dialog
    open={pendingDelete !== null}
    onClose={() => setPendingDelete(null)}
    title="Delete this record?"
    description="This permanently removes the selected record from your private NN data. This action cannot currently be undone."
    footer={<div className={styles.deleteDialogActions}>
      <button type="button" className={styles.deleteCancel} onClick={() => setPendingDelete(null)}>Keep record</button>
      <button type="button" className={styles.deleteConfirm} disabled={busy} onClick={confirmDelete}>Delete permanently</button>
    </div>}
  >
    <p className={styles.deleteDialogText}>Only the selected record will be removed. Your other Life records will remain unchanged.</p>
  </Dialog>
  </>;
}

function SwipeToDelete({ children, onDelete }: { children: ReactNode; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const start = useRef<{ id: number; x: number; y: number } | null>(null);
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.pointerType !== "touch") return;
    const target = event.target;
    if (target instanceof Element && target.closest("button, a, input, textarea, select, [contenteditable=\"true\"]")) return;
    start.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    const origin = start.current;
    start.current = null;
    if (!origin || origin.id !== event.pointerId) return;
    const dx = event.clientX - origin.x;
    const dy = event.clientY - origin.y;
    if (Math.abs(dx) < 58 || Math.abs(dx) < Math.abs(dy) * 1.25) return;
    setOpen(dx < 0);
  };
  return <div className={`${styles.swipeShell} ${open ? styles.swipeOpen : ""}`} role="group" tabIndex={0} aria-label={open ? "Delete action revealed. Press Escape to close." : "Item actions. Swipe left or press Delete to reveal the delete action."} onKeyDown={(event) => { if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); setOpen(true); } if (event.key === "Escape") setOpen(false); }} onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { start.current = null; }} onClick={(event) => event.stopPropagation()}>
    <button type="button" className={styles.swipeDelete} onClick={onDelete} aria-label="Delete this item" aria-hidden={!open} tabIndex={open ? 0 : -1}><Icon name="close" size={16}/><span>Delete</span></button>
    <div className={styles.swipeContent}>{children}</div>
  </div>;
}

function EmptyState({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return <div className={styles.emptyState}><span><Icon name={icon} size={21}/></span><strong>{title}</strong><p>{body}</p></div>;
}
export function NNLifePreview() { return <LifeSurface />; }
function LifePage() { return <RequireOwner><LifeSurface/></RequireOwner>; }
export default LifePage;
