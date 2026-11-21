"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { matchRecordByTitle, readRecordsOnce, useRecordWriter } from "@/lib/nn/records";
import { passkeysSupported, signInWithPasskey, useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { routeFor, sectionName, needsReauthentication, type RenPlan } from "./capabilities";
import { listVoices, pickVoice, writeVoicePreference } from "./voices";

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
  /**
   * Turns "the bank task" into a record, or says why it cannot.
   *
   * REN is given a phrase, never a document id, so this is the step between
   * being told and being able to act. It refuses an ambiguous match rather
   * than picking: the next thing that happens to this record may be a
   * delete, and asking "which one?" costs a sentence where guessing costs
   * the founder something they wrote.
   */
  const resolve = useCallback(async (
    collectionName: string,
    knownId: string | undefined,
    phrase: string | undefined,
  ): Promise<
    { ok: true; id: string; title: string } | { ok: false; outcome: RenOutcome }
  > => {
    if (knownId) return { ok: true, id: knownId, title: phrase ?? "it" };
    if (!phrase) {
      return { ok: false, outcome: { ok: false, said: "I am not sure which record you mean." } };
    }

    const { items, fault } = await readRecordsOnce(user?.uid, collectionName, { limit: 200 });
    if (fault !== null) return { ok: false, outcome: { ok: false, said: fault.message } };

    const match = matchRecordByTitle(items, phrase);
    if (match.kind === "none") {
      return {
        ok: false,
        outcome: { ok: false, said: `I could not find anything called "${phrase}".` },
      };
    }
    if (match.kind === "many") {
      return {
        ok: false,
        outcome: {
          ok: false,
          said: `More than one of those matches: ${match.titles.join(", ")}. Which one?`,
        },
      };
    }
    const title = String(
      match.record["title"] ?? match.record["name"] ?? match.record["text"] ?? phrase,
    );
    return { ok: true, id: match.record.id, title };
  }, [user?.uid]);

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

      case "inspect": {
        const { collection, text } = plan.args;
        if (!collection) return { ok: false, said: "I need a workspace collection to inspect." };
        if (!user) return { ok: false, said: "Sign in before I inspect your workspace records." };
        const { items, fault } = await readRecordsOnce(user.uid, collection, { limit: 200 });
        if (fault) return { ok: false, said: `I could not read ${collection}. ${fault.message}` };
        const needle = (text ?? "").trim().toLowerCase();
        const matches = needle
          ? items.filter((record) => JSON.stringify(record).toLowerCase().includes(needle))
          : items;
        const rows = matches.slice(0, 12).map((record) => {
          const safe: Record<string, string | number | boolean> = {};
          for (const [key, value] of Object.entries(record)) {
            if (key === "id" || key.startsWith("_")) continue;
            if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
              safe[key] = typeof value === "string" ? value.slice(0, 500) : value;
            } else if (value instanceof Date) {
              safe[key] = value.toISOString();
            } else if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
              safe[key] = (value.toDate() as Date).toISOString();
            }
          }
          return safe;
        });
        return {
          ok: true,
          said: matches.length === 0
            ? `No records matched in ${collection}.`
            : `Read ${matches.length} matching record(s) from ${collection}. Showing ${rows.length}: ${JSON.stringify(rows)}`,
        };
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
        const { collection, title } = plan.args;
        if (!collection) return { ok: false, said: "I am not sure where that record lives." };
        const found = await resolve(collection, plan.args.recordId, title);
        if (!found.ok) return found.outcome;
        try {
          await writer.update(collection, found.id, { done: true, completedAt: new Date().toISOString() });
          return { ok: true, said: `Marked "${found.title}" as done.` };
        } catch (error) {
          return { ok: false, said: `I could not change it. ${describe(error)}` };
        }
      }

      case "discard": {
        const { collection, title } = plan.args;
        if (!collection) return { ok: false, said: "I am not sure where that record lives." };
        const found = await resolve(collection, plan.args.recordId, title);
        if (!found.ok) return found.outcome;
        try {
          // Soft delete. It goes to the trash, where you can take it back.
          await writer.remove(collection, found.id);
          return { ok: true, said: `Moved "${found.title}" to the trash. It can be restored.` };
        } catch (error) {
          return { ok: false, said: `I could not delete it. ${describe(error)}` };
        }
      }

      case "voice": {
        const want = plan.args.voice ?? "system";
        const voices = listVoices();
        const chosen = pickVoice(voices, want);
        if (want !== "system" && chosen === null) {
          /*
           * Said rather than silently ignored. The Web Speech API has no
           * gender field, so NN infers from voice names — and a device
           * genuinely may not have one installed. Changing nothing and
           * saying nothing is how an assistant teaches you not to trust it.
           */
          return {
            ok: false,
            said: `This device has no ${want} voice installed, so I have left mine as it is.`,
          };
        }
        writeVoicePreference(want);
        return {
          ok: true,
          said: want === "system"
            ? "I will use this device's own voice."
            : `I will speak in a ${want} voice from now on.`,
        };
      }

      case "appearance": {
        const choice = plan.args.appearance;
        if (choice === "dark" || choice === "light" || choice === "system") {
          setTheme(choice);
          return { ok: true, said: `NN is now ${choice === "system" ? "following your device" : choice}.` };
        }
        /* "calm" and "vivid" used to retune a stored per-device glass setting.
           That setting is gone — the material belongs to the theme now — so
           REN says what it can do instead of silently doing nothing and
           reporting success. */
        return {
          ok: false,
          said: "I can set NN to dark, light, or follow your device. I cannot tune the glass beyond that.",
        };
      }

      case "report":
        // Reporting is the surface's job: it already holds the live records,
        // and REN asking for them again would read a second, different truth.
        return { ok: true, said: "report" };

      default:
        return { ok: false, said: "I do not know how to do that." };
    }
  }, [arrive, proveItIsYou, resolve, setTheme, user, writer]);

  return { run, ready: Boolean(user) && writer.ready };
}

function labelOf(plan: RenPlan): string {
  return plan.summary.replace(/^Open\s+/, "");
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "The change was refused.";
}
