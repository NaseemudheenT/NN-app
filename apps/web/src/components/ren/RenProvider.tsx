"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  REN_COMPLETE_MS,
  REN_INITIAL,
  renIsEngaged,
  renTryReduce,
  type RenEvent,
  type RenMachine,
  type RenTrigger,
} from "@/lib/ren/state";
import { describePage, type RenPageContext } from "@/lib/ren/context";

/**
 * REN's presence.
 *
 * Mounted once in the root layout, so REN is a property of NN rather than a
 * page you navigate to. Every screen gets the same REN, in the same state,
 * and REN always knows which screen that is.
 */

export interface RenContextValue {
  machine: RenMachine;
  /** Whether REN's surface is showing. Independent of what REN is doing. */
  open: boolean;
  /** Whether REN is actively working. Drives the identity, not the panel. */
  engaged: boolean;
  /** Where the founder is right now. REN reads this before answering. */
  page: RenPageContext;
  /** Live microphone level, 0–1. Zero unless the microphone is genuinely open. */
  level: number;
  summon: (via: RenTrigger) => void;
  dismiss: () => void;
  /** Applies an event. Refusals are returned, never thrown at the caller. */
  send: (event: RenEvent) => boolean;
  setLevel: (level: number) => void;
  /** The last refused transition, for surfacing a real bug rather than hiding it. */
  lastRefusal: string | null;
}

const RenContext = createContext<RenContextValue | null>(null);

export function useRen(): RenContextValue {
  const ctx = useContext(RenContext);
  if (ctx === null) throw new Error("useRen must be used inside <RenProvider>");
  return ctx;
}

export function RenProvider({ children }: { children: ReactNode }) {
  const [machine, setMachine] = useState<RenMachine>(REN_INITIAL);
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState(0);
  const [lastRefusal, setLastRefusal] = useState<string | null>(null);
  const pathname = usePathname();
  const page = useMemo(() => describePage(pathname), [pathname]);

  const send = useCallback((event: RenEvent): boolean => {
    let accepted = false;
    setMachine((current) => {
      const result = renTryReduce(current, event);
      if (!result.ok) {
        // Reported rather than swallowed: a refused transition means the
        // caller believes REN is somewhere it is not, and that is a bug.
        setLastRefusal(result.reason);
        return current;
      }
      accepted = true;
      return result.machine;
    });
    if (accepted) setLastRefusal(null);
    return accepted;
  }, []);

  const summon = useCallback(
    (via: RenTrigger) => {
      setOpen(true);
      send({ type: "summon", via });
    },
    [send],
  );

  const dismiss = useCallback(() => {
    setOpen(false);
    send({ type: "dismiss" });
  }, [send]);

  /* The completion flourish is brief, then the identity returns to its
     resting state. The surface stays open: the founder is still reading the
     answer, and may well ask the next thing. */
  useEffect(() => {
    if (machine.state !== "complete") return;
    const timer = window.setTimeout(() => send({ type: "dismiss" }), REN_COMPLETE_MS);
    return () => window.clearTimeout(timer);
  }, [machine.state, send]);

  /* The microphone level must never be stale. If REN stops listening while a
     level is still set, the identity would keep reacting to nothing. */
  useEffect(() => {
    if (machine.state !== "listening" && level !== 0) setLevel(0);
  }, [machine.state, level]);

  useEffect(() => {
    if (pathname === "/" || pathname === "/sign-in") setOpen(false);
  }, [pathname]);

  /* Summoning REN from the keyboard, and dismissing with Escape. Bound once,
     at the document, because REN belongs to the whole application. */
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    if (pathname === "/" || pathname === "/sign-in") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (openRef.current) dismiss();
        else summon("keyboard");
        return;
      }
      if (event.key === "Escape" && openRef.current) {
        dismiss();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [summon, dismiss, pathname]);

  const value = useMemo<RenContextValue>(
    () => ({
      machine,
      open,
      engaged: renIsEngaged(machine.state),
      page,
      level,
      summon,
      dismiss,
      send,
      setLevel,
      lastRefusal,
    }),
    [machine, open, page, level, summon, dismiss, send, lastRefusal],
  );

  return <RenContext.Provider value={value}>{children}</RenContext.Provider>;
}
