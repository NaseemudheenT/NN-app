"use client";

import { useId, useMemo, type CSSProperties, type ReactNode } from "react";
import styles from "./WaveCard.module.css";

/**
 * The NN card.
 *
 * The founder's reference is a slab of dark glass with light moving inside it:
 * cyan folding into blue, blue into indigo, indigo into violet, all of it soft
 * enough that you read the card before you read the colour. This is that card,
 * and it is the surface every other NN surface is cut from.
 *
 * The light is real geometry, not a picture. Each band is a sine sum sampled
 * into one SVG path, blurred, and translated by exactly one tile width on a
 * loop — so the motion is seamless and the file holds no image at all.
 *
 * Three properties matter more than the look:
 *
 * - **It is deterministic.** No randomness at render, no clock read during
 *   paint, so the server and the client draw the identical card and hydration
 *   never mismatches.
 * - **It is free.** Only `transform` is animated, so the bands live on the
 *   compositor and a page of forty cards costs the main thread nothing.
 * - **It stops.** Reduced motion freezes the bands mid-flow rather than
 *   removing them: the card keeps its material, it just stops moving.
 */

export type WaveTone =
  /** Cyan through violet — the founder's reference card. */
  | "aurora"
  /** Cold and quiet: cyan and aqua only. Reading surfaces. */
  | "tide"
  /** Indigo through violet. Creation and memory. */
  | "violet"
  /** Nearly still, deep navy. Dense information, where light would interfere. */
  | "deep"
  /** A single bright cyan crest. Alerts and live state. */
  | "signal";

const VIEW_W = 400;
const VIEW_H = 260;

/** One harmonic: cycles across the tile, amplitude in user units, phase. */
type Harmonic = readonly [cycles: number, amplitude: number, phase: number];

interface Band {
  /** Centre line, as a fraction of the card's height. */
  base: number;
  harmonics: readonly Harmonic[];
  /** Index into the tone's colour pair list. */
  colour: number;
  blur: number;
  opacity: number;
  /** Seconds for one full tile traverse. */
  period: number;
  direction: 1 | -1;
}

/**
 * Cycle counts are whole numbers, which is the whole trick: a harmonic with an
 * integer number of cycles across the tile has the same value at x and
 * x + tile, so translating by one tile is invisible and the loop never seams.
 */
const BANDS: readonly Band[] = [
  {
    base: 0.44,
    harmonics: [[1, 40, 0], [2, 17, 1.9], [3, 7, 4.1]],
    colour: 0, blur: 26, opacity: 0.62, period: 19, direction: 1,
  },
  {
    base: 0.62,
    harmonics: [[1, 33, 2.4], [2, 14, 5.2], [4, 6, 0.7]],
    colour: 1, blur: 30, opacity: 0.58, period: 27, direction: -1,
  },
  {
    base: 0.8,
    harmonics: [[1, 26, 4.6], [3, 12, 2.2]],
    colour: 2, blur: 34, opacity: 0.52, period: 34, direction: 1,
  },
];

/** Colour pairs per tone, as `rgb()` triplet token names. */
const TONE_COLOURS: Record<WaveTone, readonly (readonly [string, string])[]> = {
  aurora: [
    ["--nn-spectrum-cyan", "--nn-spectrum-aqua"],
    ["--nn-spectrum-blue", "--nn-spectrum-indigo"],
    ["--nn-spectrum-indigo", "--nn-spectrum-violet"],
  ],
  tide: [
    ["--nn-spectrum-cyan", "--nn-spectrum-aqua"],
    ["--nn-spectrum-aqua", "--nn-spectrum-cyan"],
    ["--nn-spectrum-blue", "--nn-spectrum-aqua"],
  ],
  violet: [
    ["--nn-spectrum-indigo", "--nn-spectrum-violet"],
    ["--nn-spectrum-violet", "--nn-spectrum-indigo"],
    ["--nn-spectrum-blue", "--nn-spectrum-violet"],
  ],
  deep: [
    ["--nn-spectrum-blue", "--nn-spectrum-indigo"],
    ["--nn-spectrum-indigo", "--nn-spectrum-blue"],
    ["--nn-spectrum-blue", "--nn-spectrum-blue"],
  ],
  signal: [
    ["--nn-spectrum-aqua", "--nn-spectrum-cyan"],
    ["--nn-spectrum-cyan", "--nn-spectrum-aqua"],
    ["--nn-spectrum-blue", "--nn-spectrum-cyan"],
  ],
};

/** Tones differ in how much light they let through, not only in hue. */
const TONE_GAIN: Record<WaveTone, number> = {
  aurora: 1, tide: 0.82, violet: 0.95, deep: 0.42, signal: 1.12,
};

