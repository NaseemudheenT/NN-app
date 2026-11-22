"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Noticing that a newer NN exists.
 *
 * A deployed web app is the one kind of software that can be replaced
 * underneath you without telling you. The founder keeps NN open on a phone
 * for days; a tab opened on Monday is still running Monday's build on
 * Thursday, quietly missing every fix made since — and the only symptom is
 * that something stays broken after being fixed, which is the most
 * confusing failure there is.
 *
 * So NN asks the server what it is now, and compares that with what this
 * page was loaded from.
 *
 * Three decisions worth stating:
 *
 * - **It never reloads on its own.** An environment that refreshes itself
 *   while you are typing is worse than one that is out of date. NN offers;
 *   the founder decides.
 * - **It only asks when it could matter.** On returning to the tab, and
 *   slowly otherwise. Polling a version endpoint every few seconds is a
 *   cost with no benefit — deployments are not that frequent.
 * - **A failed check is not an update.** No network, no claim.
 */

/** Deliberately slow. A deployment is not a thing that happens every minute. */
const EVERY = 10 * 60 * 1000;

export interface UpdateState {
  /** What this page was loaded from. */
  running: string | null;
  /** What the server says it is now. */
  available: string | null;
  /** True when those differ and both are known. */
  ready: boolean;
  /** Reload onto the new build. */
  apply: () => void;
}

async function askServer(): Promise<string | null> {
  try {
    const response = await fetch("/api/nn/version", { cache: "no-store" });
    if (!response.ok) return null;
    const body = (await response.json()) as { build?: string };
    return typeof body.build === "string" ? body.build : null;
  } catch {
    // Offline, or NN is mid-deploy. Either way there is nothing to claim.
    return null;
  }
}

export function useUpdate(): UpdateState {
  const [running, setRunning] = useState<string | null>(null);
  const [available, setAvailable] = useState<string | null>(null);

  const check = useCallback(async () => {
    const now = await askServer();
    if (now === null) return;
    setRunning((was) => {
      // The first answer is what this page is running: it was loaded from
      // whatever the server was serving a moment ago.
      if (was === null) return now;
      return was;
    });
    setAvailable(now);
  }, []);

  useEffect(() => {
    void check();

    const onReturn = () => { if (!document.hidden) void check(); };
    document.addEventListener("visibilitychange", onReturn);
    const timer = window.setInterval(() => { void check(); }, EVERY);

    return () => {
      document.removeEventListener("visibilitychange", onReturn);
      window.clearInterval(timer);
    };
  }, [check]);

  const apply = useCallback(() => {
    // A hard reload, because the point is to stop using what is cached.
    window.location.reload();
  }, []);

  return {
    running,
    available,
    ready: running !== null && available !== null && running !== available,
    apply,
  };
}
