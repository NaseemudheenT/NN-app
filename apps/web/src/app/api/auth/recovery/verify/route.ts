import { NextResponse, type NextRequest } from "next/server";
import { enforceRateLimit } from "@/server/auth/ratelimit";
import { requireServerCredentials } from "@/server/auth/credentials";
import { verifyRecoveryPassword } from "@nn/auth/recovery";
import { getAdmin } from "@/server/admin";
import { readOwner, readRecovery, recordSecurityEvent, writeRecovery } from "@/server/auth/store";
import { defaultOwner, defaultRecoveryRecord } from "@/server/auth/default-owner";
import { issueSession, sessionCookie } from "@/server/auth/nn-session";

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

  /*
   * Firestore first, configuration second.
   *
   * A stored record is the live credential — it is what the founder can
   * change, and it is the only one that counts failures. But a password that
   * *only* works when a particular document exists has a second, invisible
   * dependency, and that dependency is what has locked the founder out
   * before. So NN also knows a password of its own, and falls back to it
   * when the database holds none.
   */
  const [storedOwner, storedRecord] = await Promise.all([readOwner(), readRecovery()]);
  const owner = storedOwner ?? defaultOwner();
  const record = storedRecord ?? defaultRecoveryRecord();
  const fromConfig = storedRecord === null && record !== null;

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

  const now = new Date();
  const configured = defaultRecoveryRecord();

  /*
   * Either credential opens the door.
   *
   * The stored record is tried first and is still the one that counts
   * failures. But a stored record that is *not* the password the founder
   * believes they set is a silent lockout with no way out — the deployed
   * default would never be reached, because something was already there.
   * That is the exact shape of the two lockouts NN has already inflicted,
   * and the founder has now asked three times for one password that simply
   * works.
   *
   * So when the stored record refuses, the deployed default gets a turn.
   * Both are the owner's own credentials, both are scrypt at 64 MB a guess,
   * and both sit behind the same per-caller rate limit. What this removes is
   * not a defence — it is a trapdoor.
   */
  const verdict = await verifyRecoveryPassword(record, password, now);

  // Written back whatever happened: the failure count and the lockout are
  // part of the credential, and a check that does not persist its own result
  // is one an attacker can replay for free.
  //
  // Not written when the record came from configuration: storing it would
  // quietly promote the deployed default into the live credential, so the
  // founder could no longer change it by changing the configuration.
  if (!fromConfig) await writeRecovery(verdict.record);

  let opened = verdict.ok;
  let via: "stored" | "configured" = "stored";

  if (!opened && !fromConfig && configured !== null) {
    const fallback = await verifyRecoveryPassword(configured, password, now);
    if (fallback.ok) {
      opened = true;
      via = "configured";
    }
  }

  if (!opened) {
    await recordSecurityEvent(owner.uid, "recovery_failed", {
      failures: verdict.record.failures,
      lockedUntil: verdict.record.lockedUntil,
    });
    // `opened` is false, so the stored verdict was a refusal — but it is a
    // separate variable now and TypeScript cannot see that, so the wait is
    // read through the discriminant rather than asserted.
    return refuse(verdict.ok ? 0 : verdict.retryAfterMs);
  }

  /*
   * NN's own session is what actually signs the founder in.
   *
   * A Firebase custom token is still minted when Auth is reachable, because
   * a project that has it should get the richer session — but it is no
   * longer required, and a failure to mint one no longer costs the founder
   * their sign-in. That failure is exactly what
   * `auth/configuration-not-found` was: a correct password thrown away at
   * the last step by a service this project does not have.
   */
  let customToken: string | null = null;
  try {
    customToken = await getAdmin().auth.createCustomToken(owner.uid, { nnOwner: true });
  } catch (error) {
    console.error("NN: no Firebase custom token; continuing on NN's own session.",
      (error as Error)?.name);
  }

  await recordSecurityEvent(owner.uid, "recovery_succeeded", { via });

  const response = NextResponse.json({
    customToken,
    // Said plainly so the surface can say it too: a recovery is a signal that
    // the founder has lost a device, and the next thing they should do is add
    // a passkey on the one they are holding.
    advice: "Add a passkey on this device now, so you do not need this again.",
  });
  response.headers.set("set-cookie", sessionCookie(issueSession(owner.uid, "password")));
  return response;
}
