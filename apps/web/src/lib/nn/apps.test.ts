import { describe, expect, it } from "vitest";
import { isServerWritten } from "@nn/firebase";
import {
  APPLICATIONS,
  APPLICATION_COUNT,
  APP_FAMILIES,
  applicationBySlug,
  applicationsIn,
  matchApplications,
  openableApplications,
  searchableCollections,
} from "./apps";

describe("the NN application registry", () => {
  it("holds exactly the thirty-four approved applications", () => {
    // The founder approved thirty-four. A thirty-fifth is a scope decision,
    // not a code change — App Factory is a system capability, not an app.
    expect(APPLICATION_COUNT).toBe(34);
  });

  it("gives every application a unique slug", () => {
    const slugs = APPLICATIONS.map((app) => app.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("uses URL-safe slugs, since they appear in routes", () => {
    for (const app of APPLICATIONS) {
      expect(app.slug, app.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("files every application under a known family, and no family is empty", () => {
    const counted = APP_FAMILIES.reduce((total, family) => total + applicationsIn(family).length, 0);
    expect(counted).toBe(APPLICATION_COUNT);
    for (const family of APP_FAMILIES) {
      expect(applicationsIn(family).length, family).toBeGreaterThan(0);
    }
  });

  it("does not re-create the consolidated applications", () => {
    // Wealth→Finance, Inbox→Mail, Health & Wellness→Body, Media Vault→Files,
    // Relationships→Contacts. These consolidations are already approved.
    const names = APPLICATIONS.map((app) => app.name);
    for (const retired of ["Wealth", "Inbox", "Health & Wellness", "Media Vault", "Relationships"]) {
      expect(names).not.toContain(retired);
    }
    for (const kept of ["Finance", "Mail", "Body", "Files", "Contacts", "Learning Vault"]) {
      expect(names).toContain(kept);
    }
  });

  it("only calls an application openable when it names a real route", () => {
    for (const app of openableApplications()) {
      expect(app.route, app.name).toBeTruthy();
      expect(app.route, app.name).toMatch(/^\//);
    }
    expect(openableApplications().length).toBeLessThan(APPLICATION_COUNT);
  });

  it("never offers to search a collection the browser may not read", () => {
    // audit_logs, permissions, credentials and the rest are server-written;
    // a client query would be refused by the rules. Keeping them out of the
    // search list means search never shows the founder a denial it caused.
    for (const name of searchableCollections()) {
      expect(isServerWritten(name), name).toBe(false);
    }
  });

  it("derives searchable collections from the applications themselves", () => {
    expect(searchableCollections()).toContain("tasks");
    expect(searchableCollections()).toContain("notes");
    // sorted and deduplicated, so the order cannot drift between renders
    const names = [...searchableCollections()];
    expect(names).toEqual([...new Set(names)].sort());
  });

  it("finds an application by slug, and nothing by a slug that is not one", () => {
    expect(applicationBySlug("life")?.name).toBe("Life");
    expect(applicationBySlug("not-an-app")).toBeUndefined();
  });
});

describe("matchApplications", () => {
  it("returns everything for an empty term rather than nothing", () => {
    expect(matchApplications("").length).toBe(APPLICATION_COUNT);
    expect(matchApplications("   ").length).toBe(APPLICATION_COUNT);
  });

  it("matches on name, family and description, case-insensitively", () => {
    expect(matchApplications("FINANCE").map((a) => a.name)).toContain("Finance");
    expect(matchApplications("education").length).toBe(applicationsIn("Education").length);
    expect(matchApplications("passkeys").map((a) => a.name)).toContain("Security Centre");
  });

  it("finds nothing for a term that is in nothing", () => {
    expect(matchApplications("zzzzqqq")).toEqual([]);
  });
});
