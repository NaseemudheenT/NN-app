"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { LogoReveal } from "@/components/ui/LogoReveal";
import { useTheme } from "@/lib/theme";
import { completeSetup } from "@/lib/nn/setup";
import { say, silence } from "@/lib/ren/voice";
import {
  availablePreferences, whenVoicesReady, writeVoicePreference,
  type RenVoice, type VoicePreference,
} from "@/lib/ren/voices";
import s from "./SetupFlow.module.css";

/**
 * The first thing NN ever shows you.
 *
 * One rule governs the whole flow: **every choice takes effect the moment it
 * is made.** The theme changes under your thumb, REN speaks in the voice you
 * just picked, motion settles or stops. Nothing is queued behind a Save
 * button, because a setup that only *describes* what it will do asks you to
 * agree to something you have not seen — and then the founder arrives in an
 * environment they did not actually choose.
 *
 * It only asks about things that are genuinely properties of *this device*:
 * the screen's brightness, how much movement is welcome on it, and which
 * voices it has installed. That is why it is remembered per device rather
 * than per account — a new phone has different speakers and a different
 * screen, and should ask again.
 *
 * Every step is skippable by moving on; nothing here can fail in a way that
 * leaves NN unusable. The founder can reach it again from Settings.
 */

type StepId = "welcome" | "look" | "motion" | "voice" | "ready";

const STEPS: readonly StepId[] = ["welcome", "look", "motion", "voice", "ready"];

interface Choice<T> {
  value: T;
  name: string;
  why: string;
}

function Choices<T extends string>({ options, chosen, onChoose }: {
  options: readonly Choice<T>[];
  chosen: T;
  onChoose: (value: T) => void;
}) {
  return (
    <div className={s.choices} role="group">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={s.choice}
          aria-pressed={option.value === chosen}
          onClick={() => onChoose(option.value)}
        >
          <span className={s.choiceBody}>
            <span className={s.choiceName}>{option.name}</span>
            <span className={s.choiceWhy}>{option.why}</span>
          </span>
          <span className={s.mark} aria-hidden="true">
            {option.value === chosen ? "✓" : ""}
          </span>
        </button>
      ))}
    </div>
  );
}

export function SetupFlow() {
  const router = useRouter();
  const { theme, setTheme, motion, setMotion } = useTheme();
  const [at, setAt] = useState(0);
  const [voices, setVoices] = useState<readonly RenVoice[]>([]);
  const [voice, setVoice] = useState<VoicePreference>("system");

  /* The voice list arrives a tick after the page on most browsers. */
  useEffect(() => whenVoicesReady(setVoices), []);

  // Nothing should still be talking when the founder moves on, or two steps
  // speak over each other.
  useEffect(() => () => silence(), []);

  const step = STEPS[at] ?? "ready";
  const canSpeak = useMemo(() => availablePreferences(voices), [voices]);

  const chooseVoice = (want: VoicePreference) => {
    setVoice(want);
    writeVoicePreference(want);
    // Heard, not described. A voice you cannot hear is not a choice.
    say("This is how I will sound.", { preference: want });
  };

  const finish = () => {
    silence();
    completeSetup();
    router.replace("/home" as Route);
  };

  const onward = () => {
    if (at >= STEPS.length - 1) { finish(); return; }
    silence();
    setAt((was) => was + 1);
  };

  return (
    <main className={s.page}>
      <div className={s.card}>
        <div className={s.progress} role="presentation">
          {STEPS.map((id, index) => (
            <span
              key={id}
              className={s.tick}
              data-at={index < at ? "done" : index === at ? "now" : undefined}
            />
          ))}
        </div>

        {step === "welcome" ? (
          <div className={s.step}>
            <LogoReveal size={96} duration={2200} />
            <span className={s.kicker}>First run</span>
            <h1 className={s.title}>This is NN.</h1>
            <p className={s.said}>
              Four short questions about <strong>this device</strong> — how it should look,
              how much it should move, and how REN should sound on it. Each answer
              takes effect straight away, so you will see it before you agree to it.
            </p>
          </div>
        ) : null}

        {step === "look" ? (
          <div className={s.step}>
            <span className={s.kicker}>Step 1 of 3</span>
            <h1 className={s.title}>How should NN look here?</h1>
            <p className={s.said}>This changes as you choose. Pick whichever is easier on your eyes.</p>
            <Choices
              chosen={theme}
              onChoose={setTheme}
              options={[
                { value: "system", name: "Match this device", why: "Follows your phone between day and night." },
                { value: "dark", name: "Always dark", why: "Deep midnight glass. Easiest at night." },
                { value: "light", name: "Always light", why: "Bright ice. Easiest in daylight." },
              ] as const}
            />
          </div>
        ) : null}

        {step === "motion" ? (
          <div className={s.step}>
            <span className={s.kicker}>Step 2 of 3</span>
            <h1 className={s.title}>How much should NN move?</h1>
            <p className={s.said}>
              NN is a spatial environment and things drift, settle and turn. If that is
              unwelcome — or this device is older — it can hold still instead.
            </p>
            <Choices
              chosen={motion}
              onChoose={setMotion}
              options={[
                { value: "system", name: "Match this device", why: "Follows your accessibility setting." },
                { value: "full", name: "Full movement", why: "Every surface drifts and settles." },
                { value: "reduced", name: "Hold still", why: "Motion collapses. Nothing is lost but the travel." },
              ] as const}
            />
          </div>
        ) : null}

        {step === "voice" ? (
          <div className={s.step}>
            <span className={s.kicker}>Step 3 of 3</span>
            <h1 className={s.title}>How should REN sound?</h1>
            <p className={s.said}>
              {canSpeak.length > 1
                ? "Tap one and REN will say a line, so you hear it rather than read about it."
                : "This device has not offered NN a choice of voices, so REN will use its own. You can change this later in Settings."}
            </p>
            <Choices
              chosen={voice}
              onChoose={chooseVoice}
              options={[
                { value: "system", name: "This device's own voice", why: "Whatever your phone already uses." },
                ...(canSpeak.includes("female")
                  ? [{ value: "female" as const, name: "A female voice", why: "Chosen from the voices installed here." }]
                  : []),
                ...(canSpeak.includes("male")
                  ? [{ value: "male" as const, name: "A male voice", why: "Chosen from the voices installed here." }]
                  : []),
              ]}
            />
          </div>
        ) : null}

        {step === "ready" ? (
          <div className={s.step}>
            <span className={s.kicker}>Ready</span>
            <h1 className={s.title}>NN is yours now.</h1>
            <p className={s.said}>
              Everything you keep here stays here. REN can open applications, write a
              record, mark one done and find anything you have kept — and it asks
              before it changes anything.
            </p>
            <p className={s.said}>
              All of this can be changed later in <strong>Settings</strong>, including
              seeing this again.
            </p>
          </div>
        ) : null}

        <div className={s.feet}>
          {at > 0 ? (
            <button
              type="button"
              className={s.back}
              aria-label="Back a step"
              onClick={() => { silence(); setAt((was) => Math.max(0, was - 1)); }}
            >
              ←
            </button>
          ) : null}
          <button type="button" className={s.onward} onClick={onward}>
            {step === "welcome" ? "Begin" : step === "ready" ? "Open NN" : "Next"}
          </button>
        </div>

        {step === "welcome" ? (
          <p className={s.note}>This takes less than a minute, and only asks about this device.</p>
        ) : null}
      </div>
    </main>
  );
}

export default SetupFlow;
