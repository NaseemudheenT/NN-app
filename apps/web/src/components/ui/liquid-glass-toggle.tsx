"use client";

import * as React from "react";
import styles from "./liquid-glass-toggle.module.css";

export type LiquidToggleProps = {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  tone?: "light" | "dark";
  /** Track height in CSS pixels; width is 2.1× the height. */
  size?: number;
  icons?: { off?: React.ReactNode; on?: React.ReactNode };
  disabled?: boolean;
  sound?: boolean;
  label?: string;
  name?: string;
  value?: string;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
};

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const NimbusToggleIcons = {
  sun: <Icon><circle cx="12" cy="12" r="4.2" /><path d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5 7 7M17 17l1.5 1.5M5.5 18.5 7 17M17 7l1.5-1.5" /></Icon>,
  moon: <Icon><path d="M20 14.6A8.3 8.3 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6Z" /></Icon>,
  check: <Icon><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>,
  close: <Icon><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></Icon>,
};

type DragState = { pointerId: number; startX: number; currentX: number; moved: boolean };

export function LiquidToggle({
  checked,
  defaultChecked = false,
  onCheckedChange,
  tone = "light",
  size = 40,
  icons,
  disabled = false,
  sound = false,
  label = "Toggle",
  name,
  value = "on",
  id,
  className,
  style,
}: LiquidToggleProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultChecked);
  const [dragProgress, setDragProgress] = React.useState<number | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const dragRef = React.useRef<DragState | null>(null);
  const suppressClick = React.useRef(false);
  const audioRef = React.useRef<AudioContext | null>(null);
  const isControlled = checked !== undefined;
  const isOn = checked ?? uncontrolled;
  const trackWidth = Math.max(42, size * 2.1);
  const knobSize = Math.max(18, size - 8);
  const hasIcons = Boolean(icons?.off || icons?.on);

  const playSnap = React.useCallback((next: boolean) => {
    if (!sound || typeof window === "undefined") return;
    try {
      const AudioContextClass = window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const context = audioRef.current ?? (audioRef.current = new AudioContextClass());
      if (context.state === "suspended") void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(next ? 460 : 620, now);
      oscillator.frequency.exponentialRampToValueAtTime(next ? 1500 : 380, now + 0.08);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.11, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.16);
    } catch {
      // Audio is an optional enhancement; the control remains fully usable.
    }
  }, [sound]);

  const commit = React.useCallback((next: boolean) => {
    if (next === isOn || disabled) return;
    if (!isControlled) setUncontrolled(next);
    onCheckedChange?.(next);
    playSnap(next);
  }, [disabled, isControlled, isOn, onCheckedChange, playSnap]);

  const progressFromClientX = (clientX: number) => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return isOn ? 1 : 0;
    return Math.max(0, Math.min(1, (clientX - rect.left - knobSize / 2) / (rect.width - knobSize)));
  };

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || (event.pointerType === "mouse" && event.button !== 0)) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      currentX: event.clientX,
      moved: false,
    };
    suppressClick.current = false;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is not available in every embedded browser.
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (!drag.moved && Math.abs(event.clientX - drag.startX) > 4) {
      drag.moved = true;
      suppressClick.current = true;
    }
    if (drag.moved) {
      drag.currentX = event.clientX;
      setDragProgress(progressFromClientX(event.clientX));
    }
  };

  const endPointer = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.moved) {
      drag.currentX = event.clientX;
      commit(progressFromClientX(drag.currentX) >= 0.5);
    }
    dragRef.current = null;
    setDragProgress(null);
  };

  const onClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    commit(!isOn);
  };

  const progress = dragProgress ?? (isOn ? 1 : 0);
  const rootStyle = {
    "--toggle-size": `${size}px`,
    "--toggle-width": `${trackWidth}px`,
    "--toggle-knob": `${knobSize}px`,
    "--toggle-progress": progress,
    "--toggle-offset": `${(trackWidth - knobSize - 8) * progress}px`,
    ...style,
  } as React.CSSProperties;

  React.useEffect(() => () => {
    if (audioRef.current && audioRef.current.state !== "closed") {
      void audioRef.current.close();
    }
  }, []);

  return (
    <span className={styles.wrap}>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-label={label}
        disabled={disabled}
        className={[styles.toggle, className].filter(Boolean).join(" ")}
        data-tone={tone}
        data-state={isOn ? "on" : "off"}
        data-dragging={dragProgress !== null ? "true" : "false"}
        style={rootStyle}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") { event.preventDefault(); commit(true); }
          if (event.key === "ArrowLeft") { event.preventDefault(); commit(false); }
        }}
      >
        <span className={styles.track} aria-hidden="true" />
        <span className={styles.water} aria-hidden="true" />
        <span className={styles.drop} aria-hidden="true">
          {hasIcons ? (
            <span className={styles.iconStack}>
              <span className={styles.iconOff}>{icons?.off}</span>
              <span className={styles.iconOn}>{icons?.on}</span>
            </span>
          ) : null}
        </span>
        <span className={styles.ripple} aria-hidden="true" />
      </button>
      {name ? <input className={styles.formInput} type="checkbox" name={name} value={value} checked={isOn} readOnly tabIndex={-1} aria-hidden="true" /> : null}
    </span>
  );
}

export { LiquidToggle as Component };
export default LiquidToggle;
