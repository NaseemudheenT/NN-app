"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { Icon } from "@/components/ui/Icon";
import { NNLogo } from "@/components/ui/NNLogo";
import { useAppTransition } from "@/components/nn/AppTransition";
import { APPLICATIONS, GROUPS, matchApplications } from "@/lib/apps/registry";
import styles from "./NNAppLauncher.module.css";

/**
 * The front door to NN.
 *
 * Keep Home deliberately quiet: discover and open applications here; do the
 * work inside them. The registry is the single source of truth, and the
 * experience label distinguishes dedicated products from shared record
 * workspaces so a route never implies more functionality than it has.
 */
export function NNAppLauncher() {
  const router = useRouter();
  const travel = useAppTransition();
  const [query, setQuery] = useState("");

  const matching = useMemo(() => matchApplications(query), [query]);
  const visibleGroups = useMemo(
    () => GROUPS.map((group) => ({
      ...group,
      apps: matching.filter((app) => app.group === group.name),
    })).filter((group) => group.apps.length > 0),
    [matching],
  );

  return (
    <main className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <NNLogo size={25} glow decorative />
          <span>NN</span>
        </div>
        <button
          type="button"
          className={styles.profile}
          aria-label="Profile and settings"
          title="Profile and settings"
          onClick={() => router.push("/settings" as Route)}
        >
          {firstName.slice(0, 1).toUpperCase()}
        </button>
      </header>

      <div className={styles.content}>
        <section className={styles.welcome} aria-labelledby="launcher-title">
          <h1 id="launcher-title">Home</h1>
        </section>

        <label className={styles.search}>
          <Icon name="search" size={18} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search apps"
            aria-label="Search applications"
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <Icon name="close" size={16} />
            </button>
          ) : null}
        </label>

        <div className={styles.groups} aria-live="polite">
          {visibleGroups.map((group, groupIndex) => (
            <section className={styles.group} key={group.slug} aria-labelledby={`group-${group.slug}`}>
              <header className={styles.groupHeader}>
                <div>
                  <h2 id={`group-${group.slug}`}>{group.name}</h2>
                  
                </div>
                
              </header>

              <div className={styles.grid}>
                {group.apps.map((app, index) => (
                  <button
                    type="button"
                    className={styles.app}
                    key={app.id}
                    onClick={() => travel.open((app.href ?? app.overviewHref) as Route, app.name)}
                    style={{ animationDelay: `${Math.min(groupIndex * 45 + index * 28, 420)}ms` }}
                    aria-label={`Open ${app.name}`}
                  >
                    <span className={styles.iconWell}>
                      <Icon name={app.icon} size={22} />
                    </span>
                    <span className={styles.appName}>{app.name}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}

          {matching.length === 0 ? (
            <div className={styles.empty} role="status">
              <span><Icon name="search" size={22} /></span>
              <strong>No applications found</strong>
              <p>Try another name, category or keyword.</p>
              <button type="button" onClick={() => setQuery("")}>Clear search</button>
            </div>
          ) : null}
        </div>

      </div>
    </main>
  );
}
