"use client";

import { useEffect, useState } from "react";
import type { IconName } from "@/components/ui/Icon";
import { clearIconImages, iconImage } from "./render";

/**
 * One size for every rendered icon.
 *
 * The render is expensive once and free forever after, so it is done at a
 * resolution that still holds at the largest place an icon appears and
 * scaled down everywhere else — rather than once per size, which would be
 * the same picture cached five times. 160px covers a 74px intro tile on a
 * retina screen with room to spare.
 */
export const ICON_RENDER_PX = 160;

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
export function useIconImage(name: IconName, tone: string): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    const paint = () => {
      const next = iconImage(name, tone, isDark(), ICON_RENDER_PX);
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
  }, [name, tone]);

  return url;
}
