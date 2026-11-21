"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { useAppTransition } from "@/components/nn/AppTransition";
import { LiquidNav } from "@/components/ui/LiquidNav";
import { Icon } from "@/components/ui/Icon";
import { NNLogo } from "@/components/ui/NNLogo";
import { openableApplications } from "@/lib/apps/registry";
import styles from "./AppShell.module.css";

/**
 * The chrome every NN application sits inside.
 *
 * One navigation material is shared across the environment: the same
 * waterline physics used by the dashboard now carries the application dock.
 * Routes still change immediately; the liquid movement is only the visual
 * response, never a delay in navigation.
 */
export interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  const travel = useAppTransition();
  const pathname = usePathname();
  const openable = openableApplications();

  const dockItems = React.useMemo(
    () => [
      { id: "/home", label: "NN Home", icon: "grid" as const },
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
          <NNLogo size={24} glow decorative />
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

      <div className={styles.dock}>
        <LiquidNav
          items={dockItems}
          activeId={activeId}
          aria-label="NN application dock"
          onSelect={(item) => travel.open(item.id as Route, item.label)}
        />
      </div>
    </div>
  );
}
