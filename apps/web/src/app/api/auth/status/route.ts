import { NextResponse, type NextRequest } from "next/server";
import { enforceRateLimit } from "@/server/auth/ratelimit";
import { MIN_BOOTSTRAP_SECRET_LENGTH } from "@nn/auth";
import { adminConfigured, AdminConfigError } from "@/server/admin";
import { readOwner } from "@/server/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tells the sign-in screen which state to render: claim NN, sign in, or say
 * plainly that this deployment has no server credentials.
 *
 * Deliberately returns only booleans and never the owner's identity. Knowing
 * that an environment is claimed grants nothing; knowing who owns it would.
 *
 * A deployment without a service account is a *configuration* state, not a
 * failure, and it answers as one. Letting the error escape produced a 500,
 * which the sign-in screen could only report as "could not reach NN" — which
 * was not true, and sent the founder looking for a network fault that was
 * really a missing environment variable. Which variable is missing stays on
 * the server; an anonymous caller learns only that sign-in is unavailable.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  /* Checked before the rate limiter, which needs Firestore itself and would
     otherwise be the thing that throws. There is also nothing to rate-limit
     on a deployment that cannot authenticate anyone. */
  if (!adminConfigured()) {
    return NextResponse.json(
      { claimed: false, bootstrapReady: false, configured: false },
      { status: 503 },
    );
  }

  const limited = await enforceRateLimit(request, "status");
  if (limited !== null) return limited;

  const secret = process.env.NN_BOOTSTRAP_SECRET ?? "";

  let owner;
  try {
    owner = await readOwner();
  } catch (error) {
    if (error instanceof AdminConfigError) {
      console.error("NN auth status: server credentials are not configured.", error.message);
      return NextResponse.json(
        { claimed: false, bootstrapReady: false, configured: false },
        { status: 503 },
      );
    }
    throw error;
  }

  return NextResponse.json({
    claimed: owner !== null,
    bootstrapReady: secret.length >= MIN_BOOTSTRAP_SECRET_LENGTH,
    configured: true,
  });
}
