import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import {
  AUTH_LIMITS, clientKey, decideRateLimit, windowStart, type AuthLimitKey,
} from "@nn/security";
import { getAdmin } from "../admin";

/**
 * Firestore-backed fixed-window rate limiting.
 *
 * Deliberately not Redis: that would be another service to run and pay for.
 * One document per key per window, incremented in a transaction so concurrent
 * requests cannot both slip under the limit. Documents are keyed by window
 * start, so they stop being written to the moment the window rolls over.
 */
export async function enforceRateLimit(
  request: NextRequest,
  key: AuthLimitKey,
): Promise<NextResponse | null> {
  const rule = AUTH_LIMITS[key];
  const now = Date.now();
  const start = windowStart(now, rule.windowMs);
  const docId = `${key}_${clientKey(request.headers)}_${start}`;

  const { db } = getAdmin();
  const ref = db.collection("rate_limits").doc(docId);

  let count: number;
  try {
    count = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const next = ((snap.data()?.["count"] as number | undefined) ?? 0) + 1;
      tx.set(ref, { count: next, key, windowStart: start, expiresAt: new Date(start + rule.windowMs * 2) });
      return next;
    });
  } catch {
    // Never let the limiter itself take authentication down. Failing open on
    // an infrastructure error is the right trade here: the cryptography, not
    // this counter, is what makes a passkey unguessable.
    return null;
  }

  const verdict = decideRateLimit(rule, count, now);
  if (verdict.allowed) return null;

  return NextResponse.json(
    { error: "Too many attempts. Wait a moment and try again." },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(verdict.resetInMs / 1000)),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
