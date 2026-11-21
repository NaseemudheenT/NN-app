import { describe, expect, it } from "vitest";
import { buildCalendarGrid, calendarDateKey } from "./calendar-grid";

describe("NN Life month grid", () => {
  it("always returns six complete weeks beginning on Sunday", () => {
    const days = buildCalendarGrid(2025, 1, new Date(2025, 1, 12), []);
    expect(days).toHaveLength(42);
    expect(days[0]?.date.getDay()).toBe(0);
    expect(days[41]?.date.getDay()).toBe(6);
  });

  it("marks days outside the displayed month and identifies today", () => {
    const days = buildCalendarGrid(2025, 1, new Date(2025, 1, 12), []);
    expect(days.some((day) => !day.inMonth)).toBe(true);
    expect(days.find((day) => day.isToday)?.key).toBe("2025-02-12");
  });

  it("counts multiple events on the same local calendar day", () => {
    const events = [new Date(2025, 1, 12, 9), new Date(2025, 1, 12, 17), new Date(2025, 1, 13, 8)];
    const days = buildCalendarGrid(2025, 1, new Date(2025, 1, 12), events);
    expect(days.find((day) => day.key === "2025-02-12")?.eventCount).toBe(2);
    expect(days.find((day) => day.key === "2025-02-13")?.eventCount).toBe(1);
  });

  it("handles leap February and preserves local date keys", () => {
    const days = buildCalendarGrid(2028, 1, new Date(2028, 1, 29), []);
    expect(days.some((day) => day.key === "2028-02-29" && day.inMonth && day.isToday)).toBe(true);
    expect(calendarDateKey(new Date(2028, 1, 29, 23, 59))).toBe("2028-02-29");
  });
});
