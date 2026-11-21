import { describe, expect, it } from "vitest";
import { Timestamp } from "firebase/firestore";
import { buildLifeEditPatch, type LifeEditDraft } from "./life-edit";

const draft: LifeEditDraft = {
  title: "  Plan  ",
  body: "  Keep the important detail.  ",
  dueAt: "",
  start: "2026-11-21T09:00",
  end: "2026-11-21T10:00",
  fireAt: "2026-11-21T11:00",
  target: "12",
  unit: "weeks",
  cadence: "weekdays",
  steps: " Prepare \n\n Execute \nReview ",
  wins: "  Shipped the first version. ",
  lessons: "",
  nextStep: "  Test the flow. ",
};

describe("buildLifeEditPatch", () => {
  it("normalises task titles and clears an optional due date", () => {
    const result = buildLifeEditPatch("tasks", draft, "Asia/Kolkata");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.patch).toEqual({ title: "Plan", dueAt: null });
  });

  it("rejects an event whose end is not after its start", () => {
    const result = buildLifeEditPatch("calendar_events", { ...draft, end: draft.start }, "Asia/Kolkata");
    expect(result).toEqual({ ok: false, error: "Choose a valid end time after the event start." });
  });

  it("writes valid event timestamps and the selected timezone", () => {
    const result = buildLifeEditPatch("calendar_events", draft, "Asia/Kolkata");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.patch.timeZone).toBe("Asia/Kolkata");
      expect(result.patch.start).toBeInstanceOf(Timestamp);
      expect(result.patch.end).toBeInstanceOf(Timestamp);
    }
  });

  it("requires a positive finite goal target", () => {
    expect(buildLifeEditPatch("goals", { ...draft, target: "0" }, "UTC").ok).toBe(false);
    const result = buildLifeEditPatch("goals", draft, "UTC");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.patch).toMatchObject({ target: 12, unit: "weeks" });
  });

  it("validates routine cadence and normalises non-empty steps", () => {
    const result = buildLifeEditPatch("routines", draft, "UTC");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.patch).toMatchObject({ cadence: "weekdays", steps: ["Prepare", "Execute", "Review"] });
    expect(buildLifeEditPatch("routines", { ...draft, cadence: "monthly" }, "UTC").ok).toBe(false);
  });

  it("does not allow an empty weekly reflection", () => {
    expect(buildLifeEditPatch("reviews", { ...draft, wins: " ", nextStep: "" , lessons: "" }, "UTC").ok).toBe(false);
  });
});
