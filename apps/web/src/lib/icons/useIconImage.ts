"use client";

import { useEffect, useState } from "react";
import type { IconName } from "@/components/ui/Icon";
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

    // After paint rather than during it: a first view with several icons on
    // it should show them all as vectors immediately and swap, not block the
    // frame rendering forty objects.
    const handle = window.requestAnimationFrame(paint);

    const observer = new MutationObserver(() => {
      clearIconImages();
      paint();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      live = false;
      window.cancelAnimationFrame(handle);
      observer.disconnect();
    };
  }, [name, tone, px]);

  return url;
}
