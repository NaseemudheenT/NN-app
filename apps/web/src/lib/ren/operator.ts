"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useRecordWriter } from "@/lib/nn/records";
import { passkeysSupported, signInWithPasskey, useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { normaliseGlass, readStoredGlass, writeStoredGlass } from "@/lib/glass";
import { routeFor, sectionName, needsReauthentication, type RenPlan } from "./capabilities";

/**
 * REN's hands.
 *
 * This is where a plan becomes something that happened. Every path through it
 * ends in an outcome REN observed — a record id it got back, a route the
 * browser actually arrived at, a theme the document is actually wearing. REN
 * never reports success from the fact that it asked.
 *
 * Two gates stand in front of it, and neither is cosmetic:
 *
 * - Anything that writes is confirmed by the founder first. That happens in
 *   the surface, before `run` is called.
 * - Anything sensitive is re-authenticated *here*, by the device. NN asks the
 *   authenticator for a fresh assertion; the device runs Face ID or Touch ID
 *   itself and hands back a signature. NN never sees a face or a fingerprint,
 *   only proof that the device checked. Deleting one of the founder's records
 *   therefore costs exactly what signing in costs, which is the point.
 */

export type RenOutcome =
  | { ok: true; said: string }
  /** REN tried and it did not work. `said` is what went wrong, in plain words. */
  | { ok: false; said: string }
  /** The founder declined at the biometric prompt. Not a failure. */
  | { ok: false; cancelled: true; said: string };

const NAVIGATION_TIMEOUT_MS = 4500;

export interface RenOperator {
  run: (plan: RenPlan) => Promise<RenOutcome>;
  /** True when REN has a session and could actually write. */
  ready: boolean;
}

export function useRenOperator(): RenOperator {
  const router = useRouter();
  const writer = useRecordWriter();
  const { user } = useAuth();
  const { setTheme } = useTheme();
  // Held so a navigation started by one plan is not awaited by the next.
  const journey = useRef(0);

  /**
   * Waits for the browser to actually be at `to`.
   *
   * The router resolving is not the same as arriving: a route can be
   * intercepted, redirected by the owner guard, or simply slow. REN waits for
   * the address to change and gives up honestly if it does not.
   */
  const arrive = useCallback(async (to: string): Promise<boolean> => {
    const trip = ++journey.current;
    router.push(to as Route);
    const deadline = Date.now() + NAVIGATION_TIMEOUT_MS;
    while (Date.now() < deadline) {
      await new Promise((resolve) => window.setTimeout(resolve, 90));
      if (journey.current !== trip) return false;   // superseded
      if (window.location.pathname === to) return true;
    }
    return false;
  }, [router]);

  /**
   * Asks the device to prove the founder is here.
   *
   * A full passkey ceremony: the authenticator performs the biometric check
   * and NN receives only the assertion. Nothing else in NN is allowed to
   * assert that the founder approved something.
   */
  const proveItIsYou = useCallback(async (): Promise<RenOutcome | null> => {
    if (!passkeysSupported()) {
      return {
        ok: false,
        said: "This device cannot do a biometric check, so I will not delete anything from it.",
      };
    }
    try {
      await signInWithPasskey();
      return null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // A cancelled prompt is the founder saying no, not a fault to report.
      if (/not allowed|abort|cancel|timed? ?out/i.test(message)) {
        return { ok: false, cancelled: true, said: "Cancelled. Nothing was changed." };
      }
      return { ok: false, said: `I could not confirm it was you. ${message}` };
    }
  }, []);

  const run = useCallback(async (plan: RenPlan): Promise<RenOutcome> => {
    if (needsReauthentication(plan)) {
      const refused = await proveItIsYou();
      if (refused) return refused;
    }

    switch (plan.capability) {
      case "open": {
        const to = routeFor(plan.args);
        if (!to) return { ok: false, said: "I do not know where that is." };
        const arrived = await arrive(to);
        return arrived
          ? { ok: true, said: `Opened ${plan.args.appId ? labelOf(plan) : "it"}.` }
          : { ok: false, said: `I asked NN to open ${to} and it did not arrive. You are still here.` };
      }

      case "find": {
        const term = (plan.args.text ?? "").trim();
        if (!term) return { ok: false, said: "I need something to look for." };
        const arrived = await arrive(`/search?q=${encodeURIComponent(term)}`);
        return arrived
          ? { ok: true, said: `Searching everything you have for "${term}".` }
          : { ok: false, said: "I could not open search." };
      }

      case "capture": {
        const { collection, title } = plan.args;
        if (!collection || !title) return { ok: false, said: "I need a title and somewhere to put it." };
        if (!writer.ready || !user) {
          return { ok: false, said: "You are not signed in, so I cannot write to your records." };
        }
        try {
          const id = await writer.create(collection, { title });
          // The id came back from Firestore, so the record exists. This is the
          // only kind of success REN is allowed to report.
          return {
            ok: true,
            said: `Added "${title}" to ${sectionName(collection) ?? collection}.`,
            ...(id ? {} : {}),
          };
        } catch (error) {
          return {
            ok: false,
            said: `I could not save that. ${error instanceof Error ? error.message : "The write was refused."}`,
          };
        }
      }

      case "complete": {
        const { collection, recordId, title } = plan.args;
        if (!collection || !recordId) return { ok: false, said: "I am not sure which record you mean." };
        try {
          await writer.update(collection, recordId, { done: true });
          return { ok: true, said: `Marked "${title ?? "it"}" as done.` };
        } catch (error) {
          return { ok: false, said: `I could not change it. ${describe(error)}` };
        }
      }

      case "discard": {
        const { collection, recordId, title } = plan.args;
        if (!collection || !recordId) return { ok: false, said: "I am not sure which record you mean." };
        try {
          // Soft delete. It goes to the trash, where you can take it back.
          await writer.remove(collection, recordId);
          return { ok: true, said: `Moved "${title ?? "it"}" to the trash. It can be restored.` };
        } catch (error) {
          return { ok: false, said: `I could not delete it. ${describe(error)}` };
        }
      }

      case "appearance": {
        const choice = plan.args.appearance;
        if (choice === "dark" || choice === "light" || choice === "system") {
          setTheme(choice);
          return { ok: true, said: `NN is now ${choice === "system" ? "following your device" : choice}.` };
        }
        // Calm and vivid are the glass, not the theme: less light or more.
        const current = readStoredGlass();
        const next = normaliseGlass(
          choice === "calm"
            ? { ...current, blur: 32, opacity: 0.74, saturation: 0.95, edge: 0.35 }
            : { ...current, blur: 16, opacity: 0.22, saturation: 1.5, edge: 0.9 },
        );
        writeStoredGlass(next);
        // The surfaces read this on mount, so the change needs a reload to be
        // seen everywhere. Saying so is better than a half-changed room.
        return {
          ok: true,
          said: choice === "calm"
            ? "Quietened NN's glass. Reopen a surface to see it everywhere."
            : "Brightened NN's glass. Reopen a surface to see it everywhere.",
        };
      }

      case "report":
        // Reporting is the surface's job: it already holds the live records,
        // and REN asking for them again would read a second, different truth.
        return { ok: true, said: "report" };

      default:
        return { ok: false, said: "I do not know how to do that." };
    }
  }, [arrive, proveItIsYou, setTheme, user, writer]);

  return { run, ready: Boolean(user) && writer.ready };
}

function labelOf(plan: RenPlan): string {
  return plan.summary.replace(/^Open\s+/, "");
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "The change was refused.";
}
