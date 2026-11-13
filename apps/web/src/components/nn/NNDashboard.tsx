"use client";

import {
  useCallback, useEffect, useMemo, useRef, useState,
  type CSSProperties, type ReactNode,
} from "react";
import type { Route } from "next";
import { Icon, type IconName } from "@/components/ui/Icon";
import { NNLogo } from "@/components/ui/NNLogo";
import { LiquidNav, type LiquidNavItem } from "@/components/ui/LiquidNav";
import { CurvedCarousel, type CarouselSlide } from "@/components/ui/CurvedCarousel";
import { WaveCard, WaveChip } from "@/components/ui/WaveCard";
import { useAppTransition } from "@/components/nn/AppTransition";
import {
  DEFAULT_GLASS, GLASS_PRESETS, glassVariables, normaliseGlass,
  readStoredGlass, writeStoredGlass, type GlassSettings,
} from "@/lib/glass";
import { APPLICATIONS, GROUPS, applicationsInFamily } from "@/lib/apps/registry";
import { useRecords, type RecordFault, type RecordState } from "@/lib/nn/records";
import styles from "./NNDashboard.module.css";

/**
 * NN's dashboard.
 *
 * One sheet of adjustable glass over the room, holding four views: what today
 * asks of the founder, every application, everything that has happened, and
 * the state of the environment itself. The material is the founder's to set —
 * blur, opacity, saturation, edge light and tint are live custom properties,
 * kept per device because how much glass is right depends on the room.
 *
 * What is on it is real. Every count, every line of activity and every goal
 * is a live subscription to the founder's own Firestore collections, and when
 * a read cannot be served the panel says which of the five things went wrong
 * rather than showing a zero. A zero and "NN cannot reach your data" look the
 * same on a dashboard and mean opposite things, so NN never conflates them.
 *
 * Built to the founder's supplied adjustable-glass reference: the topbar and
 * rail, the floating dock, the appearance panel and the view switch are all
 * from it, rewritten for NN's palette, data, routes and accessibility rules.
 */

/* ------------------------------------------------------------- view model -- */

const VIEWS = [
  { id: "today", label: "Today", icon: "calendar", hint: "What NN has for you" },
  { id: "apps", label: "Applications", icon: "grid", hint: "All thirty-four" },
  { id: "activity", label: "Activity", icon: "clock", hint: "Everything recorded" },
  { id: "system", label: "System", icon: "settings", hint: "The environment itself" },
] as const satisfies readonly (LiquidNavItem & { id: string })[];

type ViewId = (typeof VIEWS)[number]["id"];

const VIEW_TITLE: Record<ViewId, string> = {
  today: "Today",
  apps: "Applications",
  activity: "Activity",
  system: "System",
};

/* ------------------------------------------------------- record accessors -- */

/**
 * Records come back as `{ id, [field]: unknown }`, because the collection is
 * the founder's and NN does not get to assume a shape. These read a field the
 * way a careful person would: take it if it is the right type, otherwise act
 * as if it were not there.
 */
