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
 * One card, the mark arriving through glass, and one button. Everything that
 * used to be on this screen explained a mechanism nobody needs explained
 * twice.
 *
 * Four states, decided by the server rather than guessed at:
 *
 * - **claim** — nobody owns this environment. Needs the bootstrap secret as
 *   well as a passkey, because the site is public and the first visitor
 *   would otherwise become the owner. A password is set in the same
 *   ceremony, so the way back exists from the first minute.
 * - **passkey** — the ordinary way in.
 * - **password** — the *other* ordinary way in, offered plainly rather than
 *   hidden behind a failure. A passkey lives on one device, and an
 *   environment reachable only from one device is one you lose with it.
 * - **arm** — claimed, but no password was ever stored. Offered with the
 *   bootstrap secret, once; the offer disappears the moment it is taken.
 *
 * A password is weaker than a passkey and this does not pretend otherwise —
 * it is scrypt-hashed, rate-limited twice and locked out globally after five
 * wrong guesses. But a passkey the founder cannot use is worth nothing at
 * all, and that is the comparison that actually matters.
 */

type Mode = "claim" | "passkey" | "password" | "arm";

export function SignIn() {
  const router = useRouter();
  const { phase, endedReason } = useAuth();
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [password, setPassword] = useState("");
  const [chosen, setChosen] = useState<Mode | null>(null);

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

  /* A deployment whose server has no credentials cannot verify anything, and
     must say so rather than offering a button that will always fail. */
  const unconfigured = phase === "unconfigured" || (status !== null && !status.configured);
  const claimed = status !== null && status.configured && status.claimed;
  const hasPassword = status?.hasPassword === true;

  const mode: Mode = chosen ?? (status === null ? "passkey" : claimed ? "passkey" : "claim");
  const strength = password.length > 0 ? assessRecoveryPassword(password) : null;
  const strong = strength !== null && strength.ok;

  const label =
    mode === "claim" ? "Claim NN"
      : mode === "password" ? "Unlock NN"
        : mode === "arm" ? "Save this password"
          : "Sign in with passkey";

  const blocked =
    busy || status === null || unconfigured
    || (mode === "claim"
      && (supported !== true || !status.bootstrapReady || secret.length === 0 || !strong))
    || (mode === "passkey" && supported !== true)
    || (mode === "password" && password.length === 0)
    || (mode === "arm" && (secret.length === 0 || !strong));

  const act = () => void run(async () => {
    if (mode === "password") {
      await signInWithRecoveryPassword(password);
      return;
    }
    if (mode === "arm") {
      await setRecoveryPassword(password, { bootstrapSecret: secret });
      setPassword("");
      setSecret("");
      setChosen("password");
      setNote("Saved. Sign in with it now.");
      setStatus((was) => (was === null ? was : { ...was, hasPassword: true }));
      return;
    }
    if (mode === "claim") {
      await registerPasskey({ bootstrapSecret: secret, label: "First device" });
      await signInWithPasskey();
      // Second, and only once the session exists.
      await setRecoveryPassword(password, {});
      return;
    }
    await signInWithPasskey();
  });

  const wantsSecret = mode === "claim" || mode === "arm";
  const wantsPassword = mode !== "passkey";

  const reset = (next: Mode) => {
    setChosen(next);
    setError(null);
    setNote(null);
    setPassword("");
    setSecret("");
  };

  return (
    <main className={s.page}>
      <div className={s.aurora} aria-hidden="true" />

      <div className={s.card}>
        <div className={s.mark}>
          <LogoReveal size={132} duration={2400} />
        </div>

        {/* The environment's name, for anything that reads rather than looks. */}
        <h1 className={s.name}>NN</h1>

        {unconfigured ? (
          <p className={s.error} role="alert">
            This deployment has no server credentials, so it cannot verify a
            passkey. See <code>docs/DEPLOY_VERCEL.md</code>.
          </p>
        ) : null}

        {!unconfigured && (wantsSecret || wantsPassword) ? (
          <div className={s.secret}>
            {wantsSecret ? (
              <TextField
                label="Bootstrap secret"
                type="password"
                autoComplete="off"
                value={secret}
                onChange={(e) => setSecret(e.currentTarget.value)}
              />
            ) : null}
            {wantsPassword ? (
              <TextField
                label={mode === "password" ? "Password" : "Choose a password"}
                type="password"
                autoComplete={mode === "password" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                {...(mode === "password"
                  ? {}
                  : strength !== null && !strength.ok
                    ? { hint: strength.reason }
                    : { hint: "Sixteen characters or more. Write it down somewhere only you can reach." })}
              />
            ) : null}
          </div>
        ) : null}

        {!unconfigured ? (
          <button
            type="button"
            className={s.enter}
            data-busy={busy || undefined}
            disabled={blocked}
            onClick={act}
          >
            <span className={s.enterScan} aria-hidden="true" />
            <span className={s.enterLabel}>{label}</span>
          </button>
        ) : null}

        {endedReason !== null ? <p className={s.note}>{endedReason}</p> : null}
        {note !== null ? <p className={s.note}>{note}</p> : null}

        {error !== null ? (
          <p className={s.error} role="alert" data-testid="signin-error">{error}</p>
        ) : null}

        {supported === false && mode === "passkey" ? (
          <p className={s.error} role="alert" data-testid="signin-unsupported">
            This browser does not support passkeys. Use the password instead.
          </p>
        ) : null}

        {/* The other way in, offered plainly. A founder who has just lost a
            device should not have to fail twice to discover NN has a door
            for them. */}
        {claimed && mode !== "passkey" ? (
          <button type="button" className={s.guestButton} onClick={() => reset("passkey")}>
            Use my passkey
          </button>
        ) : null}

        {/* Offered whenever NN has an owner, and deliberately *not* gated on
            `hasPassword`. That flag is a convenience for labelling the
            screen, and it has already been wrong once — a dropped field in
            the status client hid this button while the password behind it
            worked perfectly, which is a lockout caused entirely by the UI.
            The server is the authority on whether the password opens: if
            none is set it refuses, which costs one honest error message. A
            hidden door costs the environment. */}
        {claimed && mode === "passkey" ? (
          <button type="button" className={s.guestButton} onClick={() => reset("password")}>
            Use my password
          </button>
        ) : null}

        {claimed && mode === "passkey" && !hasPassword ? (
          <button type="button" className={s.guestButton} onClick={() => reset("arm")}>
            Set a password
          </button>
        ) : null}

        {/* Offered until this environment has an owner to protect — which
            includes a deployment with no server credentials, where it is the
            only thing that works and where local development lives. */}
        {!claimed && previewOffered() ? (
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
