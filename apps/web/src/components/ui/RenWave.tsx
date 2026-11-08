"use client";

import { useMemo } from "react";
import styles from "./RenWave.module.css";

export type RenState = "idle" | "listening" | "thinking" | "speaking";

export interface RenWaveProps {
  state?: RenState;
  /** Number of nested curves in the fan. */
  lines?: number;
  className?: string | undefined;
}

const W = 600;
const H = 150;
const CY = H / 2;

/** Amplitude and tempo per assistant state. Idle is almost flat on purpose. */
const PROFILE: Record<RenState, { amp: number; period: number }> = {
  idle:      { amp: 0.26, period: 5.0 },
  listening: { amp: 1.00, period: 2.2 },
  thinking:  { amp: 0.55, period: 3.1 },
  speaking:  { amp: 0.82, period: 2.6 },
};

/** Double-hump envelope: a tall narrow peak, a dip, then a broader second peak. */
function envelope(t: number): number {
  const g = (c: number, w: number) => Math.exp(-(((t - c) / w) ** 2));
  return g(0.37, 0.075) - 0.52 * g(0.52, 0.085) + 0.66 * g(0.67, 0.115);
}

/**
 * REN's voice signature. Deterministic geometry — identical on the server and
 * the client, so it never causes a hydration mismatch, and no randomness means
 * it looks the same every time the founder sees it.
 */
export function RenWave({ state = "idle", lines = 29, className }: RenWaveProps) {
  const profile = PROFILE[state];

  const paths = useMemo(() => {
    const STEPS = 112;
    const out: Array<{ d: string; opacity: number; delay: number }> = [];

    for (let i = 0; i < lines; i += 1) {
      // Fan factor from -1 (below the axis) through 0 (flat) to +1 (above).
      const f = (i / (lines - 1)) * 2 - 1;
      const amp = f * profile.amp * (H * 0.42);

      let d = "";
      for (let sIdx = 0; sIdx <= STEPS; sIdx += 1) {
        const t = sIdx / STEPS;
        const x = t * W;
        const y = CY - envelope(t) * amp;
        d += `${sIdx === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(2)}`;
      }

      out.push({
        // Outer curves are the visible envelope; inner ones only add density.
        opacity: 0.1 + Math.abs(f) * 0.5,
        delay: -(Math.abs(f) * profile.period * 0.55),
        d,
      });
    }
    return out;
  }, [lines, profile.amp, profile.period]);

  const label = {
    idle: "REN is idle",
    listening: "REN is listening",
    thinking: "REN is working",
    speaking: "REN is speaking",
  }[state];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={[styles.svg, className ?? ""].filter(Boolean).join(" ")}
      role="img"
      aria-label={label}
      style={{ ["--period" as string]: `${profile.period}s` }}
    >
      <title>{label}</title>
      {paths.map((p, i) => (
        <path
          key={i}
          className={styles.line}
          d={p.d}
          fill="none"
          stroke="currentColor"
          strokeWidth={0.7}
          strokeOpacity={p.opacity}
          style={{ animationDelay: `${p.delay.toFixed(2)}s` }}
        />
      ))}
    </svg>
  );
}
