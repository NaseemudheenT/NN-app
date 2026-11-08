"use client";

import { useEffect, useRef, type ComponentProps } from "react";
import type Link from "next/link";
import { NNLogo } from "@/components/ui/NNLogo";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LiquidButton } from "@/components/ui/LiquidButton";
import {
  clamp,
  createFrameLoop,
  createSpring,
  onMotionPreferenceChange,
  prefersReducedMotion,
  rampAcross,
  remap,
} from "@/lib/motion";
import styles from "./NNIntro.module.css";

/**
 * How NN introduces itself.
 *
 * A corridor in Z. The founder's own applications start far away, travel
 * toward the viewer as the corridor is driven forward, and pass by. Each card
 * owns a slice of the journey — they are staggered across 55% of the travel —
 * so the corridor always has something arriving and something leaving.
 *
 * Positions are placed on a golden angle, which is why the ring never reads as
 * a grid no matter how many cards it holds.
 *
 * Everything is written straight to element transforms from one frame loop.
 * Nothing in here re-renders React, and the corridor stops painting entirely
 * when it scrolls off screen or the tab goes to the background.
 */

interface IntroCard {
  icon: IconName;
  title: string;
  hint: string;
}

const CARDS: readonly IntroCard[] = [
  { icon: "calendar", title: "NN Life", hint: "Days, plans, routine" },
  { icon: "book", title: "NN College", hint: "Timetable, marks, revision" },
  { icon: "graph", title: "NN Academy", hint: "What you are learning" },
  { icon: "grid", title: "NN Projects", hint: "What you are building" },
  { icon: "wallet", title: "NN Finance", hint: "Where it goes" },
  { icon: "folder", title: "NN Files", hint: "Everything kept" },
  { icon: "sparkle", title: "NN Memory", hint: "What NN remembers" },
  { icon: "shield", title: "NN Security", hint: "Who gets in" },
  { icon: "settings", title: "NN Control", hint: "How NN behaves" },
];

/** Placement is fixed per card, so it is computed once at module load. */
const PLACEMENTS = CARDS.map((card, i) => {
  const goldenAngle = i * 137.5 * (Math.PI / 180);
  return {
    card,
    angleCos: Math.cos(goldenAngle),
    angleSin: Math.sin(goldenAngle),
    radiusFactorX: 0.28 + (i % 3) * 0.08,
    radiusFactorY: 0.26 + (i % 2) * 0.09,
    rotationZ: (i % 2 === 0 ? 1 : -1) * (3 + (i % 5) * 2),
    index: i,
  };
});

const STAGGER_SPAN = 0.55;

export interface NNIntroProps {
  /** Where the "enter" control leads once the corridor has been travelled. */
  enterHref?: ComponentProps<typeof Link>["href"];
  enterLabel?: string;
}

