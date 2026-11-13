import { NextResponse, type NextRequest } from "next/server";
import { enforceRateLimit } from "@/server/auth/ratelimit";
import { requireServerCredentials } from "@/server/auth/credentials";
import { confirmAuthentication, isUsable, readRelyingParty, type AuthenticationResponseJSON } from "@nn/auth";
import { getAdmin } from "@/server/admin";
import {
  FirestoreChallengeStore, findCredential, readOwner, recordSecurityEvent, updateCounter,
} from "@/server/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 2 of signing in.
 *
 * On success NN mints a Firebase custom token. The browser exchanges it for a
 * real Firebase session, so from that point on the owner-scoped Firestore and
 * Storage rules built in Phase 2 apply unchanged — the WebAuthn layer and the
 * authorisation layer meet here and nowhere else.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Asked before the rate limiter, which needs Firestore itself and would
  // otherwise be the thing that throws.
  const unconfigured = requireServerCredentials();
  if (unconfigured !== null) return unconfigured;

  const limited = await enforceRateLimit(request, "signin-verify");
  if (limited !== null) return limited;

  let body: { ticket?: unknown; response?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }
  if (typeof body.ticket !== "string" || body.response === null || typeof body.response !== "object") {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const record = await new FirestoreChallengeStore().take(body.ticket);
  if (!isUsable(record, "authentication", Date.now())) {
    return NextResponse.json({ error: "This sign-in expired. Try again." }, { status: 400 });
  }

  const assertion = body.response as AuthenticationResponseJSON;
  const found = await findCredential(assertion.id);
  const owner = await readOwner();

  // One generic message for every failure below, so nothing is revealed about
  // which passkeys exist or whether NN has been claimed.
  const refuse = () => NextResponse.json({ error: "Sign-in failed." }, { status: 401 });

  if (found === null || owner === null || found.uid !== owner.uid) return refuse();

  let result;
  try {
    result = await confirmAuthentication(
      readRelyingParty(process.env), assertion, record.challenge, found.credential,
    );
  } catch (e) {
    await recordSecurityEvent(found.uid, "signin_failed", {
      reason: e instanceof Error ? e.message : "unknown",
    });
    return refuse();
  }

  await updateCounter(found.uid, result.credentialId, result.newCounter);

  const customToken = await getAdmin().auth.createCustomToken(found.uid, { nnOwner: true });
  await recordSecurityEvent(found.uid, "signin_succeeded", { credentialId: result.credentialId });

  return NextResponse.json({ customToken });
}
