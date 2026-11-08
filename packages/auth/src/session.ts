/**
 * Session policy.
 *
 * Firebase ID tokens expire after an hour and the SDK refreshes them silently,
 * which is right for continuity but means the session would never actually
 * end. NN adds two limits on top: an absolute lifetime and an idle timeout.
 * Both are evaluated here as pure functions so the rules are testable and
 * identical on the client and the server.
 */

export const SESSION_ABSOLUTE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_IDLE_MS = 14 * 24 * 60 * 60 * 1000;     // 14 days
/** Re-authentication is required for a security change older than this. */
export const REAUTH_WINDOW_MS = 5 * 60 * 1000;               // 5 minutes

export interface SessionState {
  startedAt: number;
  lastActiveAt: number;
  lastAuthenticatedAt: number;
  revoked: boolean;
}

export type SessionVerdict =
  | { valid: true }
  | { valid: false; reason: "revoked" | "expired" | "idle" | "future" };

export function evaluateSession(
  s: SessionState,
  now: number,
  limits: { absoluteMs?: number; idleMs?: number } = {},
): SessionVerdict {
  const absoluteMs = limits.absoluteMs ?? SESSION_ABSOLUTE_MS;
  const idleMs = limits.idleMs ?? SESSION_IDLE_MS;

  if (s.revoked) return { valid: false, reason: "revoked" };
  // A session timestamped in the future means a tampered or badly skewed
  // clock. Refuse rather than trust it.
  if (s.startedAt > now || s.lastActiveAt > now) return { valid: false, reason: "future" };
  if (now - s.startedAt >= absoluteMs) return { valid: false, reason: "expired" };
  if (now - s.lastActiveAt >= idleMs) return { valid: false, reason: "idle" };
  return { valid: true };
}

/** Whether a sensitive change may proceed without re-authenticating. */
export function requiresReauthentication(
  s: Pick<SessionState, "lastAuthenticatedAt">,
  now: number,
  windowMs: number = REAUTH_WINDOW_MS,
): boolean {
  return now - s.lastAuthenticatedAt >= windowMs;
}
