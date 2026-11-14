import type { CSSProperties } from "react";

/**
 * NN's glass, as numbers.
 *
 * How much glass is right depends on the room's light and on the screen, and
 * that is not a judgement to hardcode — so the founder can move it, and every
 * surface in NN reads the same five values. They are plain CSS custom
 * properties, which is also what lets REN retheme NN at runtime without a
 * single component knowing it happened.
 */
export interface GlassSettings {
  /** Backdrop blur in px. */
  blur: number;
  /** How opaque the sheet is, 0.08–0.9. */
  opacity: number;
  /** Backdrop saturation, 0.5–2. */
  saturation: number;
  /** Strength of the rim and the top sheen, 0–1. */
  edge: number;
  /** Tint, as a six-digit hex. */
  tint: string;
}

export const DEFAULT_GLASS: GlassSettings = {
  blur: 24,
  opacity: 0.34,
  saturation: 1.2,
  edge: 0.6,
  tint: "#9CC8FF",
};

/** Named settings worth one press, rather than five drags. */
export const GLASS_PRESETS: ReadonlyArray<{
  name: string;
  hint: string;
  value: Partial<GlassSettings>;
}> = [
  {
    name: "Clear",
    hint: "Almost no sheet. The room comes through.",
    value: { blur: 8, opacity: 0.12, saturation: 1.1, edge: 0.8 },
  },
  {
    name: "Frosted",
    hint: "NN as designed.",
    value: DEFAULT_GLASS,
  },
  {
    name: "Solid",
    hint: "For bright rooms and dense reading.",
    value: { blur: 32, opacity: 0.86, saturation: 1, edge: 0.35 },
  },
];

const bounded = (value: number, min: number, max: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

/**
 * Brings any input inside the range NN can actually render.
 *
 * Clamped rather than rejected: a value out of range is a slider that went
 * too far or a stored setting from an older build, and neither is a reason to
 * show the founder an error. A malformed tint falls back, because a broken
 * colour would silently paint the whole environment the wrong shade.
 */
export function normaliseGlass(value: Partial<GlassSettings> | undefined): GlassSettings {
  const v = value ?? {};
  return {
    blur: bounded(v.blur ?? DEFAULT_GLASS.blur, 0, 40, DEFAULT_GLASS.blur),
    opacity: bounded(v.opacity ?? DEFAULT_GLASS.opacity, 0.08, 0.9, DEFAULT_GLASS.opacity),
    saturation: bounded(v.saturation ?? DEFAULT_GLASS.saturation, 0.5, 2, DEFAULT_GLASS.saturation),
    edge: bounded(v.edge ?? DEFAULT_GLASS.edge, 0, 1, DEFAULT_GLASS.edge),
    tint: /^#[0-9a-f]{6}$/i.test(v.tint ?? "") ? v.tint! : DEFAULT_GLASS.tint,
  };
}

/** The five values as the custom properties every NN surface reads. */
export function glassVariables(settings: GlassSettings): CSSProperties {
  return {
    "--nn-glass-blur": `${settings.blur}px`,
    "--nn-glass-opacity": String(settings.opacity),
    "--nn-glass-saturation": String(settings.saturation),
    "--nn-glass-edge": String(settings.edge),
    "--nn-glass-tint": settings.tint,
  } as CSSProperties;
}

/** Where the founder's choice is kept. Per device, because the room is. */
export const GLASS_STORAGE_KEY = "nn.glass";

/**
 * Reads the stored setting.
 *
 * Returns the default on anything unexpected — private browsing, a cleared
 * store, a half-written value. The environment opening at its default look is
 * not worth an error, and a thrown exception here would take the shell with it.
 */
export function readStoredGlass(): GlassSettings {
  if (typeof window === "undefined") return DEFAULT_GLASS;
  try {
    const raw = window.localStorage.getItem(GLASS_STORAGE_KEY);
    if (!raw) return DEFAULT_GLASS;
    return normaliseGlass(JSON.parse(raw) as Partial<GlassSettings>);
  } catch {
    return DEFAULT_GLASS;
  }
}

export function writeStoredGlass(settings: GlassSettings): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GLASS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable or full. The setting applies to this session
    // either way; losing it on reload is the right failure.
  }
}
