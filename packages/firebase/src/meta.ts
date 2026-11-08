import { serverTimestamp, type FieldValue, type Timestamp } from "firebase/firestore";

/**
 * Every NN document carries its own provenance. The security rules reject any
 * write without these three fields, so they are produced here rather than
 * remembered at each call site.
 */
export interface DocumentMeta {
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
  /** Bumped when a collection's shape changes. Migrations read this. */
  schemaVersion: number;
}

export const CURRENT_SCHEMA_VERSION = 1;

/** Metadata for a brand-new document. */
export function createMeta(schemaVersion: number = CURRENT_SCHEMA_VERSION): DocumentMeta {
  if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new Error(`schemaVersion must be a positive integer, got ${schemaVersion}`);
  }
  return {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    schemaVersion,
  };
}

/**
 * Metadata for an update. Deliberately omits createdAt: the rules reject any
 * write that changes it, so including it would be a bug waiting to happen.
 */
export function updateMeta(): { updatedAt: FieldValue } {
  return { updatedAt: serverTimestamp() };
}

/** Soft delete. The trash purge job hard-deletes later. */
export function softDeleteMeta(): { updatedAt: FieldValue; deletedAt: FieldValue } {
  return { updatedAt: serverTimestamp(), deletedAt: serverTimestamp() };
}
