import { describe, expect, it } from "vitest";
import { habitPeriodKey, isHabitDueOn } from "./life-periods";

describe("Life habit cadence", () => {
  it("uses one check-in period per day for daily habits", () => {
    expect(habitPeriodKey(new Date(2026, 10, 21), "daily")).toBe("2026-11-21");
  });
  it("uses the Monday date as the weekly habit period", () => {
    expect(habitPeriodKey(new Date(2026, 10, 21), "weekly")).toBe("2026-11-16");
    expect(habitPeriodKey(new Date(2026, 10, 16), "weekly")).toBe("2026-11-16");
  });
  it("does not schedule weekday habits on weekends", () => {
    expect(isHabitDueOn(new Date(2026, 10, 20), "weekdays")).toBe(true);
    expect(isHabitDueOn(new Date(2026, 10, 21), "weekdays")).toBe(false);
    expect(isHabitDueOn(new Date(2026, 10, 22), "weekdays")).toBe(false);
  });
});
