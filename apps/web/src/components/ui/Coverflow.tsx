"use client";

import * as React from "react";
import { Icon, type IconName } from "./Icon";
import { prefersReducedMotion } from "@/lib/motion";
import styles from "./Coverflow.module.css";

/**
 * A ring of floating glass cards, raked away into depth.
 *
 * Every card is positioned from one number: the fractional index sitting at
 * the centre. Looping is pure arithmetic — the distance to a card is folded
 * into the shorter way round the ring, so a card leaving the left edge
 * reappears on the right with no cloned nodes and no DOM shuffling.
 *
 * Nothing here goes through React state per frame. Sixty state updates a
 * second would re-render every card for numbers React never needs to see, so
 * transforms are written straight to the elements and only the *selected*
 * index — which the caption and dots actually read — lives in state.
 */

const useIsoLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export interface CoverflowCard {
  id: string;
  title: string;
  subtitle?: string;
  icon: IconName;
  meta?: readonly { label: string; value: string }[];
}

export interface CoverflowProps {
  cards: readonly CoverflowCard[];
  /** Degrees the first neighbour tilts. */
  rotate?: number;
  /** How far the first neighbour recedes, as a fraction of card width. */
  depth?: number;
  /** Viewer distance as a multiple of card width — smaller is a wider lens. */
  perspective?: number;
  /** Exponent on distance. Below 1 the rake eases off as cards travel out. */
  falloff?: number;
  /** Opacity lost per step from the centre. */
  fade?: number;
  /** Any CSS length. Everything else derives from it, so the rake scales. */
  cardWidth?: string;
  /** Space between cards, as a fraction of card width. */
  gap?: number;
  loop?: boolean;
  showCaption?: boolean;
  showPagination?: boolean;
  showNavigation?: boolean;
  /** Names the carousel for assistive technology. */
  label?: string;
  /** Fires when the centred card changes — the id, never the index. */
  onSelect?: ((id: string) => void) | undefined;
  className?: string | undefined;
}

