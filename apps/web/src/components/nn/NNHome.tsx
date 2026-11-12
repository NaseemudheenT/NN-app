"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { Icon } from "@/components/ui/Icon";
import { NNLogo } from "@/components/ui/NNLogo";
import { useAuth } from "@/lib/auth";
import { APPLICATIONS, GROUPS } from "@/lib/apps/registry";
import styles from "./NNHome.module.css";

function HomeExperience({ firstName, onSignOut }: { firstName: string; onSignOut?: () => void }) {
  const router = useRouter();

  const openApplication = (app: (typeof APPLICATIONS)[number]) => {
    const destination = app.availability === "available" && app.href ? app.href : app.overviewHref;
    router.push(destination as Route);
  };

  return (
    <main className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.identity} aria-label="NN">
          <NNLogo size={30} decorative />
          <span>NN</span>
        </div>
        {onSignOut ? (
          <button
            type="button"
            className={styles.profile}
            onClick={onSignOut}
            aria-label={`Sign out of NN, signed in as ${firstName}`}
            title="Sign out"
          >
            {firstName.slice(0, 1).toUpperCase()}
          </button>
        ) : null}
      </header>

      <div className={styles.page}>
        <div className={styles.applicationGroups}>
          {GROUPS.map((group, groupIndex) => {
            const apps = APPLICATIONS.filter((app) => app.group === group.name);
            return (
              <section className={styles.group} key={group.name} aria-labelledby={`group-${groupIndex}`}>
                <div className={styles.groupHeading}>
                  <h1 id={`group-${groupIndex}`}>{group.name}</h1>
                </div>

                <div className={styles.appGrid}>
                  {apps.map((app) => {
                    const isAvailable = app.availability === "available" && Boolean(app.href);
                    const availabilityLabel = isAvailable ? "Available" : "In development";
                    return (
                      <button
                        type="button"
                        key={app.id}
                        className={styles.appCard}
                        data-app-id={app.id}
                        data-availability={isAvailable ? "available" : "planned"}
                        onClick={() => openApplication(app)}
                        aria-label={`${app.name}. ${isAvailable ? "Open application" : "Open application workspace; currently in development"}`}
                        title={`${app.name} · ${availabilityLabel}`}
                      >
                        <span className={styles.iconWell} aria-hidden="true">
                          <Icon name={app.icon} size={22} />
                        </span>
                        <span className={styles.appName}>{app.name}</span>
                        <span className={styles.appState}>
                          <i aria-hidden="true" />
                          {isAvailable ? "READY" : "IN DEVELOPMENT"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function HomeSurface() {
  const { user, signOutHere } = useAuth();
  const firstName = user?.displayName?.trim().split(/\s+/)[0] || "Founder";

  return (
    <RequireOwner>
      <HomeExperience firstName={firstName} onSignOut={() => void signOutHere()} />
    </RequireOwner>
  );
}

/** A visual-only surface for the design route; production Home remains owner-gated. */
export function NNHomePreview() {
  return <HomeExperience firstName="Founder" />;
}

export default function NNHome() {
  return <HomeSurface />;
}
