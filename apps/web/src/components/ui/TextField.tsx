"use client";

import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import styles from "./TextField.module.css";

interface CommonProps {
  label: string;
  /** Hidden visually but still announced. */
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  multiline?: boolean;
}

export type TextFieldProps = CommonProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "id"> &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id">;

export function TextField({
  label,
  hideLabel = false,
  hint,
  error,
  multiline = false,
  className,
  ...rest
}: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const invalid = typeof error === "string" && error.length > 0;

  const describedBy = [
    invalid ? errId : null,
    typeof hint === "string" && hint.length > 0 ? hintId : null,
  ]
    .filter((v): v is string => v !== null)
    .join(" ");

  const fieldCls = [
    styles.field,
    multiline ? styles.textarea : "",
    invalid ? styles.invalid : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const shared = {
    id,
    className: fieldCls,
    "aria-invalid": invalid,
    ...(describedBy.length > 0 ? { "aria-describedby": describedBy } : {}),
  };

  return (
    <div className={styles.wrap}>
      <label htmlFor={id} className={hideLabel ? "nn-sr-only" : styles.label}>
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)} />
      ) : (
        <input {...shared} {...(rest as InputHTMLAttributes<HTMLInputElement>)} />
      )}
      {invalid ? (
        <p id={errId} className={styles.error} role="alert">{error}</p>
      ) : typeof hint === "string" && hint.length > 0 ? (
        <p id={hintId} className={styles.hint}>{hint}</p>
      ) : null}
    </div>
  );
}
