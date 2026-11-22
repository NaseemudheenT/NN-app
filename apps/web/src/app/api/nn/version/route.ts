import { NextResponse } from "next/server";
import { NN_RELEASE, buildId } from "@/lib/nn/version";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Which NN is running, right now, on the server.
 *
 * The page that asks already knows which build it was *loaded* from. The
 * point of asking is to find out whether that is still the current one —
 * which is the only way a browser can notice a deployment, because nothing
 * tells it.
 *
 * Public on purpose, and carries nothing private: a release name and a
 * seven-character commit prefix. Requiring a session would mean NN could
 * not report its own version on the sign-in screen, which is exactly where
 * a stale build is most confusing.
 */
export function GET(): NextResponse {
  return NextResponse.json(
    { release: NN_RELEASE, build: buildId() },
    { headers: { "cache-control": "no-store" } },
  );
}
