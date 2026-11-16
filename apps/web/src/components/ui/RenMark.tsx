"use client";

import styles from "./RenMark.module.css";

/**
 * REN, at icon size.
 *
 * REN's real orb (`components/ren/RenOrb`) is a ray-marched WebGL2 sphere.
 * It is the right thing on REN's own surface, where it is large and there is
 * one of it. It is the wrong thing in a dock: NN renders its navigation three
 * times over — rail, mobile bar, floating dock — so putting the orb in the
 * item list would open three more WebGL contexts to draw a 22 px circle, on a
 * machine that already has the nav's own water, the carousel and the launcher
 * running.
 *
 * So the same object is restated in SVG. Not an approximation of a different
 * mark — the same four things the shader does, in the same order and the same
 * spectrum: a body lit from inside, the rim where the shell turns away from
 * you, the shadow where it turns past the light, and the specular where it
 * faces it. Two orbital rings give it an axis, so it reads as a sphere in
 * space rather than a coloured dot.
 *
 * It breathes and the rings turn, slowly. Under reduced motion it holds
 * still — a sphere does not need to move to be a sphere.
 *
 * The gradients live in `IconDefs`, mounted once in the root layout, because
 * every instance would otherwise carry its own copy of them.
 */

export interface RenMarkProps {
  /** Rendered size in CSS px. */
  size?: number;
  /** Brighter, larger bloom — for the selected state in the navigation. */
  active?: boolean;
  className?: string | undefined;
}

export function RenMark({ size = 22, active = false, className }: RenMarkProps) {
  return (
    <span
      className={[styles.mark, active ? styles.active : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 40 40" width={size} height={size} focusable="false">
        {/* The light it throws on what it sits on. Drawn first, under
            everything, and never clipped to the sphere — that is the whole
            difference between an object on a surface and a sticker. */}
        <circle
          className={styles.bloom}
          cx="20"
          cy="20"
          r="13"
          fill="url(#nn-ren-body)"
          filter="url(#nn-ren-bloom)"
        />

        <g className={styles.rings}>
          <ellipse
            cx="20"
            cy="20"
            rx="17.4"
            ry="6.4"
            fill="none"
            stroke="url(#nn-ren-ring)"
            strokeWidth="1.1"
            transform="rotate(-24 20 20)"
          />
          <ellipse
            cx="20"
            cy="20"
            rx="17.4"
            ry="5.2"
            fill="none"
            stroke="url(#nn-ren-ring)"
            strokeWidth="0.8"
            opacity="0.6"
            transform="rotate(58 20 20)"
          />
        </g>

        <g className={styles.body}>
          <circle cx="20" cy="20" r="13" fill="url(#nn-ren-body)" />
          <circle cx="20" cy="20" r="13" fill="url(#nn-ren-shade)" />
          <circle cx="20" cy="20" r="13" fill="url(#nn-ren-rim)" />
          <circle cx="20" cy="20" r="13" fill="url(#nn-ren-gloss)" />
        </g>

        {/* The rings pass in front of the lower half as well as behind it;
            without this the sphere sits on top of its own orbit. */}
        <g className={styles.rings} clipPath="url(#nn-ren-front)">
          <ellipse
            cx="20"
            cy="20"
            rx="17.4"
            ry="6.4"
            fill="none"
            stroke="url(#nn-ren-ring)"
            strokeWidth="1.1"
            opacity="0.55"
            transform="rotate(-24 20 20)"
          />
        </g>
      </svg>
    </span>
  );
}

export default RenMark;
