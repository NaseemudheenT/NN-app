"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from "react";
import { onIdTokenChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { evaluateSession, type SessionState } from "@nn/auth";
import { firebaseAvailable, getFirebase } from "@/lib/firebase";

/**
 * Who is signed in, and for how long.
 *
 * Firebase refreshes ID tokens silently, which is right for continuity but
 * means a session would otherwise never end. NN layers its own absolute and
 * idle limits on top, evaluated by the same pure function the server uses.
 */

export type AuthPhase = "loading" | "unconfigured" | "signed-out" | "signed-in";

interface AuthContextValue {
  phase: AuthPhase;
  user: User | null;
  /** Fresh ID token for calling NN's own API routes. */
  getIdToken: () => Promise<string | null>;
  signOutEverywhere: () => Promise<void>;
  signOutHere: () => Promise<void>;
  /** Why the last session ended, if it ended by itself. */
  endedReason: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_KEY = "nn.session";

function readSession(): SessionState | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw === null ? null : (JSON.parse(raw) as SessionState);
  } catch { return null; }
}

function writeSession(s: SessionState): void {
  try { window.localStorage.setItem(SESSION_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

function clearSession(): void {
  try { window.localStorage.removeItem(SESSION_KEY); } catch { /* private mode */ }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<AuthPhase>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [endedReason, setEndedReason] = useState<string | null>(null);
  const userRef = useRef<User | null>(null);

  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    if (!firebaseAvailable()) {
      setPhase("unconfigured");
      return;
    }
    const { auth } = getFirebase();
    return onIdTokenChanged(auth, (u) => {
      setUser(u);
      if (u === null) {
        setPhase("signed-out");
        clearSession();
        return;
      }
      // onIdTokenChanged also fires on Firebase's silent hourly refresh. An
      // existing session must be left untouched here: bumping lastActiveAt on
      // a refresh would mean a tab left open never goes idle, quietly
      // disabling the idle timeout entirely. Only real user activity, tracked
      // by the listeners below, advances it.
      const existing = readSession();
      if (existing === null) {
        const now = Date.now();
        writeSession({ startedAt: now, lastActiveAt: now, lastAuthenticatedAt: now, revoked: false });
      }
      setPhase("signed-in");
    });
  }, []);

  // Enforce the absolute and idle limits, and keep lastActiveAt moving while
  // the founder is actually using NN.
  useEffect(() => {
    if (phase !== "signed-in") return;

    const touch = () => {
      const s = readSession();
      if (s !== null) writeSession({ ...s, lastActiveAt: Date.now() });
    };
    const windowEvents: Array<keyof WindowEventMap> = ["pointerdown", "keydown"];
    for (const e of windowEvents) window.addEventListener(e, touch, { passive: true });
    // visibilitychange is a document event, not a window one.
    document.addEventListener("visibilitychange", touch, { passive: true });

    const check = window.setInterval(() => {
      const s = readSession();
      if (s === null) return;
      const verdict = evaluateSession(s, Date.now());
      if (!verdict.valid) {
        setEndedReason(
          verdict.reason === "idle" ? "You were signed out after a long period of inactivity."
            : verdict.reason === "expired" ? "Your session reached its maximum length."
            : "Your session ended.",
        );
        clearSession();
        void fbSignOut(getFirebase().auth);
      }
    }, 60_000);

    return () => {
      for (const e of windowEvents) window.removeEventListener(e, touch);
      document.removeEventListener("visibilitychange", touch);
      window.clearInterval(check);
    };
  }, [phase]);

  const getIdToken = useCallback(async (): Promise<string | null> => {
    const u = userRef.current;
    return u === null ? null : u.getIdToken();
  }, []);

  const signOutHere = useCallback(async (): Promise<void> => {
    setEndedReason(null);
    clearSession();
    await fbSignOut(getFirebase().auth);
  }, []);

  const signOutEverywhere = useCallback(async (): Promise<void> => {
    const token = await getIdToken();
    if (token !== null) {
      // Revoking refresh tokens is what ends the session on other devices.
      await fetch("/api/auth/signout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined);
    }
    await signOutHere();
  }, [getIdToken, signOutHere]);

  const value = useMemo<AuthContextValue>(
    () => ({ phase, user, getIdToken, signOutEverywhere, signOutHere, endedReason }),
    [phase, user, getIdToken, signOutEverywhere, signOutHere, endedReason],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
