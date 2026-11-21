export interface CalendarGridDay {
  key: string;
  date: Date;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  eventCount: number;
}

/** A stable local-calendar key; never routes a date through UTC. */
export function calendarDateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return [year, month, day].join("-");
}

/** Builds a six-week Sunday-first month grid with event counts per local day. */
export function buildCalendarGrid(
  year: number,
  month: number,
  today: Date,
  eventDates: readonly Date[],
): CalendarGridDay[] {
  const eventCounts = new Map<string, number>();
  for (const date of eventDates) {
    const key = calendarDateKey(date);
    eventCounts.set(key, (eventCounts.get(key) ?? 0) + 1);
  }
  const first = new Date(year, month, 1);
  const gridStart = new Date(year, month, 1 - first.getDay());
  const todayKey = calendarDateKey(today);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + index);
    const key = calendarDateKey(date);
    return {
      key,
      date,
      day: date.getDate(),
      inMonth: date.getMonth() === month && date.getFullYear() === year,
      isToday: key === todayKey,
      eventCount: eventCounts.get(key) ?? 0,
    };
  });
}
