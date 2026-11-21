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
  getDocs,
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

/* --------------------------------------------------- NN's own data path -- */

/**
 * Whether the browser can talk to Firestore at all.
 *
 * Firestore's rules key on a Firebase session, and this project has no
 * Firebase Authentication to issue one — so a direct client read returns
 * *permission denied* no matter how correctly the founder signed in. When
 * there is no Firebase user, NN reads and writes through its own
 * owner-scoped routes instead, which take the uid from the session cookie.
 *
 * Not a fallback for *errors*: a fallback that triggers on failure would
 * mask a genuine rules problem. This asks a different question — is there a
 * Firebase identity at all — and answers it before anything is attempted.
 */
function useServerPath(): boolean {
  const { user, phase } = useAuth();
  // Signed in as far as NN is concerned, but with no Firebase identity to
  // satisfy the rules with. Being *signed out* is not this case: then the
  // honest answer is "sign in", and the ordinary path already gives it.
  return phase === "signed-in" && user === null;
}

async function serverList(
  name: string, spec: RecordQuery,
): Promise<{ items: NNRecord[]; fault: RecordFault | null }> {
  const query = new URLSearchParams();
  if (spec.limit !== undefined) query.set("limit", String(spec.limit));
  if (spec.includeDeleted === true) query.set("includeDeleted", "true");
  try {
    const response = await fetch(
      `/api/nn/records/${encodeURIComponent(name)}?${query.toString()}`,
      { cache: "no-store" },
    );
    if (response.status === 401) {
      return { items: [], fault: { kind: "signed-out", message: "Sign in to load your records." } };
    }
    if (!response.ok) {
      return { items: [], fault: { kind: "failed", message: "NN could not read those records." } };
    }
    const body = (await response.json()) as { items?: NNRecord[] };
    return { items: body.items ?? [], fault: null };
  } catch {
    return {
      items: [],
      fault: { kind: "unavailable", message: "NN could not reach your records just now." },
    };
  }
}

export function useRecords<T extends NNRecord = NNRecord>(
  name: string,
  spec: RecordQuery = {},
): RecordState<T> {
  const { user } = useAuth();
  const uid = user?.uid;
  const viaServer = useServerPath();

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
    if (viaServer) {
      /*
       * NN's own route. Polled rather than subscribed: a server route cannot
       * push, and for one founder's own records a short interval is honest
       * and simple. A write refreshes immediately through `nn:records`
       * below, so the interval only has to catch a change made elsewhere.
       */
      let alive = true;
      const parsed = JSON.parse(specKey) as [
        string | null, "asc" | "desc" | null, number | null,
        Record<string, unknown> | null, boolean,
      ];
      const load = async () => {
        const { items, fault } = await serverList(name, {
          ...(parsed[2] !== null ? { limit: parsed[2] } : {}),
          includeDeleted: parsed[4],
        });
        if (!alive) return;
        setState({
          items: items as unknown as readonly T[],
          loading: false,
          empty: fault === null && items.length === 0,
          stale: false,
          fault,
        });
      };
      void load();
      const again = () => { void load(); };
      window.addEventListener("nn:records", again);
      const timer = window.setInterval(again, 20_000);
      return () => {
        alive = false;
        window.removeEventListener("nn:records", again);
        window.clearInterval(timer);
      };
    }

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
  }, [uid, name, specKey, viaServer]);

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
  const viaServer = useServerPath();

  return React.useMemo<RecordWriter>(() => {
    if (viaServer) {
      /*
       * NN's own routes, for the same reason the reader uses them: Firestore
       * refuses a browser that has no Firebase session, and this project
       * cannot issue one. The uid is never sent — the route takes it from
       * the session cookie, so a browser cannot write into somebody else's
       * records by asking nicely.
       */
      const changed = () => window.dispatchEvent(new Event("nn:records"));
      const send = async (path: string, init: RequestInit): Promise<Response> => {
        const response = await fetch(`/api/nn/records/${path}`, init);
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? "NN could not save that.");
        }
        changed();
        return response;
      };
      const json = { "content-type": "application/json" };
      return {
        ready: true,
        create: async (name, data) => {
          assertWritable(name);
          const response = await send(encodeURIComponent(name), {
            method: "POST", headers: json, body: JSON.stringify(data),
          });
          return ((await response.json()) as { id: string }).id;
        },
        update: async (name, id, data) => {
          assertWritable(name);
          await send(`${encodeURIComponent(name)}/${encodeURIComponent(id)}`, {
            method: "PATCH", headers: json, body: JSON.stringify(data),
          });
        },
        remove: async (name, id) => {
          assertWritable(name);
          await send(`${encodeURIComponent(name)}/${encodeURIComponent(id)}`, { method: "DELETE" });
        },
        restore: async (name, id) => {
          assertWritable(name);
          await send(`${encodeURIComponent(name)}/${encodeURIComponent(id)}`, {
            method: "PATCH", headers: json, body: JSON.stringify({ deletedAt: null }),
          });
        },
        destroy: async (name, id) => {
          // Deliberately the same soft delete. NN holds one copy of the
          // founder's life, and a hard delete reachable from a browser is a
          // feature nobody asks for twice.
          assertWritable(name);
          await send(`${encodeURIComponent(name)}/${encodeURIComponent(id)}`, { method: "DELETE" });
        },
      };
    }

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
  }, [uid, viaServer]);
}

