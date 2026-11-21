"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import { GlassIcon, type GlassIconTone } from "@/components/ui/GlassIcon";
import { TextField } from "@/components/ui/TextField";
import { NNLogo } from "@/components/ui/NNLogo";
import { fetchRecoveryState, setRecoveryPassword, useAuth } from "@/lib/auth";
// The policy only — `@nn/auth` itself pulls in `node:crypto` and cannot be
// bundled for a browser.
import { assessRecoveryPassword } from "@nn/auth/recovery-policy";
import { useTheme } from "@/lib/theme";
import styles from "./NNSettings.module.css";
import { ownerFullName, ownerInitial } from "@/lib/nn/owner";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { forgetSetup } from "@/lib/nn/setup";
import { say } from "@/lib/ren/voice";
import {
  availablePreferences, readVoicePreference, whenVoicesReady, writeVoicePreference,
  type RenVoice, type VoicePreference,
} from "@/lib/ren/voices";

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
  return <GlassIcon name={icon} tone={tone} size={25} />;
}

const TONE = {
  blue: "blue", cyan: "cyan", violet: "violet", slate: "slate",
  green: "green", amber: "amber", red: "red",
} as const satisfies Record<string, GlassIconTone>;

/** A row that holds a switch. The whole row is the control's label. */

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

/**
 * The recovery password.
 *
 * One passkey on one device, and NN refuses to delete the last one — so a
 * lost phone is a permanent lockout from a lifetime of records. This is the
 * way back, and it is deliberately held to a far higher bar than a login
 * password: sixteen characters and real variety, hashed with scrypt, never
 * stored in any recoverable form, and locked out globally after five wrong
 * guesses no matter where they come from.
 */
function RecoveryRow({ signedIn }: { signedIn: boolean }) {
  const [state, setState] = useState<{ configured: boolean; updatedAt: string | null } | null>(null);
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return;
    let live = true;
    fetchRecoveryState()
      .then((next) => { if (live) setState(next); })
      .catch(() => { if (live) setState(null); });
    return () => { live = false; };
  }, [signedIn]);

  const strength = value.length > 0 ? assessRecoveryPassword(value) : null;

  const save = async () => {
    setBusy(true);
    setNote(null);
    try {
      await setRecoveryPassword(value);
      setState({ configured: true, updatedAt: new Date().toISOString() });
      setValue("");
      setOpen(false);
      setNote("Saved. Keep it somewhere only you can reach.");
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not save it.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.row}
        aria-expanded={open}
        disabled={!signedIn}
        onClick={() => setOpen((was) => !was)}
      >
        <Tile icon="vault" tone={TONE.amber} />
        <span className={styles.label}>
          Recovery password
          <small>
            {!signedIn
              ? "Sign in to set it"
              : state === null ? "…"
                : state.configured ? "Set — the way back if your passkey cannot be used"
                  : "Not set — a lost device would lock you out permanently"}
          </small>
        </span>
        <Icon name="expand" size={16} className={styles.chevron} data-open={open || undefined} />
      </button>

      {open && signedIn ? (
        <div className={styles.row} data-static>
          <span className={styles.recovery}>
            <TextField
              label={state?.configured ? "New recovery password" : "Recovery password"}
              type="password"
              autoComplete="new-password"
              value={value}
              onChange={(e) => setValue(e.currentTarget.value)}
              {...(strength !== null && !strength.ok ? { hint: strength.reason } : {})}
            />
            <button
              type="button"
              className={styles.choice}
              disabled={busy || strength === null || !strength.ok}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : "Save"}
            </button>
          </span>
        </div>
      ) : null}

      {note !== null ? <p className={styles.groupFooter}>{note}</p> : null}
    </>
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

/* ---------------------------------------------------------------- surface -- */

export interface NNSettingsProps {
  onSignOut?: (() => void) | undefined;
  onSignOutEverywhere?: (() => void) | undefined;
}

export function NNSettings({ onSignOut, onSignOutEverywhere }: NNSettingsProps) {
  const { user } = useAuth();
  const { theme, setTheme, motion, setMotion } = useTheme();

  const [profileOpen, setProfileOpen] = useState(false);
  const router = useRouter();

  /* What this device can actually speak in. NN cannot install a voice. */
  const [voices, setVoices] = useState<readonly RenVoice[]>([]);
  const [voice, setVoice] = useState<VoicePreference>("system");
  useEffect(() => {
    setVoice(readVoicePreference());
    return whenVoicesReady(setVoices);
  }, []);
  const voiceChoices = availablePreferences(voices).map((id) => ({
    id,
    label: id === "system" ? "Device" : id === "female" ? "Female" : "Male",
  }));


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
        <span className={styles.avatar}>{ownerInitial(user?.displayName)}</span>
        <span className={styles.accountBody}>
          <strong>{ownerFullName(user?.displayName)}</strong>
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
        footer={
          voiceChoices.length > 1
            ? "REN reads, reasons, writes and operates NN with your permission. The voice list is whatever this device has installed — NN cannot add one."
            : "REN reads, reasons, writes and operates NN with your permission. This device has offered no choice of voices, so REN uses its own."
        }
      >
        {voiceChoices.length > 1 ? (
          <ChoiceRow
            icon="mic" tone={TONE.blue} label="Voice" value={voice}
            choices={voiceChoices}
            onChange={(want) => {
              setVoice(want);
              writeVoicePreference(want);
              // Heard rather than described: a voice you cannot hear is not
              // a choice, it is a label.
              say("This is how I will sound.", { preference: want });
            }}
          />
        ) : (
          <FactRow icon="mic" tone={TONE.blue} label="Voice" value="This device's own" />
        )}
        <FactRow icon="sparkle" tone={TONE.violet} label="Summon" value="⌘K" />
      </Group>

      <Group
        title="This device"
        footer="The first run asks about the screen and speaker in front of you, so it is remembered per device rather than on your account. A new phone will ask again."
      >
        <button
          type="button"
          className={styles.row}
          onClick={() => { forgetSetup(); router.push("/setup" as Route); }}
        >
          <Tile icon="settings" tone={TONE.slate} />
          <span className={styles.rowBody}>
            <span className={styles.rowLabel}>Set up NN again</span>
            <span className={styles.rowHint}>Appearance, motion and REN&apos;s voice</span>
          </span>
          <Icon name="expand" size={16} className={styles.chevron} />
        </button>
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
        <RecoveryRow signedIn={user !== null} />
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
