"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { NNLogo } from "@/components/ui/NNLogo";
import styles from "./NNIsland.module.css";

type Props = {
  title: string;
  onHome: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onRen: () => void;
};

/**
 * NN's compact system control surface. The closed state keeps the header
 * quiet; opening it reveals a real navigation panel with workspace context
 * and four high-frequency destinations.
 */
export function NNIsland({ title, onHome, onSearch, onSettings, onRen }: Props) {
  const [expanded, setExpanded] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setExpanded(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [expanded]);

  const action = (callback: () => void) => {
    setExpanded(false);
    callback();
  };

  return (
    <div ref={root} className={styles.root}>
      <button
        type="button"
        className={styles.trigger}
        aria-label="Open NN control panel"
        aria-expanded={expanded}
        aria-controls="nn-island-panel"
        onClick={() => setExpanded((value) => !value)}
      >
        <span className={styles.logo}><NNLogo size={17} decorative /></span>
        <span className={styles.label}>
          <small>NN ENVIRONMENT</small>
          <strong>{title}</strong>
        </span>
        <i className={styles.pulse} aria-hidden="true" />
        <span className={styles.chevron} aria-hidden="true">{expanded ? "⌃" : "⌄"}</span>
      </button>

      {expanded ? (
        <section id="nn-island-panel" className={styles.panel} role="region" aria-label="NN control panel">
          <header className={styles.panelHeader}>
            <span>CONTROL PANEL</span>
            <button type="button" onClick={() => setExpanded(false)} aria-label="Close control panel">
              <Icon name="close" size={14} />
            </button>
          </header>

          <div className={styles.current}>
            <span className={styles.currentMark}><NNLogo size={21} decorative /></span>
            <span className={styles.currentCopy}>
              <small>CURRENT WORKSPACE</small>
              <strong>{title}</strong>
              <em><i /> NN is ready for your next action</em>
            </span>
            <span className={styles.live}>LIVE</span>
          </div>

          <div className={styles.sectionHeading}>
            <strong>Quick access</strong>
            <span>YOUR NN</span>
          </div>
          <div className={styles.actions}>
            <button type="button" onClick={() => action(onHome)}>
              <span className={styles.actionIcon}><Icon name="grid" size={17} /></span>
              <span><strong>NN Home</strong><small>All workspaces</small></span>
              <b>↗</b>
            </button>
            <button type="button" onClick={() => action(onSearch)}>
              <span className={styles.actionIcon}><Icon name="search" size={17} /></span>
              <span><strong>Search</strong><small>Find anything</small></span>
              <b>⌘ K</b>
            </button>
            <button type="button" onClick={() => action(onSettings)}>
              <span className={styles.actionIcon}><Icon name="settings" size={17} /></span>
              <span><strong>Settings</strong><small>Personalise NN</small></span>
              <b>↗</b>
            </button>
            <button type="button" onClick={() => action(onRen)}>
              <span className={styles.actionIcon}><Icon name="sparkle" size={17} /></span>
              <span><strong>Ask REN</strong><small>Your personal assistant</small></span>
              <b>↗</b>
            </button>
          </div>

          <footer>
            <span><i /> PRIVATE PERSONAL ENVIRONMENT</span>
            <span>NN</span>
          </footer>
        </section>
      ) : null}
    </div>
  );
}
