import { APPLICATIONS } from "@/lib/apps/registry";
import { APP_SECTIONS } from "@/lib/apps/sections";
import { plan, type CapabilityArgs, type CapabilityId, type RenPlan } from "./capabilities";

/**
 * REN's hands, described so a model can reach for them.
 *
 * This is the same list as {@link CAPABILITIES} — deliberately, because two
 * lists would drift and the drift would be a model confidently calling a
 * tool NN does not have. What is added here is the shape of the arguments
 * and the enumerations: the model is given the actual application ids and
 * the actual collection names, so it cannot invent a destination that does
 * not exist and discover it halfway through a write.
 *
 * The tools run **in the browser, as the founder**. Nothing here executes on
 * the server with elevated rights. That is what keeps the Firestore rules the
 * real authorisation boundary: REN can read and write exactly what the
 * founder could, and nothing more, whichever model is driving.
 */

const APP_IDS = APPLICATIONS.map((app) => app.id);

/**
 * Every collection NN can write to, from both places one is declared.
 *
 * `APP_SECTIONS` describes the sectioned applications. Life and Files are
 * not sectioned — they own their collections on the registry entry itself —
 * and those six are the ones the founder reaches for first: tasks, calendar
 * events, reminders, notes, goals and documents. Deriving this list from
 * sections alone silently left REN unable to add a task, which is the most
 * ordinary thing it will ever be asked to do. The union is the whole of what
 * exists; anything outside it is refused at the edge.
 */
const COLLECTIONS = [
  ...new Set([
    ...Object.values(APP_SECTIONS).flatMap((sections) => sections.map((s) => s.collection)),
    ...APPLICATIONS.flatMap((app) => app.collections ?? []),
  ]),
].sort();

export interface RenTool {
  name: string;
  description: string;
  schema: Record<string, unknown>;
}

const object = (
  properties: Record<string, unknown>,
  required: string[] = [],
): Record<string, unknown> => ({ type: "object", properties, required, additionalProperties: false });

export const REN_TOOLS: readonly RenTool[] = [
  {
    name: "open_application",
    description:
      "Move the founder to one of NN's applications. Use this whenever they ask to go somewhere, " +
      "see something, or work on something that has its own application. Reports back only after " +
      "the screen has actually changed.",
    schema: object(
      { appId: { type: "string", enum: APP_IDS, description: "The application to open." } },
      ["appId"],
    ),
  },
  {
    name: "capture_record",
    description:
      "Write a new record into one of the founder's collections — a task, a note, an event, an " +
      "expense, and so on. NN asks the founder to confirm before this is written.",
    schema: object(
      {
        collection: { type: "string", enum: COLLECTIONS, description: "Where it belongs." },
        title: { type: "string", description: "The record's title, in the founder's own words." },
        text: { type: "string", description: "Any detail that belongs with it. Optional." },
      },
      ["collection", "title"],
    ),
  },
  {
    name: "search_records",
    description:
      "Search everything the founder has stored in NN for a phrase, and show them the results.",
    schema: object({ text: { type: "string", description: "What to search for." } }, ["text"]),
  },
  {
    name: "report_state",
    description:
      "Report what NN is currently holding — how much is open, scheduled, recorded. Use this " +
      "instead of guessing at counts.",
    schema: object({}),
  },
  {
    name: "set_appearance",
    description: "Change how NN looks: dark, light, or follow the founder's device.",
    schema: object(
      {
        appearance: {
          type: "string",
          enum: ["dark", "light", "system"],
          description: "The appearance to apply.",
        },
      },
      ["appearance"],
    ),
  },
] as const;

/** The name a model uses → the capability NN runs. */
const CAPABILITY_OF: Readonly<Record<string, CapabilityId>> = {
  open_application: "open",
  capture_record: "capture",
  search_records: "find",
  report_state: "report",
  set_appearance: "appearance",
};

/**
 * Turns a model's tool call into a plan NN can run, or refuses it.
 *
 * Every argument is checked against what exists — an application id that is
 * not in the registry, a collection no application owns — because a model
 * being confidently wrong about a destination is the ordinary case, not the
 * exceptional one. A refusal here is a sentence REN can read back; it is
 * never an exception, because a thrown error mid-answer looks to the founder
 * like REN stopped talking.
 */
export function planFromToolCall(
  name: string,
  args: Record<string, unknown>,
): { ok: true; plan: RenPlan } | { ok: false; why: string } {
  const capability = CAPABILITY_OF[name];
  if (!capability) return { ok: false, why: `NN has no tool called "${name}".` };

  const text = typeof args["text"] === "string" ? args["text"].trim() : undefined;
  const title = typeof args["title"] === "string" ? args["title"].trim() : undefined;
  const appId = typeof args["appId"] === "string" ? args["appId"] : undefined;
  const collection = typeof args["collection"] === "string" ? args["collection"] : undefined;
  const appearance = typeof args["appearance"] === "string" ? args["appearance"] : undefined;

  const resolved: CapabilityArgs = {};

  if (capability === "open") {
    if (!appId || !APP_IDS.includes(appId)) {
      return { ok: false, why: `NN has no application with the id "${appId ?? ""}".` };
    }
    resolved.appId = appId;
  }

  if (capability === "capture") {
    if (!collection || !COLLECTIONS.includes(collection)) {
      return { ok: false, why: `Nothing in NN stores "${collection ?? ""}".` };
    }
    if (!title) return { ok: false, why: "A record needs a title before NN can store it." };
    resolved.collection = collection;
    resolved.title = title;
    if (text) resolved.text = text;
  }

  if (capability === "find") {
    if (!text) return { ok: false, why: "There is nothing to search for." };
    resolved.text = text;
  }

  if (capability === "appearance") {
    const allowed = ["dark", "light", "system"] as const;
    const match = allowed.find((value) => value === appearance);
    if (!match) return { ok: false, why: `NN has no appearance called "${appearance ?? ""}".` };
    resolved.appearance = match;
  }

  return { ok: true, plan: plan(capability, resolved) };
}
