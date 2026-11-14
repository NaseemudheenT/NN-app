"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { createFrameLoop, prefersReducedMotion } from "@/lib/motion";
import styles from "./AppTransition.module.css";

/**
 * The corridor NN travels down when the founder opens one of its tools.
 *
 * Opening an application is a movement through the environment, not a page
 * swap, so it is drawn as one: the room's structure rushes past and the tool
 * arrives at the end of it.
 *
 * The flight is tied to the real navigation. It begins when the route is
 * asked for and ends when the route has actually changed — so a slow load
 * shows a longer corridor rather than a finished animation sitting on top of
 * a page that has not arrived. A floor of {@link MIN_FLIGHT} keeps an instant
 * navigation from flashing, and a ceiling of {@link MAX_FLIGHT} means a
 * navigation that never completes cannot strand the founder inside it.
 *
 * It is skippable at any moment — Escape, or a tap anywhere — and it does not
 * run at all under reduced motion. An animation you cannot get out of is an
 * obstacle.
 */

/** Below this, a transition reads as a flicker rather than a movement. */
const MIN_FLIGHT = 620;
/** Above this, something has gone wrong and the corridor must let go. */
const MAX_FLIGHT = 6000;

interface TransitionRequest {
  href: Route;
  label: string;
}

interface AppTransitionValue {
  /** Fly down the corridor and arrive at `href`. */
  open: (href: Route, label: string) => void;
  travelling: boolean;
}

const AppTransitionContext = React.createContext<AppTransitionValue | null>(null);

/**
 * Opens NN applications with the corridor transition.
 *
 * Returns a no-op `open` when used outside the provider so a component can
 * always ask to open something; the worst case is that it is asked to do it
 * somewhere the corridor does not exist.
 */
export function useAppTransition(): AppTransitionValue {
  const value = React.useContext(AppTransitionContext);
  const router = useRouter();
  const fallback = React.useMemo<AppTransitionValue>(
    () => ({ open: (href) => router.push(href), travelling: false }),
    [router],
  );
  return value ?? fallback;
}

export function AppTransitionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [request, setRequest] = React.useState<TransitionRequest | null>(null);
  const startedAt = React.useRef(0);

  const clear = React.useCallback(() => setRequest(null), []);

  const open = React.useCallback(
    (href: Route, label: string) => {
      if (href === pathname) return;
      if (prefersReducedMotion()) {
        router.push(href);
        return;
      }
      startedAt.current = performance.now();
      setRequest({ href, label });
      router.push(href);
    },
    [pathname, router],
  );

  /* The corridor closes when the destination has actually been reached and
     the flight has had its minimum beat — never on a timer alone. */
  React.useEffect(() => {
    if (!request) return;
    if (pathname !== request.href) return;
    const remaining = Math.max(0, MIN_FLIGHT - (performance.now() - startedAt.current));
    const timer = window.setTimeout(clear, remaining);
    return () => window.clearTimeout(timer);
  }, [request, pathname, clear]);

  /* A navigation that never lands must not hold the screen for ever. */
  React.useEffect(() => {
    if (!request) return;
    const timer = window.setTimeout(clear, MAX_FLIGHT);
    return () => window.clearTimeout(timer);
  }, [request, clear]);

  const value = React.useMemo<AppTransitionValue>(
    () => ({ open, travelling: request !== null }),
    [open, request],
  );

  return (
    <AppTransitionContext.Provider value={value}>
      {children}
      {request ? <Corridor label={request.label} onSkip={clear} /> : null}
    </AppTransitionContext.Provider>
  );
}

/* ------------------------------------------------------------------ drawing */

/** How many frames of the corridor exist at once. */
const RINGS = 16;
/** Where the far end of the corridor sits, in the same units as the flight. */
const DEPTH = 7;

/**
 * The corridor itself, drawn on a 2D canvas.
 *
 * Deliberately not WebGL. NN already holds a GL context open for the room,
 * and iOS caps how many a page may have; spending the second one on a
 * transition that lasts half a second would be a poor trade. Sixteen rounded
 * rectangles are not worth a shader.
 */
function Corridor({ label, onSkip }: { label: string; onSkip: () => void }) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onSkip();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onSkip]);

  React.useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const style = getComputedStyle(document.documentElement);
    const edge = style.getPropertyValue("--nn-icy").trim() || "#A9D9FF";
    const accent = style.getPropertyValue("--nn-accent").trim() || "#7A9CFF";
    const ground = style.getPropertyValue("--nn-navy-900").trim() || "#080D24";

    let width = 0;
    let height = 0;
    let dpr = 1;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const box = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(box.width * dpr));
      const h = Math.max(1, Math.round(box.height * dpr));
      if (w === width && h === height) return;
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
    };
    resize();

    const rounded = (x: number, y: number, w: number, h: number, r: number) => {
      const radius = Math.min(r, w / 2, h / 2);
      context.beginPath();
      context.moveTo(x + radius, y);
      context.arcTo(x + w, y, x + w, y + h, radius);
      context.arcTo(x + w, y + h, x, y + h, radius);
      context.arcTo(x, y + h, x, y, radius);
      context.arcTo(x, y, x + w, y, radius);
      context.closePath();
    };

    let travelled = 0;
    const stop = createFrameLoop(host, (dt) => {
      resize();
      // Accelerating: the corridor pulls you in rather than coasting.
      travelled += dt * (2.6 + travelled * 0.9);

      context.globalAlpha = 1;
      context.fillStyle = ground;
      context.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const focal = Math.min(width, height) * 0.92;

      for (let i = 0; i < RINGS; i++) {
        // Each ring marches toward the viewer and wraps back to the far end,
        // so the corridor is endless without allocating anything.
        const z = ((i / RINGS) * DEPTH - travelled) % DEPTH;
        const depth = z <= 0 ? z + DEPTH : z;
        if (depth < 0.08) continue;

        const projected = focal / depth;
        const w = projected * 1.5;
        const h = projected * 1.05;

        // Fades in from the far end and out as it sweeps past the viewer.
        const near = 1 - Math.min(1, Math.max(0, (0.9 - depth) / 0.8));
        const far = Math.min(1, (DEPTH - depth) / 2.2);
        const alpha = Math.min(near, far) * 0.72;
        if (alpha <= 0.01) continue;

        context.globalAlpha = alpha;
        context.strokeStyle = i % 4 === 0 ? accent : edge;
        context.lineWidth = Math.max(1, (dpr * 1.4 * projected) / focal + 0.6);
        rounded(cx - w / 2, cy - h / 2, w, h, projected * 0.16);
        context.stroke();
      }

      // A pool of light at the vanishing point: the tool you are arriving at.
      const glow = context.createRadialGradient(cx, cy, 0, cx, cy, focal * 0.55);
      glow.addColorStop(0, `${edge}66`);
      glow.addColorStop(1, "#00000000");
      context.globalAlpha = 1;
      context.fillStyle = glow;
      context.fillRect(0, 0, width, height);
    });

    return stop;
  }, []);

  return (
    <div
      ref={hostRef}
      className={styles.corridor}
      onPointerDown={onSkip}
      role="status"
      aria-live="polite"
    >
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
      <p className={styles.destination}>
        <span className={styles.opening}>Opening</span>
        <strong>{label}</strong>
      </p>
      <p className={styles.skip} aria-hidden="true">
        Tap to skip
      </p>
    </div>
  );
}
