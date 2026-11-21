"use client";

import type { Route } from "next";
import { AppShell } from "@/components/nn/AppShell";
import { useAppTransition } from "@/components/nn/AppTransition";
import { Icon } from "@/components/ui/Icon";
import type { NNApplication, NNFamily } from "@/lib/apps/registry";
import styles from "./NNFamilyView.module.css";

/**
 * Everything one family of NN holds.
 *
 * The dashboard shows each family as a folder, and a folder can only show a
 * few sheets before it reads as a crowd. This is where the rest are — so the
 * folder is showing a bounded preview rather than hiding anything.
 *
 * Each row says plainly whether it opens a working application or the honest
 * overview of one that is not built. Nothing here is a dead control.
 */
export function NNFamilyView({
  family,
  applications,
}: {
  family: NNFamily;
  applications: readonly NNApplication[];
}) {
  const travel = useAppTransition();
  const ready = applications.filter((app) => app.href !== undefined);

  return (
    <AppShell title={family.name} subtitle={family.detail}>
      <p className={styles.count}>
        {applications.length} applications · {ready.length} with a working surface
      </p>

      <ul className={styles.list}>
        {applications.map((app) => {
          const open = app.href !== undefined;
          return (
            <li key={app.id}>
              <button
                type="button"
                className={styles.row}
                data-ready={open || undefined}
                onClick={() =>
                  travel.open((app.href ?? app.overviewHref) as Route, app.name)
                }
                aria-label={
                  open
                    ? `Open ${app.name}`
                    : `${app.name} — open its overview; not built yet`
                }
              >
                <span className={styles.glyph}>
                  <Icon name={app.icon} size={19} />
                </span>
                <span className={styles.text}>
                  <strong>{app.name}</strong>
                  <small>{app.description}</small>
                </span>
                <span className={styles.state}>
                  <i />
                  {open ? "READY" : "IN DEVELOPMENT"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
