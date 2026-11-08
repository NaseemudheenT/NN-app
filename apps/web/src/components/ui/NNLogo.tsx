/**
 * The official NN mark — Concept A, approved 2026-11-08, revised 2026-11-08
 * at the founder's direction to open a light gap between the two forms so the
 * mark reads unambiguously as N N.
 *
 * The path data below is the single locked geometry. It is identical to every
 * file in /public/brand/nn/ and MUST NOT be altered without founder approval.
 * Two N forms on a 76-unit grid, separated by a 6-unit gap.
 */
export const NN_MARK_PATH =
  "M0 0 H12 L32 46 V0 H44 V76 H32 L12 30 V76 H0 Z " +
  "M50 0 H62 L82 46 V0 H94 V76 H82 L62 30 V76 H50 Z";

/** The mark is 94 × 76. Never assume it is square. */
export const NN_MARK_W = 94;
export const NN_MARK_H = 76;
export const NN_MARK_RATIO = NN_MARK_W / NN_MARK_H;

export interface NNLogoProps {
  /** Rendered HEIGHT in px. Width follows the mark's 94:76 ratio. */
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
      <path fillRule="nonzero" d={NN_MARK_PATH} />
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
