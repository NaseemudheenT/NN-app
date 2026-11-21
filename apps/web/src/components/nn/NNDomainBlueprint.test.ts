import { describe, expect, it } from "vitest";
import { DOMAIN_BLUEPRINTS } from "./NNDomainBlueprint";

describe("NN domain interface blueprints", () => {
  it("provides domain-specific interface maps for all 31 records-based applications", () => {
    expect(Object.keys(DOMAIN_BLUEPRINTS)).toHaveLength(31);
  });

  it("gives every application at least three distinct modules with screen regions", () => {
    for (const [appId, modules] of Object.entries(DOMAIN_BLUEPRINTS)) {
      expect(modules.length, appId).toBeGreaterThanOrEqual(3);
      expect(new Set(modules.map((blueprint) => blueprint.id)).size, appId).toBe(modules.length);
      for (const blueprint of modules) {
        expect(blueprint.title.length, appId).toBeGreaterThan(0);
        expect(blueprint.description.length, appId).toBeGreaterThan(0);
        expect(blueprint.regions.length, appId).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
