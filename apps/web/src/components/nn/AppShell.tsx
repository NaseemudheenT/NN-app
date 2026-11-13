"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { useAppTransition } from "@/components/nn/AppTransition";
import { Dock } from "@/components/ui/Dock";
import { Icon } from "@/components/ui/Icon";
import { NNLogo } from "@/components/ui/NNLogo";
import { openableApplications } from "@/lib/apps/registry";
import styles from "./AppShell.module.css";

/**
 * The chrome every NN application sits inside.
 *
 * An operating environment's applications should not each invent their own
 * header, their own way back, and their own dock. They share this, so moving
 * between them feels like moving around one place rather than between
 * several websites.
 *
 * The dock is built from the registry and lists only applications that have a
 * real surface — NN never offers to open a screen that does not exist.
 */

export interface AppShellProps {
  /** Shown after "NN /" in the bar. The application's own name. */
  title: string;
  /** One line under the title, when there is something true to say. */
  subtitle?: string;
  /** Pushed to the right of the bar — an application's own controls. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  const travel = useAppTransition();
  const pathname = usePathname();
  const openable = openableApplications();

  const dockItems = React.useMemo(
    () => [
      { id: "/home" as Route, label: "NN Home", icon: "grid" as const },
      ...openable.map((app) => ({ id: app.href!, label: app.name, icon: app.icon })),
    ],
    [openable],
  );

  const activeId = dockItems.find((item) => item.id === pathname)?.id ?? "/home";

  return (
    <div className={styles.root}>
      <header className={styles.bar}>
        <button
          type="button"
          className={styles.brand}
          onClick={() => travel.open("/home" as Route, "NN Home")}
          aria-label="Open NN Home"
        >
          <NNLogo size={24} decorative />
          <span>
            NN <i>/</i> <strong>{title.toUpperCase()}</strong>
          </span>
        </button>

        <div className={styles.barRight}>
          {actions}
          <button
            type="button"
            className={styles.search}
            onClick={() => travel.open("/search" as Route, "Search")}
            aria-label="Search NN"
          >
            <Icon name="search" size={16} />
            <span>Search</span>
          </button>
        </div>
      </header>

      {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}

      <div className={styles.body}>{children}</div>

      {/* The Dock already wears the holographic chamfer. Repeating `nn-holo`
          on this wrapper also brought `position: relative` from the global
          utility, which beat the module's `position: fixed` on source order —
          so the dock was never fixed, never clipped, and thirty-four
          applications pushed the page sideways. */}
      <div className={styles.dock}>
        <Dock
          items={dockItems}
          activeId={activeId}
          onSelect={(id) => {
            const item = dockItems.find((entry) => entry.id === id);
            if (item) travel.open(item.id, item.label);
          }}
        />
      </div>
    </div>
  );
}
