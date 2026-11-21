import { APPLICATIONS, type NNApplication } from "@/lib/apps/registry";

/**
 * One domain specialist per NN application. The application registry is the
 * source of truth: adding an app automatically creates its specialist entry.
 *
 * A specialist is active only when its workspace has a real route. Planned
 * applications still get a reserved identity, but are never presented as
 * working agents before their workspace exists.
 */
export interface WorkspaceSpecialist {
  id: string;
  appId: string;
  name: string;
  workspace: string;
  mission: string;
  collections: readonly string[];
  status: "active" | "planned";
}

function defineSpecialist(app: NNApplication): WorkspaceSpecialist {
  return {
    id: `${app.id}-specialist`,
    appId: app.id,
    name: `${app.name} Specialist`,
    workspace: app.name,
    mission: app.description,
    collections: app.collections ?? [],
    status: app.href ? "active" : "planned",
  };
}

export const WORKSPACE_SPECIALISTS: readonly WorkspaceSpecialist[] =
  APPLICATIONS.map(defineSpecialist);

export function specialistForApp(appId: string): WorkspaceSpecialist | null {
  return WORKSPACE_SPECIALISTS.find((agent) => agent.appId === appId) ?? null;
}

/** Resolve only exact registered workspace paths; REN itself stays general. */
export function specialistForRoute(route: string): WorkspaceSpecialist | null {
  const path = route.split("?")[0]?.replace(/\/$/, "") || "/";
  const app = APPLICATIONS.find((candidate) =>
    candidate.href === path || candidate.overviewHref === path,
  );
  if (!app) return null;
  const specialist = specialistForApp(app.id);
  return specialist?.status === "active" ? specialist : null;
}

/** Validate an agent action again in the browser before execution. */
export function specialistAllows(
  appId: string,
  capability: string,
  collection?: string,
): boolean {
  const agent = specialistForApp(appId);
  if (!agent || agent.status !== "active") return false;
  if (!["capture", "complete", "discard"].includes(capability)) return false;
  return Boolean(collection && agent.collections.includes(collection));
}

export function specialistInstructions(agent: WorkspaceSpecialist): string {
  const collections = agent.collections.length > 0
    ? agent.collections.map((name) => `- ${name}`).join("\n")
    : "- No connected record collections yet.";
  return `# Active workspace specialist: ${agent.name}

You are the dedicated specialist for the ${agent.workspace} workspace.
Your mission is limited to: ${agent.mission}

## Strict workspace boundary
- Work only on ${agent.workspace} tasks and information.
- Do not act as another workspace's agent and do not claim access to another workspace.
- Do not route around this boundary by asking for or inventing another collection.
- REN is the central coordinator. If a request requires another workspace, explain the dependency and ask REN to coordinate it; do not perform the other workspace's work yourself.
- Use only the tools exposed in this specialist session. Never invent tools or claim an action occurred without a confirmed tool result.
- Explain the result in useful, concise terms. Do not make the founder manually transfer information that NN already has.
- When the task needs data that is not present, identify the missing source instead of fabricating it.

## Workspace-owned collections
${collections}

## Behaviour
Act like a capable domain operator, not a blank form. Infer reasonable next steps from available workspace context, organise work, surface blockers and opportunities, and produce a useful result. Ask only when a missing decision or consequential action genuinely requires the founder's input.`;
}
