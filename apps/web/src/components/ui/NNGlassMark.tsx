"use client";

import { useId } from "react";
import { NN_MARK_PATH } from "./NNLogo";
import styles from "./NNGlassMark.module.css";

export interface NNGlassMarkProps {
  size?: number;
  /** Strength of the volumetric bloom, in px of blur. */
  bloom?: number;
  /** Prismatic edge split. 0 disables it. */
  dispersion?: number;
  className?: string;
}

/**
 * The NN mark rendered as lit glass — the same locked Concept A geometry,
 * given real optical treatment:
 *
 *   · volumetric bloom behind the form
 *   · a vertical refraction gradient through the body
 *   · chromatic dispersion — cyan and magenta offset copies, screen-blended,
 *     the way a real prism splits light at an edge
 *   · a specular streak that travels across the surface
 *
 * The geometry itself is untouched: it imports NN_MARK_PATH rather than
 * restating it, so the approved mark can never drift out of sync here.
 */
export function NNGlassMark({
  size = 120,
  bloom = 16,
  dispersion = 0.9,
  className,
}: NNGlassMarkProps) {
  const uid = useId().replace(/:/g, "");
  const body = `${uid}-body`;
  const edge = `${uid}-edge`;
  const clip = `${uid}-clip`;
  const streak = `${uid}-streak`;

  return (
    <span
      className={[styles.wrap, className ?? ""].filter(Boolean).join(" ")}
      style={{ ["--bloom" as string]: `${bloom}px` }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 76 76"
        className={styles.svg}
        role="img"
        aria-label="NN"
      >
        <title>NN</title>
        <defs>
          {/* Refraction through the body: bright where light enters, dimmer
              where it exits. */}
          <linearGradient id={body} x1="0.1" y1="0" x2="0.72" y2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.97" />
            <stop offset="0.42" stopColor="#E3EEFF" stopOpacity="0.80" />
            <stop offset="1" stopColor="#8FB6E8" stopOpacity="0.56" />
          </linearGradient>

          {/* A brighter rim catches light along the leading edge. */}
          <linearGradient id={edge} x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="0.55" stopColor="#9CC8FF" stopOpacity="0.35" />
            <stop offset="1" stopColor="#649CE3" stopOpacity="0.12" />
          </linearGradient>

          <linearGradient id={streak} x1="0" y1="0" x2="1" y2="0.3">
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.72" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          <clipPath id={clip}>
            <path d={NN_MARK_PATH} fillRule="nonzero" />
          </clipPath>
        </defs>

        {/* Chromatic dispersion — the prism split. Screen blending keeps it
            additive so it reads as light, not as a coloured outline. */}
        {dispersion > 0 ? (
          <g style={{ mixBlendMode: "screen" }} aria-hidden="true">
            <path
              d={NN_MARK_PATH}
              fillRule="nonzero"
              fill="#4FD8FF"
              opacity="0.42"
              transform={`translate(${-dispersion} ${-dispersion * 0.45})`}
            />
            <path
              d={NN_MARK_PATH}
              fillRule="nonzero"
              fill="#C77BFF"
              opacity="0.34"
              transform={`translate(${dispersion} ${dispersion * 0.45})`}
            />
          </g>
        ) : null}

        {/* The mark itself. */}
        <path d={NN_MARK_PATH} fillRule="nonzero" fill={`url(#${body})`} />
        <path
          d={NN_MARK_PATH}
          fillRule="nonzero"
          fill="none"
          stroke={`url(#${edge})`}
          strokeWidth="0.9"
        />

        {/* Specular travelling streak, clipped to the glyph so it only ever
            lights the glass and never the space around it. */}
        <g clipPath={`url(#${clip})`} aria-hidden="true">
          <rect
            className={styles.sheen}
            x="-30" y="-10" width="30" height="96"
            fill={`url(#${streak})`}
            transform="skewX(-18)"
          />
        </g>
      </svg>
    </span>
  );
}
