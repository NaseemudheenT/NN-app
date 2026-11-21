"use client";

import type { ReactNode } from "react";
import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";
import styles from "./FeedbackState.module.css";

export type FeedbackStateKind = "empty" | "loading" | "error" | "permission" | "success";

export interface FeedbackStateProps {
  kind: FeedbackStateKind;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: (() => void) | undefined;
  className?: string | undefined;
  children?: ReactNode;
}

const ICONS: Record<FeedbackStateKind, IconName> = {
  empty: "archive",
  loading: "clock",
  error: "close",
  permission: "shield",
  success: "check",
};

/**
 * A consistent, accessible message surface for empty, loading, error,
 * permission and success states. It never invents data or implies that an
 * action succeeded; callers provide the message and optional recovery action.
 */
export function FeedbackState({
  kind,
  title,
  description,
  actionLabel,
  onAction,
  className,
  children,
}: FeedbackStateProps) {
  const role = kind === "error" ? "alert" : kind === "loading" || kind === "success" ? "status" : "group";
  const action = actionLabel !== undefined && onAction !== undefined;

  return (
    <section
      className={[styles.state, className ?? ""].filter(Boolean).join(" ")}
      data-kind={kind}
      role={role}
      aria-busy={kind === "loading" ? true : undefined}
      aria-label={kind === "empty" || kind === "permission" ? title : undefined}
    >
      <span className={[styles.icon, kind === "loading" ? styles.loading : ""].filter(Boolean).join(" ")} aria-hidden="true">
        <Icon name={ICONS[kind]} size={22} />
      </span>
      <div className={styles.copy}>
        <h3 className={styles.title}>{title}</h3>
        {description !== undefined ? <p className={styles.description}>{description}</p> : null}
        {children}
      </div>
      {action ? <Button size="sm" onClick={onAction}>{actionLabel}</Button> : null}
    </section>
  );
}

export default FeedbackState;
