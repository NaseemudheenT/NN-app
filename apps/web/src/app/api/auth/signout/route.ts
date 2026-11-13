import { NextResponse, type NextRequest } from "next/server";
import { enforceRateLimit } from "@/server/auth/ratelimit";
import { requireServerCredentials } from "@/server/auth/credentials";
import { getAdmin } from "@/server/admin";
import { callerUid } from "@/server/auth/session";
import { recordSecurityEvent } from "@/server/auth/store";

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
  if (uid === null) return NextResponse.json({ ok: true }); // already signed out

  await getAdmin().auth.revokeRefreshTokens(uid);
  await recordSecurityEvent(uid, "signout_all_sessions");
  return NextResponse.json({ ok: true });
}
