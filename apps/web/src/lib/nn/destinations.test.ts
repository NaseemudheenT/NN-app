import { describe, expect, it } from "vitest";
import { APPLICATIONS } from "@/lib/apps/registry";
import { currentDestination, destinations, PLACES, reachable } from "./destinations";

describe("the canonical NN destination map", () => {
  it("includes the six NN places and all 34 registered applications", () => {
    const all = destinations();
    expect(PLACES.map((place) => place.id)).toEqual([
      "ren", "home", "workspace", "search", "files", "settings",
    ]);
    expect(all.filter((place) => place.group === "Applications")).toHaveLength(34);
    expect(all.filter((place) => place.group === "Applications").map((place) => place.id))
      .toEqual(APPLICATIONS.map((app) => `app-${app.id}`));
  });

  it("keeps destination IDs and reachable routes unique", () => {
    const all = destinations();
    expect(new Set(all.map((place) => place.id)).size).toBe(all.length);
    const routes = reachable().map((place) => place.route);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it("provides a real route for every listed destination", () => {
    expect(reachable()).toHaveLength(destinations().length);
    expect(destinations().every((place) => place.route !== undefined)).toBe(true);
  });

  it("resolves nested paths to the most specific destination", () => {
    expect(currentDestination("/ren/chat")?.id).toBe("ren");
    expect(currentDestination("/apps/finance")?.id).toBe("app-finance");
    expect(currentDestination("/life")?.id).toBe("app-life");
  });

  it("does not match route names that merely share a prefix", () => {
    expect(currentDestination("/homecoming")).toBeNull();
    expect(currentDestination("/settings-old")).toBeNull();
    expect(currentDestination("/")).toBeNull();
  });
});
