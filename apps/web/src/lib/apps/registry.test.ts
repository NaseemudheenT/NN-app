import { describe, expect, it } from "vitest";
import { isServerWritten } from "@nn/firebase";
import {
  APPLICATIONS,
  GROUPS,
  matchApplications,
  openableApplications,
  searchableCollections,
} from "./registry";
import { APP_SECTIONS } from "./sections";

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
    // Every application now has somewhere real to work: Life, Files and
    // Search on their own routes, the rest on the shared surface against
    // their own collections. An entry with neither is unopenable, which is
    // worse than not listing it at all — so this asserts there are none.
    expect(available).toHaveLength(APPLICATIONS.length);
    expect(available.every((app) => Boolean(app.href))).toBe(true);
    // Search is the exception and always will be: it reads the collections
    // the other applications own, and owns none itself.
    for (const app of available) {
      if (app.id === "search") continue;
      expect((app.collections?.length ?? 0) > 0, app.name).toBe(true);
    }
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
    // All of them, now that every application has a surface. The assertion
    // that matters is not the count but that nothing is offered without a
    // route behind it.
    expect(openable).toHaveLength(APPLICATIONS.length);
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

describe("every application is actually openable", () => {
  it("has either a surface of its own or sections to work in", () => {
    for (const app of APPLICATIONS) {
      const sections = APP_SECTIONS[app.id] ?? [];
      const ownRoute = app.href !== undefined && app.href !== app.overviewHref;
      // Both would be fine; neither means /apps/<id> renders nothing and the
      // launcher offers a door that opens onto a 404.
      expect(ownRoute || sections.length > 0, app.name).toBe(true);
    }
  });

  it("gives every section its own collection, across the whole registry", () => {
    const all = Object.values(APP_SECTIONS).flatMap((s) => s.map((x) => x.collection));
    // Two applications sharing a collection would silently show each other's
    // records — and the founder would have no way to tell which app wrote one.
    expect(new Set(all).size, "duplicate collection").toBe(all.length);
  });

  it("never claims a collection the server owns", () => {
    const all = Object.values(APP_SECTIONS).flatMap((s) => s.map((x) => x.collection));
    for (const name of all) {
      // audit_logs, credentials and the rest are written by NN's server and
      // refused from the browser by the rules. An application pointed at one
      // would offer a form that can only ever fail.
      expect(isServerWritten(name), name).toBe(false);
    }
  });

  it("names collections the way the security rules expect", () => {
    for (const [id, sections] of Object.entries(APP_SECTIONS)) {
      for (const section of sections) {
        // Lower snake case, no slashes: a path segment, not a path.
        expect(section.collection, `${id}/${section.name}`).toMatch(/^[a-z][a-z0-9_]*$/);
        expect(section.fields.every((f) => /^[a-z][a-zA-Z0-9]*$/.test(f.key)), section.collection).toBe(true);
      }
    }
  });
});
