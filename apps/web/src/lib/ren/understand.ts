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
      return {
        kind: "question",
        ask: `Where should "${title}" go?`,
        hint: "Name an application or a section — Life, Finance · Transactions, Files.",
      };
    }
    if (!title) {
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
    const appId = resolveApplication(destination);
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
