import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { buildAuthenticationOptions, makeRecord, readRelyingParty } from "@nn/auth";
import { FirestoreChallengeStore, readOwner } from "@/server/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 1 of signing in.
 *
 * Returns the same shape whether or not NN has an owner, so an unauthenticated
 * caller cannot probe this endpoint to learn whether the environment is
 * claimed. The real check happens at verification.
 */
export async function POST(): Promise<NextResponse> {
  const options = await buildAuthenticationOptions(readRelyingParty(process.env));

  const ticket = randomUUID();
  await new FirestoreChallengeStore().put(
    ticket,
    makeRecord(options.challenge, "authentication", Date.now()),
  );

  // Read the owner only to keep timing broadly similar in both cases.
  await readOwner();

  return NextResponse.json({ ticket, options });
}
