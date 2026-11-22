"use client";

import * as React from "react";
import { LogoReveal } from "@/components/ui/LogoReveal";
import { prefersReducedMotion } from "@/lib/motion";
import { NNIntro } from "./NNIntro";
import styles from "./NNEntrance.module.css";

/**
 * The first thing NN does.
 *
 * The mark arrives as liquid glass, and once it has arrived the corridor
 * behind it takes over. Two movements, one continuous idea: light resolves
 * into the brand, the brand opens into the environment.
 *
 * The reveal is never a gate. It can be skipped with a tap or a key, it is
 * skipped outright under reduced motion, and if the WebGL context never
 * materialises `LogoReveal` reports itself revealed anyway — so there is no
 * path on which the founder is left looking at a blank screen.
 */
export function NNEntrance() {
  const [arrived, setArrived] = React.useState(false);

  const skip = React.useCallback(() => setArrived(true), []);

  React.useEffect(() => {
    if (prefersReducedMotion()) setArrived(true);
  }, []);

  React.useEffect(() => {
    if (arrived) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") skip();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [arrived, skip]);

  return (
    <div className={styles.root} data-arrived={arrived || undefined}>
      {!arrived ? (
        <div className={styles.reveal} onPointerDown={skip}>
          <LogoReveal size={168} duration={2400} onRevealed={skip} />
          <p className={styles.hint} aria-hidden="true">
            Tap to continue
          </p>
        </div>
      ) : null}

      {/* The corridor is only built once the mark has arrived: it holds a
          frame loop of its own, and running both at once on an 8 GB laptop
          would cost more than it shows. */}
      {arrived ? (
        <div className={styles.corridor}>
          <NNIntro enterHref="/sign-in" enterLabel="Start" />
        </div>
      ) : null}
    </div>
  );
}
