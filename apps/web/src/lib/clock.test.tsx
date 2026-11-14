import { describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { renderHook, act } from "@testing-library/react";
import { useClock, relativeTime } from "./clock";

describe("useClock", () => {
  it("has no time at all on the server", () => {
    let seen: number | null | undefined;
    function Probe() {
      seen = useClock();
      return <span>{seen === null ? "" : String(seen)}</span>;
    }
    // Exactly what Next renders during SSR. A number here would be a number
    // the browser is about to disagree with.
    expect(renderToString(<Probe />)).toBe("<span></span>");
    expect(seen).toBeNull();
  });

  it("has the time once mounted, and keeps it current", () => {
    vi.useFakeTimers();
    try {
      const { result } = renderHook(() => useClock(1000));
      expect(typeof result.current).toBe("number");
      const first = result.current!;
      act(() => { vi.advanceTimersByTime(1000); });
      expect(result.current!).toBeGreaterThanOrEqual(first);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops ticking when the surface goes away", () => {
    vi.useFakeTimers();
    try {
      const clear = vi.spyOn(window, "clearInterval");
      const { unmount } = renderHook(() => useClock(1000));
      unmount();
      expect(clear).toHaveBeenCalled();
      clear.mockRestore();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("relativeTime", () => {
  const now = Date.UTC(2026, 10, 13, 12, 0, 0);

  it("reads the way a person would say it", () => {
    expect(relativeTime(new Date(now + 20 * 60_000), now)).toMatch(/20 minutes/);
    expect(relativeTime(new Date(now - 3 * 86_400_000), now)).toMatch(/3 days ago/);
    expect(relativeTime(new Date(now), now)).toMatch(/now/);
  });

  it("knows the difference between ahead and behind", () => {
    expect(relativeTime(new Date(now + 7_200_000), now)).toMatch(/in 2 hours/);
    expect(relativeTime(new Date(now - 7_200_000), now)).toMatch(/2 hours ago/);
  });

  it("does not run out of units on a far date", () => {
    const far = relativeTime(new Date(now + 40 * 365 * 86_400_000), now);
    expect(far.length).toBeGreaterThan(0);
  });
});
