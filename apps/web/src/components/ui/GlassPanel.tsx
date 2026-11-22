import type { HTMLAttributes, ReactNode } from "react";
import styles from "./GlassPanel.module.css";

/**
 * Tier is a readability decision, not a style preference.
 *   1 — ambient chrome and large surfaces
 *   2 — content cards
 *   3 — dialogs, floating windows, anything carrying dense text
 * Denser information always sits on a more opaque tier.
 */
export type GlassTier = 1 | 2 | 3;
export type GlassPadding = "none" | "sm" | "md" | "lg";

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  tier?: GlassTier;
  padding?: GlassPadding;
  /** Adds hover and press affordances. Pair with a real click handler. */
  interactive?: boolean;
  /** Prismatic chamfer. On by default for tier 3; opt in elsewhere. */
  holo?: boolean;
  children?: ReactNode;
}

const TIER = { 1: styles.t1, 2: styles.t2, 3: styles.t3 } as const;
const PAD = { none: styles.p0, sm: styles.pSm, md: styles.pMd, lg: styles.pLg } as const;

export function GlassPanel({
  tier = 1,
  padding = "md",
  interactive = false,
  holo,
  className,
  children,
  ...rest
}: GlassPanelProps) {
  const cls = [
    (holo ?? tier === 3) ? "nn-holo" : "",
    "nn-glass-card",
    styles.panel,
    TIER[tier],
    PAD[padding],
    interactive ? styles.interactive : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} {...rest}>
      {children}
    </div>
  );
}
