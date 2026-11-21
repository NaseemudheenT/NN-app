import "server-only";

import type { NextRequest } from "next/server";
import { getAdmin } from "../admin";
import { readSession, sessionFromCookieHeader } from "./nn-session";

/**
 * Identifies the caller of a route handler from the Firebase ID token in the
 * Authorization header.
 *
 * `verifyIdToken(token, true)` checks revocation as well as the signature, so
 * signing out on one device genuinely invalidates the others rather than
 * waiting an hour for the token to lapse.
 */
export async function callerUid(request: NextRequest): Promise<string | null> {
  /*
   * NN's own session first.
   *
   * Firebase Authentication is not provisioned on this project and cannot be
   * without billing, so a Firebase ID token is something the founder's
   * browser can never obtain. The cookie is what actually identifies them;
   * the ID token path below stays because a passkey on a project that *does*
   * have Auth should still work, and because removing a working path to
   * celebrate a new one is how regressions are introduced.
   */
  const session = readSession(sessionFromCookieHeader(request.headers.get("cookie")));
  if (session !== null) return session.uid;

  const header = request.headers.get("authorization");
  if (header === null || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (token.length === 0) return null;
  try {
    const decoded = await getAdmin().auth.verifyIdToken(token, true);
    return decoded.nnOwner === true ? decoded.uid : null;
  } catch {
    // Expired, malformed, revoked or forged — all are simply "not signed in".
    return null;
  }
}
