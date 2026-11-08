import { NextResponse } from "next/server";
import { MIN_BOOTSTRAP_SECRET_LENGTH } from "@nn/auth";
import { readOwner } from "@/server/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Tells the sign-in screen which state to render: claim NN, or sign in.
 *
 * Deliberately returns only a boolean and never the owner's identity. Knowing
 * that an environment is claimed grants nothing; knowing who owns it would.
 */
export async function GET(): Promise<NextResponse> {
  const owner = await readOwner();
  const secret = process.env.NN_BOOTSTRAP_SECRET ?? "";
  return NextResponse.json({
    claimed: owner !== null,
    bootstrapReady: secret.length >= MIN_BOOTSTRAP_SECRET_LENGTH,
  });
}
