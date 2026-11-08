"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  AppTile, Button, Dialog, Dock, FloatingWindow, GlassPanel,
  Icon, NNLockup, NNLogo, Switch, TextField,
  type DockItem, type IconName,
} from "@/components/ui";
import { useTheme } from "@/lib/theme";
import s from "./design.module.css";

/* ------------------------------------------------------------------ data -- */

const PALETTE = [
  ["Base", "#07111F"], ["Deep", "#0B1930"], ["Surface", "#10223B"], ["Elevated", "#172B45"],
  ["White", "#F7F9FC"], ["Soft", "#E7EDF6"], ["Silver", "#A6B3C5"], ["Grey", "#77869B"],
  ["Icy", "#9CC8FF"], ["Accent", "#649CE3"],
] as const;

const TYPE_SCALE = [
  ["display", "40 / 1.1", 40, 600, "-0.025em"],
  ["title-1", "30 / 1.2", 30, 600, "-0.02em"],
  ["title-2", "24 / 1.25", 24, 600, "-0.015em"],
  ["title-3", "19 / 1.35", 19, 500, "-0.01em"],
  ["body-lg", "16 / 1.6", 16, 400, "0"],
  ["body", "15 / 1.6", 15, 400, "0"],
  ["label", "13 / 1.4", 13, 500, "0.005em"],
  ["caption", "12 / 1.35", 12, 400, "0.01em"],
] as const;

const APPS: ReadonlyArray<{ id: string; name: string; icon: IconName; description: string }> = [
  { id: "life", name: "NN Life", icon: "calendar", description: "Routine, calendar, habits" },
  { id: "college", name: "NN College", icon: "book", description: "Subjects, exams, revision" },
  { id: "projects", name: "NN Projects", icon: "graph", description: "Milestones and tasks" },
  { id: "finance", name: "NN Finance", icon: "wallet", description: "Income, spending, budgets" },
  { id: "files", name: "NN Files", icon: "folder", description: "Documents and media" },
  { id: "security", name: "NN Security", icon: "shield", description: "Devices and sessions" },
  { id: "logic", name: "NN Logic Lab", icon: "grid", description: "Reasoning and practice" },
  { id: "settings", name: "Settings", icon: "settings", description: "Every NN preference" },
];

const DOCK_ITEMS: readonly DockItem[] = [
  { id: "orin", label: "ORIN", icon: "sparkle" },
  { id: "life", label: "NN Life", icon: "calendar" },
  { id: "college", label: "NN College", icon: "book" },
  { id: "files", label: "NN Files", icon: "folder" },
  { id: "search", label: "Search", icon: "search" },
];

interface WinState {
  id: string; title: string;
  x: number; y: number; w: number; h: number;
  minimized: boolean; maximized: boolean; open: boolean;
}

const INITIAL_WINDOWS: readonly WinState[] = [
  { id: "orin", title: "ORIN", x: 24, y: 24, w: 310, h: 220, minimized: false, maximized: false, open: true },
  { id: "life", title: "NN Life", x: 268, y: 118, w: 300, h: 210, minimized: false, maximized: false, open: true },
  { id: "proj", title: "NN Projects", x: 512, y: 46, w: 300, h: 200, minimized: false, maximized: false, open: true },
];

/* ------------------------------------------------------------- component -- */

