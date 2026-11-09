"use client";

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import { NNLogo } from "@/components/ui/NNLogo";
import { LiquidButton } from "@/components/ui/LiquidButton";
import { Coverflow } from "@/components/ui/Coverflow";
import {
  ENTRIES,
  GOALS,
  KIND_ICON,
  KIND_LABEL,
  LAUNCHER,
  PERIODS,
  WORKSPACE_SAMPLE_NOTICE,
  type WorkspaceEntry,
  type WorkspaceGoal,
  type WorkspacePeriod,
} from "./workspaceContent";
import styles from "./NNWorkspace.module.css";

/**
 * The NN workspace.
 *
 * One sheet of glass holding four views, over the WebGL room. The material
 * itself is adjustable at runtime — blur, opacity, saturation, edge light and
 * tint are CSS custom properties the founder can move with a slider, because
 * the right amount of glass depends on the room's light and on the screen, and
 * that is not a judgement to hardcode.
 *
 * REN appears here as a designed surface. It is wired to nothing: the field
 * accepts text, says plainly that it is not active, and performs no action.
 */

export interface GlassSettings {
  blur: number;
  opacity: number;
  saturation: number;
  tint: string;
  edge: number;
}

const DEFAULTS: GlassSettings = {
  blur: 24,
  opacity: 0.34,
  saturation: 1.2,
  tint: "#9CC8FF",
  edge: 0.6,
};

const VIEWS = [
  { id: "today", label: "Today", icon: "calendar" },
  { id: "timeline", label: "Timeline", icon: "clock" },
  { id: "goals", label: "Goals", icon: "check" },
  { id: "insight", label: "Insight", icon: "graph" },
] as const;

type View = (typeof VIEWS)[number]["id"];

const bounded = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

const normalise = (v: Partial<GlassSettings>): GlassSettings => ({
  blur: bounded(v.blur ?? DEFAULTS.blur, 0, 40, DEFAULTS.blur),
  opacity: bounded(v.opacity ?? DEFAULTS.opacity, 0.08, 0.9, DEFAULTS.opacity),
  saturation: bounded(v.saturation ?? DEFAULTS.saturation, 0.5, 2, DEFAULTS.saturation),
  edge: bounded(v.edge ?? DEFAULTS.edge, 0, 1, DEFAULTS.edge),
  tint: /^#[0-9a-f]{6}$/i.test(v.tint ?? "") ? (v.tint as string) : DEFAULTS.tint,
});

const nonnegative = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);

