import { NextResponse, type NextRequest } from "next/server";
import { enforceRateLimit } from "@/server/auth/ratelimit";
import { requireServerCredentials } from "@/server/auth/credentials";
import { getAdmin } from "@/server/admin";
import { callerUid } from "@/server/auth/session";
import { recordSecurityEvent } from "@/server/auth/store";
import { clearedCookie } from "@/server/auth/nn-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Signs out everywhere.
 *
 * Revoking refresh tokens is what makes this meaningful: `verifyIdToken(token,
 * true)` then rejects every outstanding session on every device, rather than
 * waiting up to an hour for the ID token to lapse.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Asked before the rate limiter, which needs Firestore itself and would
  // otherwise be the thing that throws.
  const unconfigured = requireServerCredentials();
  if (unconfigured !== null) return unconfigured;

  const limited = await enforceRateLimit(request, "signout");
  if (limited !== null) return limited;

  const uid = await callerUid(request);
  if (uid === null) {
    // Already signed out — but still clear the cookie, because a session
    // that failed to verify is exactly the one worth removing.
    const done = NextResponse.json({ ok: true });
    done.headers.set("set-cookie", clearedCookie());
    return done;
  }

  /*
   * NN's own session ends by clearing the cookie; that part always works.
   * Revoking Firebase refresh tokens is attempted as well, because a
   * project that does have Auth should have its other devices cut off too —
   * but on a project without Auth it throws, and a sign-out that fails to
   * sign the founder out is worse than one that cannot reach every device.
   */
  try {
    await getAdmin().auth.revokeRefreshTokens(uid);
  } catch (error) {
    console.error("NN: could not revoke Firebase tokens on sign-out.", (error as Error)?.name);
  }
  await recordSecurityEvent(uid, "signout_all_sessions");

  const response = NextResponse.json({ ok: true });
  response.headers.set("set-cookie", clearedCookie());
  return response;
}