function text(record: Record<string, unknown>, ...fields: string[]): string | null {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function flag(record: Record<string, unknown>, field: string): boolean {
  return record[field] === true;
}

function count(record: Record<string, unknown>, field: string): number | null {
  const value = record[field];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/**
 * A Firestore timestamp, an ISO string or a number, as a Date.
 *
 * Firestore hands back a Timestamp object in the browser and a plain string
 * once a document has been through an export, so both have to work or the
 * same record sorts differently depending on where it came from.
 */
function when(record: Record<string, unknown>, ...fields: string[]): Date | null {
  for (const field of fields) {
    const value = record[field];
    if (value && typeof value === "object" && "toDate" in value) {
      const date = (value as { toDate: () => Date }).toDate();
      if (!Number.isNaN(date.getTime())) return date;
    }
    if (typeof value === "string" || typeof value === "number") {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  return null;
}

/** "in 20 minutes", "3 days ago" — said the way the founder would say it. */
function relative(date: Date, now: number): string {
  const seconds = Math.round((date.getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  const units: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
    ["second", 60], ["minute", 60], ["hour", 24], ["day", 7], ["week", 4.35],
    ["month", 12], ["year", Number.POSITIVE_INFINITY],
  ];
  let value = seconds;
  for (const [unit, size] of units) {
    if (Math.abs(value) < size) {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" })
        .format(Math.round(value), unit);
    }
    value /= size;
  }
  return abs < 60 ? "just now" : date.toLocaleDateString();
}

/* ------------------------------------------------------------ fault panel -- */

/**
 * What to show instead of data.
 *
 * Each fault gets its own sentence because the founder's next move differs:
 * sign in, add a credential, check the connection, or tell someone. "Could
 * not load" would be true for all of them and useful for none.
 */
function Fault({ fault }: { fault: RecordFault }) {
  const action: Record<RecordFault["kind"], string> = {
    unconfigured: "This deployment has no Firebase configuration, so there is nothing to read from.",
    "signed-out": "Sign in to see your own records.",
    denied: "These records are not yours to read.",
    unavailable: "NN will show them as soon as it can reach your data.",
    failed: "This is a fault in NN, not in your data.",
  };
  return (
    <p className={styles.fault} role="status">
      <Icon name="shield" size={15} />
      <span>
        <strong>{fault.message}</strong>
        <span>{action[fault.kind]}</span>
      </span>
    </p>
  );
}

/** One panel's state, rendered the same way everywhere. */
function Stateful<T extends { id: string }>({
  state, empty, children,
}: {
  state: RecordState<T>;
  empty: string;
  children: (items: readonly T[]) => ReactNode;
}) {
  if (state.fault) return <Fault fault={state.fault} />;
  if (state.loading) {
    return (
      <div className={styles.skeleton} aria-hidden="true">
        <span /><span /><span />
      </div>
    );
  }
  if (state.empty) return <p className={styles.empty}>{empty}</p>;
  return <>{children(state.items)}</>;
}

/* -------------------------------------------------------------- the views -- */

function TodayView({ firstName }: { firstName: string }) {
  // One clock for the whole view, ticking a minute at a time. Reading
  // Date.now() during render would make every relative label disagree with
  // the next, and re-render the view on every paint.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const tasks = useRecords("tasks", { limit: 60 });
  const events = useRecords("calendar_events", { orderBy: "startsAt", direction: "asc", limit: 12 });
  const notes = useRecords("notes", { limit: 20 });
  const goals = useRecords("goals", { limit: 8 });

  const openTasks = useMemo(
    () => tasks.items.filter((task) => !flag(task, "done") && !flag(task, "completed")),
    [tasks.items],
  );

  const upcoming = useMemo(() => {
    return events.items
      .map((event) => ({ event, at: when(event, "startsAt", "start", "at") }))
      .filter((entry): entry is { event: typeof entry.event; at: Date } => entry.at !== null)
      .filter((entry) => entry.at.getTime() >= now - 60 * 60 * 1000)
      .sort((a, b) => a.at.getTime() - b.at.getTime());
  }, [events.items, now]);

  const next = upcoming[0];

  const counters: ReadonlyArray<{ label: string; state: RecordState; value: number; icon: IconName }> = [
    { label: "Open tasks", state: tasks, value: openTasks.length, icon: "check" },
    { label: "Scheduled", state: events, value: upcoming.length, icon: "calendar" },
    { label: "Notes", state: notes, value: notes.items.length, icon: "file" },
    { label: "Goals", state: goals, value: goals.items.length, icon: "graph" },
  ];

  const today = new Date(now);

  return (
    <>
      <WaveCard tone="aurora" className={styles.hero} interactive={false}>
        <div className={styles.heroInner}>
          <div>
            <p className={styles.heroKicker}>
              {today.toLocaleDateString(undefined, {
                weekday: "long", day: "numeric", month: "long",
              })}
            </p>
            <h2 className={styles.heroTitle}>
              {next
                ? text(next.event, "title", "name", "summary") ?? "Something is scheduled"
                : `Nothing is scheduled, ${firstName}.`}
            </h2>
            <p className={styles.heroLine}>
              {next
                ? `${relative(next.at, now)} · ${next.at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
                : "A clear day. NN is holding everything else."}
            </p>
          </div>

          <WaveChip className={styles.heroChip}>
            <span className={styles.heroChipValue}>{openTasks.length}</span>
            <span className={styles.heroChipLabel}>
              {openTasks.length === 1 ? "task open" : "tasks open"}
            </span>
          </WaveChip>
        </div>
      </WaveCard>

      {/* A list, not a row of divs: four related statistics are a list, and
          saying so is what lets a screen reader announce "4 items" and move
          between them instead of reading one run-on paragraph. */}
      <ul className={styles.counters} aria-label="Today at a glance">
        {counters.map((counter) => (
          <li className={styles.counter} key={counter.label}>
            <p className={styles.counterTop}>
              <span>{counter.label}</span>
              <Icon name={counter.icon} size={16} />
            </p>
            {counter.state.fault ? (
              <strong className={styles.counterUnknown} title={counter.state.fault.message}>
                —
              </strong>
            ) : counter.state.loading ? (
              <strong className={styles.counterUnknown}>·</strong>
            ) : (
              <strong>{counter.value}</strong>
            )}
            <span className={styles.counterHint}>
              {counter.state.fault
                ? "Not readable"
                : counter.state.stale
                  ? "From this device"
                  : counter.state.loading
                    ? "Reading"
                    : "Live"}
            </span>
          </li>
        ))}
      </ul>

      <div className={styles.pair}>
        <section className={styles.panel}>
          <header className={styles.panelTop}>
            <h3>Next</h3>
            <span className={styles.small}>{upcoming.length} scheduled</span>
          </header>
          <Stateful state={events} empty="Nothing on the calendar yet.">
            {() =>
              upcoming.length === 0 ? (
                <p className={styles.empty}>Nothing ahead.</p>
              ) : (
                <ul className={styles.rows}>
                  {upcoming.slice(0, 5).map(({ event, at }) => (
                    <li key={event.id}>
                      <span className={styles.rowIcon}><Icon name="calendar" size={16} /></span>
                      <span className={styles.rowBody}>
                        <strong>{text(event, "title", "name", "summary") ?? "Untitled"}</strong>
                        <span>{at.toLocaleString(undefined, {
                          weekday: "short", hour: "numeric", minute: "2-digit",
                        })}</span>
                      </span>
                      <span className={styles.rowMeta}>{relative(at, now)}</span>
                    </li>
                  ))}
                </ul>
              )
            }
          </Stateful>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelTop}>
            <h3>Goals</h3>
            <span className={styles.small}>{goals.items.length} tracked</span>
          </header>
          <Stateful state={goals} empty="No goals set. NN will track them when you add one.">
            {(items) => (
              <ul className={styles.goals}>
                {items.slice(0, 4).map((goal) => {
                  const done = count(goal, "done") ?? count(goal, "progress") ?? 0;
                  const target = count(goal, "target") ?? 0;
                  const percent = target > 0
                    ? Math.max(0, Math.min(100, (done / target) * 100))
                    : 0;
                  const name = text(goal, "title", "name") ?? "Untitled goal";
                  return (
                    <li key={goal.id}>
                      <p>
                        <strong>{name}</strong>
                        {target > 0 ? <span>{Math.round(percent)}%</span> : <span>No target</span>}
                      </p>
                      <span
                        className={styles.track}
                        role="progressbar"
                        aria-label={name}
                        aria-valuenow={Math.round(percent)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      >
                        <i style={{ transform: `scaleX(${percent / 100})` }} />
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Stateful>
        </section>
      </div>
    </>
  );
}

function ApplicationsView() {
  const travel = useAppTransition();

  const slides: CarouselSlide[] = useMemo(
    () =>
      APPLICATIONS.map((app) => ({
        id: app.id,
        title: app.name,
        kicker: app.group,
        caption: app.description,
        ready: app.href !== undefined,
      })),
    [],
  );

  const open = useCallback(
    (slide: CarouselSlide) => {
      const app = APPLICATIONS.find((entry) => entry.id === slide.id);
      if (!app) return;
      // A real destination either way: the application when it exists, its
      // honest overview when it does not.
      travel.open((app.href ?? app.overviewHref) as Route, app.name);
    },
    [travel],
  );

  return (
    <>
      <CurvedCarousel
        slides={slides}
        label="NN applications"
        onOpen={open}
        className={styles.carousel}
      />

      <div className={styles.families}>
        {GROUPS.map((family) => {
          const apps = applicationsInFamily(family.name);
          const ready = apps.filter((app) => app.href !== undefined).length;
          return (
            <button
              key={family.name}
              type="button"
              className={styles.family}
              onClick={() => travel.open(`/family/${family.slug}` as Route, family.name)}
            >
              <span className={styles.familyName}>{family.name}</span>
              <span className={styles.familyMeta}>
                {apps.length} applications · {ready} ready
              </span>
              <Icon name="expand" size={16} />
            </button>
          );
        })}
      </div>
    </>
  );
}

function ActivityView() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const [filter, setFilter] = useState("");

  const tasks = useRecords("tasks", { limit: 40 });
  const notes = useRecords("notes", { limit: 40 });
  const events = useRecords("calendar_events", { limit: 40 });

  const stream = useMemo(() => {
    const rows = [
      ...tasks.items.map((r) => ({ record: r, kind: "Task", icon: "check" as IconName })),
      ...notes.items.map((r) => ({ record: r, kind: "Note", icon: "file" as IconName })),
      ...events.items.map((r) => ({ record: r, kind: "Event", icon: "calendar" as IconName })),
    ].map((row) => ({
      ...row,
      title: text(row.record, "title", "name", "summary") ?? "Untitled",
      at: when(row.record, "updatedAt", "createdAt", "startsAt"),
    }));
    const needle = filter.trim().toLowerCase();
    return rows
      .filter((row) => !needle || `${row.title} ${row.kind}`.toLowerCase().includes(needle))
      .sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));
  }, [tasks.items, notes.items, events.items, filter]);

  const faults = [tasks.fault, notes.fault, events.fault].filter(Boolean) as RecordFault[];
  const loading = tasks.loading || notes.loading || events.loading;

  return (
    <section className={styles.panel}>
      <header className={styles.panelTop}>
        <h3>
          Everything recorded
          <span className={styles.count}>{stream.length}</span>
        </h3>
        <label className={styles.search}>
          <Icon name="search" size={15} />
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter"
            aria-label="Filter activity"
          />
          {filter ? (
            <button type="button" aria-label="Clear filter" onClick={() => setFilter("")}>
              <Icon name="close" size={14} />
            </button>
          ) : null}
        </label>
      </header>

      {faults.length > 0 ? <Fault fault={faults[0]!} /> : null}

      {loading && stream.length === 0 ? (
        <div className={styles.skeleton} aria-hidden="true"><span /><span /><span /></div>
      ) : stream.length === 0 ? (
        <p className={styles.empty}>
          {filter ? "Nothing matches that." : "Nothing recorded yet."}
        </p>
      ) : (
        <ul className={styles.rows}>
          {stream.slice(0, 40).map((row) => (
            <li key={`${row.kind}-${row.record.id}`}>
              <span className={styles.rowIcon}><Icon name={row.icon} size={16} /></span>
              <span className={styles.rowBody}>
                <strong>{row.title}</strong>
                <span>{row.kind}</span>
              </span>
              <span className={styles.rowMeta}>
                {row.at ? relative(row.at, now) : "No date"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SystemView({ ownerUid, onSignOut, onSignOutEverywhere }: {
  ownerUid?: string | undefined;
  onSignOut?: (() => void) | undefined;
  onSignOutEverywhere?: (() => void) | undefined;
}) {
  const ready = APPLICATIONS.filter((app) => app.href !== undefined);

  const facts: ReadonlyArray<{ label: string; value: string; hint?: string | undefined }> = [
    {
      label: "Session",
      value: ownerUid ? `owner · ${ownerUid.slice(0, 10)}…` : "Not signed in",
      hint: ownerUid ? "Authorised by your passkey." : undefined,
    },
    {
      label: "Applications",
      value: `${ready.length} of ${APPLICATIONS.length} with a work surface`,
      hint: "The rest show an honest overview of what they will hold.",
    },
    {
      label: "Authorisation",
      value: "Firestore rules, owner-scoped",
      hint: "Nothing in the browser decides what you may read.",
    },
    {
      label: "Assistant",
      value: "REN · text and appearance",
      hint: "Voice is not built. REN says so rather than implying more.",
    },
  ];

  return (
    <>
      <div className={styles.facts}>
        {facts.map((fact) => (
          <section className={styles.fact} key={fact.label}>
            <p>{fact.label}</p>
            <strong>{fact.value}</strong>
            {fact.hint ? <span>{fact.hint}</span> : null}
          </section>
        ))}
      </div>

      <section className={styles.panel}>
        <header className={styles.panelTop}>
          <h3>This session</h3>
        </header>
        <div className={styles.actions}>
          <button type="button" onClick={onSignOut} disabled={!onSignOut}>
            Sign out here
          </button>
          <button
            type="button"
            className={styles.danger}
            onClick={onSignOutEverywhere}
            disabled={!onSignOutEverywhere}
          >
            Sign out everywhere
          </button>
        </div>
        <p className={styles.note}>
          Signing out everywhere revokes every passkey session on every device.
          You will need your passkey again to come back.
        </p>
      </section>
    </>
  );
}

/* --------------------------------------------------------------- the shell -- */

export interface NNDashboardProps {
  firstName?: string;
  ownerUid?: string | undefined;
  onSignOut?: (() => void) | undefined;
  onSignOutEverywhere?: (() => void) | undefined;
  /** Opens on this view. The design route uses it to show a specific surface. */
  initialView?: ViewId;
}

export function NNDashboard({
  firstName = "Founder",
  ownerUid,
  onSignOut,
  onSignOutEverywhere,
  initialView = "today",
}: NNDashboardProps) {
  const [view, setView] = useState<ViewId>(initialView);
  const [glass, setGlass] = useState<GlassSettings>(DEFAULT_GLASS);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);
  const appearanceButton = useRef<HTMLButtonElement>(null);
  const messagesButton = useRef<HTMLButtonElement>(null);
  const appearancePanel = useRef<HTMLDivElement>(null);

  // Read after mount, never during render: the server has no localStorage, and
  // reading it in a initial-state function would make the first client render
  // disagree with the server's and throw away the whole tree.
  useEffect(() => { setGlass(readStoredGlass()); }, []);

  const apply = useCallback((patch: Partial<GlassSettings>) => {
    setGlass((previous) => {
      const next = normaliseGlass({ ...previous, ...patch });
      writeStoredGlass(next);
      return next;
    });
  }, []);

  // Escape closes whichever panel is open, innermost first.
  useEffect(() => {
    if (!appearanceOpen && !messagesOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (messagesOpen) { setMessagesOpen(false); messagesButton.current?.focus(); }
      else { setAppearanceOpen(false); appearanceButton.current?.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [appearanceOpen, messagesOpen]);

  // Moving focus into the panel is what makes it reachable by keyboard at all;
  // without this the founder tabs from the trigger into the page behind it.
  useEffect(() => {
    if (appearanceOpen) appearancePanel.current?.querySelector<HTMLElement>("button")?.focus();
  }, [appearanceOpen]);

  const sliders = [
    { key: "blur", label: "Blur", min: 0, max: 40, step: 1, show: `${Math.round(glass.blur)} px` },
    { key: "opacity", label: "Opacity", min: 0.08, max: 0.9, step: 0.01, show: `${Math.round(glass.opacity * 100)}%` },
    { key: "saturation", label: "Saturation", min: 0.5, max: 2, step: 0.05, show: `${Math.round(glass.saturation * 100)}%` },
    { key: "edge", label: "Edge light", min: 0, max: 1, step: 0.05, show: `${Math.round(glass.edge * 100)}%` },
  ] as const;

  return (
    <div className={styles.root} style={glassVariables(glass) as CSSProperties}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <span className={styles.mark}><NNLogo size={20} decorative /></span>
          <strong>NN</strong>
          <span className={styles.divider} aria-hidden="true" />
          <span className={styles.brandLine}>Personal operating environment</span>
        </div>

        <div className={styles.toolbar}>
          <button
            type="button"
            ref={appearanceButton}
            className={styles.adjust}
            aria-expanded={appearanceOpen}
            onClick={() => { setAppearanceOpen((open) => !open); setMessagesOpen(false); }}
          >
            <Icon name="sparkle" size={15} />
            <span>Adjust glass</span>
          </button>

          <button
            type="button"
            ref={messagesButton}
            className={styles.iconButton}
            aria-label="System messages"
            aria-expanded={messagesOpen}
            onClick={() => { setMessagesOpen((open) => !open); setAppearanceOpen(false); }}
          >
            <Icon name="shield" size={17} />
          </button>

          {onSignOut ? (
            <button
              type="button"
              className={styles.avatar}
              onClick={onSignOut}
              aria-label="Sign out"
              title="Sign out"
            >
              {firstName.slice(0, 1).toUpperCase()}
            </button>
          ) : null}
        </div>
      </header>

      <div className={styles.stage}>
        <div className={styles.rail}>
          <LiquidNav
            items={VIEWS}
            activeId={view}
            onSelect={(item) => setView(item.id as ViewId)}
            orientation="vertical"
            compact
            aria-label="Dashboard views"
          />
        </div>

        <main className={styles.main}>
          <div className={styles.heading}>
            <div>
              <p className={styles.greeting}>
                {view === "today"
                  ? `Welcome back, ${firstName}.`
                  : "Your personal operating environment"}
              </p>
              <h1>{VIEW_TITLE[view]}</h1>
            </div>
          </div>

          <div className={styles.mobileNav}>
            <LiquidNav
              items={VIEWS}
              activeId={view}
              onSelect={(item) => setView(item.id as ViewId)}
              aria-label="Dashboard views"
            />
          </div>

          {/* Keyed on the view so each one mounts fresh: a stale subscription
              from the previous view would keep painting into this one. */}
          <div className={styles.view} key={view}>
            {view === "today" ? <TodayView firstName={firstName} /> : null}
            {view === "apps" ? <ApplicationsView /> : null}
            {view === "activity" ? <ActivityView /> : null}
            {view === "system" ? (
              <SystemView
                ownerUid={ownerUid}
                onSignOut={onSignOut}
                onSignOutEverywhere={onSignOutEverywhere}
              />
            ) : null}
          </div>

          <div className={styles.dock}>
            <LiquidNav
              items={VIEWS}
              activeId={view}
              onSelect={(item) => setView(item.id as ViewId)}
              aria-label="Dashboard views"
            />
          </div>
        </main>
      </div>

      {messagesOpen ? (
        <aside className={styles.aside} aria-label="System messages">
          <div className={styles.asideTop}>
            <h2>System messages</h2>
            <button type="button" aria-label="Close" onClick={() => setMessagesOpen(false)}>
              <Icon name="close" size={16} />
            </button>
          </div>
          <p className={styles.note}>
            NN does not send notifications yet. When a read fails, the panel that
            needed it says so in place — nothing is hidden behind a badge here.
          </p>
        </aside>
      ) : null}

      {appearanceOpen ? (
        <aside className={styles.aside} ref={appearancePanel} aria-label="Glass appearance">
          <div className={styles.asideTop}>
            <h2>Glass appearance</h2>
            <button type="button" aria-label="Close" onClick={() => {
              setAppearanceOpen(false);
              appearanceButton.current?.focus();
            }}>
              <Icon name="close" size={16} />
            </button>
          </div>
          <p className={styles.note}>
            How much glass is right depends on your room and your screen. This
            is kept on this device.
          </p>

          <div className={styles.sample} aria-hidden="true">
            <WaveCard tone="aurora" className={styles.sampleCard}>
              <WaveChip className={styles.sampleChip}>Live material</WaveChip>
            </WaveCard>
          </div>

          <div className={styles.presets}>
            {GLASS_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                title={preset.hint}
                onClick={() => apply(preset.value)}
              >
                {preset.name}
              </button>
            ))}
          </div>

          {sliders.map((slider) => (
            <label className={styles.slider} key={slider.key}>
              <span>
                {slider.label}
                <output>{slider.show}</output>
              </span>
              <input
                type="range"
                min={slider.min}
                max={slider.max}
                step={slider.step}
                value={glass[slider.key]}
                onChange={(event) => apply({ [slider.key]: Number(event.target.value) })}
              />
            </label>
          ))}

          <label className={styles.tint}>
            <span>Tint</span>
            <input
              type="color"
              value={glass.tint}
              onChange={(event) => apply({ tint: event.target.value })}
            />
          </label>

          <button
            type="button"
            className={styles.reset}
            onClick={() => apply(DEFAULT_GLASS)}
          >
            Reset to NN&apos;s default
          </button>
        </aside>
      ) : null}
    </div>
  );
}
