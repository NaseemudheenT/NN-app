import { NextResponse, type NextRequest } from "next/server";
import { enforceRateLimit } from "@/server/auth/ratelimit";
import { requireServerCredentials } from "@/server/auth/credentials";
import { verifyRecoveryPassword } from "@nn/auth/recovery";
import { getAdmin } from "@/server/admin";
import { readOwner, readRecovery, recordSecurityEvent, writeRecovery } from "@/server/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Getting back in without the passkey.
 *
 * This is the only door in NN that a password opens, and it exists because
 * the alternative is worse: one passkey on one device, which NN refuses to
 * delete, means a lost phone is a permanent lockout from a lifetime of
 * records.
 *
 * Three defences, in the order they run:
 *
 * 1. **The caller's rate limit** — three attempts a minute from one place.
 * 2. **The record's own lockout** — checked inside `verifyRecoveryPassword`
 *    before any hashing, and stored with the credential rather than in
 *    memory, so rotating IP addresses or restarting NN does not reset it.
 * 3. **scrypt** — 64 MB and a measurable fraction of a second per guess, for
 *    anyone, including someone holding a copy of the database.
 *
 * Every attempt is audited, successful or not. On success the founder gets
 * exactly what a passkey would have given them — the same Firebase custom
 * token, the same owner-scoped rules — and nothing more.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const unconfigured = requireServerCredentials();
  if (unconfigured !== null) return unconfigured;

  const limited = await enforceRateLimit(request, "recovery-verify");
  if (limited !== null) return limited;

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

  const [owner, record] = await Promise.all([readOwner(), readRecovery()]);

  /* One answer for "no owner", "no recovery password set" and "wrong
     password". An anonymous caller must not be able to learn which of those
     is true — the first two would tell them how NN is configured, and the
     third would tell them they had found a live target. */
  const refuse = (retryAfterMs = 0) =>
    NextResponse.json(
      { error: "Recovery failed." },
      {
        status: 401,
        ...(retryAfterMs > 0
          ? { headers: { "retry-after": String(Math.ceil(retryAfterMs / 1000)) } }
          : {}),
      },
    );

  if (owner === null || record === null) return refuse();

  const verdict = await verifyRecoveryPassword(record, password, new Date());

  // Written back whatever happened: the failure count and the lockout are
  // part of the credential, and a check that does not persist its own result
  // is one an attacker can replay for free.
  await writeRecovery(verdict.record);

  if (!verdict.ok) {
    await recordSecurityEvent(owner.uid, "recovery_failed", {
      failures: verdict.record.failures,
      lockedUntil: verdict.record.lockedUntil,
    });
    return refuse(verdict.retryAfterMs);
  }

  const customToken = await getAdmin().auth.createCustomToken(owner.uid, { nnOwner: true });
  await recordSecurityEvent(owner.uid, "recovery_succeeded", {});

  return NextResponse.json({
    customToken,
    // Said plainly so the surface can say it too: a recovery is a signal that
    // the founder has lost a device, and the next thing they should do is add
    // a passkey on the one they are holding.
    advice: "Add a passkey on this device now, so you do not need this again.",
  });
}
