/**
 * The official NN mark — Concept A, "Interlock", approved 2026-11-08.
 *
 * The path data below is the single locked geometry. It is identical to every
 * file in /public/brand/nn/ and MUST NOT be altered. Two N forms sharing one
 * stem: three verticals, two parallel diagonals, all on a 76-unit grid.
 */
export const NN_MARK_PATH =
  "M0 0 H12 L32 46 V0 H44 V76 H32 L12 30 V76 H0 Z " +
  "M32 0 H44 L64 46 V0 H76 V76 H64 L44 30 V76 H32 Z";

export interface NNLogoProps {
  /** Rendered edge length in px. The mark is always square. */
  size?: number;
  /** Decorative marks are hidden from assistive technology. */
  decorative?: boolean;
  className?: string;
}

export function NNLogo({ size = 32, decorative = false, className }: NNLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 76 76"
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
  className?: string;
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
