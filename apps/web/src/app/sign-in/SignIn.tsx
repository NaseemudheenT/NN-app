"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, GlassPanel, NNGlassMark, TextField } from "@/components/ui";
import {
  fetchAuthStatus, passkeysSupported, registerPasskey, signInWithPasskey,
  useAuth, type AuthStatus,
} from "@/lib/auth";
import s from "./signin.module.css";

/**
 * The door to NN.
 *
 * Two states, decided by the server: claim an unowned environment, or sign in
 * to a claimed one. The fingerprint below is a symbol — the actual biometric
 * check happens inside the device's own authenticator, and NN never receives
 * or stores biometric data.
 */
export function SignIn() {
  const router = useRouter();
  const { phase, endedReason } = useAuth();
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const supported = passkeysSupported();

  useEffect(() => {
    if (phase === "signed-in") router.replace("/workspace");
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

  if (phase === "unconfigured") {
    return (
      <main className={s.page}>
        <GlassPanel tier={3} padding="lg" className={s.card}>
          <div className={s.mark}><NNGlassMark size={64} /></div>
          <h1 className={s.title}>NN is not configured</h1>
          <p className={s.lede}>
            Firebase credentials are missing. Copy <code>.env.example</code> to{" "}
            <code>.env.local</code> and fill it in, then reload.
          </p>
        </GlassPanel>
      </main>
    );
  }

  const claiming = status !== null && !status.claimed;

  return (
    <main className={s.page}>
      <GlassPanel tier={3} padding="lg" className={s.card}>
        <div className={s.mark}><NNGlassMark size={64} /></div>

        <h1 className={s.title}>
          {status === null ? "NN" : claiming ? "Claim NN" : "Welcome back, Founder."}
        </h1>

        <p className={s.lede}>
          {status === null
            ? "Checking this environment…"
            : claiming
              ? "This environment has no owner yet. Claim it with your bootstrap secret and the passkey on this device."
              : "Sign in with the passkey on this device."}
        </p>

        <div className={s.fingerprint} aria-hidden="true">
          <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="1.3" strokeLinecap="round">
            <path d="M12 10a2 2 0 0 1 2 2c0 2.6-.4 5.1-1.2 7.5" />
            <path d="M8.6 19.8A14 14 0 0 0 10 12a2 2 0 0 1 3.9-.6" />
            <path d="M5.5 17.5A17 17 0 0 0 6.5 12a5.5 5.5 0 0 1 9.9-3.3" />
            <path d="M17.5 11.5a21 21 0 0 1-.8 6.3" />
            <path d="M3.5 13.5A20 20 0 0 1 4 10a8 8 0 0 1 14.6-3" />
          </svg>
        </div>

        {status !== null && claiming ? (
          <div className={s.secret}>
            <TextField
              label="Bootstrap secret"
              type="password"
              autoComplete="off"
              value={secret}
              onChange={(e) => setSecret(e.currentTarget.value)}
              hint={
                status.bootstrapReady
                  ? "From NN_BOOTSTRAP_SECRET in your .env.local."
                  : "NN_BOOTSTRAP_SECRET is not set or is too short. See docs/AUTHENTICATION.md."
              }
            />
          </div>
        ) : null}

        <div className={s.actions}>
          {status !== null && claiming ? (
            <Button
              variant="primary" size="lg" loading={busy}
              disabled={!supported || !status.bootstrapReady || secret.length === 0}
              onClick={() => void run(async () => {
                await registerPasskey({ bootstrapSecret: secret, label: "First device" });
                await signInWithPasskey();
              })}
            >
              Claim NN with a passkey
            </Button>
          ) : (
            <Button
              variant="primary" size="lg" loading={busy} disabled={!supported || status === null}
              onClick={() => void run(signInWithPasskey)}
            >
              Sign in with passkey
            </Button>
          )}
        </div>

        {endedReason !== null ? <p className={s.note}>{endedReason}</p> : null}

        {error !== null ? <p className={s.error} role="alert" data-testid="signin-error">{error}</p> : null}

        {!supported ? (
          <p className={s.error} role="alert" data-testid="signin-unsupported">
            This browser does not support passkeys. Use a recent Safari, Chrome or Edge.
          </p>
        ) : null}

        <p className={s.note}>
          The fingerprint above is a symbol. Your device performs the biometric check
          itself — NN never receives or stores biometric data, only a public key.
        </p>
      </GlassPanel>
    </main>
  );
}