export function Coverflow({
  cards,
  rotate = 44,
  depth = 0.6,
  perspective = 3,
  falloff = 0.56,
  fade = 0.1,
  cardWidth = "clamp(148px, 22vw, 260px)",
  gap = 0.05,
  loop = true,
  showCaption = false,
  showPagination = false,
  showNavigation = false,
  label = "Applications",
  onSelect,
  className,
}: CoverflowProps) {
  const count = cards.length;

  const frameRef = React.useRef<HTMLDivElement>(null);
  const cardRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  /** Fractional card index at the centre. The single source of truth. */
  const posRef = React.useRef(0);
  /** Where the current settle is headed. Stepping off `pos` instead would
      swallow a keypress that lands mid-flight, before the round-off moves. */
  const targetRef = React.useRef(0);
  const widthRef = React.useRef(0);
  const rafRef = React.useRef<number | null>(null);
  const lastFrameRef = React.useRef<number | null>(null);
  const dragRef = React.useRef<{
    id: number;
    x: number;
    pos: number;
    v: number;
    t: number;
  } | null>(null);

  const [selected, setSelected] = React.useState(0);

  /** Nearest whole card, folded back into 0..count-1. */
  const indexAt = React.useCallback(
    (pos: number) => (count === 0 ? 0 : ((Math.round(pos) % count) + count) % count),
    [count],
  );

  const paint = React.useCallback(() => {
    const width = widthRef.current;
    if (!width) return;
    const pitch = width * (1 + gap);
    const pos = posRef.current;

    cardRefs.current.forEach((card, index) => {
      if (!card) return;

      // Fold the distance into the shorter way round the ring. This is the
      // whole looping mechanism — no cloned nodes, no shuffling the DOM.
      let offset = index - pos;
      if (loop) {
        offset = ((offset % count) + count) % count;
        if (offset > count / 2) offset -= count;
      }

      const distance = Math.abs(offset);
      // Both the tilt and the recession ease off as cards travel out —
      // doubling the distance adds only about half again as much of each.
      // A linear ramp folds the second card shut; this keeps it readable.
      const ramp = Math.pow(distance, falloff);
      // Capped short of edge-on so a far card never turns its back.
      const tilt = Math.min(rotate * ramp, 82) * Math.sign(offset);

      card.style.transform =
        `translateX(calc(-50% + ${offset * pitch}px)) ` +
        `translateZ(${-depth * width * ramp}px) rotateY(${-tilt}deg)`;

      // A card is teleported across the ring at exactly half a turn out, so it
      // has to be gone by then or the jump is visible.
      const edge = loop ? Math.min(1, Math.max(0, count / 2 - distance)) : 1;
      card.style.opacity = String(Math.max(0, 1 - fade * distance) * edge);
      card.style.zIndex = String(100 - Math.round(distance));
      // Drives the specular sweep in CSS: glass catches light as it turns.
      card.style.setProperty("--tilt", tilt.toFixed(2));
      card.style.setProperty("--centred", (1 - Math.min(1, distance)).toFixed(3));
    });
  }, [count, depth, fade, falloff, gap, loop, rotate]);

  const settle = React.useCallback(
    (target: number) => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      targetRef.current = target;
      setSelected(indexAt(target));

      if (prefersReducedMotion()) {
        posRef.current = target;
        paint();
        rafRef.current = null;
        return;
      }

      lastFrameRef.current = null;
      const step = (now: number) => {
        const previous = lastFrameRef.current;
        lastFrameRef.current = now;
        const dt = previous === null ? 1 / 60 : Math.min((now - previous) / 1000, 0.1);

        const remaining = target - posRef.current;
        if (Math.abs(remaining) < 0.0004) {
          posRef.current = target;
          paint();
          rafRef.current = null;
          return;
        }
        // Exponential ease-out, not a spring — this arrives without overshoot.
        // Corrected for the frame length so a 120 Hz display settles at the
        // same speed as a 60 Hz one instead of twice as fast.
        posRef.current += remaining * (1 - Math.pow(1 - 0.16, dt * 60));
        paint();
        rafRef.current = requestAnimationFrame(step);
      };
      rafRef.current = requestAnimationFrame(step);
    },
    [indexAt, paint],
  );

  const clampPos = React.useCallback(
    (pos: number) => (loop ? pos : Math.max(0, Math.min(count - 1, pos))),
    [count, loop],
  );

  const goTo = React.useCallback(
    (index: number) => {
      // Take the shorter way round rather than unwinding the whole ring.
      const target = loop
        ? index + Math.round((targetRef.current - index) / count) * count
        : index;
      settle(clampPos(target));
    },
    [clampPos, count, loop, settle],
  );

  const nudge = React.useCallback(
    (by: number) => settle(clampPos(Math.round(targetRef.current) + by)),
    [clampPos, settle],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    targetRef.current = posRef.current;
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      pos: posRef.current,
      v: 0,
      t: performance.now(),
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;

    const pitch = widthRef.current * (1 + gap);
    if (!pitch) return;

    const now = performance.now();
    const previous = posRef.current;
    posRef.current = clampPos(drag.pos - (event.clientX - drag.x) / pitch);
    // Cards per second, for the throw.
    drag.v = ((posRef.current - previous) / Math.max(now - drag.t, 1)) * 1000;
    drag.t = now;

    const index = indexAt(posRef.current);
    if (index !== selected) setSelected(index);
    paint();
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    // Let a flick carry, but never more than two cards.
    const carried = Math.max(-2, Math.min(2, drag.v * 0.18));
    settle(clampPos(Math.round(posRef.current + carried)));
  };

  // Card width drives pitch, depth and perspective, so it is the only thing
  // worth measuring — and only when the box actually changes.
  useIsoLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const card = cardRefs.current[0];
      if (!card) return;
      widthRef.current = card.offsetWidth;
      paint();
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, [paint]);

  React.useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const active = cards[selected];

  // Reported after paint, never during it, so a parent re-render cannot land
  // in the middle of a drag.
  const notify = React.useRef(onSelect);
  notify.current = onSelect;
  React.useEffect(() => {
    const card = cards[selected];
    if (card) notify.current?.(card.id);
  }, [selected, cards]);

  if (count === 0) return null;

  return (
    <div
      className={[styles.root, className ?? ""].filter(Boolean).join(" ")}
      style={{ ["--cf-card" as string]: cardWidth }}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div className={styles.relative}>
        <div
          ref={frameRef}
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              nudge(-1);
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              nudge(1);
            } else if (event.key === "Home") {
              event.preventDefault();
              goTo(0);
            } else if (event.key === "End") {
              event.preventDefault();
              goTo(count - 1);
            }
          }}
          className={styles.frame}
          style={{ perspective: `calc(var(--cf-card) * ${perspective})` }}
        >
          <div className={styles.ring}>
            {cards.map((card, index) => (
              <div
                key={card.id}
                ref={(node) => {
                  cardRefs.current[index] = node;
                }}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${count}: ${card.title}`}
                className={["nn-glass-card", styles.card].join(" ")}
              >
                <span className={styles.sheen} aria-hidden="true" />
                <span className={styles.cardIcon}>
                  <Icon name={card.icon} size={34} />
                </span>
                <span className={styles.cardTitle}>{card.title}</span>
                {card.subtitle !== undefined ? (
                  <span className={styles.cardHint}>{card.subtitle}</span>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {showNavigation ? (
          <>
            <button
              type="button"
              aria-label="Previous card"
              onClick={() => nudge(-1)}
              className={[styles.nav, styles.navPrev].join(" ")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5 8 12l7 7" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next card"
              onClick={() => nudge(1)}
              className={[styles.nav, styles.navNext].join(" ")}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        ) : null}
      </div>

      {showCaption && active ? (
        <div key={selected} className={styles.caption}>
          <p className={styles.captionTitle}>{active.title}</p>
          {active.subtitle !== undefined ? (
            <p className={styles.captionSub}>{active.subtitle}</p>
          ) : null}
          {active.meta && active.meta.length > 0 ? (
            <dl className={styles.meta}>
              {active.meta.map((row) => (
                <div key={row.label}>
                  <dt>{row.label}</dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}

      {showPagination ? (
        <div className={styles.dots}>
          {cards.map((card, index) => (
            <button
              key={card.id}
              type="button"
              aria-label={`Go to ${card.title}`}
              aria-current={index === selected}
              onClick={() => goTo(index)}
              className={[styles.dot, index === selected ? styles.dotOn : ""]
                .filter(Boolean)
                .join(" ")}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
