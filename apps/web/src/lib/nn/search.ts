"use client";

/**
 * Search across NN.
 *
 * Two things are searched: the applications themselves, and the founder's
 * actual records.
 *
 * Firestore has no full-text index, and NN will not ship a second search
 * service to get one. So records are searched the honest way — a bounded,
 * recent window of each collection is already live on the device, and the
 * term is matched against it here. That is genuinely useful and genuinely
 * limited, and {@link RECENT_WINDOW} is surfaced to the founder rather than
 * hidden, so "no results" is never mistaken for "nothing exists".
 */

import {
  APPLICATIONS,
  matchApplications,
  searchableCollections,
  type NNApplication,
} from "./apps";
import { useRecords, type NNRecord, type RecordFault } from "./records";

/** How much of each collection is held on the device and searched. */
export const RECENT_WINDOW = 100;

export interface RecordHit {
  collection: string;
  /** The application this record belongs to, when one claims it. */
  app: NNApplication | undefined;
  id: string;
  title: string;
  detail: string;
}

export interface SearchResult {
  applications: readonly NNApplication[];
  records: readonly RecordHit[];
  loading: boolean;
  /** Set when every collection failed the same way — worth saying once. */
  fault: RecordFault | null;
  /** How many records were searched, so the founder knows the reach. */
  searched: number;
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function titleOf(record: NNRecord): string {
  const title = textOf(record["title"]) || textOf(record["name"]);
  return title.trim() || "Untitled";
}

function detailOf(record: NNRecord): string {
  const body = textOf(record["body"]) || textOf(record["description"]) || textOf(record["note"]);
  return body.trim().slice(0, 140);
}

/** Which application claims a collection, if any. */
const OWNER_OF = new Map<string, NNApplication>();
for (const app of APPLICATIONS) {
  for (const name of app.collections ?? []) if (!OWNER_OF.has(name)) OWNER_OF.set(name, app);
}

export function useSearch(term: string): SearchResult {
  /* The collection list is module-constant, so mapping hooks over it is safe:
     its length cannot change between renders, which is the only thing the
     rules of hooks actually require. */
  const collections = searchableCollections();
  const states = collections.map((name) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useRecords(name, { limit: RECENT_WINDOW }),
  );

  const needle = term.trim().toLowerCase();

  const loading = states.some((state) => state.loading);
  const faults = states.map((state) => state.fault).filter(Boolean) as RecordFault[];
  /* Only worth reporting when nothing could be read at all. One collection
     the founder has never opened failing is not a failed search. */
  const fault = faults.length > 0 && faults.length === states.length ? faults[0]! : null;
  const searched = states.reduce((total, state) => total + state.items.length, 0);

  const records: RecordHit[] = [];
  if (needle) {
    collections.forEach((name, index) => {
      const state = states[index];
      if (!state) return;
      for (const item of state.items) {
        const title = titleOf(item);
        const detail = detailOf(item);
        if (!`${title} ${detail}`.toLowerCase().includes(needle)) continue;
        records.push({ collection: name, app: OWNER_OF.get(name), id: item.id, title, detail });
      }
    });
  }

  /* Deliberately not memoised. The work is a substring match over at most a
     few hundred records already in memory; a memo keyed on their contents
     would cost more to maintain than it saves. */
  return {
    applications: needle ? matchApplications(needle) : [],
    records,
    loading,
    fault,
    searched,
  };
}
