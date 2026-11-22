"use client";

import { useCallback, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { Icon } from "./Icon";
import styles from "./FloatingWindow.module.css";

export interface FloatingWindowProps {
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  focused: boolean;
  minimized: boolean;
  onMove: (x: number, y: number) => void;
  onFocus: () => void;
  onToggleMinimize: () => void;
  onToggleMaximize: () => void;
  onClose: () => void;
  /** Keeps the window inside its positioned parent while dragging. */
  bounds?: { width: number; height: number };
  children?: ReactNode;
}

/**
 * A draggable glass window. Dragging uses pointer events with capture, so it
 * keeps tracking if the cursor leaves the title bar, and works with touch and
 * pen as well as mouse.
 */
export function FloatingWindow({
  title, x, y, width, height, focused, minimized,
  onMove, onFocus, onToggleMinimize, onToggleMaximize, onClose,
  bounds, children,
}: FloatingWindowProps) {
  const [dragging, setDragging] = useState(false);
  const offset = useRef({ x: 0, y: 0 });

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      // Reject secondary and middle buttons only. Some environments deliver a
      // pointer event with no `button` at all; treat that as the primary one
      // rather than silently refusing to drag.
      if (typeof e.button === "number" && e.button > 0) return;
      // Never start a drag from the window controls.
      if ((e.target as HTMLElement).closest("button") !== null) return;
      onFocus();
      offset.current = {
        x: Number.isFinite(e.clientX) ? e.clientX - x : 0,
        y: Number.isFinite(e.clientY) ? e.clientY - y : 0,
      };
      // Pointer capture keeps the drag alive when the cursor leaves the title
      // bar, but it is absent in older Safari and some embedded webviews.
      // Dragging still works without it, so never let its absence throw.
      if (typeof e.currentTarget.setPointerCapture === "function") {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      setDragging(true);
    },
    [onFocus, x, y],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      // A pointer event without usable coordinates must never be allowed to
      // move the window to NaN and strand it off-screen.
      if (!Number.isFinite(e.clientX) || !Number.isFinite(e.clientY)) return;
      let nx = e.clientX - offset.current.x;
      let ny = e.clientY - offset.current.y;
      if (bounds !== undefined) {
        nx = Math.max(0, Math.min(nx, bounds.width - width));
        ny = Math.max(0, Math.min(ny, bounds.height - 44));
      }
      onMove(nx, ny);
    },
    [dragging, bounds, width, onMove],
  );

  const endDrag = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (
      typeof el.hasPointerCapture === "function" &&
      typeof el.releasePointerCapture === "function" &&
      el.hasPointerCapture(e.pointerId)
    ) {
      el.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  }, []);

  const cls = [
    "nn-glass-card",
    styles.win,
    focused ? styles.focused : styles.unfocused,
    minimized ? styles.minimized : "",
  ].filter(Boolean).join(" ");

  return (
    <section
      className={cls}
      style={{ left: x, top: y, width, height: minimized ? undefined : height, zIndex: focused ? 2 : 1 }}
      aria-label={title}
      onMouseDown={onFocus}
    >
      <div
        className={styles.bar}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <span className={styles.title}>{title}</span>
        <div className={styles.controls}>
          <button type="button" className={styles.ctl} onClick={onToggleMinimize}
                  aria-label={minimized ? `Restore ${title}` : `Minimise ${title}`}>
            <Icon name={minimized ? "plus" : "minus"} size={15} />
          </button>
          <button type="button" className={styles.ctl} onClick={onToggleMaximize}
                  aria-label={`Maximise ${title}`}>
            <Icon name="expand" size={14} />
          </button>
          <button type="button" className={`${styles.ctl} ${styles.close}`} onClick={onClose}
                  aria-label={`Close ${title}`}>
            <Icon name="close" size={15} />
          </button>
        </div>
      </div>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
