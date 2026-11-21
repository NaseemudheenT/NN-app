import { describe, expect, it } from "vitest";
import { CHANGES, NN_RELEASE, buildId } from "./version";

/**
 * Which NN this is.
 *
 * "It is broken" and "it is broken on the build from Tuesday" are different
 * reports, and only one of them can be acted on. NN had no answer at all.
 */

describe("knowing its own version", () => {
  it("takes the build from Vercel's commit, shortened", () => {
    expect(buildId({ VERCEL_GIT_COMMIT_SHA: "0123456789abcdef" })).toBe("0123456");
  });

  it("says 'dev' rather than inventing one", () => {
    expect(buildId({})).toBe("dev");
    expect(buildId({ VERCEL_GIT_COMMIT_SHA: "" })).toBe("dev");
    expect(buildId({ VERCEL_GIT_COMMIT_SHA: "  " })).toBe("dev");
    // Too short to be a commit is not a commit.
    expect(buildId({ VERCEL_GIT_COMMIT_SHA: "abc" })).toBe("dev");
  });

  it("carries a release name a person can say out loud", () => {
    expect(NN_RELEASE).toMatch(/^\d+\.\d+$/);
  });
});

describe("what changed", () => {
  it("is written for the founder, not for a developer", () => {
    // A changelog naming modules is a changelog nobody reads.
    const forbidden = /refactor|typecheck|lint|commit|eslint|\.tsx?\b|module|component/i;
    for (const change of CHANGES) {
      expect(change.said, change.said).not.toMatch(forbidden);
    }
  });

  it("reads newest first, so the top line is the newest thing", () => {
    const dates = CHANGES.map((change) => change.at);
    const sorted = [...dates].sort().reverse();
    expect(dates).toEqual(sorted);
  });

  it("carries a real date on every line", () => {
    for (const change of CHANGES) {
      expect(change.at, change.said).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(change.at)), change.at).toBe(false);
    }
  });

  it("says something, in one line", () => {
    for (const change of CHANGES) {
      expect(change.said.length).toBeGreaterThan(20);
      expect(change.said.length).toBeLessThan(140);
      expect(change.said).not.toContain("\n");
    }
  });
});
