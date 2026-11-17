"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogoReveal } from "@/components/ui/LogoReveal";
import { TextField } from "@/components/ui";
import {
  fetchAuthStatus, passkeysSupported, registerPasskey, setRecoveryPassword,
  signInWithPasskey, signInWithRecoveryPassword, useAuth, type AuthStatus,
} from "@/lib/auth";
import { assessRecoveryPassword } from "@nn/auth/recovery-policy";
import { enterPreview, leavePreview, previewOffered } from "@/lib/preview";
import s from "./signin.module.css";

/**
 * The door to NN.
 *
 * One card, the mark arriving through glass, and one button. The founder
 * asked for nothing else on it and they are right: this screen has exactly
 * one thing to do, the device performs the check itself, and every sentence
 * that used to be here was explaining a mechanism nobody needs explained
 * twice. What is left is the environment's own name and the way in.
 *
 * Two states, decided by the server rather than guessed at:
 *
 * - **Unclaimed.** Nobody owns this environment yet. The claim needs the
 *   bootstrap secret as well as a passkey, because the site is public and
 *   the first visitor would otherwise become the owner. One field, one
 *   button, and it happens once in the life of the environment.
 * - **Claimed.** The passkey button, alone.
 *
 * Nothing that could be untrue is on screen: the browser's passkey support
 * is unknown until the client has actually asked, errors appear only when
 * something has actually failed, and the preview door is offered only while
 * the environment has no owner to protect.
 */
export function SignIn() {
  const router = useRouter();
  const { phase, endedReason } = useAuth();
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  /**
   * The way back in, offered only after the passkey has actually failed.
   *
   * The door is the mark and one button, and it stays that way: a recovery
   * path shown before anything has gone wrong is an invitation to use the
   * weaker credential by default, which is how a passkey environment quietly
   * becomes a password one.
   */
  const [recovering, setRecovering] = useState(false);
  const [recovery, setRecovery] = useState("");
  /**
   * The recovery password, set during the claim.
   *
   * It used to be settable only from Settings, which needs a session — so a
   * founder whose passkey would not work could not set the thing that exists
   * for exactly that case. A trap, and one NN walked into. Both credentials
   * are created in one ceremony now: the passkey, then immediately the way
   * back, while the session the claim just minted is still in hand.
   */
  const [backup, setBackup] = useState("");
  // Null until mounted. Asked during render, this is false on the server —
  // which made every visitor's sign-in page ship with "This browser does not
  // support passkeys" already in it, and React threw the page away on
  // hydration when the browser disagreed. Unknown is the honest third state.
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => { setSupported(passkeysSupported()); }, []);

  useEffect(() => {
    if (phase === "signed-in") {
      leavePreview();
      router.replace("/home");
    }
  }, [phase, router]);

  useEffect(() => {
    let cancelled = false;
    fetchAuthStatus()
      .then((v) => { if (!cancelled) setStatus(v); })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not reach NN.");
      });
    return () => { cancelled = true; };
  }, []);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const failed = error !== null || supported === false;
  const strength = backup.length > 0 ? assessRecoveryPassword(backup) : null;
  const strongEnough = strength !== null && strength.ok;

  /* A deployment whose server has no credentials cannot verify a passkey, and
     must say so rather than offering a button that will always fail. */
  const unconfigured = phase === "unconfigured" || (status !== null && !status.configured);
  const claiming = status !== null && status.configured && !status.claimed;
  const ready = status !== null && status.configured && status.claimed;

  return (
    <main className={s.page}>
      <div className={s.aurora} aria-hidden="true" />

      <div className={s.card}>
        <div className={s.mark}>
          <LogoReveal size={132} duration={2400} />
        </div>

        {/* The environment's name, for anything that reads rather than looks.
            The mark above says it to everyone else. */}
        <h1 className={s.name}>NN</h1>

        {unconfigured ? (
          <p className={s.error} role="alert">
            This deployment has no server credentials, so it cannot verify a
            passkey. See <code>docs/DEPLOY_VERCEL.md</code>.
          </p>
        ) : null}

        {claiming ? (
          <div className={s.secret}>
            <TextField
              label="Bootstrap secret"
              type="password"
              autoComplete="off"
              value={secret}
              onChange={(e) => setSecret(e.currentTarget.value)}
            />
            <TextField
              label="Recovery password"
              type="password"
              autoComplete="new-password"
              value={backup}
              onChange={(e) => setBackup(e.currentTarget.value)}
              hint={
                strength !== null && !strength.ok
                  ? strength.reason
                  : "Your way back if the passkey ever cannot be used. Sixteen characters or more — write it down somewhere only you can reach."
              }
            />
          </div>
        ) : null}

        {!unconfigured && recovering ? (
          <div className={s.secret}>
            <TextField
              label="Recovery password"
              type="password"
              autoComplete="current-password"
              value={recovery}
              onChange={(e) => setRecovery(e.currentTarget.value)}
            />
          </div>
        ) : null}

        {!unconfigured ? (
          <button
            type="button"
            className={s.enter}
            data-busy={busy || undefined}
            disabled={
              busy ||
              (recovering
                ? recovery.length === 0
                : supported !== true || status === null ||
                  (claiming && (!status.bootstrapReady || secret.length === 0 || !strongEnough)))
            }
            onClick={() => void run(async () => {
              if (recovering) {
                await signInWithRecoveryPassword(recovery);
                return;
              }
              if (claiming) {
                await registerPasskey({ bootstrapSecret: secret, label: "First device" });
                await signInWithPasskey();
                // Second, and only once the session exists. If this throws,
                // the founder is still signed in and can set it in Settings —
                // so the failure is reported, not swallowed.
                await setRecoveryPassword(backup);
                return;
              }
              await signInWithPasskey();
            })}
          >
            <span className={s.enterScan} aria-hidden="true" />
            <span className={s.enterLabel}>
              {recovering
                ? "Unlock NN"
                : claiming ? "Claim NN with a passkey" : "Sign in with passkey"}
            </span>
          </button>
        ) : null}

        {endedReason !== null ? <p className={s.note}>{endedReason}</p> : null}

        {error !== null ? (
          <p className={s.error} role="alert" data-testid="signin-error">{error}</p>
        ) : null}

        {supported === false ? (
          <p className={s.error} role="alert" data-testid="signin-unsupported">
            This browser does not support passkeys. Use a recent Safari, Chrome or Edge.
          </p>
        ) : null}

        {/* Only after the passkey has actually failed. Until then there is
            nothing here, which is the whole design of this screen. */}
        {ready && failed && !recovering ? (
          <button
            type="button"
            className={s.guestButton}
            onClick={() => { setRecovering(true); setError(null); }}
          >
            Use my recovery password
          </button>
        ) : null}

        {recovering ? (
          <button
            type="button"
            className={s.guestButton}
            onClick={() => { setRecovering(false); setRecovery(""); setError(null); }}
          >
            Back to the passkey
          </button>
        ) : null}

        {/* Offered only while nobody owns this environment. Once the founder
            has claimed it, a public door into their own surfaces — even one
            that grants no session and can read nothing — is a door that
            should not be there. */}
        {!ready && !unconfigured && previewOffered() ? (
          <button
            type="button"
            className={s.guestButton}
            onClick={() => { enterPreview(); router.replace("/home"); }}
          >
            Explore NN without an account
          </button>
        ) : null}
      </div>
    </main>
  );
}
