import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and blocks interaction. The button stays focusable. */
  loading?: boolean;
  /** Square button with no label. `aria-label` becomes required in practice. */
  iconOnly?: boolean;
  children?: ReactNode;
}

const VARIANT = {
  primary: styles.primary,
  secondary: styles.secondary,
  ghost: styles.ghost,
  danger: styles.danger,
} as const;

const SIZE = { sm: styles.sm, md: styles.md, lg: styles.lg } as const;

export function Button({
  variant = "secondary",
  size = "md",
  loading = false,
  iconOnly = false,
  disabled = false,
  className,
  children,
  ...rest
}: ButtonProps) {
  const cls = [
    styles.btn,
    VARIANT[variant],
    SIZE[size],
    iconOnly ? styles.iconOnly : "",
    loading ? styles.loading : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {children}
      {loading ? (
        <span className={styles.spinner}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeOpacity="0.25" />
            <path d="M8 1.5A6.5 6.5 0 0 1 14.5 8" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="nn-sr-only">Working</span>
        </span>
      ) : null}
    </button>
  );
}
