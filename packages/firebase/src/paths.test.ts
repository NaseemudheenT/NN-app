import { describe, expect, it } from "vitest";
import { isAppendOnly, isServerWritten, paths } from "./paths";

describe("path builders", () => {
  it("roots every document under the owner", () => {
    expect(paths.doc("u1", "notes", "n1")).toBe("users/u1/notes/n1");
    expect(paths.subdoc("u1", "notes", "n1", "versions", "v1"))
      .toBe("users/u1/notes/n1/versions/v1");
  });

  it("keeps server-only areas outside the owner's writable subtree", () => {
    // Storage rules are a permissive union: anything under users/{uid}/ is
    // writable by the owner no matter what a later rule says.
    expect(paths.storage.derived("u1", "x.png").startsWith("users/")).toBe(false);
    expect(paths.storage.backup("u1", "x.enc").startsWith("users/")).toBe(false);
  });

  it("builds storage paths with the same ownership shape", () => {
    expect(paths.storage.file("u1", "academic", "unit3.pdf"))
      .toBe("users/u1/academic/unit3.pdf");
    expect(paths.storage.derived("u1", "thumb.png")).toBe("derived/u1/thumb.png");
    expect(paths.storage.backup("u1", "2026-11.enc")).toBe("backups/u1/2026-11.enc");
  });

  it("refuses a segment that would escape the owner's subtree", () => {
    expect(() => paths.doc("u1", "notes", "../../other")).toThrow(/must not contain/);
    expect(() => paths.doc("u1/../u2", "notes", "n1")).toThrow(/must not contain/);
    expect(() => paths.doc("u1", "notes", "..")).toThrow(/must not be/);
    expect(() => paths.doc("", "notes", "n1")).toThrow(/must not be empty/);
  });
});

describe("rule mirrors", () => {
  it("knows which collections only the server may write", () => {
    expect(isServerWritten("audit_logs")).toBe(true);
    expect(isServerWritten("permissions")).toBe(true);
    expect(isServerWritten("credentials")).toBe(true);
    expect(isServerWritten("notes")).toBe(false);
  });

  it("knows which subcollections are append-only", () => {
    expect(isAppendOnly("versions")).toBe(true);
    expect(isAppendOnly("messages")).toBe(true);
    expect(isAppendOnly("attachments")).toBe(false);
  });
});
