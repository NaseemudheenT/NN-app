"use client";

import Link from "next/link";
import { useState } from "react";
import { Coverflow, GlassFold, Icon, LiquidButton, NNLogo } from "@/components/ui";
import { LAUNCHER } from "@/components/nn/workspaceContent";
import styles from "./cinematic.module.css";

/**
 * The cinematic layer, on one page.
 *
 * Four materials, each shown doing the thing it is for rather than described:
 * the room, the glass control, the floating card ring, and the corridor. Every
 * surface here is the real component the application uses — nothing on this
 * page is a picture of a component.
 */

const SIZES = ["sm", "md", "lg", "xl", "xxl"] as const;

export function CinematicShowcase() {
  const [centred, setCentred] = useState<string>(LAUNCHER[0]?.id ?? "");
  const centredName = LAUNCHER.find((app) => app.id === centred)?.name ?? "—";
  const [busy, setBusy] = useState(false);

  return (
    <main className={`${styles.page} nn-scrim`}>
      <header className={styles.head}>
        <NNLogo size={22} />
        <nav className={styles.crumbs}>
          <Link href="/design">Design system</Link>
          <span aria-hidden="true">·</span>
          <span aria-current="page">Cinematic</span>
          <span aria-hidden="true">·</span>
          <Link href="/design/workspace">Workspace</Link>
        </nav>
      </header>

      <section className={styles.intro}>
        <h1>The cinematic layer</h1>
        <p>
          Four materials carry every screen in NN: the room behind the application, the
          glass a control is made of, the ring that floats cards in depth, and the corridor
          that introduces the whole environment. They are shown here working, at the sizes
          and densities the application actually uses.
        </p>
      </section>

      {/* ---- 1 · the room ---- */}
      <section className={styles.block}>
        <div className={styles.blockHead}>
          <h2>01 · The room</h2>
          <p>
            Six panes of glass folded over one another, rendered on the GPU. Panes screen
            over each other, so an overlap gets brighter — which is how stacked glass
            behaves, and why this reads as depth rather than as a gradient. Three colours,
            taken from NN&rsquo;s tokens, so it follows the theme. It is fixed behind every
            page and stops painting entirely when the tab is in the background.
          </p>
        </div>
        <div className={styles.roomStrip}>
          <GlassFold />
        </div>
      </section>

      {/* ---- 2 · liquid glass ---- */}
      <section className={styles.block}>
        <div className={styles.blockHead}>
          <h2>02 · Liquid glass</h2>
          <p>
            Nine shadows model the edge of a real pane: an outer haze, a drop, a tight
            bright rim, a second fainter line just inside it for the material&rsquo;s
            thickness, and an inner bloom. Behind that, an SVG displacement map refracts
            whatever sits under the control. Remove any one layer and it flattens.
          </p>
        </div>

        <div className={styles.row}>
          {SIZES.map((size) => (
            <LiquidButton key={size} size={size}>
              {size.toUpperCase()}
            </LiquidButton>
          ))}
        </div>

        <div className={styles.row}>
          <LiquidButton size="lg" variant="clear">
            Clear
          </LiquidButton>
          <LiquidButton size="lg" variant="accent">
            Accent
            <Icon name="sparkle" size={16} />
          </LiquidButton>
          <LiquidButton size="lg" variant="danger">
            Danger
          </LiquidButton>
          <LiquidButton size="lg" shape="rounded">
            Rounded
          </LiquidButton>
          <LiquidButton size="lg" disabled>
            Disabled
          </LiquidButton>
          <LiquidButton
            size="lg"
            loading={busy}
            onClick={() => {
              setBusy(true);
              window.setTimeout(() => setBusy(false), 2200);
            }}
          >
            {busy ? "Working" : "Press to load"}
          </LiquidButton>
        </div>
      </section>

      {/* ---- 3 · the ring ---- */}
      <section className={styles.block}>
        <div className={styles.blockHead}>
          <h2>03 · The ring</h2>
          <p>
            Floating glass cards raked into depth. The tilt and the recession both ease off
            as cards travel out, so the second card stays readable instead of folding shut.
            Looping is arithmetic, not cloned nodes. Drag it, flick it, or use the arrow
            keys — centred card: <strong>{centredName}</strong>.
          </p>
        </div>
        <Coverflow
          cards={LAUNCHER.map((app) => ({
            id: app.id,
            title: app.name,
            subtitle: app.hint,
            icon: app.icon,
          }))}
          showCaption
          showPagination
          showNavigation
          onSelect={setCentred}
        />
      </section>

      {/* ---- 4 · the corridor ---- */}
      <section className={styles.block}>
        <div className={styles.blockHead}>
          <h2>04 · The corridor</h2>
          <p>
            NN&rsquo;s introduction: the applications start far away and travel toward you as
            the corridor is driven forward, staggered so something is always arriving.
            Drivable by wheel, by swipe and by keyboard, and it releases the gesture at
            either end rather than trapping the page.
          </p>
        </div>
        <div className={styles.row}>
          <LiquidButton href="/" size="lg" variant="accent">
            Travel the corridor
          </LiquidButton>
          <LiquidButton href="/design/workspace" size="lg">
            Open the workspace surface
          </LiquidButton>
        </div>
      </section>

      <footer className={styles.foot}>
        <p>
          Every surface on this page is the component the application uses. REN appears
          throughout NN as a designed surface and performs nothing — its reasoning, memory
          and tools stay switched off until the founder turns them on.
        </p>
      </footer>
    </main>
  );
}
