"use client";

import type { Route } from "next";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { useAppTransition } from "@/components/nn/AppTransition";
import { FolderCard, useFolderWidth, type FolderSheet } from "@/components/ui/FolderCard";
import { NNLogo } from "@/components/ui/NNLogo";
import { useAuth } from "@/lib/auth";
import { applicationsInFamily, GROUPS } from "@/lib/apps/registry";
import styles from "./NNHome.module.css";

function HomeExperience({ firstName, onSignOut }: { firstName: string; onSignOut?: () => void }) {
  const travel = useAppTransition();
  const cardWidth = useFolderWidth();

  return (
    <main className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.identity} aria-label="NN">
          <NNLogo size={34} decorative />
          <span>NN</span>
        </div>
        {onSignOut ? (
          <button
            type="button"
            className={styles.profile}
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
          >
            {firstName.slice(0, 1).toUpperCase()}
          </button>
        ) : null}
      </header>

      <div className={styles.page}>
        <section className={styles.welcome}>
          <p className={styles.kicker}>YOUR PERSONAL SPACE</p>
          <h1>Welcome back, <span>{firstName}</span></h1>
          <p className={styles.subtitle}>Everything important. One calm place.</p>
        </section>

        {/* Each family is a folder you can open: the glass leans forward, the
            sheets rise and fan, and each sheet is the application itself.
            A folder shows a bounded stack — past four, sheets read as a crowd
            — so the key at its corner opens the whole family. Nothing is
            hidden behind the preview. */}
        <div className={styles.applicationGroups}>
          {GROUPS.map((family, index) => {
            const apps = applicationsInFamily(family.name);
            /* What the founder can actually use sits nearest the glass; the
               rest are behind it, named, and honest about their state. */
            const ordered = [...apps].sort(
              (a, b) => Number(a.href !== undefined) - Number(b.href !== undefined),
            );
            const sheets: FolderSheet[] = ordered.map((app) => ({
              name: app.name,
              meta: app.href ? "Ready" : "In development",
              icon: app.icon,
            }));

            return (
              <FolderCard
                key={family.name}
                label={family.name}
                meta={`${apps.length} applications`}
                sheets={sheets}
                width={cardWidth}
                appearDelay={index * 90}
                actionLabel={`Open all ${apps.length} in ${family.name}`}
                onAction={() =>
                  travel.open(`/family/${family.slug}` as Route, family.name)
                }
                onSheetSelect={(sheet) => {
                  const app = apps.find((entry) => entry.name === sheet.name);
                  if (!app) return;
                  // A real destination either way: the application when it
                  // exists, its honest overview when it does not.
                  travel.open((app.href ?? app.overviewHref) as Route, app.name);
                }}
              />
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