/**
 * One band as a filled path, two tiles wide.
 *
 * Sampled rather than fitted: at these blur radii a 64-step polyline and a
 * perfect spline are the same picture, and the polyline has no corner cases.
 */
function bandPath(band: Band, gain: number): string {
  const STEPS = 128;            // across two tiles, so 64 per tile
  const span = VIEW_W * 2;
  const baseline = band.base * VIEW_H;
  let d = "";

  for (let i = 0; i <= STEPS; i += 1) {
    const x = (i / STEPS) * span;
    // Phase advances over the TILE, not the span, so the second tile repeats.
    const t = (x / VIEW_W) * Math.PI * 2;
    let y = baseline;
    for (const [cycles, amplitude, phase] of band.harmonics) {
      y -= Math.sin(t * cycles + phase) * amplitude * gain;
    }
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(2)}`;
  }
  // Closed just below the band rather than down to the floor. Filling to the
  // bottom edge made three ribbons stack into one solid block of colour; this
  // keeps each one a band of light with the card visible between them.
  const floor = band.base * VIEW_H + 86;
  return `${d}L${span} ${floor.toFixed(1)}L0 ${floor.toFixed(1)}Z`;
}

export interface WaveCardProps {
  tone?: WaveTone;
  /** Dials the whole light field down without changing its colour. 0–1. */
  intensity?: number;
  /** Freeze the bands. Offscreen cards should pass true. */
  paused?: boolean;
  /** Lifts the card and sharpens its rim on hover and focus-within. */
  interactive?: boolean;
  children?: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export function WaveCard({
  tone = "aurora",
  intensity = 1,
  paused = false,
  interactive = false,
  children,
  className,
  style,
}: WaveCardProps) {
  // One id per instance: SVG gradient ids are document-global, and two cards
  // sharing an id means the second one silently paints with the first's colours.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gain = Math.max(0, Math.min(1.4, intensity)) * TONE_GAIN[tone];
  const colours = TONE_COLOURS[tone];

  const paths = useMemo(
    () => BANDS.map((band) => bandPath(band, gain)),
    [gain],
  );

  return (
    <div
      className={[
        styles.card,
        interactive ? styles.interactive : "",
        paused ? styles.paused : "",
        className ?? "",
      ].filter(Boolean).join(" ")}
      data-tone={tone}
      style={style}
    >
      <svg
        className={styles.field}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          {BANDS.map((band, i) => {
            const pair = colours[band.colour] ?? colours[0]!;
            return (
              <linearGradient
                key={i}
                id={`${uid}-g${i}`}
                x1="0" y1="0" x2="1" y2="0.35"
              >
                <stop offset="0" stopColor={`rgb(var(${pair[0]}) / 0%)`} />
                <stop offset="0.18" stopColor={`rgb(var(${pair[0]}) / 52%)`} />
                <stop offset="0.46" stopColor={`rgb(var(${pair[1]}) / 72%)`} />
                <stop offset="0.74" stopColor={`rgb(var(${pair[1]}) / 44%)`} />
                <stop offset="1" stopColor={`rgb(var(${pair[1]}) / 0%)`} />
              </linearGradient>
            );
          })}
          {BANDS.map((band, i) => (
            <filter
              key={i}
              id={`${uid}-b${i}`}
              x="-30%" y="-60%" width="160%" height="260%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation={band.blur} />
            </filter>
          ))}
        </defs>

        {BANDS.map((band, i) => (
          <g
            key={i}
            className={styles.band}
            style={{
              // Negative duration is not valid; direction is expressed by the
              // animation name instead, so a band can flow either way.
              animationDuration: `${band.period}s`,
              animationName: band.direction === 1 ? styles.flowRight : styles.flowLeft,
              opacity: band.opacity,
            } as CSSProperties}
          >
            <path
              d={paths[i]}
              fill={`url(#${uid}-g${i})`}
              filter={`url(#${uid}-b${i})`}
            />
          </g>
        ))}
      </svg>

      {/* The glass itself: a bright top edge, a 1px rim, and a wash that keeps
          text legible no matter where a crest happens to be. */}
      <div className={styles.sheen} aria-hidden="true" />
      <div className={styles.rim} aria-hidden="true" />

      {children ? <div className={styles.content}>{children}</div> : null}
    </div>
  );
}

export interface WaveChipProps {
  children?: ReactNode;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

/**
 * A frosted tile that floats on a WaveCard, blurring the light behind it.
 *
 * It is the second half of the founder's reference: the card carries the
 * light, and these sit on top of it and fog it. That only reads correctly
 * over a WaveCard — over a flat surface there is nothing to frost.
 */
export function WaveChip({ children, className, style }: WaveChipProps) {
  return (
    <div
      className={[styles.chip, className ?? ""].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </div>
  );
}
