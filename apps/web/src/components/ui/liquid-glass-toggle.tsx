"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import styles from "./liquid-glass-toggle.module.css";

export interface LiquidToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  tone?: "light" | "dark";
  size?: number;
  icons?: { off?: ReactNode; on?: ReactNode };
  disabled?: boolean;
  label: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
}

/** An accessible, CSS-rendered liquid switch with no runtime dependencies. */
export function LiquidToggle({
  checked,
  defaultChecked = false,
  onCheckedChange,
  tone = "dark",
  size = 38,
  icons,
  disabled = false,
  label,
  id,
  className,
  style,
}: LiquidToggleProps) {
  const [inner, setInner] = useState(defaultChecked);
  const current = checked ?? inner;
  const width = Math.round(size * 1.95);
  const dimensions = {
    "--toggle-height": `${size}px`,
    "--toggle-width": `${width}px`,
  } as CSSProperties;

  const toggle = () => {
    if (disabled) return;
    const next = !current;
    if (checked === undefined) setInner(next);
    onCheckedChange?.(next);
  };

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={current}
      aria-label={label}
      disabled={disabled}
      data-tone={tone}
      data-checked={current}
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      style={{ ...dimensions, ...style }}
      onClick={toggle}
    >
      <span className={styles.track} aria-hidden="true">
        <span className={styles.water} />
        <span className={styles.thumb}>
          {icons ? (
            <span className={styles.icons}>
              <span className={styles.iconOff}>{icons.off}</span>
              <span className={styles.iconOn}>{icons.on}</span>
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

export default LiquidToggle;
