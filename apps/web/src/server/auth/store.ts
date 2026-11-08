import "server-only";

import type { ChallengeRecord, ChallengeStore, OwnerRecord, StoredCredential } from "@nn/auth";
import { getAdmin } from "../admin";

/**
 * Persistence for authentication, through the Admin SDK.
 *
 * Every collection touched here is one the security rules refuse to any
 * client — `credentials` and the `system` singleton. That is deliberate: the
 * only way a passkey or the owner record changes is through this file.
 */

const SYSTEM = "system";
const OWNER_DOC = "owner";

/**
 * Decodes a stored key into a Uint8Array backed by a real ArrayBuffer.
 *
 * Node's Buffer is a view over a shared pool, so passing one straight to the
 * WebAuthn library both fails TypeScript's ArrayBuffer check and risks
 * handing over bytes from neighbouring allocations. Copying is correct here,
 * not defensive clutter.
 */
function decodeKey(base64url: string): Uint8Array<ArrayBuffer> {
  const buf = Buffer.from(base64url, "base64url");
  const out = new Uint8Array(new ArrayBuffer(buf.byteLength));
  out.set(buf);
  return out as Uint8Array<ArrayBuffer>;
}

/** Challenges in Firestore, so they survive a restart and are genuinely single-use. */
export class FirestoreChallengeStore implements ChallengeStore {
  async put(key: string, record: ChallengeRecord): Promise<void> {
    await getAdmin().db.collection("auth_challenges").doc(key).set(record);
  }

  async take(key: string): Promise<ChallengeRecord | null> {
    const { db } = getAdmin();
    const ref = db.collection("auth_challenges").doc(key);
    // A transaction makes consumption atomic: two concurrent replays of the
    // same challenge cannot both succeed.
    return db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return null;
      tx.delete(ref);
      return snap.data() as ChallengeRecord;
    });
  }
}

export async function readOwner(): Promise<OwnerRecord | null> {
  const snap = await getAdmin().db.collection(SYSTEM).doc(OWNER_DOC).get();
  if (!snap.exists) return null;
  return snap.data() as OwnerRecord;
}

/**
 * Claims NN for a uid. Refuses if an owner already exists — the transaction
 * closes the race where two bootstrap requests arrive together.
 */
export async function claimOwner(uid: string): Promise<OwnerRecord> {
  const { db } = getAdmin();
  const ref = db.collection(SYSTEM).doc(OWNER_DOC);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) throw new Error("NN already has an owner.");
    const record: OwnerRecord = {
      uid,
      claimedAt: new Date().toISOString(),
      credentialCount: 0,
    };
    tx.set(ref, record);
    return record;
  });
}

function credentialsRef(uid: string) {
  return getAdmin().db.collection("users").doc(uid).collection("credentials");
}

export async function listCredentials(uid: string): Promise<StoredCredential[]> {
  const snap = await credentialsRef(uid).get();
  return snap.docs.map((d) => {
    const data = d.data() as {
      publicKey: string; counter: number; transports?: StoredCredential["transports"];
    };
    return {
      id: d.id,
      publicKey: decodeKey(data.publicKey),
      counter: data.counter,
      ...(data.transports !== undefined ? { transports: data.transports } : {}),
    };
  });
}

export async function findCredential(id: string): Promise<{ uid: string; credential: StoredCredential } | null> {
  // A discoverable passkey tells us the credential id but not the user, so
  // the lookup is by id across owners. NN has one owner, so this is cheap.
  const snap = await getAdmin().db.collectionGroup("credentials").get();
  for (const doc of snap.docs) {
    if (doc.id !== id) continue;
    const uid = doc.ref.parent.parent?.id;
    if (uid === undefined) continue;
    const data = doc.data() as {
      publicKey: string; counter: number; transports?: StoredCredential["transports"];
    };
    return {
      uid,
      credential: {
        id: doc.id,
        publicKey: decodeKey(data.publicKey),
        counter: data.counter,
        ...(data.transports !== undefined ? { transports: data.transports } : {}),
      },
    };
  }
  return null;
}

export async function saveCredential(
  uid: string, credential: StoredCredential, label: string,
): Promise<void> {
  const { db } = getAdmin();
  const now = new Date();
  await db.runTransaction(async (tx) => {
    const ownerRef = db.collection(SYSTEM).doc(OWNER_DOC);
    const ownerSnap = await tx.get(ownerRef);

    tx.set(credentialsRef(uid).doc(credential.id), {
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      ...(credential.transports !== undefined ? { transports: credential.transports } : {}),
      label,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    if (ownerSnap.exists) {
      const current = ownerSnap.data() as OwnerRecord;
      tx.update(ownerRef, { credentialCount: current.credentialCount + 1 });
    }
  });
}

export async function updateCounter(uid: string, credentialId: string, counter: number): Promise<void> {
  await credentialsRef(uid).doc(credentialId).update({ counter, updatedAt: new Date() });
}

/** Append-only. The founder can read these; no client can write one. */
export async function recordSecurityEvent(
  uid: string, type: string, detail: Record<string, unknown> = {},
): Promise<void> {
  const now = new Date();
  await getAdmin().db.collection("users").doc(uid).collection("security_events").add({
    type, ...detail, createdAt: now, updatedAt: now, schemaVersion: 1,
  });
}
