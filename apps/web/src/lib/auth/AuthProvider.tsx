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
  /** Re-ask the server who is signed in. Called after a sign-in completes. */
  refresh: () => Promise<void>;
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

  /*
   * NN's own session, asked for first.
   *
   * Firebase Authentication is not provisioned on this project and cannot be
   * without billing, so `onIdTokenChanged` will never fire with a user no
   * matter how correct the founder's password is. The session that actually
   * exists is the cookie NN signed, and the only way the browser learns
   * about an httpOnly cookie is to ask the server.
   *
   * Asked before Firebase and allowed to settle the phase on its own: if NN
   * says the founder is signed in, they are, whatever Firebase thinks.
   */
  const [nnSession, setNnSession] = useState<{ uid: string } | null>(null);
  const [asked, setAsked] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      const body = (await response.json()) as { signedIn?: boolean; uid?: string };
      setNnSession(body.signedIn === true && body.uid ? { uid: body.uid } : null);
    } catch {
      // A network failure is not a sign-out. Leaving the previous answer in
      // place keeps a flaky connection from throwing the founder at the door.
    } finally {
      setAsked(true);
    }
  }, []);

  useEffect(() => { void refreshSession(); }, [refreshSession]);

  useEffect(() => {
    if (!firebaseAvailable()) {
      // Without Firebase config there is no Firebase session to wait for,
      // but NN's own may still exist.
      if (asked) setPhase(nnSession !== null ? "signed-in" : "unconfigured");
      return;
    }
    const { auth } = getFirebase();
    return onIdTokenChanged(auth, async (u) => {
      if (u === null) {
        setUser(null);
        clearSession();
        // Firebase has no user — which on this project is the *normal*
        // state, not a failure. NN's own session decides.
        setPhase(nnSession !== null ? "signed-in" : (asked ? "signed-out" : "loading"));
        return;
      }

      // A Firebase session alone is not an NN session. Only the server-issued
      // custom claim minted after a verified passkey assertion may enter NN.
      try {
        const token = await u.getIdTokenResult();
        if (token.claims.nnOwner !== true) {
          clearSession();
          await fbSignOut(auth);
          setUser(null);
          setPhase("signed-out");
          return;
        }
      } catch {
        clearSession();
        await fbSignOut(auth);
        setUser(null);
        setPhase("signed-out");
        return;
      }
      setUser(u);
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
  }, [nnSession, asked]);

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
    // NN's cookie is httpOnly, so only the server can remove it.
    await fetch("/api/auth/signout", { method: "POST" }).catch(() => undefined);
    setNnSession(null);
    setPhase("signed-out");
    if (firebaseAvailable()) await fbSignOut(getFirebase().auth).catch(() => undefined);
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
    () => ({ phase, user, getIdToken, signOutEverywhere, signOutHere, endedReason,
      refresh: refreshSession }),
    [phase, user, getIdToken, signOutEverywhere, signOutHere, endedReason, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (ctx === null) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
