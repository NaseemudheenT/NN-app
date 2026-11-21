import { calendarDateKey } from "./calendar-grid";

export function habitPeriodKey(date: Date, cadence: string): string {
  const dayKey = calendarDateKey(date);
  if (cadence !== "weekly") return dayKey;
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return calendarDateKey(monday);
}

export function isHabitDueOn(date: Date, cadence: string): boolean {
  return cadence !== "weekdays" || (date.getDay() !== 0 && date.getDay() !== 6);
}
