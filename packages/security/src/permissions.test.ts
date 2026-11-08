import { describe, expect, it } from "vitest";
import { ALWAYS_CONFIRM, decide, isSensitive, type PermissionGrant } from "./permissions";

const grant = (over: Partial<PermissionGrant> = {}): PermissionGrant => ({
  scope: "notes.write", tier: "modify",
  grantedAt: "2026-01-01T00:00:00Z", expiresAt: null, revoked: false, ...over,
});

describe("permission decisions", () => {
  it("lets routine authorised work run without interrupting the founder", () => {
    const d = decide("update_note", "notes.write", [grant()]);
    expect(d.allowed).toBe(true);
    expect(d.approval).toBe("none");
  });

  it("fails closed when no grant exists", () => {
    const d = decide("update_note", "notes.write", []);
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/No grant/);
  });

  it("fails closed on a revoked grant", () => {
    expect(decide("update_note", "notes.write", [grant({ revoked: true })]).allowed).toBe(false);
  });

  it("fails closed on an expired grant", () => {
    const d = decide("update_note", "notes.write",
      [grant({ expiresAt: "2026-01-02T00:00:00Z" })], new Date("2026-06-01T00:00:00Z"));
    expect(d.allowed).toBe(false);
    expect(d.reason).toMatch(/expired/);
  });

  it("honours a grant that has not yet expired", () => {
    const d = decide("update_note", "notes.write",
      [grant({ expiresAt: "2027-01-01T00:00:00Z" })], new Date("2026-06-01T00:00:00Z"));
    expect(d.allowed).toBe(true);
  });

  it("escalates a sensitive action even under a broad grant", () => {
    // The crucial case: a wide 'modify' grant must not become a licence to
    // send email on the founder's behalf.
    const d = decide("send_email", "mail.write", [grant({ scope: "mail.write", tier: "modify" })]);
    expect(d.allowed).toBe(true);
    expect(d.approval).toBe("confirm");
    expect(d.reason).toMatch(/always requires explicit approval/);
  });

  it("demands re-authentication for a security-tier action", () => {
    const d = decide("change_security_setting", "security.write",
      [grant({ scope: "security.write", tier: "security" })]);
    expect(d.approval).toBe("reauthenticate");
  });

  it.each(ALWAYS_CONFIRM)("never lets %s run silently", (action) => {
    const d = decide(action, "any.scope", [grant({ scope: "any.scope", tier: "modify" })]);
    expect(d.approval).not.toBe("none");
  });

  it("recognises the sensitive action list", () => {
    expect(isSensitive("transfer_money")).toBe(true);
    expect(isSensitive("read_note")).toBe(false);
  });
});
