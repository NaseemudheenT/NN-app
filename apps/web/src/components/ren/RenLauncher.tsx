"use client";

import { useRen } from "./RenProvider";
import { RenMark } from "./RenMark";
import styles from "./RenLauncher.module.css";

/**
 * REN's resting presence.
 *
 * A small animated mark, fixed in the corner of every page. Tapping it
 * summons REN; it reports the keyboard shortcut for anyone who would rather
 * not reach for it. It hides while REN is open, because by then the mark has
 * moved to the centre of the panel — the same identity, not a second one.
 */
export function RenLauncher() {
  const { machine, open, summon } = useRen();

  return (
    <button
      type="button"
      className={styles.launcher}
      data-open={open}
      onClick={() => summon("touch")}
      aria-label="Open REN"
      aria-expanded={open}
      {...(open ? { tabIndex: -1, "aria-hidden": true as const } : {})}
    >
      <RenMark state={machine.state} size={34} />
      <span className={styles.hint} aria-hidden="true">
        <kbd>⌘</kbd>
        <kbd>K</kbd>
      </span>
    </button>
  );
}
