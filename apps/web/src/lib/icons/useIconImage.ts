"use client";

import { useEffect, useState } from "react";
import type { IconName } from "./paths";
import { clearIconImages, iconImage } from "./render";

/**
 * Two sizes, not one, and not one per caller.
 *
 * A render is expensive once and free forever, so it would be tempting to
 * do it once at 160 and scale down everywhere. That is wrong at dock size:
 * downscaling a lit object by nine loses exactly the micro-contrast that
 * makes it look lit, and an 18px icon came out a grey smudge. Two buckets —
 * one for chrome, one for everything an icon is big in — keep the downscale
 * near 2x in both cases, which a browser resamples cleanly.
 */
export const ICON_RENDER_SMALL = 76;
export const ICON_RENDER_LARGE = 160;

/** The bucket an icon of this display size belongs in. */
export function renderSizeFor(size: number): number {
  return size <= 24 ? ICON_RENDER_SMALL : ICON_RENDER_LARGE;
}

/**
 * A render queue with a frame budget.
 *
 * A page can carry thirty icons, and thirty renders in one frame is a
 * visible stall on the kind of machine NN has to run well on. Jobs are
 * drained a few milliseconds at a time, so the work spreads across however
 * many frames it needs and never holds one.
 */
const queue: Array<() => void> = [];
let draining = 0;

function drain(): void {
  draining = 0;
  const until = performance.now() + 5;
  while (queue.length > 0 && performance.now() < until) {
    queue.shift()!();
  }
  if (queue.length > 0) draining = window.requestAnimationFrame(drain);
}

function enqueue(job: () => void): () => void {
  queue.push(job);
  if (!draining) draining = window.requestAnimationFrame(drain);
  return () => {
    const at = queue.indexOf(job);
    if (at >= 0) queue.splice(at, 1);
  };
}

function isDark(): boolean {
  if (typeof document === "undefined") return true;
  return document.documentElement.getAttribute("data-theme") !== "light";
}

/**
 * The icon, rendered as a real object, or null until it is.
 *
 * Null on the server and on the first client render, which is deliberate:
 * the caller draws the vector icon then, so the markup matches and nothing
 * pops. The image arrives in an effect and replaces it.
 *
 * Re-renders when the theme changes, because the light changed with it.
 */
export function useIconImage(name: IconName, tone: string, size: number): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const px = renderSizeFor(size);

  useEffect(() => {
    let live = true;
    const paint = () => {
      const next = iconImage(name, tone, isDark(), px);
      if (live) setUrl(next);
    };

    // After paint rather than during it, and budgeted: a first view shows
    // every icon as a vector immediately, and the objects arrive over the
    // next frames rather than holding one.
    let cancel = enqueue(paint);

    const observer = new MutationObserver(() => {
      clearIconImages();
      cancel();
      cancel = enqueue(paint);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      live = false;
      cancel();
      observer.disconnect();
    };
  }, [name, tone, px]);

  return url;
}
