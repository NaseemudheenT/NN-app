import { NextResponse, type NextRequest } from "next/server";
import { enforceRateLimit } from "@/server/auth/ratelimit";
import { requireServerCredentials } from "@/server/auth/credentials";
import { assessRecoveryPassword, secretsMatch } from "@nn/auth";
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

  let body: { password?: unknown; bootstrapSecret?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : null;
  if (password === null) {
    return NextResponse.json({ error: "Expected a password." }, { status: 400 });
  }

  const [owner, uid, existing] = await Promise.all([
    readOwner(), callerUid(request), readRecovery(),
  ]);
  if (owner === null) {
    return NextResponse.json({ error: "NN has no owner yet." }, { status: 409 });
  }

  /*
   * Two ways to set this, and the second one closes behind itself.
   *
   * Normally: the owner, signed in with their passkey. The only person who
   * may cut a second key is somebody holding the first.
   *
   * Once, with the bootstrap secret, **only while no password exists yet**.
   * Without this there is a state NN can reach and never leave: an
   * environment claimed with a passkey that will not work on the founder's
   * device, and no way to set the credential that exists for exactly that
   * case, because setting it needs the session they cannot get. The window
   * shuts permanently the moment a password is stored, so this is a way out
   * of that trap and not a standing back door.
   */
  const presented = typeof body.bootstrapSecret === "string" ? body.bootstrapSecret : null;
  const configured = process.env.NN_BOOTSTRAP_SECRET ?? null;
  const asOwner = uid !== null && uid === owner.uid;
  const asFirstSetup = existing === null
    && presented !== null && configured !== null
    && secretsMatch(presented, configured);

  if (!asOwner && !asFirstSetup) {
    // The same answer for "not signed in", "signed in as somebody else" and
    // "wrong secret": none of those callers is owed the difference.
    return NextResponse.json(
      { error: "Sign in with your passkey, or use the bootstrap secret." },
      { status: 401 },
    );
  }

  const strength = assessRecoveryPassword(password);
  if (!strength.ok) {
    // The reason is about the password's shape, never its content.
    return NextResponse.json({ error: strength.reason, bits: strength.bits }, { status: 400 });
  }

  const record = await createRecoveryRecord(password, new Date());
  await writeRecovery(record);
  await recordSecurityEvent(owner.uid, "recovery_password_set", {
    // The strength and the route, not the password. Useful in an audit,
    // worthless to a thief.
    bits: strength.bits,
    via: asOwner ? "session" : "bootstrap",
  });

  return NextResponse.json({ ok: true, bits: strength.bits });
}
