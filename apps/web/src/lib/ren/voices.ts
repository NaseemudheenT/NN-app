"use client";

/**
 * Which voice REN speaks in.
 *
 * The Web Speech API hands back a list of installed voices and tells you
 * almost nothing useful about them: a name, a language, and whether they are
 * local. **There is no gender field.** So a founder asking for "a male
 * voice" is asking NN to infer something the platform does not state, and
 * the honest implementation says so rather than pretending to a certainty it
 * does not have.
 *
 * What NN does instead:
 *
 * - matches the words *male* and *female* when a voice name carries them,
 *   checking **female first** — `"female".includes("male")` is true, and
 *   getting that backwards is the whole bug;
 * - falls back to the given names Apple, Google and Microsoft actually ship,
 *   which is a list, not a guess;
 * - **returns null when it cannot tell**, so the surface can say "this
 *   device has no male voice installed" instead of silently picking one and
 *   leaving the founder to wonder why nothing changed.
 *
 * Voices load asynchronously on most browsers and synchronously on none, so
 * everything here tolerates an empty list and re-asks.
 */

export type VoicePreference = "system" | "female" | "male";

export interface RenVoice {
  name: string;
  lang: string;
  /** What NN believes, and how sure it is. Never presented as fact. */
  guessed: VoicePreference;
  local: boolean;
}

/** Given names the major platforms ship, by the voice they actually are. */
const FEMALE_NAMES = [
  "samantha", "victoria", "karen", "moira", "tessa", "fiona", "veena",
  "zira", "susan", "allison", "ava", "joanna", "kendra", "kimberly",
  "salli", "nicole", "amy", "emma", "ivy", "raveena", "aria", "jenny",
  "michelle", "sara", "nanami", "serena", "catherine", "linda", "heather",
];
const MALE_NAMES = [
  "daniel", "alex", "fred", "tom", "david", "mark", "guy", "matthew",
  "justin", "joey", "brian", "russell", "ryan", "oliver", "thomas",
  "rishi", "gordon", "aaron", "eric", "christopher", "roger", "steffan",
  "arthur", "william", "james", "liam", "jorge", "diego",
];

/** What NN believes a voice to be, from its name alone. */
export function guessVoice(name: string): VoicePreference {
  const lower = name.toLowerCase();

  // Female first, always. "female" contains "male".
  if (/\bfemale\b/.test(lower) || /\(female\)/.test(lower)) return "female";
  if (/\bmale\b/.test(lower) || /\(male\)/.test(lower)) return "male";
  if (/\bwoman\b/.test(lower)) return "female";
  if (/\bman\b/.test(lower)) return "male";

  // Given names the platforms ship. Word-boundary matched so "Marksmith"
  // is not read as "Mark".
  const words = lower.split(/[^a-z]+/).filter(Boolean);
  for (const word of words) {
    if (FEMALE_NAMES.includes(word)) return "female";
    if (MALE_NAMES.includes(word)) return "male";
  }
  return "system";
}

/** Every voice the browser will admit to, as NN sees them. */
export function listVoices(): RenVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return window.speechSynthesis.getVoices().map((voice) => ({
    name: voice.name,
    lang: voice.lang,
    guessed: guessVoice(voice.name),
    local: voice.localService,
  }));
}

/**
 * The best voice for a preference, or null when the device has none.
 *
 * Prefers a voice matching the page's language, then a local one — a local
 * voice does not need the network and does not send what REN says anywhere.
 */
export function pickVoice(
  voices: readonly RenVoice[],
  want: VoicePreference,
  lang = typeof navigator !== "undefined" ? navigator.language : "en-US",
): RenVoice | null {
  if (voices.length === 0) return null;
  if (want === "system") return null;   // let the platform decide

  const base = lang.split("-")[0] ?? "en";
  const matching = voices.filter((voice) => voice.guessed === want);
  if (matching.length === 0) return null;

  const sameLanguage = matching.filter((voice) => voice.lang.toLowerCase().startsWith(base));
  const pool = sameLanguage.length > 0 ? sameLanguage : matching;
  return pool.find((voice) => voice.local) ?? pool[0] ?? null;
}

/** What this device can actually offer. */
export function availablePreferences(voices: readonly RenVoice[]): VoicePreference[] {
  const out: VoicePreference[] = ["system"];
  if (voices.some((voice) => voice.guessed === "female")) out.push("female");
  if (voices.some((voice) => voice.guessed === "male")) out.push("male");
  return out;
}

/* ------------------------------------------------------------ remembered -- */

const KEY = "nn.ren.voice";

export function readVoicePreference(): VoicePreference {
  try {
    const stored = window.localStorage.getItem(KEY);
    return stored === "male" || stored === "female" ? stored : "system";
  } catch {
    return "system";   // private mode, or storage refused
  }
}

export function writeVoicePreference(preference: VoicePreference): void {
  try {
    window.localStorage.setItem(KEY, preference);
  } catch { /* nothing to do; the choice simply will not persist */ }
}

/**
 * Waits for the voice list, which is empty on the first call in most
 * browsers and populated a tick later.
 */
export function whenVoicesReady(then: (voices: RenVoice[]) => void): () => void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    then([]);
    return () => undefined;
  }
  const deliver = () => then(listVoices());
  const ready = listVoices();
  if (ready.length > 0) deliver();
  window.speechSynthesis.addEventListener("voiceschanged", deliver);
  return () => window.speechSynthesis.removeEventListener("voiceschanged", deliver);
}
