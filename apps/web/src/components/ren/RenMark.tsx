"use client";

import { NN_MARK_PATH, NN_MARK_W, NN_MARK_H } from "@/components/ui/NNLogo";
import { REN_STATUS, type RenState } from "@/lib/ren/state";
import styles from "./RenMark.module.css";

/**
 * REN's face.
 *
 * The brand mark is the identity — not a generic AI sphere with the logo
 * bolted on. In every one of the six states the NN mark is drawn at full
 * strength in the centre and the effects happen *around* it: rings expand
 * outward, particles orbit, the aura swells. Nothing ever covers it, and
 * nothing ever replaces it.
 *
 * Live values arrive as CSS custom properties rather than React state. The
 * microphone level updates about sixty times a second while REN listens; a
 * re-render at that rate would be a waste for a number only the compositor
 * needs.
 */

export interface RenMarkProps {
  state: RenState;
  /** Rendered height in px. Everything scales from it. */
  size?: number;
  /**
   * Real input level, 0 to 1, from the microphone analyser. Only meaningful
   * while listening — and only ever a measured value, never a fake pulse,
   * because a waveform that moves when nobody is speaking is a lie.
   */
  level?: number;
  className?: string | undefined;
}

export function RenMark({ state, size = 64, level = 0, className }: RenMarkProps) {
  const clamped = Math.min(1, Math.max(0, level));

  return (
    <span
      className={[styles.mark, className ?? ""].filter(Boolean).join(" ")}
      data-state={state}
      style={{
        ["--size" as string]: `${size}px`,
        ["--level" as string]: clamped.toFixed(3),
      }}
      role="img"
      aria-label={`REN — ${REN_STATUS[state]}`}
    >
      {/* The aura. Breathes when idle, swells with the voice when listening. */}
      <span className={styles.aura} aria-hidden="true" />

      {/* Three rings. Still until summoned, then they travel outward once. */}
      <span className={styles.rings} aria-hidden="true">
        <i />
        <i />
        <i />
      </span>

      {/* Six particles, orbiting only while REN is actually working. */}
      <span className={styles.orbit} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </span>

      {/* The brand, unchanged, on top of all of it. */}
      <svg
        className={styles.glyph}
        viewBox={`0 0 ${NN_MARK_W} ${NN_MARK_H}`}
        fill="currentColor"
        aria-hidden="true"
      >
        <path fillRule="nonzero" d={NN_MARK_PATH} />
      </svg>

      {/* The confirmation tick. Drawn only on a real, confirmed completion. */}
      <svg className={styles.tick} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M5 12.5 10 17.5 19 7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
