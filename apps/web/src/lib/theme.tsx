"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";

export type ThemeChoice = "dark" | "light" | "system";
export type MotionChoice = "full" | "reduced" | "system";

const THEME_KEY = "nn.theme";
const MOTION_KEY = "nn.motion";

interface ThemeContextValue {
  /** What the founder chose. */
  theme: ThemeChoice;
  /** What is actually on screen once "system" is resolved. */
  resolvedTheme: "dark" | "light";
  setTheme: (t: ThemeChoice) => void;
  motion: MotionChoice;
  /** True when animation should be suppressed, from either source. */
  reducedMotion: boolean;
  setMotion: (m: MotionChoice) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** localStorage throws in private mode and inside some embedded webviews. */
function readStored<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = window.localStorage.getItem(key);
    return v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — the in-memory choice still applies for this session */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("dark");
  const [motion, setMotionState] = useState<MotionChoice>("system");
  const [systemDark, setSystemDark] = useState(true);
  const [systemReduced, setSystemReduced] = useState(false);

  // Hydrate from storage and the OS after mount so server and client markup match.
  useEffect(() => {
    setThemeState(readStored(THEME_KEY, ["dark", "light", "system"] as const, "dark"));
    setMotionState(readStored(MOTION_KEY, ["full", "reduced", "system"] as const, "system"));
  }, []);

  useEffect(() => {
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncDark = () => setSystemDark(dark.matches);
    const syncReduce = () => setSystemReduced(reduce.matches);
    syncDark();
    syncReduce();
    dark.addEventListener("change", syncDark);
    reduce.addEventListener("change", syncReduce);
    return () => {
      dark.removeEventListener("change", syncDark);
      reduce.removeEventListener("change", syncReduce);
    };
  }, []);

  const resolvedTheme: "dark" | "light" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  const reducedMotion = motion === "system" ? systemReduced : motion === "reduced";

  // Drive the DOM. Tokens key off these two attributes and nothing else.
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
    root.style.colorScheme = resolvedTheme;
  }, [theme, resolvedTheme]);

  useEffect(() => {
    const root = document.documentElement;
    if (motion === "reduced") root.setAttribute("data-motion", "reduced");
    else root.removeAttribute("data-motion");
  }, [motion]);

  const setTheme = useCallback((t: ThemeChoice) => {
    setThemeState(t);
    writeStored(THEME_KEY, t);
  }, []);

  const setMotion = useCallback((m: MotionChoice) => {
    setMotionState(m);
    writeStored(MOTION_KEY, m);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme, setTheme, motion, reducedMotion, setMotion }),
    [theme, resolvedTheme, setTheme, motion, reducedMotion, setMotion],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === null) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}

/**
 * Inlined in <head> before paint so a light-theme founder never sees a dark
 * flash. Mirrors the provider's storage contract exactly.
 */
export const themeBootstrapScript = `(function(){try{
var t=localStorage.getItem("${THEME_KEY}");
if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);document.documentElement.style.colorScheme=t;}
var m=localStorage.getItem("${MOTION_KEY}");
if(m==="reduced"){document.documentElement.setAttribute("data-motion","reduced");}
}catch(e){}})();`;
