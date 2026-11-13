"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Route } from "next";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Switch } from "@/components/ui/Switch";
import { NNLogo } from "@/components/ui/NNLogo";
import { useAppTransition } from "@/components/nn/AppTransition";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import {
  DEFAULT_GLASS, GLASS_PRESETS, normaliseGlass,
  readStoredGlass, writeStoredGlass, type GlassSettings,
} from "@/lib/glass";
import { APPLICATIONS } from "@/lib/apps/registry";
import styles from "./NNSettings.module.css";

/**
 * NN's settings.
 *
 * Built the way a phone's settings are built, because that is the shape
 * people already know: your account at the top, then grouped lists of rows,
 * each row one setting, each group one concern. Nothing is hidden behind a
 * floating panel and nothing is called an "advanced" section.
 *
 * Every switch here changes something real. There is no row for a feature NN
 * does not have — when something is not built, it says so in its own row
 * rather than offering a control that does nothing.
 */

/* ------------------------------------------------------------- primitives -- */

function Group({ title, footer, children }: {
  title?: string; footer?: string; children: ReactNode;
}) {
  return (
    <section className={styles.group}>
      {title ? <h2 className={styles.groupTitle}>{title}</h2> : null}
      <div className={styles.rows}>{children}</div>
      {footer ? <p className={styles.groupFooter}>{footer}</p> : null}
    </section>
  );
}

function Tile({ icon, tone }: { icon: IconName; tone: string }) {
  return (
    <span className={styles.tile} style={{ background: tone }} aria-hidden="true">
      <Icon name={icon} size={16} />
    </span>
  );
}

/** A row that goes somewhere. */
function LinkRow({ icon, tone, label, value, onClick }: {
  icon: IconName; tone: string; label: string; value?: string; onClick: () => void;
}) {
  return (
    <button type="button" className={styles.row} onClick={onClick}>
      <Tile icon={icon} tone={tone} />
      <span className={styles.label}>{label}</span>
      {value ? <span className={styles.value}>{value}</span> : null}
      <Icon name="expand" size={15} className={styles.chevron} />
    </button>
  );
}

/** A row that holds a switch. The whole row is the control's label. */
function SwitchRow({ icon, tone, label, hint, checked, onChange, disabled }: {
  icon: IconName; tone: string; label: string; hint?: string;
  checked: boolean; onChange: (next: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className={styles.row} data-static>
      <Tile icon={icon} tone={tone} />
      <span className={styles.label}>
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} label={label} hideLabel disabled={disabled ?? false} />
    </div>
  );
}

