import { NextResponse, type NextRequest } from "next/server";
import { confirmRegistration, isUsable, readRelyingParty, type RegistrationResponseJSON } from "@nn/auth";
import {
  FirestoreChallengeStore, claimOwner, readOwner, recordSecurityEvent, saveCredential,
} from "@/server/auth/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Step 2: verify the attestation and store the passkey. */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { ticket?: unknown; response?: unknown; label?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (typeof body.ticket !== "string" || body.response === null || typeof body.response !== "object") {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  // Taking the challenge consumes it, so a replay of this request fails even
  // if everything else about it is valid.
  const record = await new FirestoreChallengeStore().take(body.ticket);
  if (!isUsable(record, "registration", Date.now())) {
    return NextResponse.json({ error: "This registration expired. Start again." }, { status: 400 });
  }

  const carried = record as unknown as { uid?: string; mode?: string };
  const uid = carried.uid;
  const mode = carried.mode;
  if (typeof uid !== "string" || (mode !== "bootstrap" && mode !== "add-credential")) {
    return NextResponse.json({ error: "This registration expired. Start again." }, { status: 400 });
  }

  // Re-check ownership at commit time. The world may have changed since the
  // options were issued, and the bootstrap race must close here too.
  const owner = await readOwner();
  if (mode === "bootstrap" && owner !== null) {
    return NextResponse.json({ error: "NN already has an owner." }, { status: 409 });
  }
  if (mode === "add-credential" && (owner === null || owner.uid !== uid)) {
    return NextResponse.json({ error: "Not permitted." }, { status: 403 });
  }

  let credential;
  try {
    credential = await confirmRegistration(
      readRelyingParty(process.env),
      body.response as RegistrationResponseJSON,
      record.challenge,
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Verification failed." },
      { status: 400 },
    );
  }

  if (mode === "bootstrap") await claimOwner(uid);

  const label = typeof body.label === "string" && body.label.trim().length > 0
    ? body.label.trim().slice(0, 60)
    : "This device";
  await saveCredential(uid, credential, label);
  await recordSecurityEvent(uid, mode === "bootstrap" ? "owner_claimed" : "passkey_registered", { label });

  return NextResponse.json({ ok: true, mode });
}
