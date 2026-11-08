/**
 * What REN can actually do, today.
 *
 * This is a deterministic matcher, not a language model. That is a deliberate
 * choice rather than a placeholder: every entry here maps to a real function
 * NN already has, so REN either performs the action or says plainly that it
 * cannot. There is no middle state where REN produces a confident sentence
 * about something that did not happen.
 *
 * When a model provider is connected it goes *in front* of this, classifying
 * free text into these same intents. The intents stay the authority on what is
 * permitted — a model proposes, this list disposes.
 */

export type RenIntent =
  | { kind: "navigate"; to: string; label: string }
  | { kind: "answer"; text: string }
  | { kind: "unhandled"; text: string };

interface Rule {
  /** Every phrase that should trigger it. Matched as a whole-word phrase. */
  phrases: readonly string[];
  intent: RenIntent;
}

/** Destinations REN may open. Nothing outside this list is reachable. */
const RULES: readonly Rule[] = [
  {
    phrases: ["workspace", "my workspace", "open workspace", "take me to the workspace", "today"],
    intent: { kind: "navigate", to: "/workspace", label: "the workspace" },
  },
  {
    phrases: ["design system", "open the design system", "components", "tokens"],
    intent: { kind: "navigate", to: "/design", label: "the design system" },
  },
  {
    phrases: ["cinematic", "cinematic layer", "the room", "materials", "animations"],
    intent: { kind: "navigate", to: "/design/cinematic", label: "the cinematic layer" },
  },
  {
    phrases: ["sign in", "log in", "login"],
    intent: { kind: "navigate", to: "/sign-in", label: "sign-in" },
  },
  {
    phrases: ["home", "entrance", "start", "go home"],
    intent: { kind: "navigate", to: "/", label: "the entrance" },
  },
  {
    phrases: ["what is nn", "what is this", "what are you"],
    intent: {
      kind: "answer",
      text:
        "NN is your private operating environment, and I am REN, the intelligence layer inside it. " +
        "Right now I can move you around NN and change how it looks. I cannot yet reason, remember " +
        "or use tools — that needs a model provider you have not connected.",
    },
  },
  {
    phrases: ["what can you do", "help", "what can i ask"],
    intent: {
      kind: "answer",
      text:
        "Three things today: I can open any part of NN, I can tell you where you are, and I can " +
        "retheme NN. Everything else — your goals, your college work, your finances — is designed " +
        "but not built yet, and I will say so rather than guess.",
    },
  },
  {
    phrases: ["where am i", "what page is this", "what am i looking at"],
    // Resolved against live page context by the caller, which is why the text
    // is empty here; see resolveIntent.
    intent: { kind: "answer", text: "" },
  },
];

/** Normalises for matching: lowercase, punctuation stripped, spaces collapsed. */
function normalise(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when `phrase` appears in `text` on whole-word boundaries. */
function containsPhrase(text: string, phrase: string): boolean {
  const padded = ` ${text} `;
  return padded.includes(` ${phrase} `);
}

export interface ResolveOptions {
  /** One line describing where the founder is, for "where am I". */
  pageSummary: string;
  pageName: string;
}

export function resolveIntent(input: string, options: ResolveOptions): RenIntent {
  const text = normalise(input);
  if (text.length === 0) {
    return { kind: "unhandled", text: "I did not catch that." };
  }

  if (containsPhrase(text, "where am i") || containsPhrase(text, "what page is this")) {
    return { kind: "answer", text: `You are on ${options.pageName}. ${options.pageSummary}` };
  }

  // Longest phrase first, so "open the design system" is not shadowed by "open".
  const matches = RULES.flatMap((rule) =>
    rule.phrases
      .filter((phrase) => containsPhrase(text, normalise(phrase)))
      .map((phrase) => ({ phrase, intent: rule.intent })),
  ).sort((a, b) => b.phrase.length - a.phrase.length);

  const best = matches[0];
  if (best) return best.intent;

  return {
    kind: "unhandled",
    text:
      "I cannot do that yet. I can open any part of NN, tell you where you are, and change how " +
      "NN looks — that is genuinely all, until a model provider is connected.",
  };
}
