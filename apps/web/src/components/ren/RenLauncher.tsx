"use client";

import { useRouter } from "next/navigation";
import { useRen } from "./RenProvider";
import { RenOrb } from "./RenOrb";
import styles from "./RenLauncher.module.css";

/**
 * REN's resting presence.
 *
 * A small animated mark, fixed in the corner of every page. Touching it goes
 * to REN's own screen, and so does ⌘K.
 *
 * It used to open a panel beside the page. The founder asked for that to
 * stop: REN writes code, reads documents and holds long conversations, and
 * none of that fits in a drawer. A panel also quietly reframed REN as
 * something you consult beside your work rather than somewhere you work.
 */
export function RenLauncher() {
  const router = useRouter();
  const { machine } = useRen();

  return (
    <button
      type="button"
      className={styles.launcher}
      onClick={() => router.push("/ren")}
      aria-label="Open REN"
    >
      <RenOrb state={machine.state} size={34} />
      <span className={styles.hint} aria-hidden="true">
        <kbd>⌘</kbd>
        <kbd>K</kbd>
      </span>
    </button>
  );
}
