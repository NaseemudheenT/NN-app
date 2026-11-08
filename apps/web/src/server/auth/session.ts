import "server-only";

import type { NextRequest } from "next/server";
import { getAdmin } from "../admin";

/**
 * Identifies the caller of a route handler from the Firebase ID token in the
 * Authorization header.
 *
 * `verifyIdToken(token, true)` checks revocation as well as the signature, so
 * signing out on one device genuinely invalidates the others rather than
 * waiting an hour for the token to lapse.
 */
export async function callerUid(request: NextRequest): Promise<string | null> {
  const header = request.headers.get("authorization");
  if (header === null || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  if (token.length === 0) return null;
  try {
    const decoded = await getAdmin().auth.verifyIdToken(token, true);
    return decoded.uid;
  } catch {
    // Expired, malformed, revoked or forged — all are simply "not signed in".
    return null;
  }
}
