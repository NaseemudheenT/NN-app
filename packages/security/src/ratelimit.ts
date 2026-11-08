/**
 * Rate limiting policy.
 *
 * Pure decision logic, so the rules can be tested without a database and so
 * the same policy applies wherever it is enforced. The storage layer only
 * counts; this decides.
 *
 * Fixed windows rather than a token bucket: NN has one user, the traffic is
 * tiny, and a fixed window costs exactly one Firestore document per window
 * per key — which matters while the project stays on the free plan.
 */

export interface RateLimitRule {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Requests permitted inside one window. */
  max: number;
}

export interface RateLimitVerdict {
  allowed: boolean;
  remaining: number;
  /** Milliseconds until the window resets. */
  resetInMs: number;
}

/**
 * Limits for the authentication surface.
 *
 * Sign-in verification is the tightest: it is the only endpoint where a
 * guess could ever succeed, so it is held well below the rate at which any
 * practical attack would operate, while staying far above what a real person
 * fumbling a passkey prompt would hit.
 */
export const AUTH_LIMITS = {
  "signin-options": { windowMs: 60_000, max: 20 },
  "signin-verify": { windowMs: 60_000, max: 10 },
  // A bootstrap secret guess costs a request; 5 a minute makes brute force
  // hopeless against a 24+ character secret.
  "register-options": { windowMs: 60_000, max: 5 },
  "register-verify": { windowMs: 60_000, max: 10 },
  status: { windowMs: 60_000, max: 60 },
  signout: { windowMs: 60_000, max: 30 },
} as const satisfies Record<string, RateLimitRule>;

export type AuthLimitKey = keyof typeof AUTH_LIMITS;

/** The window a timestamp belongs to. Shared by the counter and the decision. */
export function windowStart(now: number, windowMs: number): number {
  return Math.floor(now / windowMs) * windowMs;
}

export function decideRateLimit(
  rule: RateLimitRule,
  countInWindow: number,
  now: number,
): RateLimitVerdict {
  const start = windowStart(now, rule.windowMs);
  const resetInMs = start + rule.windowMs - now;
  const remaining = Math.max(0, rule.max - countInWindow);
  return { allowed: countInWindow <= rule.max, remaining, resetInMs };
}

/**
 * Derives the limiting key from request headers.
 *
 * `x-forwarded-for` can be spoofed when nothing trustworthy sets it, so this
 * is a throttle against casual abuse, not an authorisation control. The real
 * protection is that guessing a passkey assertion is cryptographically
 * infeasible; this only stops someone hammering the endpoint.
 */
export function clientKey(headers: {
  get(name: string): string | null;
}): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded !== null && forwarded.length > 0) {
    const first = forwarded.split(",")[0]?.trim();
    if (first !== undefined && first.length > 0) return first.slice(0, 64);
  }
  return headers.get("x-real-ip")?.slice(0, 64) ?? "unknown";
}