/** Minutes as the founder would say them out loud. */
function formatMinutes(total: number): string {
  const m = Math.round(nonnegative(total));
  if (m < 60) return `${m}m`;
  const hours = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

function goalProgress(goal: WorkspaceGoal): number {
  return goal.target > 0 ? bounded((goal.done / goal.target) * 100, 0, 100, 0) : 0;
}

/**
 * True below NN's narrow breakpoint. Starts false so the server and the first
 * client render agree, then corrects on mount — a hydration mismatch is worse
 * than one frame at the wider layout.
 */
function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const sync = () => setNarrow(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  return narrow;
}

export interface NNWorkspaceProps {
  userName?: string;
  ownerUid?: string | undefined;
  periodLabel?: string;
  initialPeriodId?: string;
  footerNote?: string;
  entries?: readonly WorkspaceEntry[];
  goals?: readonly WorkspaceGoal[];
  periods?: readonly WorkspacePeriod[];
  glass?: Partial<GlassSettings>;
  onSignOut?: (() => void) | undefined;
  onSignOutEverywhere?: (() => void) | undefined;
}

export function NNWorkspace({
  userName = "Founder",
  ownerUid,
  periodLabel = "November 2026",
  initialPeriodId = "month",
  footerNote = WORKSPACE_SAMPLE_NOTICE,
  entries = ENTRIES,
  goals = GOALS,
  periods = PERIODS,
  glass = DEFAULTS,
  onSignOut,
  onSignOutEverywhere,
}: NNWorkspaceProps) {
  const root = useRef<HTMLDivElement>(null);
  const settingsTrigger = useRef<HTMLButtonElement>(null);
  const id = useId().replace(/:/g, "");

  const [view, setView] = useState<View>("today");
  const [material, setMaterial] = useState(() => normalise(glass));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [periodId, setPeriodId] = useState(initialPeriodId);
  const [filter, setFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [renDraft, setRenDraft] = useState("");
  const narrow = useNarrow();

  // Focus the first control in the panel when it opens; return focus to the
  // trigger when it closes. A popover that steals focus and loses it is worse
  // than one that never took it.
  useEffect(() => {
    if (settingsOpen) {
      root.current?.querySelector<HTMLButtonElement>(`.${styles.presets} button`)?.focus();
    }
  }, [settingsOpen]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedPeriod = useMemo(
    () => periods.find((p) => p.id === periodId) ?? periods[0],
    [periods, periodId],
  );
  const points = selectedPeriod?.points ?? [];

  const studied = points.reduce((sum, p) => sum + nonnegative(p.studied), 0);
  const planned = points.reduce((sum, p) => sum + nonnegative(p.planned), 0);

  const visibleEntries = entries.filter((e) =>
    `${e.name} ${KIND_LABEL[e.kind]}`.toLowerCase().includes(filter.toLowerCase()),
  );

  const chartMax = Math.max(
    1,
    ...points.flatMap((p) => [nonnegative(p.studied), nonnegative(p.planned)]),
  );
  const chartX = (index: number) =>
    points.length === 1 ? 300 : (index * 600) / (points.length - 1);
  const chartY = (value: number) => 180 - (nonnegative(value) / chartMax) * 160;
  const linePoints = (key: "studied" | "planned") =>
    points.map((p, index) => `${chartX(index)},${chartY(p[key])}`).join(" ");

  /* Evenly chosen labels, as many as the axis can hold. Six fit a desktop
     chart; at 375px the last two run into each other, so a narrow screen gets
     four. Fewer than that and the axis stops meaning anything. */
  const labelTarget = narrow ? 4 : 6;
  const labelIndices = new Set(
    Array.from({ length: Math.min(points.length, labelTarget) }, (_, index) =>
      points.length <= labelTarget
        ? index
        : Math.round((index * (points.length - 1)) / (labelTarget - 1)),
    ),
  );

  const kinds = Array.from(new Set(entries.map((e) => e.kind)));
  const totalMinutes = entries.reduce((sum, e) => sum + nonnegative(e.minutes), 0);

  function updateGlass(patch: Partial<GlassSettings>) {
    setMaterial(normalise({ ...material, ...patch }));
  }

  function closeSettings() {
    setSettingsOpen(false);
    settingsTrigger.current?.focus();
  }

  function changeView(next: View) {
    setView(next);
    setAlertsOpen(false);
  }

  /** The founder's own data, in a format nothing else owns. */
  function exportCsv() {
    // A leading =, +, @ or - makes a spreadsheet treat a cell as a formula.
    // Prefixing an apostrophe keeps an exported row as text.
    const clean = (v: string) =>
      `"${(/^[\s]*[=+@-]/.test(v) ? "'" : "") + v.replace(/"/g, '""')}"`;
    const csv = [
      "Name,Kind,When,Minutes,Status",
      ...visibleEntries.map((e) =>
        [clean(e.name), clean(KIND_LABEL[e.kind]), clean(e.when), e.minutes, clean(e.status)].join(","),
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "nn-timeline.csv";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Timeline exported.");
  }

  const nav = (compact: boolean) => (
    <nav
      className={compact ? styles.rail : styles.dock}
      aria-label={compact ? "Quick navigation" : "Workspace views"}
    >
      {VIEWS.map((tab, i) => (
        <button
          key={tab.id}
          type="button"
          {...(compact ? { "aria-label": tab.label, title: tab.label } : {})}
          {...(view === tab.id ? { "aria-current": "page" as const } : {})}
          onClick={() => changeView(tab.id)}
          onKeyDown={(event) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
            event.preventDefault();
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? VIEWS.length - 1
                  : (i + (event.key === "ArrowRight" ? 1 : VIEWS.length - 1)) % VIEWS.length;
            const target = VIEWS[next];
            if (!target) return;
            changeView(target.id);
            const sibling = event.currentTarget.parentElement?.children[next];
            if (sibling instanceof HTMLElement) sibling.focus();
          }}
        >
          <Icon name={tab.icon} size={18} />
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );

  const periodSelector = (label: string) =>
    periods.length > 1 ? (
      <div className={styles.segment} role="group" aria-label={label}>
        {periods.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={selectedPeriod?.id === item.id}
            onClick={() => setPeriodId(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
    ) : null;

  const firstPoint = points[0];

  const chart =
    points.length > 0 ? (
      <div className={styles.chartWrap}>
        <div className={styles.chartLabels}>
          <span>{formatMinutes(chartMax)}</span>
          <span>{formatMinutes(chartMax / 2)}</span>
          <span>0m</span>
        </div>
        <svg
          viewBox="0 0 600 185"
          role="img"
          aria-label={`${selectedPeriod?.label ?? "Hours"}: ${formatMinutes(studied)} spent against ${formatMinutes(planned)} planned.`}
          preserveAspectRatio="none"
        >
          {/* The series read out in full for anyone who cannot see the line. */}
          <desc>
            {points
              .map(
                (p) =>
                  `${p.label}: spent ${formatMinutes(p.studied)}, planned ${formatMinutes(p.planned)}`,
              )
              .join(". ")}
          </desc>
          <defs>
            <linearGradient id={`${id}-area`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="var(--nn-accent)" stopOpacity=".28" />
              <stop offset="1" stopColor="var(--nn-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[20, 100, 180].map((y) => (
            <path key={y} d={`M0 ${y} H600`} stroke="currentColor" opacity=".11" strokeDasharray="3 5" />
          ))}
          <path
            d={`M${chartX(0)} 185 ${points
              .map((p, index) => `L${chartX(index)} ${chartY(p.studied)}`)
              .join(" ")} L${chartX(points.length - 1)} 185 Z`}
            fill={`url(#${id}-area)`}
          />
          <polyline
            points={linePoints("studied")}
            fill="none"
            stroke="var(--nn-icy)"
            strokeWidth="2.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {/* Planned is the quieter of the two: it is the reference, not the result. */}
          <polyline
            points={linePoints("planned")}
            fill="none"
            stroke="currentColor"
            strokeOpacity=".45"
            strokeWidth="2"
            strokeDasharray="5 5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {points.length === 1 && firstPoint ? (
            <>
              <circle cx="300" cy={chartY(firstPoint.studied)} r="4" fill="var(--nn-icy)" />
              <circle cx="300" cy={chartY(firstPoint.planned)} r="4" fill="currentColor" opacity=".45" />
            </>
          ) : null}
        </svg>
        <div className={styles.chartMonths}>
          {points.map((p, index) =>
            labelIndices.has(index) ? (
              <span
                key={`${p.label}-${index}`}
                style={{
                  left: `${chartX(index) / 6}%`,
                  transform:
                    index === 0 && points.length > 1
                      ? "none"
                      : index === points.length - 1 && points.length > 1
                        ? "translateX(-100%)"
                        : "translateX(-50%)",
                }}
              >
                {p.label}
              </span>
            ) : null,
          )}
        </div>
      </div>
    ) : (
      <div className={[styles.empty, styles.chartEmpty].join(" ")}>
        <Icon name="graph" size={23} />
        <h3>No hours recorded yet</h3>
        <p>The chart appears once a period has data.</p>
      </div>
    );

  const entryList = (limit?: number) => (
    <div className={styles.entries}>
      {visibleEntries.length > 0 ? (
        visibleEntries.slice(0, limit).map((entry) => (
          <div className={styles.entry} key={entry.id}>
            <span
              className={[styles.entryIcon, entry.status === "Done" ? styles.entryDone : ""]
                .filter(Boolean)
                .join(" ")}
            >
              <Icon name={KIND_ICON[entry.kind]} size={17} />
            </span>
            <div className={styles.entryName}>
              <strong>{entry.name}</strong>
              <span>
                {KIND_LABEL[entry.kind]} · {entry.when}
              </span>
            </div>
            <span
              className={[styles.entryStatus, entry.status === "Planned" ? styles.pending : ""]
                .filter(Boolean)
                .join(" ")}
            >
              {entry.status === "Done" ? <Icon name="check" size={12} /> : null}
              {entry.status}
            </span>
            <strong className={styles.entryMinutes}>{formatMinutes(entry.minutes)}</strong>
          </div>
        ))
      ) : (
        <div className={styles.empty}>
          <Icon name="search" size={23} />
          <h3>{filter ? "Nothing matches that" : "Nothing recorded yet"}</h3>
          <p>{filter ? "Try another name or kind." : "Your days will appear here."}</p>
          {filter ? (
            <button type="button" onClick={() => setFilter("")}>
              Show everything
            </button>
          ) : null}
        </div>
      )}
    </div>
  );

  const goalList = (
    <div className={styles.goals}>
      {goals.length > 0 ? (
        goals.map((goal) => (
          <div className={styles.goal} key={goal.id}>
            <div className={styles.goalTop}>
              <span className={styles.goalIcon}>
                <Icon name="check" size={18} />
              </span>
              <strong>{goal.name}</strong>
              <span>{Math.round(goalProgress(goal))}%</span>
            </div>
            <div
              className={styles.goalTrack}
              role="progressbar"
              aria-label={goal.name}
              aria-valuenow={Math.round(goalProgress(goal))}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i style={{ width: `${goalProgress(goal)}%` }} />
            </div>
            <p>
              <strong>
                {goal.done} {goal.unit}
              </strong>
              <span>of {goal.target}</span>
            </p>
          </div>
        ))
      ) : (
        <p className={styles.empty}>No goals set yet.</p>
      )}
    </div>
  );

  /**
   * REN's surface.
   *
   * Three capabilities and only three: it listens in text, it listens in
   * voice, and it can change how NN looks. Appearance lives here rather than
   * in the workspace chrome because retheming NN is REN's job, not a system
   * setting.
   *
   * Text and voice are designed surfaces — the field accepts typing, the
   * controls are real controls, and nothing reaches a model, a microphone or
   * the network. Appearance is the one capability already wired end to end.
   */
  const ren = (
    <section
      className={[styles.panel, "nn-glass-card", styles.ren, styles.reveal].join(" ")}
      style={{ "--i": 2 } as CSSProperties}
      aria-labelledby={`${id}-ren-heading`}
    >
      <div className={styles.panelTitle}>
        <h2 id={`${id}-ren-heading`}>REN</h2>
        <span className={styles.renBadge}>Not active</span>
      </div>

      <div className={styles.renField}>
        <span className={styles.renWave} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <input
          value={renDraft}
          onChange={(event) => setRenDraft(event.target.value)}
          placeholder="Ask REN anything about your day…"
          aria-label="Ask REN"
          aria-describedby={`${id}-ren-note`}
        />
        <button
          type="button"
          className={styles.renMic}
          disabled
          aria-label="Speak to REN — voice is designed, not active"
        >
          <Icon name="mic" size={17} />
        </button>
        <LiquidButton size="sm" shape="rounded" disabled aria-label="Send to REN — not active">
          Send
        </LiquidButton>
      </div>

      <div className={styles.renCaps}>
        <span className={styles.renCap} data-state="designed">
          <Icon name="file" size={14} />
          Text
        </span>
        <span className={styles.renCap} data-state="designed">
          <Icon name="mic" size={14} />
          Voice
        </span>
        <button
          type="button"
          className={styles.renCap}
          data-state="live"
          ref={settingsTrigger}
          onClick={() => {
            setSettingsOpen(!settingsOpen);
            setAlertsOpen(false);
          }}
          aria-expanded={settingsOpen}
          aria-controls={`${id}-material`}
        >
          <Icon name="settings" size={14} />
          Appearance
        </button>
      </div>

      <p className={styles.renNote} id={`${id}-ren-note`}>
        Text and voice are surfaces only — nothing typed or spoken here leaves this
        page. Appearance is the one capability already working: it rethemes NN live.
      </p>
    </section>
  );

  return (
    <div
      ref={root}
      className={styles.root}
      style={
        {
          "--gw-blur": `${material.blur}px`,
          "--gw-opacity": material.opacity,
          "--gw-saturation": material.saturation,
          "--gw-tint": material.tint,
          "--gw-edge": material.edge,
        } as CSSProperties
      }
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          if (settingsOpen) closeSettings();
          setAlertsOpen(false);
        }
      }}
    >
      <div className={styles.workspace}>
        <header className={[styles.topbar, styles.glass, "nn-glass-card"].join(" ")}>
          <div className={styles.brand}>
            <NNLogo size={20} />
            <span className={styles.brandDivider} />
            <span className={styles.personal}>Private workspace</span>
          </div>
          <div className={styles.toolbar}>
            <button
              type="button"
              className={[styles.iconButton, styles.bell].join(" ")}
              aria-label="Notifications"
              aria-expanded={alertsOpen}
              onClick={() => {
                setAlertsOpen(!alertsOpen);
                setSettingsOpen(false);
              }}
            >
              <Icon name="sparkle" size={17} />
              <i />
            </button>
            <span className={styles.avatar} title={userName}>
              {userName.slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>

        <div className={styles.stage}>
          {nav(true)}

          <main className={[styles.main, styles.glass].join(" ")}>
            <div className={styles.viewHeading}>
              <div>
                <p className={styles.greeting}>
                  {view === "today" ? `Good evening, ${userName}.` : "Your private workspace"}
                </p>
                <h1>{VIEWS.find((v) => v.id === view)?.label ?? "Today"}</h1>
              </div>
              <div className={styles.headingAction}>
                {view === "timeline" || view === "insight" ? (
                  <LiquidButton size="sm" shape="rounded" onClick={exportCsv}>
                    <Icon name="file" size={14} />
                    Export CSV
                  </LiquidButton>
                ) : (
                  <span className={styles.date}>{periodLabel}</span>
                )}
              </div>
            </div>

            <div className={styles.mobileNav}>{nav(false)}</div>

            <div key={view} className={styles.view}>
              {view === "today" ? (
                <>
                  <div className={styles.overviewGrid}>
                    <section
                      className={[styles.panel, "nn-glass-card", styles.focus, styles.reveal].join(" ")}
                      style={{ "--i": 0 } as CSSProperties}
                    >
                      <div className={styles.panelTitle}>
                        <span>Time spent · {selectedPeriod?.label ?? "period"}</span>
                        <Icon name="clock" size={17} />
                      </div>
                      <strong className={styles.focusValue}>{formatMinutes(studied)}</strong>
                      <p className={styles.focusMeta}>
                        <span className={planned > 0 && studied >= planned ? styles.positive : undefined}>
                          {planned > 0 ? `${Math.round((studied / planned) * 100)}%` : "—"}
                        </span>{" "}
                        of {formatMinutes(planned)} planned
                      </p>
                      <div className={styles.nextUp}>
                        <span className={styles.nextIcon}>
                          <Icon name="calendar" size={19} />
                        </span>
                        <div>
                          <strong>Engineering Maths</strong>
                          <span>Tomorrow 09:00 · Block C</span>
                        </div>
                        <button
                          type="button"
                          aria-label="Open the timeline"
                          onClick={() => changeView("timeline")}
                        >
                          <Icon name="expand" size={18} />
                        </button>
                      </div>
                    </section>

                    <section
                      className={[styles.panel, "nn-glass-card", styles.reveal].join(" ")}
                      style={{ "--i": 1 } as CSSProperties}
                    >
                      <div className={styles.panelTitle}>
                        <h2>Spent against planned</h2>
                        {periodSelector("Chart period")}
                      </div>
                      <div className={styles.chartSummary}>
                        <div>
                          <span>
                            <i />
                            Spent
                          </span>
                          <strong>{formatMinutes(studied)}</strong>
                        </div>
                        <div>
                          <span>
                            <i />
                            Planned
                          </span>
                          <strong>{formatMinutes(planned)}</strong>
                        </div>
                      </div>
                      {chart}
                    </section>
                  </div>

                  {ren}

                  <section
                    className={[styles.panel, "nn-glass-card", styles.launcher, styles.reveal].join(" ")}
                    style={{ "--i": 3 } as CSSProperties}
                  >
                    <div className={styles.panelTitle}>
                      <h2>Applications</h2>
                      <span className={styles.smallLabel}>Drag, swipe or use the arrow keys</span>
                    </div>
                    <Coverflow
                      cards={LAUNCHER.map((app) => ({
                        id: app.id,
                        title: app.name,
                        subtitle: app.hint,
                        icon: app.icon,
                      }))}
                      cardWidth="clamp(136px, 17vw, 200px)"
                      showCaption
                      showPagination
                      showNavigation
                      label="NN applications"
                    />
                  </section>

                  <div className={styles.lowerGrid}>
                    <section
                      className={[styles.panel, "nn-glass-card", styles.reveal].join(" ")}
                      style={{ "--i": 4 } as CSSProperties}
                    >
                      <div className={styles.panelTitle}>
                        <h2>Recent</h2>
                        <button
                          className={styles.textButton}
                          type="button"
                          onClick={() => changeView("timeline")}
                        >
                          View all
                          <Icon name="expand" size={14} />
                        </button>
                      </div>
                      {entryList(4)}
                    </section>
                    <section
                      className={[styles.panel, "nn-glass-card", styles.reveal].join(" ")}
                      style={{ "--i": 5 } as CSSProperties}
                    >
                      <div className={styles.panelTitle}>
                        <h2>Goals</h2>
                        <span className={styles.smallLabel}>{goals.length} active</span>
                      </div>
                      {goalList}
                    </section>
                  </div>
                </>
              ) : null}

              {view === "timeline" ? (
                <section
                  className={[styles.panel, "nn-glass-card", styles.reveal].join(" ")}
                  style={{ "--i": 0 } as CSSProperties}
                >
                  <div className={styles.panelTitle}>
                    <h2>
                      Everything <span className={styles.count}>{entries.length}</span>
                    </h2>
                    <label className={styles.search}>
                      <Icon name="search" size={15} />
                      <input
                        aria-label="Search the timeline"
                        placeholder="Search by name or kind"
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                      />
                      {filter ? (
                        <button type="button" aria-label="Clear search" onClick={() => setFilter("")}>
                          <Icon name="close" size={14} />
                        </button>
                      ) : null}
                    </label>
                  </div>
                  {entryList()}
                </section>
              ) : null}

              {view === "goals" ? (
                <>
                  <div className={[styles.goalsIntro, styles.reveal].join(" ")} style={{ "--i": 0 } as CSSProperties}>
                    <span className={styles.goalsOrb}>
                      <Icon name="check" size={28} />
                    </span>
                    <div>
                      <p>Total recorded</p>
                      <strong>{formatMinutes(totalMinutes)}</strong>
                    </div>
                    <span>
                      {goals.length} goals
                      <br />
                      Tracked in one place
                    </span>
                  </div>
                  <section
                    className={[styles.panel, "nn-glass-card", styles.reveal].join(" ")}
                    style={{ "--i": 1 } as CSSProperties}
                  >
                    <div className={styles.panelTitle}>
                      <h2>Your goals</h2>
                      <span className={styles.smallLabel}>{goals.length} active</span>
                    </div>
                    {goalList}
                  </section>
                  {ren}
                </>
              ) : null}

              {view === "insight" ? (
                <>
                  <div className={[styles.stats, styles.reveal].join(" ")} style={{ "--i": 0 } as CSSProperties}>
                    {[
                      { label: "Spent", value: studied, icon: "clock" as const },
                      { label: "Planned", value: planned, icon: "calendar" as const },
                      { label: "Difference", value: Math.abs(studied - planned), icon: "graph" as const },
                    ].map((stat) => (
                      <section className={[styles.panel, "nn-glass-card"].join(" ")} key={stat.label}>
                        <div className={styles.panelTitle}>
                          <span>{stat.label}</span>
                          <Icon name={stat.icon} size={17} />
                        </div>
                        <strong>{formatMinutes(stat.value)}</strong>
                        <span className={styles.statPeriod}>
                          {selectedPeriod?.label ?? "No period data"}
                        </span>
                      </section>
                    ))}
                  </div>
                  <div className={styles.reportsGrid}>
                    <section
                      className={[styles.panel, "nn-glass-card", styles.reveal].join(" ")}
                      style={{ "--i": 1 } as CSSProperties}
                    >
                      <div className={styles.panelTitle}>
                        <h2>Spent against planned</h2>
                        {periodSelector("Report period")}
                      </div>
                      <div className={styles.chartLegend}>
                        <span>
                          <i />
                          Spent
                        </span>
                        <span>
                          <i />
                          Planned
                        </span>
                      </div>
                      {chart}
                      {selectedPeriod?.description !== undefined ? (
                        <p className={styles.chartFootnote}>{selectedPeriod.description}</p>
                      ) : null}
                    </section>
                    <section
                      className={[styles.panel, "nn-glass-card", styles.reveal].join(" ")}
                      style={{ "--i": 2 } as CSSProperties}
                    >
                      <div className={styles.panelTitle}>
                        <h2>Where it goes</h2>
                        <span className={styles.smallLabel}>All recorded activity</span>
                      </div>
                      <div className={styles.kindList}>
                        {kinds.map((kind, i) => {
                          const value = entries
                            .filter((e) => e.kind === kind)
                            .reduce((sum, e) => sum + nonnegative(e.minutes), 0);
                          return (
                            <div key={kind}>
                              <div>
                                <Icon name={KIND_ICON[kind]} size={14} />
                                <span>{KIND_LABEL[kind]}</span>
                                <strong>{formatMinutes(value)}</strong>
                              </div>
                              <span className={styles.kindTrack}>
                                <i
                                  style={{
                                    width: `${totalMinutes ? (value / totalMinutes) * 100 : 0}%`,
                                    opacity: Math.max(0.4, 1 - i * 0.14),
                                  }}
                                />
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                </>
              ) : null}
            </div>

            <footer className={styles.footer}>
              <span>
                <i />
                {footerNote}
              </span>
              {ownerUid !== undefined ? <span className={styles.uid}>owner · {ownerUid}</span> : null}
            </footer>

            <div className={styles.desktopDock}>{nav(false)}</div>
          </main>
        </div>

        {alertsOpen ? (
          <aside className={[styles.notifications, styles.glass].join(" ")} aria-label="Notifications">
            <div>
              <h2>Nothing needs you.</h2>
              <button type="button" aria-label="Close notifications" onClick={() => setAlertsOpen(false)}>
                <Icon name="close" size={17} />
              </button>
            </div>
            <p>
              NN will surface what matters here once REN is switched on. Until then this
              panel stays honest and empty.
            </p>
            {onSignOut || onSignOutEverywhere ? (
              <div className={styles.sessionActions}>
                {onSignOut ? (
                  <LiquidButton size="sm" shape="rounded" onClick={onSignOut}>
                    Sign out
                  </LiquidButton>
                ) : null}
                {onSignOutEverywhere ? (
                  <LiquidButton size="sm" shape="rounded" variant="danger" onClick={onSignOutEverywhere}>
                    All devices
                  </LiquidButton>
                ) : null}
              </div>
            ) : null}
          </aside>
        ) : null}

        {settingsOpen ? (
          <aside
            className={[styles.material, styles.glass].join(" ")}
            id={`${id}-material`}
            aria-label="Glass appearance"
          >
            <div className={styles.materialTitle}>
              <h2>Glass appearance</h2>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Close glass settings"
                onClick={closeSettings}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
            <p className={styles.materialNote}>
              The right amount of glass depends on your room&rsquo;s light and your screen. Move it
              until the text is comfortable.
            </p>
            <div className={styles.sample} aria-hidden="true">
              <Icon name="sparkle" size={26} />
              <span>Live material preview</span>
            </div>
            <div className={styles.presets} aria-label="Glass presets">
              {[
                { name: "Clear", value: { blur: 8, opacity: 0.12, saturation: 1.1, edge: 0.8 } },
                { name: "Frosted", value: DEFAULTS },
                { name: "Solid", value: { blur: 32, opacity: 0.86, saturation: 1, edge: 0.35 } },
              ].map((preset) => (
                <button key={preset.name} type="button" onClick={() => updateGlass(preset.value)}>
                  {preset.name}
                </button>
              ))}
            </div>
            {[
              { key: "blur" as const, label: "Blur", min: 0, max: 40, step: 1, shown: `${Math.round(material.blur)} px` },
              { key: "opacity" as const, label: "Opacity", min: 0.08, max: 0.9, step: 0.01, shown: `${Math.round(material.opacity * 100)}%` },
              { key: "saturation" as const, label: "Saturation", min: 0.5, max: 2, step: 0.05, shown: `${Math.round(material.saturation * 100)}%` },
              { key: "edge" as const, label: "Edge light", min: 0, max: 1, step: 0.05, shown: `${Math.round(material.edge * 100)}%` },
            ].map((control) => (
              <label className={styles.range} key={control.key}>
                <span>
                  {control.label}
                  <output>{control.shown}</output>
                </span>
                <input
                  type="range"
                  aria-label={control.label}
                  min={control.min}
                  max={control.max}
                  step={control.step}
                  value={material[control.key]}
                  onChange={(event) => updateGlass({ [control.key]: Number(event.target.value) })}
                />
              </label>
            ))}
            <label className={styles.tint}>
              Edge tint
              <input
                type="color"
                value={material.tint}
                onChange={(event) => updateGlass({ tint: event.target.value })}
              />
            </label>
            <button className={styles.reset} type="button" onClick={() => setMaterial(normalise(glass))}>
              Reset appearance
            </button>
          </aside>
        ) : null}
      </div>

      {notice ? (
        <div className={styles.toast} role="status">
          <Icon name="check" size={16} />
          {notice}
        </div>
      ) : null}
    </div>
  );
}
