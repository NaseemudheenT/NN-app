/**
 * The official NN mark.
 *
 * A single N drawn as a double stroke: each of its three strokes is an
 * outline, so every edge reads as two parallel lines and the letter holds
 * together as one architectural form rather than three bars.
 *
 * The founder supplied this mark directly and has confirmed it three times.
 * It replaces the earlier two-N lockup.
 *
 * The path below is the single locked geometry. Every file in
 * /public/brand/nn/ is generated from it, and it MUST NOT be altered without
 * founder approval. Because the strokes are hollow, it is filled **evenodd**:
 * with nonzero the counters would fill in and the mark would become a solid
 * blob at small sizes.
 */
export const NN_MARK_PATH =
  "M0 0 H22 V108 H0 Z M7 7 H15 V101 H7 Z " +
  "M78 0 H100 V108 H78 Z M85 7 H93 V101 H85 Z " +
  "M22 0 H42 L78 108 H58 Z M29 7 H35 L71 101 H65 Z";

/** The mark is 100 × 108. Never assume it is square. */
export const NN_MARK_W = 100;
export const NN_MARK_H = 108;
export const NN_MARK_RATIO = NN_MARK_W / NN_MARK_H;

export interface NNLogoProps {
  /** Rendered HEIGHT in px. Width follows the mark's 100:108 ratio. */
  size?: number;
  /** Decorative marks are hidden from assistive technology. */
  decorative?: boolean;
  className?: string | undefined;
}

export function NNLogo({ size = 32, decorative = false, className }: NNLogoProps) {
  return (
    <svg
      width={Math.round(size * NN_MARK_RATIO)}
      height={size}
      viewBox={`0 0 ${NN_MARK_W} ${NN_MARK_H}`}
      fill="currentColor"
      className={className}
      {...(decorative
        ? { "aria-hidden": true as const, role: "presentation" as const }
        : { role: "img" as const, "aria-label": "NN" })}
    >
      <path fillRule="evenodd" d={NN_MARK_PATH} />
    </svg>
  );
}

export interface NNLockupProps {
  size?: number;
  className?: string | undefined;
}

/**
 * Mark plus wordmark. The wordmark is real text, not outlines, so it stays
 * selectable, translatable and respects the founder's font-size settings.
 */
export function NNLockup({ size = 28, className }: NNLockupProps) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: size * 0.45 }}
    >
      <NNLogo size={size} decorative />
      <span
        style={{
          fontSize: size * 0.78,
          fontWeight: "var(--weight-semibold)",
          letterSpacing: "0.14em",
          lineHeight: 1,
        }}
      >
        NN
      </span>
    </span>
  );
}
