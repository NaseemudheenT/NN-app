import {
  plan, resolveApplication, resolveDestination,
  type CapabilityArgs, type RenPlan,
} from "./capabilities";

/**
 * Turning what the founder said into something REN can do.
 *
 * Deterministic, and deliberately so. Every phrase here resolves to a real
 * capability against a real application or collection, so REN either produces
 * a plan it can carry out or says plainly that it did not understand. There is
 * no middle state where REN writes a confident sentence about something that
 * did not happen — which is the failure mode of every assistant built the
 * other way round.
 *
 * When a model provider is connected it sits *in front* of this, not instead
 * of it: the model's job is to classify free speech into these same
 * capabilities and arguments, and this file stays the authority on what is
 * permitted. A model proposes; this disposes.
 */

export type Understanding =
  | { kind: "plan"; plan: RenPlan }
  /** Understood, but REN needs one more thing before it can act. */
  | { kind: "question"; ask: string; hint?: string }
  /** REN has something to say and nothing to do. */
  | { kind: "answer"; text: string }
  | { kind: "unknown"; heard: string };

/** Strips politeness and filler so the verb is at the front. */
function normalise(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[.!?]+$/g, "")
    .replace(/^(hey |ok |okay |please |ren,? |hi |could you |can you |would you |i want to |i need to )+/g, "")
    .trim();
}

/** Matches a leading verb and returns what followed it. */
function after(text: string, verbs: readonly string[]): string | null {
  for (const verb of verbs) {
    if (text.startsWith(`${verb} `)) return text.slice(verb.length + 1).trim();
    if (text === verb) return "";
  }
  return null;
}

const OPEN_VERBS = ["open", "go to", "take me to", "show me", "show", "launch", "switch to"];
const ADD_VERBS = ["add", "capture", "note", "remember", "create", "new", "jot", "log", "record"];
const FIND_VERBS = ["find", "search", "search for", "look for", "where is", "do i have"];
/**
 * The verb says where it goes.
 *
 * "note buy milk" and "remember to buy milk" both name a destination — just
 * not with a noun. Asking "where should this go?" after being told "note"
 * is REN being pedantic at the founder's expense, and the evaluation suite
 * scored it as the failure it is. Defaulting is safe here specifically
 * because the plan is shown with its destination and waits for approval:
 * the founder reads "Add \"Buy milk\" to Life · Notes" before anything is
 * written, so a wrong guess costs a tap, not a misplaced record.
 */
const VERB_DESTINATION: Readonly<Record<string, string>> = {
  note: "notes", jot: "notes",
  remember: "tasks", capture: "tasks", log: "tasks",
  record: "tasks", add: "tasks", create: "tasks", new: "tasks",
};

/**
 * Words that stand in for a title without being one.
 *
 * "add something" is the founder saying they have not decided yet. Storing a
 * record called "Something" is obedience without comprehension — REN would
 * have done as it was told and produced nothing of use.
 */
const PLACEHOLDERS = new Set([
  "something", "anything", "a thing", "stuff", "things",
  "this", "that", "it", "one",
]);

function isPlaceholder(title: string): boolean {
  return PLACEHOLDERS.has(title.trim().toLowerCase());
}

/** Which of `verbs` the text opened with, if any. */
function verbUsed(text: string, verbs: readonly string[]): string | null {
  for (const verb of verbs) {
    if (text.startsWith(`${verb} `) || text === verb) return verb;
  }
  return null;
}

/**
 * Drops the possessive a person naturally uses about their own things.
 *
 * "show me my files" names the Files application; the word "my" is the only
 * reason it did not resolve.
 */
function withoutPossessive(text: string): string {
  return text.replace(/^(my|our|the|a|an)\s+/i, "").trim();
}

const DONE_VERBS = ["complete", "finish", "tick off", "check off", "mark"];
const DELETE_VERBS = ["delete", "remove", "discard", "throw away", "bin", "trash", "get rid of"];

/**
 * Strips the grammar around a record's name.
 *
 * The founder says "mark the bank task as done", not "complete bank". The
 * leading article and the trailing "as done" are grammar, not title, and
 * leaving them in means the resolver looks for a record literally called
 * "the bank task as done" and finds nothing.
 */
function recordPhrase(rest: string): string {
  return rest
    .replace(/^(the|my|that|this|a|an)\s+/i, "")
    .replace(/\s+(as\s+)?(done|complete|completed|finished)\s*$/i, "")
    .replace(/\s+(task|note|reminder|goal|event|item|record)\s*$/i, "")
    .trim();
}

/** Phrases that name an appearance rather than a destination. */
const APPEARANCE: ReadonlyArray<[RegExp, NonNullable<CapabilityArgs["appearance"]>]> = [
  [/\b(dark|night|darker)\b/, "dark"],
  [/\b(light|day|bright)\b/, "light"],
  [/\b(auto|system|match my device)\b/, "system"],
  [/\b(calm|quiet|subtle|softer|peace)\b/, "calm"],
  [/\b(vivid|alive|stronger|bolder|more colour|more color)\b/, "vivid"],
];

