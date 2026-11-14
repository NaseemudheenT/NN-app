import { describe, expect, it } from "vitest";
import manifest from "./manifest";
import { APPLICATIONS, openableApplications } from "@/lib/apps/registry";

/**
 * The manifest decides what happens when the founder taps NN on their home
 * screen. Getting it wrong is not a cosmetic problem: it is the difference
 * between landing in the environment and landing on a prototype.
 */
describe("the PWA manifest", () => {
  const m = manifest();

  it("launches into the environment, not the landing page or a prototype", () => {
    // "/" would replay the cinematic entrance on every open; "/workspace" is
    // a design surface rather than where the founder actually works.
    expect(m.start_url).toBe("/home");
  });

  it("opens without browser chrome, which is the point of installing it", () => {
    expect(m.display).toBe("standalone");
    expect(m.scope).toBe("/");
  });

  it("ships a maskable icon, so Android does not letterbox the mark", () => {
    const purposes = (m.icons ?? []).map((icon) => icon.purpose);
    expect(purposes).toContain("maskable");
    expect(purposes).toContain("any");
  });

  it("uses the midnight ground for the splash, so launch does not flash white", () => {
    expect(m.background_color).toBe("#07111F");
    expect(m.theme_color).toBe("#07111F");
  });

  it("only offers shortcuts to routes that actually exist", () => {
    const routes = new Set<string>([
      "/home", "/search", "/", "/sign-in", "/workspace",
      ...openableApplications().map((app) => app.href as string),
      ...APPLICATIONS.map((app) => app.overviewHref),
    ]);
    for (const shortcut of m.shortcuts ?? []) {
      // A shortcut is a home-screen control. One pointing at a route that
      // does not exist is a dead button on the founder's phone.
      const path = shortcut.url.split("?")[0]!;
      expect(routes.has(path), `${shortcut.name} → ${shortcut.url}`).toBe(true);
    }
  });

  it("is named NN, and says what it is", () => {
    expect(m.name).toBe("NN");
    expect(m.short_name).toBe("NN");
    expect(m.description).toMatch(/private personal operating environment/i);
  });
});
