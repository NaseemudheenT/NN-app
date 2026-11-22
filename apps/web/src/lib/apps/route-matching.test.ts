import { describe, expect, it } from "vitest";
import { matchesPathname } from "./route-matching";

describe("NN application route matching", () => {
  it("keeps a workspace active on its nested pages", () => {
    expect(matchesPathname("/life/tasks", "/life")).toBe(true);
    expect(matchesPathname("/apps/college/materials/unit-one", "/apps/college")).toBe(true);
  });

  it("does not confuse sibling paths with nested routes", () => {
    expect(matchesPathname("/lifestyle", "/life")).toBe(false);
    expect(matchesPathname("/apps/college-prep", "/apps/college")).toBe(false);
  });

  it("treats trailing slashes as the same destination", () => {
    expect(matchesPathname("/life/", "/life")).toBe(true);
    expect(matchesPathname("/life", "/life/")).toBe(true);
  });

  it("rejects missing and malformed route values", () => {
    expect(matchesPathname("/life", undefined)).toBe(false);
    expect(matchesPathname("life", "/life")).toBe(false);
    expect(matchesPathname("/life", "life")).toBe(false);
  });
});
