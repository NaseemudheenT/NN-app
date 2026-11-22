"use client";

import type { CSSProperties, ReactNode } from "react";
import styles from "./HoloPanel.module.css";

export interface HoloPanelProps {
  /** Position within the stage, in px from its top-left. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Depth on the Z axis. Positive is nearer the viewer. */
  z?: number;
  rotateY?: number;
  rotateX?: number;
  /** Panels further back should sit behind nearer ones. */
  zIndex?: number;
  className?: string | undefined;
  children?: ReactNode;
}

/**
 * One pane of glass suspended in a <HoloStage>.
 *
 * Parallax is proportional to depth, which is what makes the scene read as
 * real volume: a panel 180px forward moves noticeably more than one 180px
 * back as the pointer travels. The arithmetic happens in CSS from the stage's
 * --px/--py variables, so no React re-render is involved while moving.
 */
export function HoloPanel({
  x, y, width, height, z = 0, rotateY = 0, rotateX = 0, zIndex = 1,
  className, children,
}: HoloPanelProps) {
  // Depth factor: -1 (far) … +1 (near), clamped to a sane travel range.
  const depthFactor = Math.max(-1, Math.min(1, z / 220));

  const style: CSSProperties = {
    left: x,
    top: y,
    width,
    height,
    zIndex,
    transform: [
      `translate3d(calc(var(--px, 0) * var(--parallax, 0) * ${depthFactor.toFixed(3)} * 1px),`,
      `calc(var(--py, 0) * var(--parallax, 0) * ${(depthFactor * 0.6).toFixed(3)} * 1px),`,
      `${z}px)`,
      `rotateY(${rotateY}deg)`,
      `rotateX(${rotateX}deg)`,
    ].join(" "),
  };

  return (
    <div className={["nn-glass-card", styles.panel, className ?? ""].filter(Boolean).join(" ")} style={style}>
      <div className={styles.body}>{children}</div>
    </div>
  );
}
