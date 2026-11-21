import { NextResponse, type NextRequest } from "next/server";
import { isServerWritten, paths } from "@nn/firebase";
import { getAdmin } from "@/server/admin";
import { requireServerCredentials } from "@/server/auth/credentials";
import { callerUid } from "@/server/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * One record: changed, or moved to the trash.
 *
 * Same rules as the collection route — the uid comes from the session and
 * nowhere else, the path is built rather than concatenated, and a
 * server-owned collection is refused with the reason rather than a bare 403.
 *
 * Deleting is soft. NN has one copy of the founder's life and a `delete`
 * that actually deletes is a feature nobody asks for twice.
 */

function badName(name: string): boolean {
  return name.length === 0 || name.length > 80 || /[/\\.#$[\]]/.test(name);
}

const DENIED = NextResponse.json({ error: "Not signed in." }, { status: 401 });

async function guard(
  request: NextRequest,
  context: { params: Promise<{ collection: string; id: string }> },
): Promise<{ uid: string; collection: string; id: string } | NextResponse> {
  const unconfigured = requireServerCredentials();
  if (unconfigured !== null) return unconfigured;

  const uid = await callerUid(request);
  if (uid === null) return DENIED;

  const { collection, id } = await context.params;
  if (badName(collection) || badName(id)) {
    return NextResponse.json({ error: "No such record." }, { status: 400 });
  }
  if (isServerWritten(collection)) {
    return NextResponse.json(
      { error: `"${collection}" is written by NN itself, not from a browser.` },
      { status: 403 },
    );
  }
  return { uid, collection, id };
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ collection: string; id: string }> },
): Promise<NextResponse> {
  const checked = await guard(request, context);
  if (checked instanceof NextResponse) return checked;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }
  const { id: _ignored, createdAt: _also, ...fields } = body;
  void _ignored; void _also;

  try {
    await getAdmin().db
      .doc(paths.doc(checked.uid, checked.collection, checked.id))
      .set({ ...fields, updatedAt: new Date().toISOString() }, { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("NN: could not update", checked.collection, (error as Error)?.message);
    return NextResponse.json({ error: "NN could not change that." }, { status: 502 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ collection: string; id: string }> },
): Promise<NextResponse> {
  const checked = await guard(request, context);
  if (checked instanceof NextResponse) return checked;

  try {
    // Soft: the record goes to the trash and can be brought back.
    await getAdmin().db
      .doc(paths.doc(checked.uid, checked.collection, checked.id))
      .set({ deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { merge: true });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("NN: could not delete", checked.collection, (error as Error)?.message);
    return NextResponse.json({ error: "NN could not delete that." }, { status: 502 });
  }
}
