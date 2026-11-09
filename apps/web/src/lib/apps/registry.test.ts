import { describe, expect, it } from "vitest";
import { APPLICATIONS, GROUPS } from "./registry";

describe("NN application registry", () => {
  it("contains the 34 applications in the approved product registry", () => {
    expect(APPLICATIONS).toHaveLength(34);
  });

  it("uses unique stable application IDs", () => {
    const ids = APPLICATIONS.map((app) => app.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("exposes only application surfaces with an implemented route", () => {
    const available = APPLICATIONS.filter((app) => app.availability === "available");
    expect(available.map((app) => app.id)).toEqual(["life"]);
    expect(available.every((app) => Boolean(app.href))).toBe(true);
    expect(APPLICATIONS.filter((app) => app.href)).toHaveLength(1);
    expect(APPLICATIONS.every((app) => app.overviewHref === `/apps/${app.id}`)).toBe(true);
  });

  it("derives group counts from the registry rather than hardcoding them", () => {
    expect(GROUPS.reduce((total, group) => total + Number(group.count), 0)).toBe(34);
    expect(GROUPS.map((group) => group.name)).toEqual([
      "Life & wellbeing",
      "Education",
      "Money & work",
      "Creation & communication",
      "Knowledge & insight",
      "System",
    ]);
  });

  it("keeps REN and App Factory as system capabilities, not launcher apps", () => {
    expect(APPLICATIONS.some((app) => app.name === "REN")).toBe(false);
    expect(APPLICATIONS.some((app) => app.name === "App Factory")).toBe(false);
  });
});
