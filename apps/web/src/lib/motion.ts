/**
 * NN's motion engine.
 *
 * Every cinematic surface in NN — the intro tunnel, the coverflow, the
 * pointer-tracked lighting — needs the same three things: a spring that
 * smooths a scalar, a frame loop that stops when nobody is looking, and one
 * honest answer about whether the founder wants motion at all.
 *
 * This is deliberately not a dependency. The springs below are the same
 * semi-implicit Euler integrator a motion library ships, and keeping it here
 * means every animated value in NN is written straight to a CSS custom
 * property or a transform — never through React state, so a pointer moving
 * across the screen causes zero re-renders.
 */

/** Matches NN's two motion switches: the OS preference and the explicit one. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (document.documentElement.dataset["motion"] === "reduced") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Calls `listener` whenever either motion switch changes. Returns a cleanup. */
export function onMotionPreferenceChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", listener);
  const observer = new MutationObserver(listener);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-motion"],
  });
  return () => {
    query.removeEventListener("change", listener);
    observer.disconnect();
  };
}

export interface SpringConfig {
  stiffness?: number;
  damping?: number;
  mass?: number;
  /** Below this distance *and* speed the spring snaps and reports itself done. */
  rest?: number;
}

export interface Spring {
  /** Current smoothed value. */
  readonly value: number;
  /** Where the spring is heading. Read this, not `value`, to step targets. */
  readonly target: number;
  set(target: number): void;
  /** Jumps both value and target, killing velocity. For resets and teleports. */
  reset(value: number): void;
  /** Advances by `dt` seconds. Returns false once settled. */
  step(dt: number): boolean;
  readonly settled: boolean;
}

/**
 * A critically-dampened-by-default spring.
 *
 * Integrated at a fixed 240 Hz substep rather than once per frame, so the
 * result is identical whether the display runs at 60 Hz or 120 Hz and a
 * dropped frame cannot overshoot.
 */
export function createSpring(initial: number, config: SpringConfig = {}): Spring {
  const stiffness = config.stiffness ?? 80;
  const damping = config.damping ?? 30;
  const mass = config.mass ?? 1;
  const rest = config.rest ?? 0.0002;
  const SUBSTEP = 1 / 240;

  let value = initial;
  let target = initial;
  let velocity = 0;
  let settled = true;

  return {
    get value() {
      return value;
    },
    get target() {
      return target;
    },
    get settled() {
      return settled;
    },
    set(next: number) {
      if (next === target) return;
      target = next;
      settled = false;
    },
    reset(next: number) {
      value = next;
      target = next;
      velocity = 0;
      settled = true;
    },
    step(dt: number) {
      if (settled) return false;
      // Clamp the slice so a backgrounded tab returning after ten seconds
      // does not integrate ten seconds of force in one go.
      let remaining = Math.min(dt, 0.1);
      while (remaining > 0) {
        const h = Math.min(SUBSTEP, remaining);
        remaining -= h;
        const force = -stiffness * (value - target);
        const damper = -damping * velocity;
        velocity += ((force + damper) / mass) * h;
        value += velocity * h;
      }
      if (Math.abs(target - value) < rest && Math.abs(velocity) < rest * 60) {
        value = target;
        velocity = 0;
        settled = true;
        return false;
      }
      return true;
    },
  };
}

/**
 * A frame loop that only runs while the element is on screen and the tab is
 * visible. NN is a PWA the founder leaves open — a shader painting 60 times a
 * second behind a scrolled-away section is a battery leak, not an animation.
 *
 * `frame` receives seconds elapsed since the previous frame.
 */
export function createFrameLoop(
  target: Element,
  frame: (dt: number, now: number) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  let handle: number | null = null;
  let last: number | null = null;
  let visible = !document.hidden;
  let onScreen = true;

  const tick = (now: number) => {
    const dt = last === null ? 1 / 60 : Math.min((now - last) / 1000, 0.1);
    last = now;
    frame(dt, now);
    handle = requestAnimationFrame(tick);
  };

  const sync = () => {
    const shouldRun = visible && onScreen;
    if (shouldRun && handle === null) {
      // Drop the stale timestamp so the first frame after a pause reports a
      // normal delta instead of the whole pause.
      last = null;
      handle = requestAnimationFrame(tick);
    } else if (!shouldRun && handle !== null) {
      cancelAnimationFrame(handle);
      handle = null;
    }
  };

  const onVisibility = () => {
    visible = !document.hidden;
    sync();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[entries.length - 1];
      if (!entry) return;
      onScreen = entry.isIntersecting;
      sync();
    },
    { rootMargin: "120px" },
  );
  observer.observe(target);

  sync();

  return () => {
    document.removeEventListener("visibilitychange", onVisibility);
    observer.disconnect();
    if (handle !== null) cancelAnimationFrame(handle);
  };
}

/** Linear map from one range to another, clamped at both ends. */
export function remap(
  input: number,
  fromLow: number,
  fromHigh: number,
  toLow: number,
  toHigh: number,
): number {
  if (fromHigh === fromLow) return toLow;
  const t = Math.min(1, Math.max(0, (input - fromLow) / (fromHigh - fromLow)));
  return toLow + (toHigh - toLow) * t;
}

/**
 * Piecewise-linear interpolation across matched stop arrays, the shape every
 * keyframe in the cinematic surfaces is written as: `[0, .18, .82, .98]` →
 * `[0, 1, 1, 0]`.
 */
export function rampAcross(
  input: number,
  stops: readonly number[],
  outputs: readonly number[],
): number {
  const first = outputs[0] ?? 0;
  if (stops.length === 0) return first;
  if (input <= (stops[0] ?? 0)) return first;
  for (let i = 1; i < stops.length; i += 1) {
    const high = stops[i];
    const low = stops[i - 1];
    const outHigh = outputs[i];
    const outLow = outputs[i - 1];
    if (high === undefined || low === undefined) break;
    if (outHigh === undefined || outLow === undefined) break;
    if (input <= high) return remap(input, low, high, outLow, outHigh);
  }
  return outputs[outputs.length - 1] ?? first;
}

export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}
