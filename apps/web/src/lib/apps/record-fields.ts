import type { AppField } from "./sections";

/**
 * Converts stored date values to the calendar-date string expected by
 * <input type="date"> without shifting the day through UTC.
 */
export function toDateInputValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  let date: Date;
  if (typeof value === "object" && value !== null && "toDate" in value &&
      typeof (value as { toDate?: unknown }).toDate === "function") {
    date = (value as { toDate: () => Date }).toDate();
  } else if (value instanceof Date) {
    date = value;
  } else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return isValidDateInput(value) ? value : "";
  } else if (typeof value === "string" || typeof value === "number") {
    date = new Date(value);
  } else {
    return "";
  }
  if (Number.isNaN(date.getTime())) return "";
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isValidDateInput(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

export type ParsedField =
  | { ok: true; value: string | number | null }
  | { ok: false; error: string };

/** Validates a field at the boundary before it becomes a Firestore value. */
export function parseRecordField(field: AppField, raw: string): ParsedField {
  if (raw.trim() === "") return { ok: true, value: null };
  if (field.type === "number") {
    const value = Number(raw);
    return Number.isFinite(value)
      ? { ok: true, value }
      : { ok: false, error: `${field.label} must be a number.` };
  }
  if (field.type === "date") {
    return isValidDateInput(raw)
      ? { ok: true, value: raw }
      : { ok: false, error: `${field.label} must be a valid date.` };
  }
  if (field.type === "choice" && field.choices && !field.choices.includes(raw)) {
    return { ok: false, error: `Choose a valid ${field.label.toLocaleLowerCase()}.` };
  }
  return { ok: true, value: raw };
}
