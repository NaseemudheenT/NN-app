"use client";

/**
 * The record layer every NN application reads and writes through.
 *
 * NN's authorisation boundary is the Firestore rules, not React — so the
 * client talks to Firestore directly and the rules decide what it may do.
 * That makes *how* the client talks to Firestore worth getting right once,
 * here, rather than thirty-four times:
 *
 *   · Paths come from `@nn/firebase`, never from a string literal. A mistyped
 *     path does not fail loudly; it creates an orphan document that no rule
 *     protects and no backup inventory knows about.
 *   · Every document carries the provenance the rules demand, applied here
 *     rather than remembered at each call site.
 *   · Writes to server-owned collections are refused before they leave the
 *     browser. The rules would refuse them anyway; failing here says why.
 *   · Every read reports its real state — loading, empty, denied, offline —
 *     so a surface can tell the founder the truth instead of showing a
 *     plausible blank.
 *
 * Reads are live. An operating environment whose numbers are stale until you
 * reload is not an operating environment.
 */

import * as React from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type Firestore,
  type QueryConstraint,
} from "firebase/firestore";
import { createMeta, isServerWritten, paths, softDeleteMeta, updateMeta } from "@nn/firebase";
import { firebaseAvailable, getFirebase } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";

/** A document as an application sees it: its id, plus whatever it holds. */
export interface NNRecord {
  id: string;
  [field: string]: unknown;
}

/**
 * Why a read is not showing data.
 *
 * Distinguished because the right thing to say is different in each case, and
 * "something went wrong" is never the right thing to say.
 */
export type RecordFault =
  | { kind: "unconfigured"; message: string }
  | { kind: "signed-out"; message: string }
  | { kind: "denied"; message: string }
  | { kind: "unavailable"; message: string }
  | { kind: "failed"; message: string };

export interface RecordState<T extends NNRecord = NNRecord> {
  items: readonly T[];
  /** True until the first response — from the server or the local cache. */
  loading: boolean;
  /** The read succeeded and there is genuinely nothing here. */
  empty: boolean;
  /** Served from the on-device cache; the server has not been reached. */
  stale: boolean;
  fault: RecordFault | null;
}

export interface RecordQuery {
  /** Field to order by. Defaults to the most recently touched first. */
  orderBy?: string;
  direction?: "asc" | "desc";
  /** Hard ceiling on how much is pulled down. Always set; never unbounded. */
  limit?: number;
  /** Simple equality filters. Anything richer belongs in a server job. */
  equals?: Readonly<Record<string, unknown>>;
  /** Include soft-deleted documents. Off by default — trash is not content. */
  includeDeleted?: boolean;
}

