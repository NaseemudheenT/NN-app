"use client";

import * as React from "react";
import type { Route } from "next";
import { useAppTransition } from "@/components/nn/AppTransition";
import { Icon } from "@/components/ui/Icon";
import { NNLogo } from "@/components/ui/NNLogo";
import styles from "./AppShell.module.css";

/**
 * The chrome every NN application sits inside.
 *
 * Every application shares the same quiet header and reading canvas.
 * Global navigation and REN live in the one environment-level chrome, not
 * in a second dock repeated on every application.
 */
export interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, actions, children }: AppShellProps) {
  const travel = useAppTransition();
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

    </div>
  );
}
