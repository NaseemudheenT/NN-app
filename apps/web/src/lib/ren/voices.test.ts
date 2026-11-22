import { afterEach, describe, expect, it, vi } from "vitest";
import {
  availablePreferences, guessVoice, pickVoice, readVoicePreference,
  writeVoicePreference, type RenVoice,
} from "./voices";

/**
 * Which voice REN speaks in.
 *
 * The Web Speech API has no gender field, so every answer here is an
 * inference over a name. The tests exist to pin the two things that matter:
 * the inference is right on the voices the platforms actually ship, and NN
 * says *nothing available* rather than quietly picking wrong.
 */

const voice = (name: string, over: Partial<RenVoice> = {}): RenVoice => ({
  name, lang: "en-US", guessed: guessVoice(name), local: true, ...over,
});

afterEach(() => { try { window.localStorage.clear(); } catch { /* ignore */ } });

describe("reading a voice's name", () => {
  it("does not read 'female' as 'male'", () => {
    // `"female".includes("male")` is true. Getting this backwards is the
    // entire bug, and it would be invisible until a founder complained.
    expect(guessVoice("Google UK English Female")).toBe("female");
    expect(guessVoice("Microsoft Hazel - English (Female)")).toBe("female");
    expect(guessVoice("Google UK English Male")).toBe("male");
  });

  it("knows the voices Apple, Google and Microsoft actually ship", () => {
    for (const name of ["Samantha", "Victoria", "Moira", "Zira", "Joanna"]) {
      expect(guessVoice(name), name).toBe("female");
    }
    for (const name of ["Daniel", "Alex", "Fred", "David", "Matthew"]) {
      expect(guessVoice(name), name).toBe("male");
    }
  });

  it("matches a whole word, not a fragment of one", () => {
    // "Marksmith" is not Mark; "Female" inside "Femalely" is not a signal.
    expect(guessVoice("Marksmith")).toBe("system");
    expect(guessVoice("Alexandra")).toBe("system");
  });

  it("admits it does not know", () => {
    for (const name of ["Whisper", "Nova 3", "en-US-Standard-C", ""]) {
      expect(guessVoice(name), name).toBe("system");
    }
  });
});

describe("choosing one", () => {
  const voices = [
    voice("Samantha"), voice("Daniel"), voice("Nova 3"),
    voice("Google UK English Male", { lang: "en-GB", local: false }),
  ];

  it("finds a male voice when asked for one", () => {
    expect(pickVoice(voices, "male", "en-US")?.name).toBe("Daniel");
  });

  it("finds a female voice when asked for one", () => {
    expect(pickVoice(voices, "female", "en-US")?.name).toBe("Samantha");
  });

  it("leaves the platform alone for 'system'", () => {
    expect(pickVoice(voices, "system", "en-US")).toBeNull();
  });

  it("returns null rather than picking wrong when none exists", () => {
    // So the surface can say "this device has no male voice installed"
    // instead of changing nothing and leaving the founder confused.
    expect(pickVoice([voice("Samantha")], "male", "en-US")).toBeNull();
    expect(pickVoice([], "female", "en-US")).toBeNull();
  });

  it("prefers a voice in the page's own language", () => {
    const mixed = [
      voice("Jorge", { lang: "es-ES" }),
      voice("Daniel", { lang: "en-GB" }),
    ];
    expect(pickVoice(mixed, "male", "en-GB")?.name).toBe("Daniel");
    expect(pickVoice(mixed, "male", "es-ES")?.name).toBe("Jorge");
  });

  it("prefers a local voice, which needs no network", () => {
    const both = [
      voice("Matthew", { local: false }),
      voice("Daniel", { local: true }),
    ];
    expect(pickVoice(both, "male", "en-US")?.name).toBe("Daniel");
  });

  it("offers only what the device really has", () => {
    expect(availablePreferences([voice("Samantha")])).toEqual(["system", "female"]);
    expect(availablePreferences([voice("Daniel")])).toEqual(["system", "male"]);
    expect(availablePreferences([])).toEqual(["system"]);
    expect(availablePreferences([voice("Samantha"), voice("Daniel")]))
      .toEqual(["system", "female", "male"]);
  });
});

describe("remembering the choice", () => {
  it("keeps it between sessions", () => {
    writeVoicePreference("male");
    expect(readVoicePreference()).toBe("male");
  });

  it("falls back to the platform when nothing is stored", () => {
    expect(readVoicePreference()).toBe("system");
  });

  it("ignores a stored value that is not a voice", () => {
    window.localStorage.setItem("nn.ren.voice", "robot");
    expect(readVoicePreference()).toBe("system");
  });

  it("does not throw where storage is refused", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => { throw new Error("private mode"); });
    expect(() => writeVoicePreference("female")).not.toThrow();
    spy.mockRestore();
  });
});
