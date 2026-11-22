"use client";

import { useId, useState, type ReactNode } from "react";
import styles from "./FlipCard.module.css";

/**
 * A card with a back.
 *
 * The founder's reference turns on hover. NN's turns on a press, and hover is
 * added back only where a real pointer exists — because a phone synthesises a
 * hover on tap, so a hover-driven card turns twice on one touch and lands
 * exactly where it started. The phone is the first target here, not the
 * fallback.
 *
 * What makes it read as an object rather than a turning picture is depth: the
 * contents stand off the face at different heights (`lift1`–`lift3`), so they
 * part company as the card rotates and the eye is given parallax to read. The
 * faces keep `transform-style: preserve-3d` for the same reason — flatten it
 * anywhere in the chain and every child collapses onto the face.
 *
 * Three things keep it honest as a control:
 *
 * - **It is one button.** Not a div with a click handler: it takes Enter and
 *   Space, it is in the tab order once, and `aria-pressed` says which side is
 *   showing rather than leaving a screen reader to guess.
 * - **Only the visible face is readable.** The hidden one is `aria-hidden`
 *   and `inert`, so assistive technology reads one card, not two — and
 *   nothing focusable hides behind a face that is turned away.
 * - **It says it has a back.** A card that only reveals itself on contact is
 *   a card nobody turns over, so the front carries a hint.
 */

export interface FlipCardProps {
  /** What the card shows at rest. */
  front: ReactNode;
  /** What it shows once turned. */
  back: ReactNode;
  /**
   * The front's own markup, rendered invisibly in flow to give the card its
   * height. Both faces are absolutely positioned and cannot size anything.
   * Defaults to `front`, which is right unless the back is taller.
   */
  sizer?: ReactNode;
  /** Shown on the front, telling the founder there is more. */
  hint?: string;
  /** Names the card for assistive technology. */
  label: string;
  className?: string | undefined;
}

export function FlipCard({ front, back, sizer, hint = "More", label, className }: FlipCardProps) {
  const [flipped, setFlipped] = useState(false);
  const id = useId();

  return (
    <button
      type="button"
      className={[styles.scene, className ?? ""].filter(Boolean).join(" ")}
      data-flipped={flipped || undefined}
      aria-pressed={flipped}
      aria-label={flipped ? `${label} — showing detail` : `${label} — show detail`}
      aria-describedby={`${id}-face`}
      onClick={() => setFlipped((was) => !was)}
    >
      <div className={styles.pane}>
        {/* In flow, invisible: the only thing giving the card a height. */}
        <div className={styles.sizer} aria-hidden="true">{sizer ?? front}</div>

        <div
          className={[styles.face, styles.front].join(" ")}
          id={flipped ? undefined : `${id}-face`}
          {...(flipped ? { "aria-hidden": true, inert: true } : {})}
        >
          {front}
          <span className={styles.hint} aria-hidden="true">{hint}</span>
        </div>

        <div
          className={[styles.face, styles.back].join(" ")}
          id={flipped ? `${id}-face` : undefined}
          {...(flipped ? {} : { "aria-hidden": true, inert: true })}
        >
          {back}
        </div>
      </div>
    </button>
  );
}

/**
 * Stands a piece of a card's content off its face.
 *
 * Three steps only. Deeper than this and a card in a grid shears into the one
 * beside it, because each card turns around its own centre.
 */
export function FlipLift({ depth = 1, children }: { depth?: 1 | 2 | 3; children: ReactNode }) {
  const at = depth === 3 ? styles.lift3 : depth === 2 ? styles.lift2 : styles.lift1;
  return <span className={at}>{children}</span>;
}

export default FlipCard;