/* ------------------------------------------------------- reading once -- */

/**
 * One read, now, without a subscription.
 *
 * `useRecords` is a hook and a live subscription, which is right for a
 * surface and useless to REN: REN needs to look something up in the middle
 * of carrying out an instruction, from inside a callback, once. Calling a
 * hook there is not possible, and holding a subscription open for a single
 * question would leak one listener per request.
 *
 * Faults are returned rather than thrown, for the same reason they are in
 * `useRecords`: REN has to say what went wrong in a sentence, and an
 * exception thrown mid-answer looks to the founder like REN stopped talking.
 */
export async function readRecordsOnce<T extends NNRecord = NNRecord>(
  uid: string | undefined,
  name: string,
  spec: RecordQuery = {},
): Promise<{ items: readonly T[]; fault: RecordFault | null }> {
  if (!firebaseAvailable()) {
    return {
      items: [],
      fault: {
        kind: "unconfigured",
        message: "This environment has no Firebase configuration, so nothing was loaded.",
      },
    };
  }
  if (!uid) {
    return { items: [], fault: { kind: "signed-out", message: "Sign in to read your records." } };
  }
  try {
    const ref = collection(getFirebase().db, paths.collection(uid, name));
    const snapshot = await getDocs(query(ref, ...constraintsFor(spec)));
    const items = snapshot.docs
      .map((document) => ({ id: document.id, ...document.data() }) as T)
      .filter((item) => spec.includeDeleted === true || item["deletedAt"] == null);
    return { items, fault: null };
  } catch (error) {
    return { items: [], fault: describe(error) };
  }
}

/**
 * Which record the founder meant.
 *
 * REN is told "mark the bank task as done", not a document id, so something
 * has to turn a phrase into one record. The rules are deliberately strict
 * about ambiguity: an exact title wins, then a title that contains the whole
 * phrase, and **a tie is not resolved**. Guessing between two records when
 * the next step is a delete is how an assistant destroys something the
 * founder cared about, and "which one?" costs a sentence.
 */
export type RecordMatch<T extends NNRecord = NNRecord> =
  | { kind: "one"; record: T }
  | { kind: "none" }
  | { kind: "many"; titles: readonly string[] };

export function matchRecordByTitle<T extends NNRecord = NNRecord>(
  items: readonly T[],
  phrase: string,
): RecordMatch<T> {
  const wanted = phrase.trim().toLowerCase();
  if (wanted.length === 0) return { kind: "none" };

  const titleOf = (item: T): string =>
    String(item["title"] ?? item["name"] ?? item["text"] ?? "").trim();

  const scored = items
    .map((item) => {
      const title = titleOf(item).toLowerCase();
      if (title.length === 0) return { item, score: 0 };
      if (title === wanted) return { item, score: 3 };
      if (title.includes(wanted)) return { item, score: 2 };
      // Every word of the phrase appears somewhere in the title.
      const words = wanted.split(/\s+/).filter(Boolean);
      if (words.length > 1 && words.every((word) => title.includes(word))) {
        return { item, score: 1 };
      }
      return { item, score: 0 };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) return { kind: "none" };

  const best = scored[0]!.score;
  const leaders = scored.filter((entry) => entry.score === best);
  if (leaders.length > 1) {
    return { kind: "many", titles: leaders.slice(0, 5).map((entry) => titleOf(entry.item)) };
  }
  return { kind: "one", record: leaders[0]!.item };
}
