"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { NNLogo } from "@/components/ui/NNLogo";
import { REN_STATUS } from "@/lib/ren/state";
import { useRen } from "@/components/ren/RenProvider";
import styles from "./NNNexus.module.css";

const SYSTEM_LINKS = [
  { href: "/", label: "Home", icon: "calendar" as const },
  { href: "/workspace", label: "Workspace", icon: "grid" as const },
  { href: "/design", label: "Design", icon: "sparkle" as const },
];

const QUICK_LINKS = [
  { href: "/workspace", label: "Workspace", detail: "Your personal environment", icon: "grid" as const, tone: "blue" },
  { href: "/design", label: "Design system", detail: "NN interface library", icon: "sparkle" as const, tone: "violet" },
];

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

/**
 * NN NEXUS — the always-available adaptive activity surface.
 *
 * The compact island reflects the real REN state. Its focus timer is a real
 * local timer controlled by the founder; quick links point only to existing
 * routes. It deliberately does not fabricate battery, network, download or
 * native Dynamic Island data that a browser cannot reliably observe.
 */
export function NNNexus() {
  const { machine, open: renOpen, summon } = useRen();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const deadlineRef = useRef<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [railExpanded, setRailExpanded] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!running) return;
    const sync = () => {
      const deadline = deadlineRef.current;
      if (deadline === null) return;
      const next = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining((current) => (current === next ? current : next));
    };
    sync();
    const id = window.setInterval(sync, 200);
    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setExpanded(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
        setRailExpanded(false);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setExpanded((value) => !value);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  useEffect(() => {
    if (remaining === 0) {
      deadlineRef.current = null;
      setRunning(false);
    }
  }, [remaining]);

  const dateLabel = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  const renState = REN_STATUS[machine.state];
  const isRenActive = machine.state !== "idle";
  const timerDone = remaining === 0;
  const routeLabel = pathname === "/workspace" ? "WORKSPACE" : pathname === "/design" ? "DESIGN" : pathname === "/" ? "HOME" : "NN";

  function startRen() {
    setExpanded(false);
    summon("touch");
  }

  function toggleTimer() {
    if (timerDone) {
      const next = 25 * 60;
      setRemaining(next);
      deadlineRef.current = Date.now() + next * 1000;
      setRunning(true);
      return;
    }
    if (running) {
      const next = Math.max(0, Math.ceil(((deadlineRef.current ?? Date.now()) - Date.now()) / 1000));
      setRemaining(next);
      deadlineRef.current = null;
      setRunning(false);
      return;
    }
    deadlineRef.current = Date.now() + remaining * 1000;
    setRunning(true);
  }

  function resetTimer() {
    deadlineRef.current = null;
    setRunning(false);
    setRemaining(25 * 60);
  }

  return (
    <div className={styles.root} ref={rootRef} data-ren-open={renOpen}>
      <aside className={styles.sideRail} aria-label="NN system navigation">
        <button
          type="button"
          className={styles.railToggle}
          aria-expanded={railExpanded}
          aria-label={railExpanded ? "Collapse system navigation" : "Expand system navigation"}
          onClick={() => setRailExpanded((value) => !value)}
        >
          <NNLogo size={18} decorative />
          <span className={styles.railPulse} />
        </button>
        <nav className={styles.railLinks} data-open={railExpanded} aria-label="NN spaces">
          {SYSTEM_LINKS.map((item) => (
            <Link
              href={item.href}
              key={item.href}
              className={styles.railLink}
              data-active={pathname === item.href}
              title={item.label}
              aria-label={item.label}
              onClick={() => setRailExpanded(false)}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
            </Link>
          ))}
          <button type="button" className={styles.railAssistant} onClick={startRen} aria-label="Open REN assistant" title="REN">
            <Icon name="sparkle" size={17} />
            <span>REN</span>
          </button>
        </nav>
      </aside>
      <div className={styles.islandWrap}>
        <button
          type="button"
          className={styles.island}
          data-expanded={expanded}
          data-ren-active={isRenActive}
          aria-expanded={expanded}
          aria-controls="nn-nexus-panel"
          aria-label={expanded ? "Collapse NN NEXUS" : "Expand NN NEXUS"}
          aria-keyshortcuts="Control+K Meta+K"
          onClick={() => setExpanded((value) => !value)}
        >
          <span className={styles.brand}>
            <NNLogo size={17} decorative />
          </span>
          <span className={styles.islandDivider} />
          {isRenActive ? (
            <>
              <span className={styles.liveDot} />
              <span className={styles.islandLabel}>REN</span>
              <span className={styles.stateLabel}>{renState}</span>
            </>
          ) : running ? (
            <>
              <span className={styles.liveDot} />
              <span className={styles.islandLabel}>FOCUS</span>
              <span className={styles.timerLabel}>{formatTime(remaining)}</span>
            </>
          ) : (
            <>
              <span className={styles.islandLabel}>NEXUS</span>
              <span className={styles.islandHint}>{routeLabel}</span>
            </>
          )}
          <span className={styles.expandGlyph}>
            <Icon name={expanded ? "close" : "plus"} size={14} />
          </span>
        </button>
      </div>

      {expanded ? (
        <section
          id="nn-nexus-panel"
          className={styles.panel}
          aria-label="NN NEXUS control panel"
          onClick={(event) => event.stopPropagation()}
        >
          <header className={styles.panelHeader}>
            <div className={styles.panelBrand}>
              <span className={styles.brandMark}><NNLogo size={19} decorative /></span>
              <div>
                <p className={styles.eyebrow}>PERSONAL OPERATING ENVIRONMENT</p>
                <h2>NN NEXUS</h2>
              </div>
            </div>
            <button className={styles.closeButton} type="button" onClick={() => setExpanded(false)} aria-label="Close NEXUS">
              <Icon name="close" size={17} />
            </button>
          </header>

          <div className={styles.dateCard}>
            <div>
              <p className={styles.eyebrow}>YOUR SPACE</p>
              <p className={styles.date}>{dateLabel}</p>
            </div>
            <p className={styles.clock}>{now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</p>
          </div>

          <button className={styles.renCard} type="button" onClick={startRen}>
            <span className={styles.renOrb}><Icon name="sparkle" size={21} /></span>
            <span className={styles.renCopy}>
              <strong>REN Intelligence</strong>
              <span>{isRenActive ? renState : "Open your personal assistant"}</span>
            </span>
            <Icon name="expand" size={17} />
          </button>

          <div className={styles.sectionHeading}>
            <span>FOCUS SESSION</span>
            <span>{running ? "IN PROGRESS" : timerDone ? "COMPLETE" : "25 MINUTES"}</span>
          </div>
          <div className={styles.timerCard}>
            <div className={styles.timerFace} data-running={running}>
              <span>{formatTime(remaining)}</span>
              <small>{timerDone ? "Session complete" : running ? "Stay in flow" : "Ready when you are"}</small>
            </div>
            <div className={styles.timerActions}>
              <button type="button" className={styles.primaryAction} onClick={toggleTimer}>
                <Icon name={running ? "minus" : "plus"} size={15} />
                {running ? "Pause" : timerDone ? "Restart" : "Start"}
              </button>
              <button type="button" className={styles.secondaryAction} onClick={resetTimer} aria-label="Reset focus timer">
                <Icon name="clock" size={16} />
              </button>
            </div>
          </div>

          <div className={styles.sectionHeading}>
            <span>QUICK ACCESS</span>
            <span>NN APPS</span>
          </div>
          <div className={styles.quickGrid}>
            {QUICK_LINKS.map((item) => (
              <Link className={styles.quickCard} href={item.href} key={item.href} onClick={() => setExpanded(false)} data-tone={item.tone}>
                <span className={styles.quickIcon}><Icon name={item.icon} size={19} /></span>
                <span className={styles.quickText}>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
                <Icon name="expand" size={14} />
              </Link>
            ))}
          </div>
          <footer className={styles.panelFooter}>
            <span><i /> NN SYSTEM</span>
            <span>Private by design</span>
          </footer>
        </section>
      ) : null}
    </div>
  );
}
