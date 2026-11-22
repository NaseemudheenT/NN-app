import "server-only";

import { NextResponse } from "next/server";
import { adminConfigured } from "../admin";

/**
 * Refuses an authentication request when this deployment has no server
 * credentials to answer it with.
 *
 * Every /api/auth route needs the Admin SDK, and the Admin SDK needs a
 * service account. Without one, `getAdmin()` throws — and because the rate
 * limiter is the first thing to call it, the throw happened before any route's
 * own error handling and every endpoint returned a bare 500 with an empty
 * body. The sign-in screen could only report that as "could not reach NN",
 * which is untrue and sends the founder looking for a network fault that is
 * really a missing environment variable.
 *
 * So the question is asked first, here, in the one place every route can call
 * it — returning `NextResponse | null` to read the same way as
 * {@link enforceRateLimit} beside it. There is also nothing to rate-limit on a
 * deployment that cannot authenticate anyone.
 *
 * What is missing stays on the server. An anonymous caller learns only that
 * sign-in is unavailable here, never which variable is unset.
 */
export function requireServerCredentials(): NextResponse | null {
  if (adminConfigured()) return null;
  return NextResponse.json(
    {
      error: "This deployment of NN has no server credentials, so it cannot verify a passkey.",
      configured: false,
    },
    { status: 503 },
  );
}
