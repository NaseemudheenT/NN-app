"use client";

import {
  useCallback, useEffect, useRef, useState,
  type CSSProperties, type PointerEvent, type ReactNode,
} from "react";
import { useTheme } from "@/lib/theme";
import styles from "./HoloStage.module.css";

export interface HoloStageProps {
  /** Camera distance. Lower is a more dramatic perspective. */
  perspective?: number;
  /** Pointer parallax travel in px at the frontmost plane. 0 disables it. */
  parallax?: number;
  /** Authoring width. Panels are placed against this, then scaled to fit. */
  designWidth?: number;
  /** Authoring height, before scaling. */
  designHeight?: number;
  className?: string;
  children?: ReactNode;
}

/**
 * A real 3D scene. Children placed with <HoloPanel> sit at genuine depths on
 * the Z axis, so pointer movement produces true parallax — near panels travel
 * further than far ones — rather than a flat tilt of the whole group.
 *
 * Panels are authored once against designWidth × designHeight in plain pixels
 * and the whole scene is scaled to whatever space it is given, so the
 * composition holds from a phone to a wide display without re-authoring.
 *
 * Parallax is suppressed entirely under reduced motion.
 */
export function HoloStage({
  perspective = 1700,
  parallax = 18,
  designWidth = 1040,
  designHeight = 470,
  className,
  children,
}: HoloStageProps) {
  const { reducedMotion } = useTheme();
  const outer = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = outer.current;
    if (el === null) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setScale(Math.min(1, w / designWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [designWidth]);

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (reducedMotion || parallax === 0) return;
      const el = stage.current;
      if (el === null) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      const px = ((e.clientX - r.left) / r.width - 0.5) * 2;
      const py = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        el.style.setProperty("--px", px.toFixed(3));
        el.style.setProperty("--py", py.toFixed(3));
      });
    },
    [reducedMotion, parallax],
  );

  const reset = useCallback(() => {
    const el = stage.current;
    if (el === null) return;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
  }, []);

  const stageStyle: CSSProperties = {
    ["--stage-perspective" as string]: `${perspective}px`,
    ["--parallax" as string]: reducedMotion ? "0" : String(parallax),
    width: designWidth,
    height: designHeight,
    transform: `scale(${scale})`,
    transformOrigin: "top center",
  };

  return (
    <div
      ref={outer}
      className={[styles.outer, className ?? ""].filter(Boolean).join(" ")}
      style={{ height: designHeight * scale }}
    >
      <div
        ref={stage}
        className={styles.stage}
        style={stageStyle}
        onPointerMove={onPointerMove}
        onPointerLeave={reset}
      >
        <div className={styles.inner}>{children}</div>
      </div>
    </div>
  );
}
