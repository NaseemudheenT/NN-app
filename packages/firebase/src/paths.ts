/**
 * Typed Firestore path builders.
 *
 * Every document in NN lives under users/{uid}/…, and the security rules
 * depend on that being true without exception. A mistyped path string would
 * not fail loudly — it would create an orphan document that no rule protects
 * and no backup inventory knows about. So paths are never written by hand
 * anywhere in NN; they come from here.
 */

/** Collections only a trusted server may write. Mirrors firestore.rules. */
export const SERVER_WRITTEN_COLLECTIONS = [
  "audit_logs",
  "security_events",
  "permissions",
  "summaries",
  "backups",
  "tool_executions",
  "credentials",
  "system_health",
  "job_runs",
] as const;

export type ServerWrittenCollection = (typeof SERVER_WRITTEN_COLLECTIONS)[number];

export function isServerWritten(collection: string): collection is ServerWrittenCollection {
  return (SERVER_WRITTEN_COLLECTIONS as readonly string[]).includes(collection);
}

/** Subcollections the rules treat as append-only history. */
export const APPEND_ONLY_SUBCOLLECTIONS = [
  "versions",
  "occurrences",
  "entries",
  "messages",
  "steps",
] as const;

export function isAppendOnly(sub: string): boolean {
  return (APPEND_ONLY_SUBCOLLECTIONS as readonly string[]).includes(sub);
}

/**
 * Firestore rejects path segments containing "/" and documents named "." or
 * "..". Catching it here turns a confusing server error into a clear one.
 */
function assertSegment(value: string, label: string): string {
  if (value.length === 0) throw new Error(`${label} must not be empty`);
  if (value.includes("/")) throw new Error(`${label} must not contain "/": ${value}`);
  if (value === "." || value === "..") throw new Error(`${label} must not be "${value}"`);
  return value;
}

export const paths = {
  /** The owner record. Everything else hangs beneath it. */
  user: (uid: string): string => `users/${assertSegment(uid, "uid")}`,

  collection: (uid: string, collection: string): string =>
    `${paths.user(uid)}/${assertSegment(collection, "collection")}`,

  doc: (uid: string, collection: string, docId: string): string =>
    `${paths.collection(uid, collection)}/${assertSegment(docId, "docId")}`,

  subcollection: (uid: string, collection: string, docId: string, sub: string): string =>
    `${paths.doc(uid, collection, docId)}/${assertSegment(sub, "subcollection")}`,

  subdoc: (
    uid: string, collection: string, docId: string, sub: string, subId: string,
  ): string => `${paths.subcollection(uid, collection, docId, sub)}/${assertSegment(subId, "subDocId")}`,

  /** Shared verified libraries. Read-only to every client. */
  reference: (docId: string): string => `reference/${assertSegment(docId, "docId")}`,

  /** Cloud Storage. Mirrors the Firestore shape so ownership is obvious. */
  storage: {
    file: (uid: string, ...segments: readonly string[]): string =>
      [`users/${assertSegment(uid, "uid")}`, ...segments.map((s, i) => assertSegment(s, `segment ${i}`))].join("/"),
    /**
     * Server-generated previews, OCR output and thumbnails.
     *
     * Deliberately outside users/. Storage rules are a permissive union, so a
     * nested path would still be matched — and allowed — by the owner's
     * general write rule, letting a client forge server output.
     */
    derived: (uid: string, ...segments: readonly string[]): string =>
      ["derived", assertSegment(uid, "uid"),
       ...segments.map((s, i) => assertSegment(s, `segment ${i}`))].join("/"),

    /** Encrypted backup archives. No client may read or write these. */
    backup: (uid: string, ...segments: readonly string[]): string =>
      ["backups", assertSegment(uid, "uid"),
       ...segments.map((s, i) => assertSegment(s, `segment ${i}`))].join("/"),
  },
} as const;
