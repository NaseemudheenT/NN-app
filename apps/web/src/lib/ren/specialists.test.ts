import { describe, expect, it } from "vitest";
import { APPLICATIONS } from "@/lib/apps/registry";
import {
  WORKSPACE_SPECIALISTS,
  specialistForApp,
  specialistForRoute,
  specialistInstructions,
} from "./specialists";
import { planFromToolCall, toolsForSpecialist } from "./tools";

describe("NN workspace specialist registry", () => {
  it("creates exactly one specialist identity for every registered application", () => {
    expect(WORKSPACE_SPECIALISTS).toHaveLength(APPLICATIONS.length);
    expect(WORKSPACE_SPECIALISTS.map((agent) => agent.appId).sort()).toEqual(
      APPLICATIONS.map((app) => app.id).sort(),
    );
    expect(new Set(WORKSPACE_SPECIALISTS.map((agent) => agent.id)).size).toBe(APPLICATIONS.length);
  });

  it("activates only specialists whose workspace has a real route", () => {
    for (const app of APPLICATIONS) {
      expect(specialistForApp(app.id)?.status).toBe(app.href ? "active" : "planned");
    }
  });

  it("resolves an exact workspace route but never turns REN itself into a specialist", () => {
    expect(specialistForRoute("/apps/finance")?.appId).toBe("finance");
    expect(specialistForRoute("/ren")).toBeNull();
    expect(specialistForRoute("/apps/finance/unknown")).toBeNull();
  });

  it("gives a specialist only write tools for its own collections", () => {
    const finance = specialistForApp("finance");
    expect(finance).not.toBeNull();
    const tools = toolsForSpecialist(finance!);
    expect(tools.map((tool) => tool.name)).toEqual([
      "inspect_workspace_records",
      "capture_record",
      "complete_record",
      "discard_record",
    ]);
    const capture = tools.find((tool) => tool.name === "capture_record")!;
    const props = capture.schema["properties"] as Record<string, { enum?: string[] }>;
    expect(props["collection"]?.enum).toContain("finance_transactions");
    expect(props["collection"]?.enum).not.toContain("tasks");
  });

  it("lets a specialist inspect only its own workspace records", () => {
    expect(planFromToolCall("inspect_workspace_records", {
      collection: "finance_transactions",
      text: "subscription",
    }, "finance").ok).toBe(true);
    expect(planFromToolCall("inspect_workspace_records", {
      collection: "college_exams",
    }, "finance").ok).toBe(false);
  });

  it("refuses cross-workspace actions again at the client execution boundary", () => {
    expect(planFromToolCall("capture_record", {
      collection: "finance_transactions",
      title: "Internet bill",
    }, "finance").ok).toBe(true);

    const crossWorkspace = planFromToolCall("capture_record", {
      collection: "tasks",
      title: "Unrelated task",
    }, "finance");
    expect(crossWorkspace.ok).toBe(false);

    const globalNavigation = planFromToolCall("open_application", {
      appId: "college",
    }, "finance");
    expect(globalNavigation.ok).toBe(false);
  });

  it("gives each specialist a clear boundary and REN escalation path", () => {
    const finance = specialistForApp("finance")!;
    const prompt = specialistInstructions(finance);
    expect(prompt).toContain("Finance Specialist");
    expect(prompt).toContain("REN is the central coordinator");
    expect(prompt).toContain("finance_transactions");
    expect(prompt).toContain("Do not act as another workspace's agent");
  });

  it("does not expose tools to a planned or collection-less workspace agent", () => {
    const planned = WORKSPACE_SPECIALISTS.find((agent) => agent.status === "planned");
    if (planned) expect(toolsForSpecialist(planned)).toEqual([]);
  });
});
