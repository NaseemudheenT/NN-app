"use client";

import { useId } from "react";
import styles from "./Switch.module.css";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
}

/**
 * A real checkbox underneath, visually replaced. Keeps native keyboard
 * behaviour, form semantics and screen-reader announcements for free.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  hideLabel = false,
  disabled = false,
}: SwitchProps) {
  const id = useId();
  return (
    <label className={styles.row} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.currentTarget.checked)}
      />
      <span className={styles.track} aria-hidden="true">
        <span className={styles.thumb} />
      </span>
      <span className={hideLabel ? "nn-sr-only" : styles.label}>{label}</span>
    </label>
  );
}
