import { Timestamp } from "firebase/firestore";

export type EditableLifeCollection =
  | "tasks"
  | "calendar_events"
  | "reminders"
  | "notes"
  | "goals"
  | "habits"
  | "routines"
  | "reviews";

export interface LifeEditDraft {
  title: string;
  body: string;
  dueAt: string;
  start: string;
  end: string;
  fireAt: string;
  target: string;
  unit: string;
  cadence: string;
  steps: string;
  wins: string;
  lessons: string;
  nextStep: string;
}

export type LifeEditResult =
  | { ok: true; patch: Record<string, unknown> }
  | { ok: false; error: string };

function parseDateTime(value: string): Date | null {
  if (!value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseSteps(value: string): string[] {
  return value.split(/\r?\n/).map((step) => step.trim()).filter(Boolean).slice(0, 20);
}

export function buildLifeEditPatch(
  collection: EditableLifeCollection,
  draft: LifeEditDraft,
  timeZone: string,
): LifeEditResult {
  const title = draft.title.trim();
  if (!title) return { ok: false, error: "Enter a title before saving." };
  const patch: Record<string, unknown> = { title };

  switch (collection) {
    case "tasks": {
      const dueAt = draft.dueAt ? parseDateTime(draft.dueAt) : null;
      if (draft.dueAt && !dueAt) return { ok: false, error: "Choose a valid task due date." };
      patch.dueAt = dueAt ? Timestamp.fromDate(dueAt) : null;
      break;
    }
    case "calendar_events": {
      const start = parseDateTime(draft.start);
      const end = parseDateTime(draft.end);
      if (!start || !end || end <= start) {
        return { ok: false, error: "Choose a valid end time after the event start." };
      }
      patch.start = Timestamp.fromDate(start);
      patch.end = Timestamp.fromDate(end);
      patch.timeZone = timeZone;
      break;
    }
    case "reminders": {
      const fireAt = parseDateTime(draft.fireAt);
      if (!fireAt) return { ok: false, error: "Choose a valid reminder time." };
      patch.fireAt = Timestamp.fromDate(fireAt);
      patch.timeZone = timeZone;
      break;
    }
    case "notes":
      patch.body = draft.body.trim();
      break;
    case "goals": {
      const target = Number(draft.target);
      if (!Number.isFinite(target) || target <= 0) {
        return { ok: false, error: "Enter a goal target greater than zero." };
      }
      patch.target = target;
      patch.unit = draft.unit.trim();
      break;
    }
    case "habits":
      if (!["daily", "weekdays", "weekly"].includes(draft.cadence)) {
        return { ok: false, error: "Choose a valid habit cadence." };
      }
      patch.cadence = draft.cadence;
      break;
    case "routines":
      if (!["daily", "weekdays", "weekly"].includes(draft.cadence)) {
        return { ok: false, error: "Choose a valid routine cadence." };
      }
      patch.cadence = draft.cadence;
      patch.steps = parseSteps(draft.steps);
      break;
    case "reviews":
      if (!draft.wins.trim() && !draft.lessons.trim() && !draft.nextStep.trim()) {
        return { ok: false, error: "Add at least one reflection before saving." };
      }
      patch.wins = draft.wins.trim();
      patch.lessons = draft.lessons.trim();
      patch.nextStep = draft.nextStep.trim();
      break;
  }
  return { ok: true, patch };
}
