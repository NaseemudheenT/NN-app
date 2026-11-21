"use client";

import styles from "./AppLogo.module.css";

export interface AppLogoProps {
  id: string;
  name: string;
  tone?: string;
  size?: number;
  className?: string;
}

/** A distinct application wordmark tile, not a generic pictogram. */
export function AppLogo({ id, name, tone = "blue", size = 44, className }: AppLogoProps) {
  const initials = name
    .replace(/&/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <span
      className={[styles.logo, className ?? ""].filter(Boolean).join(" ")}
      data-app-logo={id}
      data-tone={tone}
      style={{ "--app-logo-size": `${size}px` } as React.CSSProperties}
      role="img"
      aria-label={`${name} app`}
    >
      <span className={styles.face}>{initials || name.slice(0, 1).toUpperCase()}</span>
      <span className={styles.glint} aria-hidden="true" />
    </span>
  );
}
