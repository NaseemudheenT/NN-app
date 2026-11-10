"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { Icon } from "@/components/ui/Icon";
import { NNLogo } from "@/components/ui/NNLogo";
import { useAuth } from "@/lib/auth";
import { APPLICATIONS, GROUPS } from "@/lib/apps/registry";
import { useRen } from "@/components/ren/RenProvider";
import styles from "./NNHome.module.css";

function HomeExperience({ firstName, onSignOut }: { firstName: string; onSignOut?: () => void }) {
  const router = useRouter();
  const { summon } = useRen();

  const openApplication = (app: (typeof APPLICATIONS)[number]) => {
    const destination = app.availability === "available" && app.href ? app.href : app.overviewHref;
    router.push(destination as Route);
  };

  return (
    <main className={styles.root}>
      <header className={styles.topbar}>
        <div className={styles.identity} aria-label="NN">
          <NNLogo size={34} decorative />
          <span>NN</span>
        </div>
        {onSignOut ? (
          <button className={styles.profile} onClick={onSignOut} aria-label="Sign out" title="Sign out">
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

        <div className={styles.applicationGroups}>
          {GROUPS.map((group, groupIndex) => {
            const apps = APPLICATIONS.filter((app) => app.group === group.name);
            return (
              <section className={styles.group} key={group.name} aria-labelledby={`group-${groupIndex}`}>
                <div className={styles.groupHeading}>
                  <h2 id={`group-${groupIndex}`}>{group.name}</h2>
                  <span>{apps.length.toString().padStart(2, "0")}</span>
                </div>
                <div className={styles.appGrid}>
                  {apps.map((app, index) => (
                    <button
                      type="button"
                      key={app.id}
                      className={styles.appCard}
                      onClick={() => openApplication(app)}
                      aria-label={`${app.name}. Open application`}
                      style={{ animationDelay: `${Math.min(index * 35, 210)}ms` }}
                    >
                      <span className={styles.iconWell}>
                        <Icon name={app.icon} size={24} />
                      </span>
                      <span className={styles.appName}>{app.name}</span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className={styles.renButton}
        onClick={() => summon("touch")}
        aria-label="Open REN assistant"
      >
        <span className={styles.renAura} />
        <Icon name="sparkle" size={23} />
        <span>REN</span>
      </button>
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

export function NNHomePreview() {
  return <HomeExperience firstName="Founder" />;
}

export default function NNHome() {
  return <HomeSurface />;
}
