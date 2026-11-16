"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { prefersReducedMotion } from "@/lib/motion";
import styles from "./AppTransition.module.css";

/**
 * How NN moves between its tools.
 *
 * One sweep of light across the screen, and the new surface is there. That
 * is all of it.
 *
 * It used to be a corridor: sixteen rounded rectangles rushing past on a
 * canvas, with the destination's name in the middle, for at least 620ms.
 * The founder asked for it to go. It was theatre in front of work — and
 * theatre you have to sit through every time stops reading as cinematic and
 * starts reading as slow. What is left is the part that was actually doing
 * something: a moment of acknowledgement, short enough that it never gets
 * between the founder and the thing they asked for.
 *
 * The sweep is tied to the real navigation. It begins when the route is asked
 * for and ends when the route has actually changed, with a floor so an
 * instant navigation does not flicker and a ceiling so a navigation that
 * never lands cannot hold the screen.
 */

/** Below this a sweep reads as a flicker rather than a movement. */
const MIN = 260;
/** Above this something has gone wrong and the sweep must let go. */
const MAX = 4000;

interface AppTransitionValue {
  /** Move to `href`. The label is announced, not drawn. */
  open: (href: Route, label: string) => void;
  travelling: boolean;
}

const AppTransitionContext = React.createContext<AppTransitionValue | null>(null);

/**
 * Opens NN's applications.
 *
 * Returns a plain navigation when used outside the provider, so a component
 * can always ask to open something; the worst case is that it arrives without
 * the sweep.
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
  const [going, setGoing] = React.useState<{ href: Route; label: string } | null>(null);
  const startedAt = React.useRef(0);

  const clear = React.useCallback(() => setGoing(null), []);

  const open = React.useCallback(
    (href: Route, label: string) => {
      if (href === pathname) return;
      if (prefersReducedMotion()) {
        router.push(href);
        return;
      }
      startedAt.current = performance.now();
      setGoing({ href, label });
      router.push(href);
    },
    [pathname, router],
  );

  /* The sweep ends when the destination has been reached and it has had its
     minimum beat — never on a timer alone. */
  React.useEffect(() => {
    if (!going) return;
    if (pathname !== going.href) return;
    const remaining = Math.max(0, MIN - (performance.now() - startedAt.current));
    const timer = window.setTimeout(clear, remaining);
    return () => window.clearTimeout(timer);
  }, [going, pathname, clear]);

  /* A navigation that never lands must not hold the screen for ever. */
  React.useEffect(() => {
    if (!going) return;
    const timer = window.setTimeout(clear, MAX);
    return () => window.clearTimeout(timer);
  }, [going, clear]);

  const value = React.useMemo<AppTransitionValue>(
    () => ({ open, travelling: going !== null }),
    [open, going],
  );

  return (
    <AppTransitionContext.Provider value={value}>
      {children}
      {going ? (
        <div className={styles.sweep}>
          {/* `aria-hidden` belongs on the light, not on this wrapper: putting
              it there hid the live region inside it, so the announcement was
              never made. The sweep is already unreachable by pointer. */}
          <span className={styles.line} aria-hidden="true" />
          {/* Announced rather than drawn: a screen reader should know the
              founder is on their way to Finance; the screen already shows it
              a quarter of a second later. */}
          <span className={styles.announce} role="status" aria-live="polite">
            Opening {going.label}
          </span>
        </div>
      ) : null}
    </AppTransitionContext.Provider>
  );
}
