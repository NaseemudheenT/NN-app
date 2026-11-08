"use client";

import { useEffect } from "react";

/**
 * Registers the service worker.
 *
 * Only in production: in development it would serve stale bundles and make
 * every change look like it had not applied.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const register = () => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failing must never break the application.
      });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);
  return null;
}
