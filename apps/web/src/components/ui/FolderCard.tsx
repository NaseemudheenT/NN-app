"use client";

import * as React from "react";
import Link from "next/link";
import {
  ART_PRESETS,
  fanSlot,
  hashString,
  presetFor,
  rng,
  seedFor,
  type ArtPreset,
  type ArtRecipe,
} from "@/lib/folderArt";
import { paintArt } from "@/lib/artPainter";
import { prefersReducedMotion } from "@/lib/motion";
import { Icon, type IconName } from "./Icon";
import styles from "./FolderCard.module.css";

/**
 * An NN surface drawn as an object rather than a picture of one.
 *
 * Three real layers, back to front: a back panel holding generated NN
 * artwork, the things the surface contains, and a frosted front panel that
 * blurs whatever sits behind it. The contents are real elements between real
 * panels, so the glass frosts them as they move — nothing is faked with a
 * screenshot.
 *
 *   rest           flat and closed; the tops of the sheets only just show
 *   hover / focus  the front leans forward on its bottom hinge, sheets lift
 *   open           the panel falls further forward, sheets rise and fan out
 *
 * Opening is a real state the caller can own (`open`/`onOpenChange`) or let
 * the card keep for itself. Every sheet is a button or a link — never a
 * decorative rectangle that looks pressable and is not.
 */

/* ------------------------------------------------------------------ painter */