/** A row of mutually exclusive choices. */
function ChoiceRow<T extends string>({ icon, tone, label, value, choices, onChange }: {
  icon: IconName; tone: string; label: string; value: T;
  choices: readonly { id: T; label: string }[];
  onChange: (next: T) => void;
}) {
  return (
    <div className={styles.row} data-static>
      <Tile icon={icon} tone={tone} />
      <span className={styles.label}>{label}</span>
      <div className={styles.segment} role="group" aria-label={label}>
        {choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            aria-pressed={value === choice.id}
            onClick={() => onChange(choice.id)}
          >
            {choice.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A row that reports something NN knows but cannot change. */
function FactRow({ icon, tone, label, value }: {
  icon: IconName; tone: string; label: string; value: string;
}) {
  return (
    <div className={styles.row} data-static>
      <Tile icon={icon} tone={tone} />
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{value}</span>
    </div>
  );
}

const TONE = {
  blue: "linear-gradient(160deg, #2a6cff, #1b44c4)",
  cyan: "linear-gradient(160deg, #29b0ff, #1878c8)",
  violet: "linear-gradient(160deg, #a06cff, #6a46d8)",
  slate: "linear-gradient(160deg, #46557d, #2c3858)",
  green: "linear-gradient(160deg, #3fbf8a, #1f8a63)",
  amber: "linear-gradient(160deg, #e0a44a, #b57a24)",
  red: "linear-gradient(160deg, #e06a6a, #b23c3c)",
} as const;

/* ---------------------------------------------------------------- surface -- */

export interface NNSettingsProps {
  onSignOut?: (() => void) | undefined;
  onSignOutEverywhere?: (() => void) | undefined;
}

export function NNSettings({ onSignOut, onSignOutEverywhere }: NNSettingsProps) {
  const { user } = useAuth();
  const { theme, setTheme, motion, setMotion } = useTheme();
  const travel = useAppTransition();

  const [profileOpen, setProfileOpen] = useState(false);
  const [glass, setGlass] = useState<GlassSettings>(DEFAULT_GLASS);
  // Read after mount: there is no localStorage on the server, and reading it
  // during render would make the first client paint disagree with the HTML.
  useEffect(() => { setGlass(readStoredGlass()); }, []);

  const applyGlass = useCallback((patch: Partial<GlassSettings>) => {
    setGlass((previous) => {
      const next = normaliseGlass({ ...previous, ...patch });
      writeStoredGlass(next);
      return next;
    });
  }, []);

  const firstName = user?.displayName?.trim().split(/\s+/)[0] ?? "Founder";
  const ready = APPLICATIONS.filter((app) => app.href !== undefined).length;

  const sliders = [
    { key: "blur", label: "Blur", min: 0, max: 40, step: 1, show: `${Math.round(glass.blur)} px` },
    { key: "opacity", label: "Opacity", min: 0.08, max: 0.9, step: 0.01, show: `${Math.round(glass.opacity * 100)}%` },
    { key: "saturation", label: "Saturation", min: 0.5, max: 2, step: 0.05, show: `${Math.round(glass.saturation * 100)}%` },
    { key: "edge", label: "Edge light", min: 0, max: 1, step: 0.05, show: `${Math.round(glass.edge * 100)}%` },
  ] as const;

  return (
    <div className={styles.root}>
      <h1 className={styles.heading}>Settings</h1>

      {/* Your account, the way a phone puts it at the top. It opens in place
          rather than navigating: everything NN knows about the session is
          four lines, and a page for four lines is a page too many. */}
      <button
        type="button"
        className={styles.account}
        aria-expanded={profileOpen}
        onClick={() => setProfileOpen((open) => !open)}
      >
        <span className={styles.avatar}>{firstName.slice(0, 1).toUpperCase()}</span>
        <span className={styles.accountBody}>
          <strong>{user?.displayName?.trim() || "Founder"}</strong>
          <span>{user ? "Owner · signed in with a passkey" : "Not signed in"}</span>
        </span>
        <Icon name="expand" size={16} className={styles.chevron} data-open={profileOpen || undefined} />
      </button>

      {profileOpen ? (
        <Group title="Profile">
          <FactRow
            icon="shield" tone={TONE.green} label="Owner id"
            value={user?.uid ? `${user.uid.slice(0, 12)}…` : "None"}
          />
          <FactRow
            icon="check" tone={TONE.blue} label="Verified"
            value={user ? "By your device's authenticator" : "Not signed in"}
          />
          <FactRow
            icon="file" tone={TONE.slate} label="Biometrics"
            value="Never leave your device"
          />
        </Group>
      ) : null}

      <Group
        title="Appearance"
        footer="How much glass is right depends on your room and your screen, so NN keeps this on this device rather than on your account."
      >
        <ChoiceRow
          icon="sparkle" tone={TONE.violet} label="Theme" value={theme}
          choices={[
            { id: "system", label: "Auto" },
            { id: "dark", label: "Dark" },
            { id: "light", label: "Light" },
          ]}
          onChange={setTheme}
        />
        <ChoiceRow
          icon="clock" tone={TONE.slate} label="Motion" value={motion}
          choices={[
            { id: "system", label: "Auto" },
            { id: "full", label: "Full" },
            { id: "reduced", label: "Reduced" },
          ]}
          onChange={setMotion}
        />
        <div className={styles.row} data-static data-column>
          <div className={styles.rowHead}>
            <Tile icon="grid" tone={TONE.cyan} />
            <span className={styles.label}>Glass</span>
            <div className={styles.presets}>
              {GLASS_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  title={preset.hint}
                  onClick={() => applyGlass(preset.value)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
          {sliders.map((slider) => (
            <label className={styles.slider} key={slider.key}>
              <span>{slider.label}<output>{slider.show}</output></span>
              <input
                type="range"
                min={slider.min} max={slider.max} step={slider.step}
                value={glass[slider.key]}
                onChange={(event) => applyGlass({ [slider.key]: Number(event.target.value) })}
              />
            </label>
          ))}
          <label className={styles.tint}>
            <span>Tint</span>
            <input
              type="color"
              value={glass.tint}
              onChange={(event) => applyGlass({ tint: event.target.value })}
              aria-label="Glass tint"
            />
          </label>
        </div>
      </Group>

      <Group
        title="REN"
        footer="REN has three capabilities by design: text, voice and appearance. Voice is not built yet, and REN says so rather than implying more."
      >
        <SwitchRow
          icon="mic" tone={TONE.blue} label="Voice"
          hint="Not built yet" checked={false} onChange={() => {}} disabled
        />
        <FactRow icon="sparkle" tone={TONE.violet} label="Summon" value="⌘K" />
      </Group>

      <Group
        title="Privacy and security"
        footer="Authorisation happens in NN's security rules, never in the browser. Nothing on this device decides what you may read."
      >
        <FactRow
          icon="shield" tone={TONE.green} label="Sign-in"
          value={user ? "Passkey on this device" : "Not signed in"}
        />
        <FactRow icon="file" tone={TONE.slate} label="Records" value="Owner-scoped" />
        <LinkRow
          icon="search" tone={TONE.cyan} label="What NN can search"
          value={`${ready} applications`}
          onClick={() => travel.open("/search" as Route, "Search")}
        />
      </Group>

      <Group title="Applications">
        <FactRow
          icon="grid" tone={TONE.blue} label="Installed"
          value={`${APPLICATIONS.length} applications`}
        />
        <LinkRow
          icon="folder" tone={TONE.amber} label="Files"
          onClick={() => travel.open("/files" as Route, "Files")}
        />
        <LinkRow
          icon="calendar" tone={TONE.green} label="Life"
          onClick={() => travel.open("/life" as Route, "Life")}
        />
      </Group>

      {onSignOut || onSignOutEverywhere ? (
        <Group footer="Signing out everywhere revokes every passkey session on every device. You will need your passkey again to come back.">
          {onSignOut ? (
            <button type="button" className={`${styles.row} ${styles.danger}`} onClick={onSignOut}>
              <Tile icon="close" tone={TONE.slate} />
              <span className={styles.label}>Sign out here</span>
            </button>
          ) : null}
          {onSignOutEverywhere ? (
            <button type="button" className={`${styles.row} ${styles.danger}`} onClick={onSignOutEverywhere}>
              <Tile icon="shield" tone={TONE.red} />
              <span className={styles.label}>Sign out everywhere</span>
            </button>
          ) : null}
        </Group>
      ) : null}

      <footer className={styles.about}>
        <NNLogo size={26} decorative />
        <p>NN · a personal operating environment</p>
      </footer>
    </div>
  );
}

export default NNSettings;
