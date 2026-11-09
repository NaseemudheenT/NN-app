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
  { icon: "calendar", title: "Life", hint: "" },
  { icon: "book", title: "Learn", hint: "" },
  { icon: "grid", title: "Create", hint: "" },
  { icon: "wallet", title: "Build", hint: "" },
  { icon: "sparkle", title: "Remember", hint: "" },
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

/**
 * Original NN lettering drawn as connected vector strokes.
 * The seven glyph paths meet at their joins to read as one handwritten word.
 * This is an NN-original script treatment, not Apple's proprietary setup font.
 */
const WELCOME_GLYPHS = [
  "M 22 48 C 35 66 49 119 63 126 C 78 134 91 67 105 51 C 113 42 119 84 128 109 C 136 132 149 128 162 105 C 170 91 176 77 187 78",
  "M 187 78 C 201 70 220 79 218 94 C 216 108 192 115 181 105 C 170 95 183 80 198 81 C 214 82 222 100 237 105",
  "M 237 105 C 249 76 251 34 264 27 C 279 21 270 75 260 103 C 254 120 263 121 279 105",
  "M 279 105 C 291 83 316 77 326 91 C 337 107 310 120 292 113 C 277 107 282 91 295 86 C 307 82 317 98 330 105",
  "M 330 105 C 341 84 365 78 376 91 C 389 106 369 119 351 114 C 333 109 334 91 349 85 C 363 79 375 96 389 105",
  "M 389 105 C 401 92 409 80 421 83 C 432 86 421 108 415 117 C 409 126 421 121 432 107 C 444 91 451 81 462 84 C 473 87 459 109 454 117 C 448 126 462 119 473 105 C 485 90 495 82 505 87 C 516 93 498 111 494 119 C 489 128 503 121 515 106",
  "M 515 106 C 527 84 550 78 560 92 C 571 107 544 120 527 113 C 512 107 517 91 530 86 C 544 81 555 98 569 105 C 589 116 610 105 626 88"
];

export interface NNIntroProps {
  /** Where the "enter" control leads once the corridor has been travelled. */
  enterHref?: ComponentProps<typeof Link>["href"];
  enterLabel?: string;
}

