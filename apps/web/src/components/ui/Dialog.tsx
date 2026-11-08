"use client";

import { useCallback, useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./Dialog.module.css";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * A real modal: focus is moved in, trapped while open, and returned to the
 * element that opened it. Escape and backdrop click both close. Background
 * scrolling is locked. Rendered in a portal so no ancestor can clip it.
 */
export function Dialog({ open, onClose, title, description, children, footer }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;

      const panel = panelRef.current;
      if (panel === null) return;
      const nodes = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (first === undefined || last === undefined) return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    // Focus the first control, or the panel itself if there is nothing to focus.
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE) ?? null;
    (firstFocusable ?? panel)?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      restoreTo.current?.focus();
    };
  }, [open, onKeyDown]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className={styles.backdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        {...(description !== undefined ? { "aria-describedby": descId } : {})}
        tabIndex={-1}
      >
        <div className={styles.head}>
          <div className={styles.titles}>
            <h2 id={titleId} className={styles.title}>{title}</h2>
            {description !== undefined ? (
              <p id={descId} className={styles.desc}>{description}</p>
            ) : null}
          </div>
        </div>
        {children !== undefined ? <div className={styles.body}>{children}</div> : null}
        {footer !== undefined ? <div className={styles.foot}>{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
