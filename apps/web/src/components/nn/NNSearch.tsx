"use client";

import * as React from "react";
import type { Route } from "next";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { useAppTransition } from "@/components/nn/AppTransition";
import { AppShell } from "@/components/nn/AppShell";
import { Icon } from "@/components/ui/Icon";
import { APPLICATION_COUNT } from "@/lib/nn/apps";
import { RECENT_WINDOW, useSearch } from "@/lib/nn/search";
import styles from "./NNSearch.module.css";

/**
 * Search across NN.
 *
 * Finds applications and the founder's own records in one place. What it
 * cannot do is stated on the screen rather than discovered: Firestore has no
 * full-text index, so this reaches the most recent {@link RECENT_WINDOW}
 * records of each collection — which is a real limit, and a founder who knows
 * it will not mistake "no results" for "it isn't there".
 */

const COLLECTION_LABELS: Readonly<Record<string, string>> = {
  tasks: "Task",
  notes: "Note",
  goals: "Goal",
  reminders: "Reminder",
  calendar_events: "Event",
};

function SearchSurface() {
  const [term, setTerm] = React.useState("");
  const travel = useAppTransition();
  const result = useSearch(term);
  const typing = term.trim().length > 0;

  const nothingFound =
    typing && !result.loading && result.applications.length === 0 && result.records.length === 0;

  return (
    <AppShell
      title="Search"
      subtitle={`Your applications and your records, in one place. Records are matched across the ${RECENT_WINDOW} most recent entries in each collection.`}
    >
      <label className={styles.field}>
        <Icon name="search" size={19} />
        <input
          autoFocus
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Search NN"
          aria-label="Search NN"
          enterKeyHint="search"
        />
        {term ? (
          <button type="button" onClick={() => setTerm("")} aria-label="Clear search">
            <Icon name="close" size={16} />
          </button>
        ) : null}
      </label>

      <p className={styles.reach} role="status">
        {result.loading
          ? "Reading your records…"
          : result.fault
            ? result.fault.message
            : `${APPLICATION_COUNT} applications · ${result.searched} records searched`}
      </p>

      {!typing ? (
        <p className={styles.resting}>Type to search.</p>
      ) : null}

      {typing && result.applications.length > 0 ? (
        <section className={styles.group}>
          <h2>
            Applications <span>{result.applications.length}</span>
          </h2>
          <div className={styles.list}>
            {result.applications.map((app) => (
              <article className={styles.row} key={app.slug}>
                <span className={styles.glyph}>
                  <Icon name={app.icon} size={17} />
                </span>
                <span className={styles.text}>
                  <strong>{app.name}</strong>
                  <small>{app.description}</small>
                </span>
                {app.route ? (
                  <button
                    type="button"
                    className={styles.open}
                    onClick={() => travel.open(app.route as Route, app.name)}
                  >
                    Open
                  </button>
                ) : (
                  /* Honest rather than hopeful: there is no surface to open. */
                  <span className={styles.pending}>Not built</span>
                )}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {typing && result.records.length > 0 ? (
        <section className={styles.group}>
          <h2>
            Your records <span>{result.records.length}</span>
          </h2>
          <div className={styles.list}>
            {result.records.map((hit) => (
              <article className={styles.row} key={`${hit.collection}/${hit.id}`}>
                <span className={styles.glyph}>
                  <Icon name={hit.app?.icon ?? "file"} size={17} />
                </span>
                <span className={styles.text}>
                  <strong>{hit.title}</strong>
                  <small>{hit.detail || "No further detail"}</small>
                </span>
                <span className={styles.kind}>
                  {COLLECTION_LABELS[hit.collection] ?? hit.collection}
                </span>
                {hit.app?.route ? (
                  <button
                    type="button"
                    className={styles.open}
                    onClick={() => travel.open(hit.app!.route as Route, hit.app!.name)}
                  >
                    Open in {hit.app.name}
                  </button>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {nothingFound ? (
        <div className={styles.empty}>
          <Icon name="search" size={22} />
          <strong>Nothing matched “{term.trim()}”.</strong>
          <p>
            NN searched {result.searched} of your records — the {RECENT_WINDOW} most recent in each
            collection — and all {APPLICATION_COUNT} applications.
          </p>
        </div>
      ) : null}
    </AppShell>
  );
}

export default function NNSearch() {
  return (
    <RequireOwner>
      <SearchSurface />
    </RequireOwner>
  );
}