export function NNIntro({ enterHref = "/sign-in", enterLabel = "Enter NN" }: NNIntroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const titleRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const enterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let still = prefersReducedMotion();

    // Progress along the corridor, 0 at the far end and 1 past the viewer.
    const progress = createSpring(0, { stiffness: 80, damping: 30, rest: 0.00008 });
    // The camera. Lags the pointer, which is what makes the corridor feel
    // like a room being looked around rather than a graphic being dragged.
    const panX = createSpring(0, { stiffness: 60, damping: 25, mass: 0.5 });
    const panY = createSpring(0, { stiffness: 60, damping: 25, mass: 0.5 });

    let stage = { width: 1440, height: 900, isMobile: false };
    let dirty = true;

    const drive = (next: number) => {
      const clamped = clamp(next, 0, 1);
      if (clamped === progress.target) return false;
      if (still) progress.reset(clamped);
      else progress.set(clamped);
      dirty = true;
      return true;
    };

    /* ---- input -----------------------------------------------------------
       Three ways in, because the corridor has to be drivable on the founder's
       phone as well as a trackpad: a wheel, a vertical swipe, and the keyboard.
       At either end the gesture is released rather than swallowed, so the
       corridor never becomes a scroll trap. */

    const onWheel = (event: WheelEvent) => {
      if (drive(progress.target + event.deltaY * 0.0008)) event.preventDefault();
    };
    container.addEventListener("wheel", onWheel, { passive: false });

    let touchY: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      const y = event.touches[0]?.clientY;
      if (y === undefined || touchY === null) return;
      const delta = touchY - y;
      touchY = y;
      // Touch travel is 1:1 with pixels, so it needs a larger coefficient
      // than a wheel to cross the corridor in one comfortable swipe.
      if (drive(progress.target + delta * 0.0022)) event.preventDefault();
    };
    const onTouchEnd = () => {
      touchY = null;
    };
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchEnd, { passive: true });

    const onKeyDown = (event: KeyboardEvent) => {
      const step =
        event.key === "ArrowDown" || event.key === "ArrowRight"
          ? 0.08
          : event.key === "ArrowUp" || event.key === "ArrowLeft"
            ? -0.08
            : event.key === "PageDown"
              ? 0.3
              : event.key === "PageUp"
                ? -0.3
                : null;
      if (step !== null) {
        event.preventDefault();
        drive(progress.target + step);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        drive(1);
      } else if (event.key === "Home") {
        event.preventDefault();
        drive(0);
      }
    };
    container.addEventListener("keydown", onKeyDown);

    const onPointerMove = (event: PointerEvent) => {
      if (still) return;
      panX.set((event.clientX / window.innerWidth - 0.5) * 2);
      panY.set((event.clientY / window.innerHeight - 0.5) * 2);
      dirty = true;
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    /* ---- measurement ----------------------------------------------------- */
    const measure = () => {
      const box = container.getBoundingClientRect();
      stage = {
        width: box.width || window.innerWidth,
        height: box.height || window.innerHeight,
        isMobile: (box.width || window.innerWidth) < 768,
      };
      container.style.setProperty("--perspective", stage.isMobile ? "900px" : "1200px");
      dirty = true;
    };
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(container);

    /* ---- paint ------------------------------------------------------------ */
    const paint = () => {
      const p = progress.value;
      const farZ = stage.isMobile ? -1200 : -1700;
      const nearZ = stage.isMobile ? 350 : 500;
      const panStrength = stage.isMobile ? 20 : 45;
      const cardWidth = stage.isMobile
        ? Math.max(130, Math.min(180, stage.width * 0.38))
        : Math.max(180, Math.min(270, stage.width * 0.18));
      const px = panX.value;
      const py = panY.value;

      for (const placement of PLACEMENTS) {
        const node = cardsRef.current[placement.index];
        if (!node) continue;

        const start = (placement.index / PLACEMENTS.length) * (1 - STAGGER_SPAN);
        const local = remap(p, start, start + STAGGER_SPAN, 0, 1);
        const z = remap(local, 0, 1, farZ, nearZ);

        const baseX = placement.angleCos * (stage.width * placement.radiusFactorX);
        const baseY = placement.angleSin * (stage.height * placement.radiusFactorY);
        const offsetX = baseX - px * panStrength;
        const offsetY = baseY - py * panStrength;

        node.style.width = `${cardWidth}px`;
        node.style.transform =
          `translate3d(calc(-50% + ${offsetX.toFixed(1)}px), ` +
          `calc(-50% + ${offsetY.toFixed(1)}px), ${z.toFixed(1)}px) ` +
          `rotateZ(${placement.rotationZ}deg)`;
        node.style.opacity = rampAcross(local, [0, 0.18, 0.82, 0.98], [0, 1, 1, 0]).toFixed(3);
      }

      if (titleRef.current) {
        titleRef.current.style.transform = `scale(${rampAcross(p, [0, 0.5, 1], [0.7, 1, 1.35]).toFixed(3)})`;
        titleRef.current.style.opacity = rampAcross(p, [0, 0.12, 0.85, 1], [0.25, 1, 1, 0]).toFixed(3);
      }
      if (promptRef.current) {
        promptRef.current.style.opacity = rampAcross(p, [0, 0.12], [1, 0]).toFixed(3);
      }
      if (railRef.current) {
        railRef.current.style.setProperty("--travelled", p.toFixed(4));
      }
      if (enterRef.current) {
        // The way out appears only once the corridor has actually been crossed.
        const shown = rampAcross(p, [0.72, 0.92], [0, 1]);
        enterRef.current.style.opacity = shown.toFixed(3);
        enterRef.current.style.transform = `translateY(${((1 - shown) * 14).toFixed(1)}px)`;
        enterRef.current.style.pointerEvents = shown > 0.6 ? "auto" : "none";
        enterRef.current.setAttribute("aria-hidden", shown > 0.6 ? "false" : "true");
      }
    };

    const stopLoop = createFrameLoop(container, (dt) => {
      // Stepped separately and then combined: `a || b || c` would short-circuit
      // and leave the camera frozen for as long as the corridor is travelling.
      const travelling = progress.step(dt);
      const panningX = panX.step(dt);
      const panningY = panY.step(dt);
      const moving = travelling || panningX || panningY;
      if (!moving && !dirty) return;
      dirty = moving;
      paint();
    });

    /* The corridor arrives rather than sitting empty. At rest every card is
       still beyond the fade-in, so a founder opening NN would see a bare
       title and no sign that there is anything to travel through. A short
       drift forward puts the first cards on screen; any input takes over. */
    const ARRIVAL = 0.1;
    let arrivalTimer: number | null = null;
    if (still) {
      progress.reset(ARRIVAL);
      dirty = true;
    } else {
      arrivalTimer = window.setTimeout(() => {
        if (progress.target === 0) {
          progress.set(ARRIVAL);
          dirty = true;
        }
      }, 400);
    }

    const stopMotionWatcher = onMotionPreferenceChange(() => {
      still = prefersReducedMotion();
      if (still) {
        panX.reset(0);
        panY.reset(0);
        progress.reset(progress.target);
      }
      dirty = true;
    });

    return () => {
      if (arrivalTimer !== null) window.clearTimeout(arrivalTimer);
      stopLoop();
      stopMotionWatcher();
      resizeObserver.disconnect();
      container.removeEventListener("wheel", onWheel);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
      container.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={styles.stage}
      tabIndex={0}
      role="group"
      aria-label="NN introduction. Scroll, swipe or use the arrow keys to travel through NN's applications."
    >
      {/* The depth grid and the two rings that give the corridor a floor. */}
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.ringInner} aria-hidden="true" />
      <div className={styles.ringOuter} aria-hidden="true" />

      <div ref={titleRef} className={styles.title}>
        <p className={styles.eyebrow}>A private operating environment</p>
        <NNLogo size={72} className={styles.mark} />
        <h1 className={styles.heading}>
          Everything you are,
          <br />
          in one place.
        </h1>
        <p className={styles.lede}>
          One environment for your days, your studies, your work, your money and your
          memory — owned by you alone, for as long as you want it.
        </p>
      </div>

      <div ref={promptRef} className={styles.prompt}>
        <span>Scroll to travel</span>
        <span className={styles.promptLine} aria-hidden="true" />
      </div>

      <div ref={enterRef} className={styles.enter} aria-hidden="true">
        <LiquidButton href={enterHref} size="xl" variant="accent">
          {enterLabel}
          <Icon name="check" size={18} />
        </LiquidButton>
      </div>

      <div ref={railRef} className={styles.rail} aria-hidden="true">
        <span className={styles.railFill} />
      </div>

      {/* The corridor itself. */}
      <div className={styles.corridor} aria-hidden="true">
        {PLACEMENTS.map((placement) => (
          <div
            key={placement.card.title}
            ref={(node) => {
              cardsRef.current[placement.index] = node;
            }}
            className={styles.card}
          >
            <div className={styles.cardInner}>
              <span className={styles.cardSheen} />
              <span className={styles.cardIcon}>
                <Icon name={placement.card.icon} size={26} />
              </span>
              <span className={styles.cardTitle}>{placement.card.title}</span>
              <span className={styles.cardHint}>{placement.card.hint}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
