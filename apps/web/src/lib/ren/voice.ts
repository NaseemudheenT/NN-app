"use client";

import { listVoices, pickVoice, readVoicePreference, type VoicePreference } from "./voices";

/**
 * REN's ears and voice.
 *
 * A thin, honest wrapper over what the browser already has: the Web Speech
 * API for recognition and synthesis. No model, no GPU, no audio leaving the
 * device except where the browser's own engine sends it — which on Chrome it
 * does, and this file says so rather than implying otherwise.
 *
 * Why the browser's engine rather than a self-hosted one: a self-hosted
 * Whisper needs a server that does not exist yet, and until it does, the
 * choice is between the platform's recogniser and no voice at all. When NN
 * has an inference host this file gains a second backend and the surface
 * above it does not change. The interface is the point.
 *
 * Four rules, all from the founder's brief §11 and §2 of the expansion:
 *
 * 1. **The microphone is never open unless the founder opened it.** There is
 *    no wake word here and no ambient listening. `start()` is called from a
 *    user gesture and `stop()` closes it.
 * 2. **Nothing is recorded.** Transcripts are text in memory. No audio is
 *    stored, uploaded by NN, or kept after the turn.
 * 3. **Support is detected, never assumed.** Firefox has no recogniser;
 *    iOS Safari's is partial and needs a fresh gesture each time. The caller
 *    is told which, so it can offer typing instead of failing silently.
 * 4. **Speech is interruptible.** `silence()` stops REN mid-sentence, because
 *    an assistant you cannot interrupt is one you have to wait out.
 */

/* ------------------------------------------------------- the browser API -- */

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}
interface SpeechRecognitionResultLike {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}
interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
  message?: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function recogniser(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/* ---------------------------------------------------------- what is here -- */

export interface VoiceSupport {
  /** The founder can speak to REN on this device. */
  listening: boolean;
  /** REN can speak back on this device. */
  speaking: boolean;
  /**
   * Said plainly when something is missing, so a surface can show the reason
   * instead of a dead microphone button.
   */
  reason: string | null;
}

export function voiceSupport(): VoiceSupport {
  if (typeof window === "undefined") {
    return { listening: false, speaking: false, reason: null };
  }
  const canHear = recogniser() !== null;
  const canSpeak = "speechSynthesis" in window;
  if (canHear && canSpeak) return { listening: true, speaking: true, reason: null };
  if (!canHear && !canSpeak) {
    return {
      listening: false, speaking: false,
      reason: "This browser has no speech engine. Firefox is the usual one — type instead, or use Safari, Chrome or Edge.",
    };
  }
  if (!canHear) {
    return {
      listening: false, speaking: canSpeak,
      reason: "This browser cannot listen, only speak. Type to REN here.",
    };
  }
  return {
    listening: canHear, speaking: false,
    reason: "This browser can listen but not speak back.",
  };
}

/* --------------------------------------------------------------- hearing -- */

export type HeardHandler = (heard: { text: string; final: boolean }) => void;
export type VoiceFault = (reason: string) => void;

export interface Ears {
  start: () => void;
  stop: () => void;
  readonly open: boolean;
  dispose: () => void;
}

/**
 * Why `no-speech` and `aborted` are not reported as faults: both are ordinary.
 * The first is a pause, the second is the founder pressing stop, and showing
 * either as an error trains someone to ignore the error that matters.
 */
const QUIET_ERRORS = new Set(["no-speech", "aborted"]);

const ERROR_WORDS: Record<string, string> = {
  "not-allowed": "The microphone is blocked. Allow it for this site and try again.",
  "service-not-allowed": "This browser will not allow speech here.",
  network: "The speech service could not be reached.",
  "audio-capture": "No microphone was found.",
};

/**
 * Opens the microphone only when told to, and closes it when told to.
 *
 * `continuous` is deliberately false on every platform: a recogniser left
 * running holds the microphone open between sentences, which is both a
 * battery cost and a thing the founder has not asked for. Each turn is one
 * utterance, started by a gesture.
 */
export function makeEars(
  onHeard: HeardHandler, onFault: VoiceFault, language = "en-GB",
): Ears | null {
  const Recogniser = recogniser();
  if (Recogniser === null) return null;

  const engine = new Recogniser();
  engine.lang = language;
  engine.continuous = false;
  engine.interimResults = true;
  engine.maxAlternatives = 1;

  let open = false;

  engine.onstart = () => { open = true; };
  engine.onend = () => { open = false; };

  engine.onresult = (event) => {
    let text = "";
    let final = false;
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (result === undefined) continue;
      const alternative = result[0];
      if (alternative === undefined) continue;
      text += alternative.transcript;
      if (result.isFinal) final = true;
    }
    if (text.trim().length > 0) onHeard({ text: text.trim(), final });
  };

  engine.onerror = (event) => {
    open = false;
    if (QUIET_ERRORS.has(event.error)) return;
    onFault(ERROR_WORDS[event.error] ?? `The microphone stopped: ${event.error}.`);
  };

  return {
    start: () => {
      if (open) return;
      try {
        engine.start();
      } catch {
        // Already running, or called without a gesture. Neither is a fault
        // worth showing: the next press will work.
      }
    },
    stop: () => {
      try { engine.stop(); } catch { /* not running */ }
    },
    get open() { return open; },
    dispose: () => {
      engine.onresult = null;
      engine.onerror = null;
      engine.onend = null;
      engine.onstart = null;
      try { engine.abort(); } catch { /* not running */ }
    },
  };
}

/* --------------------------------------------------------------- talking -- */

export interface SaidOptions {
  /** Called when REN has finished, or was interrupted. */
  onDone?: () => void;
  rate?: number;
  pitch?: number;
  /** Overrides the founder's stored choice, for previewing one. */
  preference?: VoicePreference;
}

/**
 * REN says something.
 *
 * Calm and a little slower than default, because the brief asks for calm and
 * the default rate reads as hurried. Anything already being said is cut off
 * first: REN speaking over itself is worse than REN being interrupted.
 */
export function say(text: string, options: SaidOptions = {}): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options.onDone?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = options.rate ?? 0.98;
  utterance.pitch = options.pitch ?? 1;

  /*
   * The founder's chosen voice, if this device has one.
   *
   * Left unset when it does not: an unset `voice` lets the platform pick its
   * own default, which is a better outcome than forcing a voice in the wrong
   * language because it was the only one whose name looked right.
   */
  const want = options.preference ?? readVoicePreference();
  const chosen = pickVoice(listVoices(), want);
  if (chosen !== null) {
    const match = window.speechSynthesis.getVoices()
      .find((candidate) => candidate.name === chosen.name);
    if (match) utterance.voice = match;
  }

  utterance.onend = () => options.onDone?.();
  utterance.onerror = () => options.onDone?.();
  window.speechSynthesis.speak(utterance);
}

/** Stops REN mid-sentence. */
export function silence(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}
