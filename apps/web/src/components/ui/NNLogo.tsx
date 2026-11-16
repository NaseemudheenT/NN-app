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
  /**
   * Light the mark instead of filling it flat.
   *
   * The geometry is untouched — this is material, not shape. The same path
   * is painted three times: a bloom beneath it so it throws light onto the
   * surface it sits on, the spectrum across its faces so it is made of the
   * same light as the rest of NN, and a bright edge along the top-left where
   * the light actually falls.
   */
  glow?: boolean;
  className?: string | undefined;
}

/** Shared ids. Two identical definitions are harmless; two different ones
 *  would not be, so the mark never generates per-instance names. */
const GLOW_FACE = "nn-mark-face";
const GLOW_BLOOM = "nn-mark-bloom";

export function NNLogo({ size = 32, decorative = false, glow = false, className }: NNLogoProps) {
  return (
    <svg
      width={Math.round(size * NN_MARK_RATIO)}
      height={size}
      viewBox={`0 0 ${NN_MARK_W} ${NN_MARK_H}`}
      fill="currentColor"
      className={className}
      // The bloom is wider than the mark, and the mark touches all four
      // edges of its own box. Without this the light is cut off square.
      {...(glow ? { style: { overflow: "visible" } } : {})}
      {...(decorative
        ? { "aria-hidden": true as const, role: "presentation" as const }
        : { role: "img" as const, "aria-label": "NN" })}
    >
      {glow ? (
        <>
          <defs>
            <linearGradient id={GLOW_FACE} x1="0" y1="0" x2="0.82" y2="1">
              <stop offset="0" stopColor="#F4FBFF" />
              <stop offset="0.3" stopColor="#A9DCFF" />
              <stop offset="0.62" stopColor="#7AA6FF" />
              <stop offset="1" stopColor="#B07CFF" />
            </linearGradient>
            <filter
              id={GLOW_BLOOM}
              x="-55%"
              y="-55%"
              width="210%"
              height="210%"
              colorInterpolationFilters="sRGB"
            >
              <feGaussianBlur stdDeviation="7.5" />
            </filter>
          </defs>
          <path
            d={NN_MARK_PATH}
            fill="#6FB6FF"
            filter={`url(#${GLOW_BLOOM})`}
            opacity="0.62"
          />
          <path d={NN_MARK_PATH} fill={`url(#${GLOW_FACE})`} />
          <path
            d={NN_MARK_PATH}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity="0.55"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <path d={NN_MARK_PATH} />
      )}
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
