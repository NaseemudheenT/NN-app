"use client";

import { useEffect } from "react";

/**
 * Light that follows your hand across the glass.
 *
 * The founder asks for cinematic, and NN has already decided once what that
 * must not mean: the sixteen-ring transition canvas was removed because it
 * was *theatre in front of work*. So this is the other kind of cinema — the
 * kind that makes a surface read as a material rather than a rectangle.
 *
 * A real pane of glass has a specular highlight, and the highlight moves
 * when you do. NN's glass has had a fixed one painted at the top-left since
 * it was written, which is correct for a still image and is the single
 * clearest tell that a surface is drawn rather than lit. This moves it to
 * wherever the founder is actually touching.
 *
 * Three things make it affordable on the hardware NN runs on:
 *
 * - **One listener for the whole document**, not one per card. NN draws
 *   dozens of glass surfaces on some screens, and sixty listeners firing on
 *   every pointer move is how a 2015 laptop starts dropping frames.
 * - **One write per frame.** Pointer events arrive faster than the screen
 *   refreshes; coalescing them into a single `requestAnimationFrame` means
 *   the work is bounded by the display, not by the digitiser.
 * - **Two custom properties**, read by CSS. No React state, so nothing
 *   re-renders — the highlight is a paint, which is what it is in life.
 *
 * It does nothing at all where motion is unwelcome.
 */

/** Only surfaces that opt in. Everything else is untouched. */
const LIT = ".nn-glass-card, .nn-liquid, [data-lightfall]";

export function Lightfall() {
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) return;
    if (document.documentElement.dataset["motion"] === "reduced") return;

    let frame = 0;
    let pending: { target: HTMLElement; x: number; y: number } | null = null;
    let lastLit: HTMLElement | null = null;

    const paint = () => {
      frame = 0;
      if (pending === null) return;
      const { target, x, y } = pending;
      pending = null;
      target.style.setProperty("--nn-lightfall-x", `${x}%`);
      target.style.setProperty("--nn-lightfall-y", `${y}%`);
      target.dataset["lit"] = "true";
      if (lastLit !== null && lastLit !== target) delete lastLit.dataset["lit"];
      lastLit = target;
    };

    const move = (event: PointerEvent) => {
      const found = (event.target as Element | null)?.closest?.(LIT);
      if (!(found instanceof HTMLElement)) {
        if (lastLit !== null) { delete lastLit.dataset["lit"]; lastLit = null; }
        return;
      }
      const box = found.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      pending = {
        target: found,
        x: Math.round(((event.clientX - box.left) / box.width) * 100),
        y: Math.round(((event.clientY - box.top) / box.height) * 100),
      };
      if (frame === 0) frame = window.requestAnimationFrame(paint);
    };

    const leave = () => {
      if (lastLit !== null) { delete lastLit.dataset["lit"]; lastLit = null; }
    };

    // `passive`: this never calls preventDefault, and saying so lets the
    // browser keep scrolling off the main thread.
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerdown", move, { passive: true });
    document.addEventListener("pointerup", leave, { passive: true });
    document.addEventListener("pointercancel", leave, { passive: true });
    window.addEventListener("blur", leave);

    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerdown", move);
      document.removeEventListener("pointerup", leave);
      document.removeEventListener("pointercancel", leave);
      window.removeEventListener("blur", leave);
      leave();
    };
  }, []);

  return null;
}

export default Lightfall;
