"use client";

import { useId, type FormEvent } from "react";
import { Icon } from "./Icon";
import { OrinWave, type OrinState } from "./OrinWave";
import styles from "./OrinCommand.module.css";

export interface OrinCommandProps {
  /** Assistant state. Drives the waveform and the orb. */
  state?: OrinState;
  prompt?: string;
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (value: string) => void;
  onMicToggle: () => void;
  /** Shown beneath the input. Use it to state what is and is not wired up. */
  status?: string;
  className?: string;
}

const STATE_TEXT: Record<OrinState, string> = {
  idle: "Ready",
  listening: "Listening",
  thinking: "Working",
  speaking: "Speaking",
};

/**
 * ORIN's command surface — the single place the founder talks to NN.
 *
 * This component is presentational and fully controlled: it renders state and
 * reports intent. It performs no speech recognition and makes no network call,
 * so it can never imply a capability that is not yet connected. The owning
 * screen decides what actually happens.
 */
export function OrinCommand({
  state = "idle",
  prompt = "Ask me anything…",
  value,
  onValueChange,
  onSubmit,
  onMicToggle,
  status,
  className,
}: OrinCommandProps) {
  const id = useId();
  const listening = state === "listening";

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length > 0) onSubmit(trimmed);
  };

  return (
    <div className={[styles.card, className ?? ""].filter(Boolean).join(" ")}>
      <p className={styles.prompt}>{prompt}</p>

      <div className={styles.wave}>
        <OrinWave state={state} />
      </div>

      <form className={styles.row} onSubmit={submit}>
        <label className="nn-sr-only" htmlFor={id}>Message ORIN</label>
        <input
          id={id}
          className={styles.input}
          value={value}
          placeholder="Type a command, or press the orb to speak"
          onChange={(e) => onValueChange(e.currentTarget.value)}
          autoComplete="off"
        />
        <button
          type="button"
          className={styles.orb}
          data-active={listening}
          aria-pressed={listening}
          aria-label={listening ? "Stop listening" : "Start listening"}
          onClick={onMicToggle}
        >
          <Icon name="mic" size={19} />
        </button>
        <button
          type="submit"
          className={styles.orb}
          aria-label="Send to ORIN"
          disabled={value.trim().length === 0}
          style={value.trim().length === 0 ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
        >
          <Icon name="check" size={19} />
        </button>
      </form>

      <p className={styles.status}>
        {status ?? STATE_TEXT[state]}
      </p>
    </div>
  );
}
