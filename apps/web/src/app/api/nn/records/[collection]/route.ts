import { NextResponse, type NextRequest } from "next/server";
import { isServerWritten, paths } from "@nn/firebase";
import { getAdmin } from "@/server/admin";
import { requireServerCredentials } from "@/server/auth/credentials";
import { callerUid } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The founder's records, read and written on the server.
 *
 * NN's authorisation used to be the Firestore rules alone, reached directly
 * from the browser with a Firebase session. That session cannot exist on
 * this project — Authentication was never provisioned and the API that would
 * provision it demands billing — so the client's reads return
 * *permission denied* and every surface in NN says "NOT READABLE" to a
 * founder who is, in fact, signed in.
 *
 * So the data path moves here, and with it the authorisation boundary:
 *
 * - **The uid comes from the session cookie and from nowhere else.** Not
 *   from a header, a query parameter or the body. A browser cannot ask for
 *   somebody else's records because it has no way to name them.
 * - **The path is built, never concatenated.** `paths.collection` is the
 *   only thing that turns a uid and a name into a location, so a crafted
 *   collection name cannot climb out of the founder's own subtree.
 * - **Server-owned collections stay refused**, exactly as the rules refuse
 *   them. Audit logs and credentials are not writable here either.
 *
 * The Firestore rules are unchanged and still deny every direct client read.
 * They are now a second lock on a door nobody walks through.
 */

/** Firestore rejects a path segment containing a slash; so does NN, earlier. */
function badName(name: string): boolean {
  return name.length === 0 || name.length > 80 || /[/\\.#$[\]]/.test(name);
}

async function owner(request: NextRequest): Promise<string | null> {
  return callerUid(request);
}

const DENIED = NextResponse.json({ error: "Not signed in." }, { status: 401 });

/** Reads a page of one collection. */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ collection: string }> },
): Promise<NextResponse> {
  const unconfigured = requireServerCredentials();
  if (unconfigured !== null) return unconfigured;

  const uid = await owner(request);
  if (uid === null) return DENIED;

  const { collection } = await context.params;
  if (badName(collection)) {
    return NextResponse.json({ error: "No such collection." }, { status: 400 });
  }

  const url = new URL(request.url);
  // Always bounded. An unbounded read is how one surface downloads a life.
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 200), 1), 500);
  const includeDeleted = url.searchParams.get("includeDeleted") === "true";

  try {
    const snapshot = await getAdmin().db
      .collection(paths.collection(uid, collection))
      .limit(limit)
      .get();

    const items = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }))
      .filter((item) => includeDeleted || (item as { deletedAt?: unknown }).deletedAt == null);

    return NextResponse.json({ items }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    console.error("NN: could not read", collection, (error as Error)?.message);
    return NextResponse.json({ error: "NN could not read those records." }, { status: 502 });
  }
}

/** Creates one record. */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ collection: string }> },
): Promise<NextResponse> {
  const unconfigured = requireServerCredentials();
  if (unconfigured !== null) return unconfigured;

  const uid = await owner(request);
  if (uid === null) return DENIED;

  const { collection } = await context.params;
  if (badName(collection)) {
    return NextResponse.json({ error: "No such collection." }, { status: 400 });
  }
  if (isServerWritten(collection)) {
    // The same refusal the rules give, with the reason attached.
    return NextResponse.json(
      { error: `"${collection}" is written by NN itself, not from a browser.` },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  // Provenance is applied here, never taken from the caller: a browser that
  // could set `createdAt` could also set it to a lie.
  const now = new Date().toISOString();
  const { id: _ignoredId, ...fields } = body;
  void _ignoredId;

  try {
    const reference = await getAdmin().db
      .collection(paths.collection(uid, collection))
      .add({ ...fields, createdAt: now, updatedAt: now, schemaVersion: 1 });
    return NextResponse.json({ id: reference.id }, { status: 201 });
  } catch (error) {
    console.error("NN: could not write", collection, (error as Error)?.message);
    return NextResponse.json({ error: "NN could not save that." }, { status: 502 });
  }
}
