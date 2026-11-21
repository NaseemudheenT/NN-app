import { NextResponse, type NextRequest } from "next/server";
import { readSession, sessionFromCookieHeader } from "@/server/auth/nn-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Who NN thinks you are, according to NN's own session.
 *
 * The browser used to learn this from Firebase, which on this project can
 * never answer — so the founder's session existed on the server and was
 * invisible to the page that needed it. This is the smallest honest answer:
 * whether there is a session, whose it is, and when it lapses.
 *
 * It deliberately returns no profile, no claims and no token. A page that
 * needs to *do* something sends the cookie and the route decides; nothing
 * here is a capability.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = readSession(sessionFromCookieHeader(request.headers.get("cookie")));
  if (session === null) {
    return NextResponse.json({ signedIn: false }, {
      // Never cached: a stale "signed in" is a page that shows a locked
      // environment, and a stale "signed out" throws the founder at the door.
      headers: { "cache-control": "no-store" },
    });
  }
  return NextResponse.json(
    { signedIn: true, uid: session.uid, via: session.via, expiresAt: session.expiresAt },
    { headers: { "cache-control": "no-store" } },
  );
}