function ArtCanvas({
  art,
  seed,
  w,
  h,
  density,
  priority,
  paused,
  className,
}: {
  art: ArtPreset | ArtRecipe;
  seed: number;
  w: number;
  h: number;
  density: number;
  priority: number;
  /** Offscreen cards do not paint. Nothing is drawn that nobody can see. */
  paused: boolean;
  className?: string | undefined;
}) {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = React.useState(false);
  const recipe = typeof art === "string" ? ART_PRESETS[art] : art;
  const key = JSON.stringify(recipe);
  const pw = Math.round(w * density);
  const ph = Math.round(h * density);

  React.useEffect(() => {
    if (paused) return;
    let live = true;
    void paintArt(JSON.parse(key) as ArtRecipe, seed, pw, ph, priority).then((src) => {
      const canvas = ref.current;
      if (!live || !canvas) return;
      canvas.width = src.width;
      canvas.height = src.height;
      canvas.getContext("2d")?.drawImage(src, 0, 0);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [key, seed, pw, ph, priority, paused]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={className}
      data-ready={ready || undefined}
      style={{ width: w, height: h, maxWidth: "none" }}
    />
  );
}

/* ----------------------------------------------------------------- geometry */

/**
 * The stage is drawn at 340 × 272 and scaled to `width`, so every shape can
 * be a fixed path rather than arithmetic at render time.
 */
const W = 340;
const H = 272;
const HEADROOM = 54; // room above the back panel for the sheets to rise into
const FRONT_TOP = 74;
const FRONT_H = H - FRONT_TOP;

const BACK_PATH =
  "M0 56A22 22 0 0 1 22 34L146 34C170 34 172 0 198 0L318 0A22 22 0 0 1 340 22L340 250A22 22 0 0 1 318 272L22 272A22 22 0 0 1 0 250Z";
const FRONT_PATH =
  `M0 22A22 22 0 0 1 22 0L118 0C144 0 146 32 172 32L318 32A22 22 0 0 1 340 54L340 ${FRONT_H - 22}` +
  `A22 22 0 0 1 318 ${FRONT_H}L22 ${FRONT_H}A22 22 0 0 1 0 ${FRONT_H - 22}Z`;

/** Beyond four, the stack reads as a crowd rather than a set of things. */
const MAX_VISIBLE = 4;

/* -------------------------------------------------------------------- types */

export interface FolderSheet {
  /** What the thing is called. Shown on the sheet. */
  name: string;
  /** A short second line: a count, a date, a kind. Never invented. */
  meta?: string;
  /** An NN icon, for a sheet that is a place rather than a picture. */
  icon?: IconName;
  /** Generated NN artwork, for a sheet that is a picture. */
  art?: ArtPreset | ArtRecipe;
  /** Makes the sheet a link rather than a button. */
  href?: React.ComponentProps<typeof Link>["href"];
}

export interface FolderCardProps {
  label: string;
  /**
   * The second line on the front panel. Defaults to the number of sheets.
   * Pass your own only when you have something truer to say.
   */
  meta?: string;
  /** NN artwork for the back panel. Chosen from the label when omitted. */
  art?: ArtPreset | ArtRecipe | "none";
  /** A different arrangement of the same recipe. Derived from the label when omitted. */
  seed?: number;
  /** What the surface contains. */
  sheets?: readonly FolderSheet[];
  /** Where the label sits on the front panel. */
  labelPlacement?: "bottom-left" | "top-left" | "top-right";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: ((open: boolean) => void) | undefined;
  /** Called when a sheet is chosen while the card is open. */
  onSheetSelect?: ((sheet: FolderSheet, index: number) => void) | undefined;
  /** Width in px. Everything else scales with it. */
  width?: number;
  /** Assemble the first time the card scrolls into view. */
  appear?: boolean;
  /** Delay before that entrance, in ms — for staggering a row. */
  appearDelay?: number;
  /** Shown in place of the stack when there is genuinely nothing here. */
  emptyNote?: string;
  /**
   * The key at the folder's lower-right corner.
   *
   * A folder shows a bounded stack — beyond four, sheets read as a crowd
   * rather than a set of things — so whenever it holds more than it can show,
   * this is how the rest is reached. Without it the folder would be hiding
   * things, which is worse than looking busy.
   */
  actionLabel?: string;
  onAction?: (() => void) | undefined;
  className?: string | undefined;
  style?: React.CSSProperties | undefined;
}

/**
 * A card width that fits the viewport.
 *
 * FolderCard sizes itself from a pixel width — every shape inside it is a
 * fixed path scaled by that one number — so the responsive decision has to be
 * made in JavaScript rather than in a media query. This makes that decision
 * once, for everyone.
 *
 * Starts at the desktop width so the server and the first client render
 * agree, then measures.
 */
export function useFolderWidth(max = 320): number {
  const [width, setWidth] = React.useState(max);

  React.useEffect(() => {
    const measure = () => {
      const available = window.innerWidth;
      // A phone at 375 CSS px, minus the page gutters, leaves about 300.
      const fit = available < 420 ? available - 72 : available < 760 ? 268 : max;
      setWidth(Math.max(200, Math.min(max, fit)));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [max]);

  return width;
}

/* ---------------------------------------------------------------- component */

export function FolderCard({
  label,
  meta,
  art,
  seed,
  sheets = [],
  labelPlacement = "bottom-left",
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  onSheetSelect,
  width = 320,
  appear = true,
  appearDelay = 0,
  emptyNote = "Nothing here yet.",
  actionLabel,
  onAction,
  className,
  style,
}: FolderCardProps) {
  const uid = React.useId().replace(/:/g, "");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const sheetsRef = React.useRef<HTMLDivElement>(null);
  const hitRef = React.useRef<HTMLButtonElement>(null);

  const [openState, setOpenState] = React.useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOpenState(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );
  const [entered, setEntered] = React.useState(!appear);

  const scale = width / W;
  const material = art ?? presetFor(label);
  const grain = seed ?? seedFor(label);

  /* Painting resolution is capped deliberately. The founder's machine is an
     Intel Air and the phone is in a pocket; a retina-perfect noise field is
     not worth a stalled frame. */
  const density = React.useMemo(() => {
    if (typeof window === "undefined") return 1;
    const dpr = window.devicePixelRatio || 1;
    return Math.min(1.25, Math.max(1, dpr)) * Math.min(1, scale);
  }, [scale]);

  /* ---- entrance: assemble the first time the card is on screen ---------- */
  React.useEffect(() => {
    if (!appear) return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setEntered(true);
      return;
    }
    let timer = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        timer = window.setTimeout(
          () => setEntered(true),
          prefersReducedMotion() ? 0 : appearDelay,
        );
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [appear, appearDelay]);

  /* ---- light and parallax follow the cursor, without re-rendering ------- */
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el || prefersReducedMotion()) return;
    let raf = 0;
    let px = 0;
    let py = 0;
    const write = () => {
      raf = 0;
      el.style.setProperty("--fc-px", px.toFixed(3));
      el.style.setProperty("--fc-py", py.toFixed(3));
    };
    const move = (event: PointerEvent) => {
      // A finger is already touching the card; it does not also need a
      // cursor light following it around.
      if (event.pointerType === "touch") return;
      const box = el.getBoundingClientRect();
      px = ((event.clientX - box.left) / box.width) * 2 - 1;
      py = ((event.clientY - box.top) / box.height) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(write);
    };
    const leave = () => {
      px = 0;
      py = 0;
      if (!raf) raf = requestAnimationFrame(write);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* ---- a closed card's contents are out of the tab order ---------------- */
  React.useEffect(() => {
    sheetsRef.current?.toggleAttribute("inert", !open);
  }, [open]);

  /* ---- Escape, and a press outside, close the card ---------------------- */
  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      hitRef.current?.focus();
    };
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, setOpen]);

  // The newest sheets sit at the front of the stack, nearest the glass.
  const start = Math.max(0, sheets.length - MAX_VISIBLE);
  const visible = sheets.slice(start);
  const count = sheets.length;
  const metaLine = meta ?? (count === 1 ? "1 item" : `${count} items`);

  return (
    <div
      ref={rootRef}
      className={className ? `${styles.root} ${className}` : styles.root}
      data-open={open || undefined}
      data-entered={entered || undefined}
      data-place={labelPlacement}
      style={{ width, height: (H + HEADROOM) * scale, ...style }}
    >
      <div
        className={styles.stage}
        style={{ transform: `translateY(${HEADROOM * scale}px) scale(${scale})` }}
      >
        <div className={styles.tilt}>
          <div className={styles.shadow} aria-hidden="true" />

          {/* back panel and its artwork */}
          <div
            className={styles.back}
            style={{ clipPath: `path('${BACK_PATH}')` }}
            aria-hidden="true"
          >
            {material !== "none" ? (
              <ArtCanvas
                className={styles.art}
                art={material}
                seed={grain}
                w={W + 24}
                h={H + 24}
                density={density}
                priority={0}
                paused={!entered}
              />
            ) : null}
            <div className={styles.backSheen} />
          </div>
          <svg className={`${styles.rim} ${styles.backRim}`} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            <path d={BACK_PATH} />
          </svg>

          {/* the frosted front panel, hinged on its bottom edge */}
          <div className={styles.front} style={{ clipPath: `path('${FRONT_PATH}')` }}>
            <div className={styles.tint} aria-hidden="true" />
            <div className={styles.spec} aria-hidden="true" />
            <svg
              className={`${styles.rim} ${styles.frontRim}`}
              viewBox={`0 0 ${W} ${FRONT_H}`}
              aria-hidden="true"
            >
              <defs>
                <linearGradient id={`fc-rim-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#E7EDF6" stopOpacity="0.92" />
                  <stop offset="0.35" stopColor="#A9D9FF" stopOpacity="0.34" />
                  <stop offset="1" stopColor="#7A9CFF" stopOpacity="0.12" />
                </linearGradient>
              </defs>
              <path d={FRONT_PATH} stroke={`url(#fc-rim-${uid})`} />
            </svg>
            <button
              ref={hitRef}
              type="button"
              className={styles.hit}
              aria-expanded={open}
              aria-label={`${open ? "Close" : "Open"} ${label}, ${metaLine}`}
              onClick={() => setOpen(!open)}
            />
            <div className={styles.labelBlock}>
              <span className={styles.title}>{label}</span>
              <span className={styles.meta} key={metaLine}>
                {metaLine}
              </span>
            </div>
          </div>

          {/* the contents: after the glass in tab order, beneath it on screen */}
          <div
            ref={sheetsRef}
            className={styles.sheets}
            role="list"
            aria-label={`${label} contents`}
          >
            {visible.map((sheet, index) => {
              const slot = fanSlot(index, visible.length);
              const jitter = rng(hashString(sheet.name) + index);
              const picture = sheet.art !== undefined;
              const inner = (
                <>
                  {picture ? (
                    <ArtCanvas
                      className={styles.sheetArt}
                      art={sheet.art!}
                      seed={seedFor(sheet.name)}
                      w={272}
                      h={184}
                      density={Math.min(density, 1)}
                      priority={1}
                      paused={!entered}
                    />
                  ) : sheet.icon ? (
                    <span className={styles.sheetGlyph} aria-hidden="true">
                      <Icon name={sheet.icon} size={26} />
                    </span>
                  ) : (
                    <span className={styles.lines} aria-hidden="true">
                      <i style={{ width: "86%" }} />
                      <i style={{ width: "92%" }} />
                      <i style={{ width: "64%" }} />
                      <i style={{ width: "88%" }} />
                      <i style={{ width: "42%" }} />
                    </span>
                  )}
                  <span className={styles.sheetHead}>
                    <span className={styles.sheetName}>{sheet.name}</span>
                    {sheet.meta ? <span className={styles.sheetMeta}>{sheet.meta}</span> : null}
                  </span>
                </>
              );
              const common = {
                /* Named explicitly. Left to compose itself from the text
                   inside, the name and the second line ran together — a
                   screen reader announced "ContactsIn development". */
                "aria-label": sheet.meta ? `${sheet.name} — ${sheet.meta}` : sheet.name,
                className: picture ? `${styles.sheet} ${styles.sheetArtCard}` : styles.sheet,
                style: {
                  "--fc-slot": slot,
                  "--fc-depth": visible.length - 1 - index,
                  "--fc-jx": `${((jitter() - 0.5) * 10).toFixed(2)}px`,
                  "--fc-jr": `${((jitter() - 0.5) * 3.2).toFixed(2)}deg`,
                  zIndex: index + 1,
                } as React.CSSProperties,
              };
              return (
                <div key={sheet.name} role="listitem" className={styles.sheetSlot}>
                  {sheet.href !== undefined ? (
                    <Link
                      {...common}
                      href={sheet.href}
                      onClick={() => onSheetSelect?.(sheet, start + index)}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <button
                      {...common}
                      type="button"
                      onClick={() => onSheetSelect?.(sheet, start + index)}
                    >
                      {inner}
                    </button>
                  )}
                </div>
              );
            })}
            {visible.length === 0 ? (
              <p className={styles.empty} role="listitem">
                {emptyNote}
              </p>
            ) : null}
          </div>

          {actionLabel && onAction ? (
            <button
              type="button"
              className={styles.key}
              aria-label={actionLabel}
              title={actionLabel}
              onClick={(event) => {
                // The front panel behind this toggles the folder; without
                // stopping here, one tap would both open it and leave.
                event.stopPropagation();
                onAction();
              }}
            >
              <svg className={styles.keyGlyph} viewBox="0 0 30 12" aria-hidden="true">
                <rect x="1" y="1.5" width="8" height="9" rx="3.4" />
                <rect x="11" y="1.5" width="8" height="9" rx="3.4" />
                <rect x="21" y="1.5" width="8" height="9" rx="3.4" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