export function DesignSystem() {
  const { theme, resolvedTheme, setTheme, reducedMotion, setMotion } = useTheme();

  const [log, setLog] = useState<string>("");
  const record = useCallback((msg: string) => setLog(msg), []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [quietHours, setQuietHours] = useState(false);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeDock, setActiveDock] = useState<string | null>("orin");
  const [animKey, setAnimKey] = useState(0);
  const [windows, setWindows] = useState<readonly WinState[]>(INITIAL_WINDOWS);
  const [focusedWin, setFocusedWin] = useState<string>("orin");
  const stageRef = useRef<HTMLDivElement>(null);

  const emailError = useMemo(() => {
    if (email.length === 0) return "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "" : "That is not a valid email address.";
  }, [email]);

  const updateWin = useCallback((id: string, patch: Partial<WinState>) => {
    setWindows((ws) => ws.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  }, []);

  const bounds = useMemo(() => {
    const el = stageRef.current;
    return el === null ? undefined : { width: el.clientWidth, height: el.clientHeight };
  }, []);

  const openWindows = windows.filter((w) => w.open);

  return (
    <main className={s.page}>
      <div className={s.wrap}>

        {/* ---------------------------------------------------------- topbar */}
        <header className={s.topbar}>
          <NNLockup size={22} />
          <span className={s.topbarSpacer} />
          <span className={s.log} aria-live="polite">{log}</span>
          <Button size="sm" variant="ghost" iconOnly aria-label="Search" onClick={() => record("search opened")}>
            <Icon name="search" size={17} />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const next = resolvedTheme === "dark" ? "light" : "dark";
              setTheme(next);
              record(`theme → ${next}`);
            }}
          >
            {resolvedTheme === "dark" ? "Light" : "Dark"}
          </Button>
        </header>

        <p className={s.eyebrow}>NN APP · Phase 1 · Design System</p>
        <h1 className={s.h1}>The NN design system</h1>
        <p className={s.lede}>
          Every element below is a real, reusable React component reading real design
          tokens. Nothing here is a picture of an interface. Every control does
          something — the line in the bar above reports what you just triggered.
        </p>

        {/* ----------------------------------------------------- 01 identity */}
        <section className={s.section} id="identity">
          <div className={s.sectionHead}><span className={s.num}>01</span><h2 className={s.h2}>Brand identity</h2></div>

          <div className={s.grid4}>
            <div>
              <div className={`${s.markStage} ${s.onDark}`}><NNLogo size={96} /></div>
              <p className={s.caption}>Mark on dark</p>
            </div>
            <div>
              <div className={`${s.markStage} ${s.onLight}`}><NNLogo size={96} /></div>
              <p className={s.caption}>Mark on light</p>
            </div>
            <div>
              <div className={s.markStage} style={{ background: "transparent" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/nn/nn-app-icon.svg" alt="NN application icon" width={128} height={128} style={{ borderRadius: 28 }} />
              </div>
              <p className={s.caption}>App icon</p>
            </div>
            <div>
              <div className={s.markStage} style={{ background: "transparent" }}>
                <NNLockup size={34} />
              </div>
              <p className={s.caption}>Lockup</p>
            </div>
          </div>

          <GlassPanel tier={2} padding="lg" style={{ marginTop: "var(--space-8)" }}>
            <p className={s.eyebrow} style={{ marginBottom: "var(--space-7)" }}>Legibility ladder</p>
            <div className={s.sizes}>
              {[96, 48, 32, 24, 16].map((n) => (
                <figure key={n}>
                  <NNLogo size={n} decorative />
                  <figcaption>{n}px</figcaption>
                </figure>
              ))}
            </div>
            <p className={s.note}>
              Concept A — <strong>Interlock</strong>, approved 8 November 2026. Two N forms
              sharing one stem on a 76-unit grid. The path data is defined once in
              <code> NNLogo.tsx</code> and is byte-identical in all seven files under
              <code> /public/brand/nn/</code>. It must not be redrawn.
            </p>
          </GlassPanel>

          <div className={s.grid4} style={{ marginTop: "var(--space-8)" }}>
            {PALETTE.map(([name, hex]) => (
              <div key={hex} className={s.swatch}>
                <div className={s.swatchChip} style={{ background: hex }} />
                <div className={s.swatchLabel}>
                  <div className={s.swatchName}>{name}</div>
                  <div className={s.swatchHex}>{hex}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------- 02 themes */}
        <section className={s.section} id="themes">
          <div className={s.sectionHead}><span className={s.num}>02</span><h2 className={s.h2}>Themes and motion</h2></div>
          <div className={s.grid2}>
            <GlassPanel tier={2} padding="lg">
              <p className={s.eyebrow}>Theme</p>
              <div className={s.row} style={{ marginTop: "var(--space-6)" }}>
                {(["dark", "light", "system"] as const).map((t) => (
                  <Button key={t} size="sm" variant={theme === t ? "primary" : "secondary"}
                          aria-pressed={theme === t}
                          onClick={() => { setTheme(t); record(`theme → ${t}`); }}>
                    {t[0]?.toUpperCase()}{t.slice(1)}
                  </Button>
                ))}
              </div>
              <p className={s.note}>
                Choice is stored and survives reload. <strong>System</strong> follows the OS live.
                Currently rendering <strong>{resolvedTheme}</strong>. The light theme is not an
                inversion — it defines its own text ramp, because the dark ramp fails WCAG AA
                on a light ground.
              </p>
            </GlassPanel>

            <GlassPanel tier={2} padding="lg">
              <p className={s.eyebrow}>Motion</p>
              <div className={s.row} style={{ marginTop: "var(--space-6)" }}>
                {(["full", "reduced", "system"] as const).map((m) => (
                  <Button key={m} size="sm" variant="secondary"
                          onClick={() => { setMotion(m); record(`motion → ${m}`); }}>
                    {m[0]?.toUpperCase()}{m.slice(1)}
                  </Button>
                ))}
              </div>
              <p className={s.note}>
                Animation is {reducedMotion ? <strong>suppressed</strong> : <strong>active</strong>}.
                Reduced motion collapses every duration token to 1&nbsp;ms rather than removing
                transitions, so <code>transitionend</code> listeners still fire and no state
                machine stalls. Set it here, or in your OS — both are honoured.
              </p>
            </GlassPanel>
          </div>
        </section>

        {/* -------------------------------------------------------- 03 glass */}
        <section className={s.section} id="glass">
          <div className={s.sectionHead}><span className={s.num}>03</span><h2 className={s.h2}>Glass material</h2></div>
          <div className={s.grid3}>
            {([1, 2, 3] as const).map((tier) => (
              <GlassPanel key={tier} tier={tier} padding="lg">
                <p className={s.eyebrow}>Tier {tier}</p>
                <p style={{ marginTop: "var(--space-5)", fontSize: "var(--text-t3-size)", fontWeight: 500 }}>
                  {tier === 1 ? "Ambient" : tier === 2 ? "Content" : "Focused"}
                </p>
                <p className={s.note} style={{ marginTop: "var(--space-4)" }}>
                  {tier === 1 && "Chrome and large background surfaces. Most transparent, lightest blur."}
                  {tier === 2 && "Content cards. Mid opacity so body text stays comfortable."}
                  {tier === 3 && "Dialogs and windows. Nearly opaque — dense text never fights the background."}
                </p>
              </GlassPanel>
            ))}
          </div>
          <p className={s.note}>
            Transparency is graded, not uniform. Denser information always sits on a more
            opaque tier — this is the single rule that stops glassmorphism from becoming
            unreadable.
          </p>
        </section>

        {/* ---------------------------------------------------- 04 typography */}
        <section className={s.section} id="type">
          <div className={s.sectionHead}><span className={s.num}>04</span><h2 className={s.h2}>Typography</h2></div>
          <GlassPanel tier={2} padding="lg">
            {TYPE_SCALE.map(([name, meta, size, weight, ls]) => (
              <div key={name} className={s.typeRow}>
                <div className={s.typeMeta}>{name}<br />{meta}</div>
                <div style={{ fontSize: size, fontWeight: weight, letterSpacing: ls, lineHeight: 1.3 }}>
                  Hello, Founder.
                </div>
              </div>
            ))}
            <div className={s.typeRow} style={{ borderBottom: "none" }}>
              <div className={s.typeMeta}>mono<br />12 / 1.5</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>nn-os-prod · 62302820912</div>
            </div>
          </GlassPanel>
        </section>

        {/* ------------------------------------------------------ 05 controls */}
        <section className={s.section} id="controls">
          <div className={s.sectionHead}><span className={s.num}>05</span><h2 className={s.h2}>Controls</h2></div>

          <GlassPanel tier={2} padding="lg">
            <p className={s.eyebrow}>Variants</p>
            <div className={s.row} style={{ marginTop: "var(--space-6)" }}>
              <Button variant="primary" onClick={() => record("primary pressed")}>Primary</Button>
              <Button variant="secondary" onClick={() => record("secondary pressed")}>Secondary</Button>
              <Button variant="ghost" onClick={() => record("ghost pressed")}>Ghost</Button>
              <Button variant="danger" onClick={() => record("danger pressed")}>Danger</Button>
              <Button variant="secondary" disabled>Disabled</Button>
              <Button
                variant="primary"
                loading={saving}
                onClick={() => {
                  setSaving(true);
                  record("saving…");
                  window.setTimeout(() => { setSaving(false); record("saved"); }, 1100);
                }}
              >
                Save
              </Button>
            </div>

            <p className={s.eyebrow} style={{ marginTop: "var(--space-9)" }}>Sizes and icon buttons</p>
            <div className={s.row} style={{ marginTop: "var(--space-6)" }}>
              <Button size="sm" onClick={() => record("small pressed")}>Small</Button>
              <Button size="md" onClick={() => record("medium pressed")}>Medium</Button>
              <Button size="lg" onClick={() => record("large pressed")}>Large</Button>
              <Button size="md" iconOnly aria-label="Record voice" onClick={() => record("microphone pressed")}>
                <Icon name="mic" size={18} />
              </Button>
              <Button size="md" variant="primary" iconOnly aria-label="Add" onClick={() => record("add pressed")}>
                <Icon name="plus" size={18} />
              </Button>
            </div>

            <div className={s.grid2} style={{ marginTop: "var(--space-9)", alignItems: "start" }}>
              <div style={{ display: "grid", gap: "var(--space-7)" }}>
                <TextField
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  hint="Validates live. Try removing the @."
                  error={emailError}
                />
                <TextField label="Note" multiline placeholder="Anything you want to remember…"
                           onChange={() => record("note typed")} />
              </div>
              <div style={{ display: "grid", gap: "var(--space-7)", justifyItems: "start" }}>
                <Switch label="Notifications" checked={notifications}
                        onCheckedChange={(v) => { setNotifications(v); record(`notifications ${v ? "on" : "off"}`); }} />
                <Switch label="Quiet hours" checked={quietHours}
                        onCheckedChange={(v) => { setQuietHours(v); record(`quiet hours ${v ? "on" : "off"}`); }} />
                <Switch label="Unavailable setting" checked={false} onCheckedChange={() => {}} disabled />
                <Button variant="secondary" onClick={() => { setDialogOpen(true); record("dialog opened"); }}>
                  Open dialog
                </Button>
              </div>
            </div>
          </GlassPanel>
        </section>

        {/* ------------------------------------------------------- 06 windows */}
        <section className={s.section} id="windows">
          <div className={s.sectionHead}><span className={s.num}>06</span><h2 className={s.h2}>Floating windows</h2></div>
          <div className={s.stage} ref={stageRef}>
            {openWindows.map((w) => (
              <FloatingWindow
                key={w.id}
                title={w.title}
                x={w.maximized ? 8 : w.x}
                y={w.maximized ? 8 : w.y}
                width={w.maximized ? (bounds?.width ?? 800) - 16 : w.w}
                height={w.maximized ? 390 : w.h}
                focused={focusedWin === w.id}
                minimized={w.minimized}
                {...(bounds !== undefined ? { bounds } : {})}
                onMove={(x, y) => updateWin(w.id, { x, y })}
                onFocus={() => setFocusedWin(w.id)}
                onToggleMinimize={() => { updateWin(w.id, { minimized: !w.minimized }); record(`${w.title} ${w.minimized ? "restored" : "minimised"}`); }}
                onToggleMaximize={() => { updateWin(w.id, { maximized: !w.maximized }); record(`${w.title} ${w.maximized ? "restored" : "maximised"}`); }}
                onClose={() => { updateWin(w.id, { open: false }); record(`${w.title} closed`); }}
              >
                <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-caption-size)", lineHeight: 1.6 }}>
                  Drag the title bar. Click to focus — the unfocused window dims and drops a
                  shadow tier. Minimise, maximise and close all work.
                </p>
              </FloatingWindow>
            ))}
            {openWindows.length === 0 ? (
              <div style={{ display: "grid", placeItems: "center", height: "100%" }}>
                <Button variant="secondary" onClick={() => { setWindows(INITIAL_WINDOWS); record("windows restored"); }}>
                  Restore all windows
                </Button>
              </div>
            ) : null}
          </div>
          <div className={s.row} style={{ marginTop: "var(--space-6)" }}>
            <Button size="sm" variant="ghost" onClick={() => { setWindows(INITIAL_WINDOWS); record("windows reset"); }}>
              Reset windows
            </Button>
            <span className={s.kv}>{openWindows.length} open · focused: {focusedWin}</span>
          </div>
        </section>

        {/* ------------------------------------------------------ 07 launcher */}
        <section className={s.section} id="launcher">
          <div className={s.sectionHead}><span className={s.num}>07</span><h2 className={s.h2}>Launcher and dock</h2></div>
          <div className={s.grid4}>
            {APPS.map((a) => (
              <AppTile key={a.id} name={a.name} icon={a.icon} description={a.description}
                       onClick={() => record(`${a.name} opened`)} />
            ))}
          </div>
          <div className={s.row} style={{ marginTop: "var(--space-9)", justifyContent: "center" }}>
            <Dock items={DOCK_ITEMS} activeId={activeDock}
                  onSelect={(id) => { setActiveDock(id); record(`dock → ${id}`); }} />
          </div>
          <p className={s.note} style={{ textAlign: "center", margin: "var(--space-6) auto 0" }}>
            These tiles are the real launcher component. In Phase 3 they read the application
            registry instead of this fixed list — the component does not change.
          </p>
        </section>

        {/* ----------------------------------------------------- 08 animation */}
        <section className={s.section} id="motion">
          <div className={s.sectionHead}><span className={s.num}>08</span><h2 className={s.h2}>Motion</h2></div>
          <div className={s.grid4} key={animKey}>
            <div className={`${s.motionBox} ${s.animFade}`}>fade · 360ms</div>
            <div className={`${s.motionBox} ${s.animRise}`}>rise · entrance</div>
            <div className={`${s.motionBox} ${s.animScale}`}>scale · spring</div>
            <div className={`${s.motionBox} ${s.animDraw}`}>
              <svg width="54" height="54" viewBox="0 0 76 76" fill="none" aria-hidden="true">
                <path d="M6 70 V6 L38 70 V6 L70 70 V6" stroke="currentColor" strokeWidth="7"
                      strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <div className={s.row} style={{ marginTop: "var(--space-6)" }}>
            <Button size="sm" variant="secondary" onClick={() => { setAnimKey((k) => k + 1); record("animations replayed"); }}>
              Replay
            </Button>
            <span className={s.kv}>
              {reducedMotion ? "reduced motion active — durations are 1ms" : "full motion"}
            </span>
          </div>
          <p className={s.note}>
            The fourth tile is the launch-sequence line draw: the mark traces itself as a single
            unbroken stroke. It is the same geometry family as the logo and will open NN in
            Phase 3.
          </p>
        </section>

        {/* -------------------------------------------------------- 09 mobile */}
        <section className={s.section} id="mobile">
          <div className={s.sectionHead}><span className={s.num}>09</span><h2 className={s.h2}>Mobile</h2></div>
          <div className={`${s.row} ${s.rowTop}`} style={{ gap: "var(--space-11)" }}>
            <div className={s.phone}>
              <div className={s.phoneScreen}>
                <div className={s.notch} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <NNLogo size={22} decorative />
                  <Button size="sm" variant="ghost" iconOnly aria-label="Settings"
                          onClick={() => record("mobile settings")}>
                    <Icon name="settings" size={17} />
                  </Button>
                </div>
                <p style={{ marginTop: "var(--space-8)", fontSize: 25, fontWeight: 600, letterSpacing: "-0.02em" }}>
                  Hello, Founder.
                </p>
                <p style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>
                  Design system preview
                </p>
                <GlassPanel tier={2} padding="sm" style={{ marginTop: "var(--space-7)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)" }}>
                    <Icon name="sparkle" size={17} />
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Ask ORIN anything…</span>
                  </div>
                </GlassPanel>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-5)", marginTop: "var(--space-7)" }}>
                  {APPS.slice(0, 4).map((a) => (
                    <AppTile key={a.id} name={a.name} icon={a.icon} compact
                             onClick={() => record(`mobile: ${a.name}`)} />
                  ))}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <GlassPanel tier={2} padding="lg">
                <p className={s.eyebrow}>Responsive rules</p>
                <ul style={{ marginTop: "var(--space-6)", paddingLeft: "1.1em", color: "var(--text-secondary)", lineHeight: 1.85 }}>
                  <li>Four-column grids fold to two below 1000px, then one below 680px.</li>
                  <li>Touch targets stay at or above 44&nbsp;px on every interactive element.</li>
                  <li>Page padding tightens from 36&nbsp;px to 16&nbsp;px on small screens.</li>
                  <li>Layout uses <code>100dvh</code>, so mobile browser chrome never clips content.</li>
                  <li>The mark, tokens and components are identical — only the arrangement changes.</li>
                </ul>
                <p className={s.note}>
                  Narrow this browser window to see it happen. The phone above is the same
                  components at a 300&nbsp;px width, not a separate mobile design.
                </p>
              </GlassPanel>
            </div>
          </div>
        </section>

        <Dialog
          open={dialogOpen}
          onClose={() => { setDialogOpen(false); record("dialog closed"); }}
          title="This is a real dialog"
          description="Focus moved into it, Tab is trapped inside, Escape closes it, clicking the backdrop closes it, and focus returns to the button that opened it."
          footer={
            <>
              <Button variant="ghost" onClick={() => { setDialogOpen(false); record("dialog cancelled"); }}>Cancel</Button>
              <Button variant="primary" onClick={() => { setDialogOpen(false); record("dialog confirmed"); }}>Confirm</Button>
            </>
          }
        >
          <p style={{ color: "var(--text-secondary)" }}>
            Try it: press Tab repeatedly and the focus ring never escapes this panel.
            Background scrolling is locked while it is open.
          </p>
        </Dialog>
      </div>
    </main>
  );
}
