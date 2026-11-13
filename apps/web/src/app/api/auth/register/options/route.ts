import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { enforceRateLimit } from "@/server/auth/ratelimit";
import { requireServerCredentials } from "@/server/auth/credentials";
import {
  buildRegistrationOptions, evaluateRegistration, makeRecord, readRelyingParty,
} from "@nn/auth";
import { callerUid } from "@/server/auth/session";
import { FirestoreChallengeStore, listCredentials, readOwner } from "@/server/auth/store";

// firebase-admin needs the Node runtime; it cannot run on the edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 1 of registering a passkey.
 *
 * The bootstrap gate runs BEFORE any challenge is issued, so an unauthorised
 * caller learns nothing — not even whether NN has an owner.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Asked before the rate limiter, which needs Firestore itself and would
  // otherwise be the thing that throws.
  const unconfigured = requireServerCredentials();
  if (unconfigured !== null) return unconfigured;

  const limited = await enforceRateLimit(request, "register-options");
  if (limited !== null) return limited;

  let body: { bootstrapSecret?: unknown } = {};
  try { body = (await request.json()) as typeof body; } catch { /* empty body is fine */ }

  const presentedSecret = typeof body.bootstrapSecret === "string" ? body.bootstrapSecret : null;
  const configuredSecret = process.env.NN_BOOTSTRAP_SECRET ?? null;

  const [owner, uid] = await Promise.all([readOwner(), callerUid(request)]);

  const verdict = evaluateRegistration({
    owner, presentedSecret, configuredSecret, authenticatedUid: uid,
  });
  if (!verdict.allowed) {
    return NextResponse.json({ error: verdict.reason }, { status: verdict.status });
  }

  const rp = readRelyingParty(process.env);
  const targetUid = verdict.mode === "bootstrap" ? randomUUID() : verdict.uid;
  const existing = verdict.mode === "bootstrap" ? [] : await listCredentials(targetUid);

  const options = await buildRegistrationOptions(
    rp,
    { id: targetUid, name: "founder", displayName: "Founder" },
    existing,
  );

  // The challenge is bound to a one-time ticket rather than to a cookie, so a
  // stolen ticket is useless once used and expires in five minutes.
  const ticket = randomUUID();
  await new FirestoreChallengeStore().put(ticket, {
    ...makeRecord(options.challenge, "registration", Date.now()),
    // The uid is carried with the challenge so the verify step cannot be
    // pointed at a different account.
    ...({ uid: targetUid, mode: verdict.mode } as Record<string, unknown>),
  });

  return NextResponse.json({ ticket, options });
}
