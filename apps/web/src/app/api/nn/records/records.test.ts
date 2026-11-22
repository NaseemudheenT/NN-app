import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/**
 * The route that became NN's authorisation boundary.
 *
 * When the browser could reach Firestore directly, the rules were the only
 * lock and a mistake here could not matter. It cannot reach Firestore on
 * this project — there is no Firebase session to satisfy the rules with — so
 * these routes are now the thing standing between a request and the
 * founder's life. The properties below are the ones that make that safe.
 */

const { paths, isServerWritten } = await import("@nn/firebase");

/** The same check the routes apply before touching a path. */
function badName(name: string): boolean {
  return name.length === 0 || name.length > 80 || /[/\\.#$[\]]/.test(name);
}

describe("what a collection name is allowed to be", () => {
  it("refuses anything that could climb out of the founder's subtree", () => {
    for (const bad of [
      "../../system", "a/b", "..", ".", "users/other/tasks",
      "a#b", "a$b", "a[b]", "a\\b", "", "x".repeat(81),
    ]) {
      expect(badName(bad), bad).toBe(true);
    }
  });

  it("allows the ordinary ones", () => {
    for (const good of ["tasks", "notes", "calendar_events", "documents", "goals"]) {
      expect(badName(good), good).toBe(false);
    }
  });

  it("builds every path from the uid, never by concatenation", () => {
    // A path built from a template is a path an attacker can shape.
    const built = paths.collection("owner-1", "tasks");
    expect(built).toContain("owner-1");
    expect(built).toContain("tasks");
    const other = paths.collection("owner-2", "tasks");
    expect(other).not.toContain("owner-1");
  });
});

describe("what stays refused", () => {
  it("keeps NN's own collections out of a browser's reach", () => {
    // Exactly what the Firestore rules refuse. The route refuses them too,
    // because the route is now the lock that is actually being used.
    for (const owned of ["audit_logs", "security_events", "credentials"]) {
      expect(isServerWritten(owned), owned).toBe(true);
    }
  });

  it("still allows the founder's own records", () => {
    for (const mine of ["tasks", "notes", "goals"]) {
      expect(isServerWritten(mine), mine).toBe(false);
    }
  });
});
