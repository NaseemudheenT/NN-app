import { NextResponse, type NextRequest } from "next/server";
import { enforceRateLimit } from "@/server/auth/ratelimit";
import { requireServerCredentials } from "@/server/auth/credentials";
import { assessRecoveryPassword } from "@nn/auth";
import { createRecoveryRecord } from "@nn/auth/recovery";
import { callerUid } from "@/server/auth/session";
import {
  readOwner, readRecovery, recordSecurityEvent, writeRecovery,
} from "@/server/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Whether a recovery password exists. Owner only, and nothing else about it. */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const unconfigured = requireServerCredentials();
  if (unconfigured !== null) return unconfigured;

  const [owner, uid] = await Promise.all([readOwner(), callerUid(request)]);
  if (owner === null || uid === null || uid !== owner.uid) {
    return NextResponse.json({ error: "Sign in with your passkey first." }, { status: 401 });
  }
  const record = await readRecovery();
  return NextResponse.json({
    configured: record !== null,
    // When it was last changed, which is the only thing about it that is
    // safe to show and the only thing worth knowing.
    updatedAt: record?.updatedAt ?? null,
  });
}

/**
 * Setting the recovery password.
 *
 * Only the owner, only while already signed in with a passkey. That ordering
 * is the whole security of it: the recovery password is a second key to the
 * founder's life, and the only person allowed to cut one is somebody who has
 * already proved they hold the first.
 *
 * The password arrives over TLS, is hashed here, and is never written to a
 * log, an error, a response or Firestore in any recoverable form. If NN's
 * database were copied tomorrow, the copy would contain a 64-byte scrypt
 * output and the parameters that produced it, and nothing else.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const unconfigured = requireServerCredentials();
  if (unconfigured !== null) return unconfigured;

  const limited = await enforceRateLimit(request, "recovery-set");
  if (limited !== null) return limited;

  const [owner, uid] = await Promise.all([readOwner(), callerUid(request)]);
  if (owner === null) {
    return NextResponse.json({ error: "NN has no owner yet." }, { status: 409 });
  }
  if (uid === null || uid !== owner.uid) {
    // Deliberately the same answer for "not signed in" and "signed in as
    // somebody else": neither caller is owed the difference.
    return NextResponse.json(
      { error: "Sign in with your passkey first." },
      { status: 401 },
    );
  }

  let body: { password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : null;
  if (password === null) {
    return NextResponse.json({ error: "Expected a password." }, { status: 400 });
  }

  const strength = assessRecoveryPassword(password);
  if (!strength.ok) {
    // The reason is about the password's shape, never its content.
    return NextResponse.json({ error: strength.reason, bits: strength.bits }, { status: 400 });
  }

  const record = await createRecoveryRecord(password, new Date());
  await writeRecovery(record);
  await recordSecurityEvent(owner.uid, "recovery_password_set", {
    // The strength, not the password. Useful in an audit, worthless to a thief.
    bits: strength.bits,
  });

  return NextResponse.json({ ok: true, bits: strength.bits });
}
