import { useEffect, useState } from "react";

/**
 * The current time — but only once the browser has it.
 *
 * Anything formatted from a clock is a hydration hazard. The server renders
 * in its own timezone and locale at its own instant; the browser renders in
 * the founder's, milliseconds later. "Thursday, 13 November" and "in 20
 * minutes" are both different strings in the two places, and React throws the
 * whole subtree away and rebuilds it when it finds them disagreeing.
 *
 * So this returns `null` until the component has mounted. A surface reading
 * it renders the time-dependent part as nothing on the server and fills it in
 * on the client, which is the only arrangement where the two agree. It is not
 * a workaround: the server genuinely does not know what time it is where the
 * founder is, and pretending otherwise is what causes the bug.
 */
export function useClock(intervalMs = 60_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}

/** "in 20 minutes", "3 days ago" — said the way the founder would say it. */
export function relativeTime(date: Date, now: number): string {
  const seconds = Math.round((date.getTime() - now) / 1000);
  const units: ReadonlyArray<[Intl.RelativeTimeFormatUnit, number]> = [
    ["second", 60], ["minute", 60], ["hour", 24], ["day", 7], ["week", 4.35],
    ["month", 12], ["year", Number.POSITIVE_INFINITY],
  ];
  let value = seconds;
  for (const [unit, size] of units) {
    if (Math.abs(value) < size) {
      return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
        .format(Math.round(value), unit);
    }
    value /= size;
  }
  return date.toLocaleDateString();
}