export function NNIntro({ enterHref = "/sign-in", enterLabel = "Enter NN" }: NNIntroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const titleRef = useRef<HTMLDivElement>(null);
  const enterRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Measure the original vector strokes once. The measured length drives the
    // SVG dash reveal; no canvas, font download or frame-by-frame React work.
    const welcomeGroups = welcomeRef.current?.querySelectorAll("g") ?? [];
    welcomeGroups.forEach((group) => {
      const paths = group.querySelectorAll<SVGPathElement>("path");
      const measurePath = paths[1];
      if (!measurePath) return;
      const length = measurePath.getTotalLength();
      paths.forEach((path) => {
        path.style.setProperty("--path-length", String(length));
        path.style.strokeDasharray = String(length);
        path.style.strokeDashoffset = String(length);
      });
    });

    let still = prefersReducedMotion();
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    // Progress along the corridor, 0 at the far end and 1 past the viewer.
    const progress = createSpring(0, { stiffness: 80, damping: 30, rest: 0.00008 });
    // The camera. Lags the pointer, which is what makes the corridor feel
    // like a room being looked around rather than a graphic being dragged.
    const panX = createSpring(0, { stiffness: 60, damping: 25, mass: 0.5 });
    const panY = createSpring(0, { stiffness: 60, damping: 25, mass: 0.5 });

    let stage = { width: 1440, height: 900, isMobile: false };
    let dirty = true;
    let welcomeDismissed = false;
    let hasLeftWelcomePosition = false;
    let welcomeTimer: number | null = null;
    const dismissWelcome = () => {
      if (welcomeDismissed) return;
      welcomeDismissed = true;
      if (welcomeTimer !== null) {
        window.clearTimeout(welcomeTimer);
        welcomeTimer = null;
      }
      welcomeRef.current?.classList.add(styles.welcomeGone!);
    };
    const scheduleWelcomeDismiss = () => {
      if (welcomeTimer !== null) window.clearTimeout(welcomeTimer);
      welcomeTimer = window.setTimeout(dismissWelcome, 4550);
    };
    const replayWelcome = () => {
      const node = welcomeRef.current;
      if (!node) return;
      welcomeDismissed = false;
      node.classList.remove(styles.welcomeActive!, styles.welcomeGone!);
      // Force a style boundary so the staggered letter sequence restarts.
      void node.offsetWidth;
      node.classList.add(styles.welcomeActive!);
      scheduleWelcomeDismiss();
    };

    // The greeting is a brief opening moment, not a permanent overlay.
    scheduleWelcomeDismiss();

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
      // Detect the actual camera crossing the intro boundary. Using the
      // spring's rendered value (rather than its target) makes replay happen
      // when the viewer really returns to the opening position.
      if (p > 0.015) {
        hasLeftWelcomePosition = true;
        dismissWelcome();
      } else if (hasLeftWelcomePosition) {
        hasLeftWelcomePosition = false;
        replayWelcome();
      }
      const farZ = stage.isMobile ? -1200 : -1700;
      const nearZ = stage.isMobile ? 350 : 500;
      const panStrength = stage.isMobile ? 20 : 45;
      const cardWidth = stage.isMobile
        ? Math.max(150, Math.min(230, stage.width * 0.52))
        : Math.max(230, Math.min(340, stage.width * 0.25));
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
        titleRef.current.style.opacity = rampAcross(p, [0, 0.12, 0.85, 1], [0, 1, 1, 0]).toFixed(3);
      }
      if (enterRef.current) {
        // The way out appears only once the corridor has actually been crossed.
        const shown = rampAcross(p, [0.94, 1], [0, 1]);
        enterRef.current.style.opacity = shown.toFixed(3);
        enterRef.current.style.transform = `translate(-50%, ${((1 - shown) * 14).toFixed(1)}px)`;
        enterRef.current.style.pointerEvents = shown > 0.6 ? "auto" : "none";
        enterRef.current.setAttribute("aria-hidden", shown > 0.6 ? "false" : "true");
        enterRef.current.toggleAttribute("inert", shown <= 0.6);
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
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
      stopLoop();
      stopMotionWatcher();
      if (welcomeTimer !== null) window.clearTimeout(welcomeTimer);
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
      aria-label="NN. Scroll, swipe or use the arrow keys to reveal the experience."
    >
      <div className={styles.atmosphere} aria-hidden="true" />
      <div ref={welcomeRef} className={`${styles.welcome} ${styles.welcomeActive}`} aria-hidden="true">
        <svg
          className={styles.welcomeSvg}
          viewBox="0 0 650 160"
          role="img"
          aria-label="Welcome"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="nn-welcome-silk" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#F4FCFF" />
              <stop offset="34%" stopColor="#A9E9FF" />
              <stop offset="68%" stopColor="#91A9FF" />
              <stop offset="100%" stopColor="#E4D9FF" />
            </linearGradient>
            <linearGradient id="nn-welcome-edge" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity=".96" />
              <stop offset="48%" stopColor="#D9F4FF" stopOpacity=".72" />
              <stop offset="100%" stopColor="#7B91E8" stopOpacity=".72" />
            </linearGradient>
          </defs>
          {WELCOME_GLYPHS.map((d, index) => (
            <g key={index} className={styles.welcomeGlyph}>
              <path className={styles.welcomeShadow} d={d} />
              <path className={styles.welcomeBody} d={d} />
              <path className={styles.welcomeHighlight} d={d} />
            </g>
          ))}
        </svg>
      </div>
      <div ref={titleRef} className={styles.title} aria-hidden="true">
        <NNLogo size={82} className={styles.mark} />
      </div>

      <div ref={enterRef} className={styles.enter} aria-hidden="true" inert>
        <LiquidButton href={enterHref} size="xl" variant="accent">
          {enterLabel}
        </LiquidButton>
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
