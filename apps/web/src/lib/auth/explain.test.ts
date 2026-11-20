import { describe, expect, it } from "vitest";
import { explainAuthError } from "./explain";

/**
 * The founder typed a correct password and was shown
 * `Firebase: Error (auth/configuration-not-found).`
 *
 * It named no cause, suggested no action, and read as a rejection. The
 * password had already been verified by the server; what failed was the
 * exchange of the resulting token for a session, because Authentication had
 * never been switched on for the project.
 */

describe("what the founder is told", () => {
  it("explains the error that cost days, and says it was not the password", () => {
    const said = explainAuthError(new Error("Firebase: Error (auth/configuration-not-found)."));
    expect(said).toContain("accepted");
    expect(said).toContain("Firebase Authentication has not been switched on");
    expect(said).toContain("Get started");
    expect(said).not.toContain("auth/configuration-not-found");
  });

  it("names the action for a project with the method switched off", () => {
    expect(explainAuthError(new Error("auth/operation-not-allowed")))
      .toContain("Firebase console");
  });

  it("separates a connection problem from a credential one", () => {
    expect(explainAuthError(new Error("auth/network-request-failed")))
      .toContain("connection");
  });

  it("says plainly when the deployment's keys do not match its project", () => {
    expect(explainAuthError(new Error("auth/invalid-custom-token")))
      .toContain("do not match");
  });

  it("passes an unknown error through rather than inventing a friendly one", () => {
    // An ugly message the founder can search for beats a reassuring one
    // that hides what happened.
    expect(explainAuthError(new Error("auth/some-new-code-2031"))).toContain("auth/some-new-code-2031");
    expect(explainAuthError("a plain string")).toBe("a plain string");
  });

  it("never leaves a raw Firebase code on screen for a case it does know", () => {
    for (const code of [
      "configuration-not-found", "network-request-failed", "invalid-custom-token",
      "user-disabled", "too-many-requests", "operation-not-allowed", "internal-error",
    ]) {
      const said = explainAuthError(new Error(`Firebase: Error (auth/${code}).`));
      expect(said, code).not.toContain(`auth/${code}`);
      expect(said.length, code).toBeGreaterThan(20);
    }
  });
});
