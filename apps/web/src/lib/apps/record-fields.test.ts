import { describe, expect, it } from "vitest";
import { isValidDateInput, parseRecordField, toDateInputValue } from "./record-fields";
import type { AppField } from "./sections";

describe("record date fields", () => {
  it("keeps a date-only value on the same calendar day", () => {
    expect(toDateInputValue("2026-11-21")).toBe("2026-11-21");
  });

  it("formats timestamp dates using local calendar components, not UTC slicing", () => {
    const value = new Date(2026, 10, 21, 23, 30);
    expect(toDateInputValue(value)).toBe("2026-11-21");
  });

  it("rejects impossible calendar dates", () => {
    expect(isValidDateInput("2026-02-29")).toBe(false);
    expect(isValidDateInput("2028-02-29")).toBe(true);
    expect(isValidDateInput("21-11-2026")).toBe(false);
  });
});

describe("record field parsing", () => {
  it("parses finite numbers and rejects invalid numeric values", () => {
    const field: AppField = { key: "amount", label: "Amount", type: "number" };
    expect(parseRecordField(field, "12.5")).toEqual({ ok: true, value: 12.5 });
    expect(parseRecordField(field, "nope")).toEqual({ ok: false, error: "Amount must be a number." });
  });

  it("preserves empty values as null so existing fields can be cleared", () => {
    const field: AppField = { key: "detail", label: "Detail", type: "longtext" };
    expect(parseRecordField(field, "")).toEqual({ ok: true, value: null });
  });

  it("validates choice values against the declared options", () => {
    const field: AppField = { key: "status", label: "Status", type: "choice", choices: ["open", "done"] };
    expect(parseRecordField(field, "done")).toEqual({ ok: true, value: "done" });
    expect(parseRecordField(field, "admin")).toEqual({ ok: false, error: "Choose a valid status." });
  });
});
