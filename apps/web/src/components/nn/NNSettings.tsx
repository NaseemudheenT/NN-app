"use client";

import { useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { GlassIcon, type GlassIconTone } from "@/components/ui/GlassIcon";
import { Switch } from "@/components/ui/Switch";
import { NNLogo } from "@/components/ui/NNLogo";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
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
 *
 * Deliberately short. On 2026-11-14 the founder asked why the applications
 * were listed in Settings, and the honest answer was that they should not
 * be: an application is not a setting, and a link to one here is a second
 * front door that has to be kept in step with the first. The glass sliders
 * went with them — four sliders and a colour picker is a workshop, not a
 * preference. What is left is what a phone keeps: who you are, how it looks,
 * what it may do, and the way out.
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

/* Every row's glyph sits in glass. A flat gradient chip was the last place
   in NN where an icon had a painted background rather than a material. */
function Tile({ icon, tone }: { icon: IconName; tone: GlassIconTone }) {
  return <GlassIcon name={icon} tone={tone} size={28} />;
}

/** A row that holds a switch. The whole row is the control's label. */
function SwitchRow({ icon, tone, label, hint, checked, onChange, disabled }: {
  icon: IconName; tone: GlassIconTone; label: string; hint?: string;
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
  icon: IconName; tone: GlassIconTone; label: string; value: T;
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
            className={styles.choice}
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
  icon: IconName; tone: GlassIconTone; label: string; value: string;
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
  blue: "blue", cyan: "cyan", violet: "violet", slate: "slate",
  green: "green", amber: "amber", red: "red",
} as const satisfies Record<string, GlassIconTone>;

/* ---------------------------------------------------------------- surface -- */

export interface NNSettingsProps {
  onSignOut?: (() => void) | undefined;
  onSignOutEverywhere?: (() => void) | undefined;
}

export function NNSettings({ onSignOut, onSignOutEverywhere }: NNSettingsProps) {
  const { user } = useAuth();
  const { theme, setTheme, motion, setMotion } = useTheme();

  const [profileOpen, setProfileOpen] = useState(false);

  const firstName = user?.displayName?.trim().split(/\s+/)[0] ?? "Founder";

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
        footer="Kept on this device rather than on your account: the right answer depends on the screen you are looking at, not on who you are."
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
      </Group>

      <Group
        title="REN"
        footer="REN reads, reasons, writes and operates NN with your permission. Voice is the one thing not built yet, and REN says so rather than implying more."
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
        <NNLogo size={26} glow decorative />
        <p>NN · a personal operating environment</p>
      </footer>
    </div>
  );
}

export default NNSettings;