const REPORT = /\b(what('s| is| have i)? (on|up|today|next|left)|brief me|status|how am i doing|catch me up|where am i)\b/;

export function understand(raw: string): Understanding {
  const heard = raw.trim();
  if (!heard) return { kind: "unknown", heard };
  const text = normalise(heard);

  /* ---- appearance. Checked first: "make NN darker" names no destination -- */
  if (/^(make|set|turn|switch|theme|retheme)\b/.test(text) || /\btheme\b/.test(text)) {
    for (const [pattern, appearance] of APPEARANCE) {
      if (pattern.test(text)) return { kind: "plan", plan: plan("appearance", { appearance }) };
    }
  }

  /* ---- report ---------------------------------------------------------- */
  if (REPORT.test(text)) return { kind: "plan", plan: plan("report", {}) };

  /* ---- complete and delete ----------------------------------------------
     Before capture, because "mark the bank task as done" starts with a verb
     capture does not claim but "note" and "record" both appear in the words
     a founder uses for the thing being completed. */
  for (const [verbs, capability] of [
    [DONE_VERBS, "complete"], [DELETE_VERBS, "discard"],
  ] as const) {
    const rest = after(text, verbs);
    if (rest === null) continue;
    if (!rest) {
      return {
        kind: "question",
        ask: capability === "complete" ? "Which one should I mark as done?" : "Which one should I delete?",
        hint: "Name it the way you wrote it — \u201cthe bank task\u201d.",
      };
    }
    const destination = resolveDestination(rest);
    const phrase = recordPhrase(titleFrom(rest, destination?.label ?? null) || rest);
    // "mark it as done" names nothing. Resolving a record called "It" and
    // then completing — or deleting — whatever came back is the failure mode
    // worth caring about here.
    if (!phrase || isPlaceholder(phrase)) {
      return {
        kind: "question",
        ask: capability === "complete" ? "Which one should I mark as done?" : "Which one should I delete?",
      };
    }
    // Tasks are what this is nearly always about, and naming the collection
    // is the one thing the founder should not have to do.
    const collection = destination?.collection ?? "tasks";
    return {
      kind: "plan",
      plan: plan(capability, {
        collection,
        title: phrase,
        ...(destination?.appId !== undefined ? { appId: destination.appId } : {}),
      }),
    };
  }

  /* ---- capture --------------------------------------------------------- */
  const captured = after(text, ADD_VERBS);
  if (captured !== null) {
    if (!captured) {
      return {
        kind: "question",
        ask: "What should I add, and where?",
        hint: "Try: add a task to call the bank",
      };
    }
    // "a task to call the bank" / "call the bank to tasks" — the destination
    // can lead or trail, so both are tried against the same resolver.
    const destination = resolveDestination(captured);
    const title = titleFrom(captured, destination?.label ?? null);

    if (!destination) {
      // The verb is a destination too. Only when it says nothing — and there
      // is no noun either — does REN have to ask.
      const verb = verbUsed(text, ADD_VERBS);
      const implied = verb === null ? undefined : VERB_DESTINATION[verb];
      if (implied !== undefined && title && !isPlaceholder(title)) {
        return {
          kind: "plan",
          plan: plan("capture", { collection: implied, appId: "life", title }),
        };
      }
      return {
        kind: "question",
        ask: `Where should "${title}" go?`,
        hint: "Name an application or a section — Life, Finance · Transactions, Files.",
      };
    }
    if (!title || isPlaceholder(title)) {
      return { kind: "question", ask: `What should I add to ${destination.label}?` };
    }
    return {
      kind: "plan",
      plan: plan("capture", {
        collection: destination.collection,
        appId: destination.appId,
        title,
      }),
    };
  }

  /* ---- find ------------------------------------------------------------ */
  const sought = after(text, FIND_VERBS);
  if (sought !== null) {
    if (!sought) return { kind: "question", ask: "What should I look for?" };
    return { kind: "plan", plan: plan("find", { text: sought }) };
  }

  /* ---- open ------------------------------------------------------------ */
  const destination = after(text, OPEN_VERBS);
  if (destination !== null) {
    if (!destination) return { kind: "question", ask: "Which part of NN?" };
    const appId = resolveApplication(destination)
      ?? resolveApplication(withoutPossessive(destination));
    if (appId) return { kind: "plan", plan: plan("open", { appId }) };
    return {
      kind: "question",
      ask: `I could not find an application called "${destination}".`,
      hint: "NN has 34. Try Life, Finance, Files, Projects, Contacts.",
    };
  }

  /* ---- a bare application name is an instruction to open it ------------ */
  const bare = resolveApplication(text);
  if (bare) return { kind: "plan", plan: plan("open", { appId: bare }) };

  /* ---- what REN is ----------------------------------------------------- */
  if (/\b(what can you do|help|what are you|who are you)\b/.test(text)) {
    return {
      kind: "answer",
      text:
        "I run NN for you. I can open any of its 34 applications, add a record to any of them, " +
        "search everything you have, tell you what today holds, and change how NN looks. " +
        "Anything that changes a record I ask about first; anything that deletes one I ask, " +
        "and then your device asks you.",
    };
  }

  return { kind: "unknown", heard };
}

/**
 * The title inside a captured phrase.
 *
 * Strips the leading article and the destination the founder named, so "a task
 * to call the bank" becomes "call the bank" rather than storing the
 * instruction as the record.
 */
function titleFrom(phrase: string, destinationLabel: string | null): string {
  let title = phrase
    .replace(/^(a|an|the)\s+/i, "")
    .replace(/^(task|note|reminder|event|document|entry|record)\s+(to|about|that|for|:)?\s*/i, "")
    .trim();

  if (destinationLabel) {
    // Remove a trailing "to Finance" / "in Life · Tasks" that named the place.
    for (const word of destinationLabel.toLowerCase().split(/\s*·\s*|\s+/)) {
      if (word.length < 3) continue;
      title = title
        .replace(new RegExp(`\\s+(to|in|on|under)\\s+${word}\\b.*$`, "i"), "")
        .replace(new RegExp(`^${word}\\b[:,]?\\s*`, "i"), "")
        .trim();
    }
  }

  // Capitalise the first letter; leave the rest as the founder said it.
  return title ? title.charAt(0).toUpperCase() + title.slice(1) : "";
}
