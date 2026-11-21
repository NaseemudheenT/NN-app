import { describe, expect, it } from "vitest";
import { DOMAIN_BLUEPRINTS, inferDomainLayout } from "./NNDomainBlueprint";

describe("NN domain interface blueprints", () => {
  it("provides domain-specific interface maps for all 31 records-based applications", () => {
    expect(Object.keys(DOMAIN_BLUEPRINTS)).toHaveLength(31);
  });

  it("covers the core College and Academy workflows with dedicated modules", () => {
    expect(DOMAIN_BLUEPRINTS.college?.map((blueprint) => blueprint.id)).toEqual(["semester", "syllabus", "question-bank", "exam-prep"]);
    expect(DOMAIN_BLUEPRINTS.academy?.map((blueprint) => blueprint.id)).toEqual(["paths", "courses", "lesson", "mastery"]);
    expect(DOMAIN_BLUEPRINTS.college?.map((blueprint) => blueprint.layout)).toEqual(["planner", "navigator", "library", "planner"]);
    expect(DOMAIN_BLUEPRINTS.academy?.map((blueprint) => blueprint.layout)).toEqual(["roadmap", "library", "reader", "analytics"]);
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
  it("keeps every feature label concise and unique within its application", () => {
    for (const [appId, modules] of Object.entries(DOMAIN_BLUEPRINTS)) {
      const titles = modules.map((module) => module.title);
      expect(new Set(titles).size, appId).toBe(titles.length);
      for (const title of titles) {
        expect(title.length, `${appId}/${title} should stay concise`).toBeLessThanOrEqual(14);
      }
    }
  });

  it("selects specialised layouts for distinct application domains", () => {
    const resolve = (appId: string, id: string, title: string) =>
      inferDomainLayout(appId, { id, title, description: "", icon: "file", regions: ["One", "Two", "Three"] });
    expect(resolve("finance", "transactions", "Ledger")).toBe("finance");
    expect(resolve("mail", "inbox", "Inbox")).toBe("inbox");
    expect(resolve("automation-studio", "workflows", "Flow")).toBe("flow");
    expect(resolve("security-centre", "audit", "Audit")).toBe("security");
    expect(resolve("creator-studio", "production", "Production")).toBe("media");
    expect(resolve("formula-engine", "workspace", "Compute")).toBe("calculator");
    expect(resolve("travel", "places", "Places")).toBe("map");
    expect(resolve("studio", "documents", "Docs")).toBe("editor");
    expect(resolve("projects", "boards", "Boards")).toBe("board");
    expect(resolve("control-room", "preferences", "Preferences")).toBe("settings");
  });

});