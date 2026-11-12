import { describe, expect, it } from "vitest";
import { isServerWritten } from "@nn/firebase";
import {
  APPLICATIONS,
  GROUPS,
  matchApplications,
  openableApplications,
  searchableCollections,
} from "./registry";

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
    // Named deliberately: marking an application available is a claim that it
    // works, and this is the guard against making that claim by accident.
    expect(available.map((app) => app.id)).toEqual(["life", "search"]);
    expect(available.every((app) => Boolean(app.href))).toBe(true);
    // The two are the same set from either direction.
    expect(APPLICATIONS.filter((app) => app.href)).toHaveLength(available.length);
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

/* ------------------------------------------------------------------------
   The collections map and the helpers derived from it.

   `collections` says which owner collections an application reads and writes.
   Search is built on it, so the invariants below are what keep search from
   asking Firestore for something the rules will refuse.
   --------------------------------------------------------------------- */

describe("the collections map", () => {
  it("never offers to search a collection the browser may not read", () => {
    // audit_logs, permissions, credentials and the rest are server-written.
    // A client query would be refused, and search would be showing the
    // founder a denial it had caused itself.
    for (const name of searchableCollections()) {
      expect(isServerWritten(name), name).toBe(false);
    }
  });

  it("derives searchable collections from the applications themselves", () => {
    expect(searchableCollections()).toContain("tasks");
    expect(searchableCollections()).toContain("notes");
  });

  it("returns them sorted and deduplicated, so the order cannot drift", () => {
    const names = [...searchableCollections()];
    expect(names).toEqual([...new Set(names)].sort());
  });

  it("only claims a collection for an application that has a surface to show it in", () => {
    for (const app of APPLICATIONS) {
      if ((app.collections ?? []).length === 0) continue;
      expect(app.href, `${app.name} claims collections but has no surface`).toBeDefined();
    }
  });
});

describe("openableApplications", () => {
  it("returns exactly those applications with a real route", () => {
    const openable = openableApplications();
    expect(openable.length).toBeGreaterThan(0);
    expect(openable.length).toBeLessThan(APPLICATIONS.length);
    for (const app of openable) expect(app.href, app.name).toBeDefined();
  });
});

describe("matchApplications", () => {
  it("returns everything for an empty term rather than nothing", () => {
    expect(matchApplications("").length).toBe(APPLICATIONS.length);
    expect(matchApplications("   ").length).toBe(APPLICATIONS.length);
  });

  it("matches name, group and description, case-insensitively", () => {
    expect(matchApplications("FINANCE").map((a) => a.name)).toContain("Finance");
    expect(matchApplications("passkeys").map((a) => a.name)).toContain("Security Centre");
  });

  it("does not re-create the consolidated applications", () => {
    // Wealth→Finance, Inbox→Mail, Health & Wellness→Body, Media Vault→Files,
    // Relationships→Contacts are approved consolidations.
    const names = APPLICATIONS.map((app) => app.name);
    for (const retired of ["Wealth", "Inbox", "Health & Wellness", "Media Vault", "Relationships"]) {
      expect(names).not.toContain(retired);
    }
    for (const kept of ["Finance", "Mail", "Body", "Files", "Contacts", "Learning Vault"]) {
      expect(names).toContain(kept);
    }
  });

  it("finds nothing for a term that is in nothing", () => {
    expect(matchApplications("zzzzqqq")).toEqual([]);
  });
});
