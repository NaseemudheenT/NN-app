/**
 * The official NN mark.
 *
 * A single N, drawn solid and cut on the diagonal. Two upright stems carry a
 * full-width diagonal between them, and the silhouette is chamfered at the
 * top-left and bottom-right so the whole letter leans the same way the
 * diagonal does. It reads as one architectural form rather than three bars.
 *
 * It replaced the hollow double-stroke mark on 2026-11-14 at the founder's
 * instruction. The outline version was correct geometry but the wrong
 * material: 7px walls around an 8px counter went wiry below about 28px and
 * read as a wireframe rather than a logo. Solid strokes hold at 16px and
 * still have somewhere to go at 200px, where the glass treatment in
 * {@link NNGlassMark} can light the faces.
 *
 * The path is the single locked geometry — every file in /public/brand/nn/ is
 * generated from it, and it must not be altered without founder approval.
 * The three sub-paths deliberately **overlap** by 2px where the diagonal
 * meets each stem, so no hairline seam can appear between them at any raster
 * size. That overlap is why the mark is filled **nonzero**: under evenodd the
 * two overlaps would punch holes at exactly the joints.
 */
export const NN_MARK_PATH =
  "M0 14 L14 0 H22 V108 H0 Z " +
  "M20 0 H46 L100 108 H74 Z " +
  "M98 0 H120 V94 L106 108 H98 Z";

/** The mark is 120 × 108. Never assume it is square. */
export const NN_MARK_W = 120;
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
      <path d={NN_MARK_PATH} />
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