/** Firestore error codes NN can explain, mapped to what to actually say. */
function describe(error: unknown): RecordFault {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";
  if (code === "permission-denied") {
    return {
      kind: "denied",
      message: "This record is not yours to read. Nothing was loaded.",
    };
  }
  if (code === "unavailable" || code === "deadline-exceeded") {
    return {
      kind: "unavailable",
      message: "NN could not reach your data. Showing nothing rather than something out of date.",
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { kind: "failed", message };
}

function constraintsFor(spec: RecordQuery): QueryConstraint[] {
  const constraints: QueryConstraint[] = [];
  for (const [field, value] of Object.entries(spec.equals ?? {})) {
    constraints.push(where(field, "==", value));
  }
  constraints.push(orderBy(spec.orderBy ?? "updatedAt", spec.direction ?? "desc"));
  // A personal environment should never try to pull an unbounded collection
  // onto a phone. Callers that want more ask for more, explicitly.
  constraints.push(fsLimit(spec.limit ?? 100));
  return constraints;
}

/**
 * Subscribes to one of the owner's collections.
 *
 * Returns state, never throws. A surface should be able to render whatever
 * comes back without a try/catch around its own JSX.
 */
export function useRecords<T extends NNRecord = NNRecord>(
  name: string,
  spec: RecordQuery = {},
): RecordState<T> {
  const { user } = useAuth();
  const uid = user?.uid;

  const [state, setState] = React.useState<RecordState<T>>({
    items: [],
    loading: true,
    empty: false,
    stale: false,
    fault: null,
  });

  // The spec is an object literal at almost every call site, so a new identity
  // arrives on every render. Comparing its contents keeps that from tearing
  // down and rebuilding the subscription sixty times a second.
  const specKey = JSON.stringify([
    spec.orderBy ?? null, spec.direction ?? null, spec.limit ?? null,
    spec.equals ?? null, spec.includeDeleted ?? false,
  ]);

  React.useEffect(() => {
    if (!firebaseAvailable()) {
      setState({
        items: [], loading: false, empty: false, stale: false,
        fault: {
          kind: "unconfigured",
          message: "This environment has no Firebase configuration, so no personal data was loaded.",
        },
      });
      return;
    }
    if (!uid) {
      setState({
        items: [], loading: false, empty: false, stale: false,
        fault: { kind: "signed-out", message: "Sign in to load your records." },
      });
      return;
    }

    const parsed = JSON.parse(specKey) as [
      string | null, "asc" | "desc" | null, number | null,
      Record<string, unknown> | null, boolean,
    ];
    const resolved: RecordQuery = {
      ...(parsed[0] !== null ? { orderBy: parsed[0] } : {}),
      ...(parsed[1] !== null ? { direction: parsed[1] } : {}),
      ...(parsed[2] !== null ? { limit: parsed[2] } : {}),
      ...(parsed[3] !== null ? { equals: parsed[3] } : {}),
      includeDeleted: parsed[4],
    };

    let db: Firestore;
    let ref;
    try {
      db = getFirebase().db;
      // The path builder, not a string. This is the whole point of the layer.
      ref = collection(db, paths.collection(uid, name));
    } catch (error) {
      setState({ items: [], loading: false, empty: false, stale: false, fault: describe(error) });
      return;
    }

    setState((previous) => ({ ...previous, loading: true, fault: null }));

    const unsubscribe = onSnapshot(
      query(ref, ...constraintsFor(resolved)),
      (snapshot) => {
        const items = snapshot.docs
          .map((document) => ({ id: document.id, ...document.data() }) as T)
          .filter((item) => resolved.includeDeleted || item["deletedAt"] == null);
        setState({
          items,
          loading: false,
          empty: items.length === 0,
          stale: snapshot.metadata.fromCache,
          fault: null,
        });
      },
      (error) => {
        setState({ items: [], loading: false, empty: false, stale: false, fault: describe(error) });
      },
    );

    return unsubscribe;
  }, [uid, name, specKey]);

  return state;
}

/* ----------------------------------------------------------------- writing */

function assertWritable(name: string): void {
  if (isServerWritten(name)) {
    // The rules refuse this too. Refusing here names the reason, which a
    // generic "permission denied" from the server never would.
    throw new Error(
      `"${name}" is written by NN's server, not by the browser. ` +
        `A client write here would be refused by the security rules.`,
    );
  }
}

function requireOwner(uid: string | undefined): string {
  if (!uid) throw new Error("No signed-in owner: NN will not write a record it cannot attribute.");
  return uid;
}

/** Everything an application needs to change its own records. */
export interface RecordWriter {
  create: (name: string, data: Readonly<Record<string, unknown>>) => Promise<string>;
  update: (name: string, id: string, data: Readonly<Record<string, unknown>>) => Promise<void>;
  /** Moves a record to the trash. Recoverable; a purge job removes it later. */
  remove: (name: string, id: string) => Promise<void>;
  /** Takes a record back out of the trash. */
  restore: (name: string, id: string) => Promise<void>;
  /** Permanently removes a record. Only ever from an explicit instruction. */
  destroy: (name: string, id: string) => Promise<void>;
  ready: boolean;
}

export function useRecordWriter(): RecordWriter {
  const { user } = useAuth();
  const uid = user?.uid;

  return React.useMemo<RecordWriter>(() => {
    const db = () => getFirebase().db;

    return {
      ready: Boolean(uid) && firebaseAvailable(),

      create: async (name, data) => {
        assertWritable(name);
        const owner = requireOwner(uid);
        const reference = await addDoc(
          collection(db(), paths.collection(owner, name)),
          { ...data, ...createMeta() } as DocumentData,
        );
        return reference.id;
      },

      update: async (name, id, data) => {
        assertWritable(name);
        const owner = requireOwner(uid);
        await updateDoc(
          doc(db(), paths.doc(owner, name, id)),
          { ...data, ...updateMeta() } as DocumentData,
        );
      },

      remove: async (name, id) => {
        assertWritable(name);
        const owner = requireOwner(uid);
        await updateDoc(doc(db(), paths.doc(owner, name, id)), softDeleteMeta() as DocumentData);
      },

      restore: async (name, id) => {
        assertWritable(name);
        const owner = requireOwner(uid);
        await setDoc(
          doc(db(), paths.doc(owner, name, id)),
          { deletedAt: null, ...updateMeta() } as DocumentData,
          { merge: true },
        );
      },

      destroy: async (name, id) => {
        assertWritable(name);
        const owner = requireOwner(uid);
        await deleteDoc(doc(db(), paths.doc(owner, name, id)));
      },
    };
  }, [uid]);
}
