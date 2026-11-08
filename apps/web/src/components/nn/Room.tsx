"use client";

import { GlassFold } from "@/components/ui/GlassFold";
import styles from "./Room.module.css";

/**
 * The room, fixed behind every page in NN.
 *
 * One WebGL surface for the whole application rather than one per screen, so
 * navigating between pages never restarts the shader and the environment feels
 * continuous — the founder moves through NN, the room does not reload.
 */
export function Room() {
  return (
    <div className={styles.room} aria-hidden="true">
      <GlassFold />
      <div className={styles.veil} />
    </div>
  );
}
