"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { useAppTransition } from "@/components/nn/AppTransition";
import { Icon } from "@/components/ui/Icon";
import { NNLogo } from "@/components/ui/NNLogo";
import { useAuth } from "@/lib/auth";
import { APPLICATIONS, GROUPS } from "@/lib/apps/registry";
import { ownerFirstName } from "@/lib/nn/owner";
import styles from "./NNHome.module.css";

function LauncherSurface() {
  const { user } = useAuth();
  const firstName = ownerFirstName(user?.displayName);
  const travel = useAppTransition();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return APPLICATIONS;
    return APPLICATIONS.filter((app) =>
      `${app.name} ${app.group} ${app.description}`.toLowerCase().includes(needle),
    );
  }, [query]);

  const visibleGroups = GROUPS.map((group) => ({
    ...group,
    apps: filtered.filter((app) => app.group === group.name),
  })).filter((group) => group.apps.length > 0);

  const openApp = (app: (typeof APPLICATIONS)[number]) => {
    const href = app.href ?? (app.overviewHref as Route);
    travel.open(href, app.name);
  };

  return (
    <main className={styles.root}>
      <div className={styles.atmosphere} aria-hidden="true">
        <span className={styles.waveOne} />
        <span className={styles.waveTwo} />
        <span className={styles.waveThree} />
        <span className={styles.horizon} />
      </div>

      <header className={styles.topbar}>
        <button className={styles.brand} type="button" onClick={() => router.push("/home")} aria-label="NN Home">
          <NNLogo size={27} glow decorative />
          <span>NN</span>
        </button>
        <div className={styles.systemLabel}>PERSONAL OPERATING ENVIRONMENT</div>
        <button className={styles.profile} type="button" onClick={() => router.push("/settings")} aria-label="Profile and settings">
          {(firstName || "N").slice(0, 1).toUpperCase()}
        </button>
      </header>

      <section className={styles.content} aria-label="NN application launcher">
        <div className={styles.intro}>
          <p className={styles.eyebrow}>YOUR SPACE · YOUR SYSTEM</p>
          <h1>Good to see you<span>{firstName ? `, ${firstName}.` : "."}</span></h1>
          <p className={styles.subtitle}>Everything you need. One connected environment.</p>
        </div>

        <label className={styles.search}>
          <Icon name="search" size={17} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find an application"
            aria-label="Find an application"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
              <Icon name="close" size={15} />
            </button>
          ) : <kbd>⌘ K</kbd>}
        </label>

        <div className={styles.groups}>
          {visibleGroups.map((group) => (
            <section className={styles.group} key={group.name} aria-labelledby={`group-${group.slug}`}>
              <div className={styles.groupHeading}>
                <div>
                  <h2 id={`group-${group.slug}`}>{group.name}</h2>
                  <p>{group.detail}</p>
                </div>
                <span>{String(group.apps.length).padStart(2, "0")}</span>
              </div>
              <div className={styles.appGrid}>
                {group.apps.map((app, index) => (
                  <button
                    type="button"
                    key={app.id}
                    className={styles.app}
                    onClick={() => openApp(app)}
                    data-available={app.availability === "available"}
                    style={{ "--app-order": index } as React.CSSProperties}
                    aria-label={`Open ${app.name}`}
                  >
                    <span className={styles.appMark} data-app={app.id}>
                      <Icon name={app.icon} size={25} strokeWidth={1.65} />
                      <span className={styles.markReflection} />
                    </span>
                    <span className={styles.appName}>{app.name}</span>
                    <span className={styles.appState}>
                      <i />
                      {app.availability === "available" ? "READY" : "IN DEVELOPMENT"}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
          {visibleGroups.length === 0 ? (
            <p className={styles.noResults}>No applications match “{query}”.</p>
          ) : null}
        </div>

        <footer className={styles.footer}>
          <span><i /> NN SYSTEM</span>
          <span>{APPLICATIONS.length} APPLICATIONS</span>
        </footer>
      </section>
    </main>
  );
}

function AuthenticatedHome() {
  return <RequireOwner><LauncherSurface /></RequireOwner>;
}

export function NNHomePreview() {
  return <LauncherSurface />;
}

export default function NNHome() {
  return <AuthenticatedHome />;
}
