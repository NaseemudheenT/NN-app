"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Coverflow,
  FolderCard,
  GlassFold,
  Icon,
  LiquidButton,
  LogoReveal,
  NNLogo,
  useFolderWidth,
} from "@/components/ui";
import { LAUNCHER } from "@/components/nn/workspaceContent";
import { RenOrb } from "@/components/ren/RenOrb";
import { REN_STATES, REN_STATUS } from "@/lib/ren/state";
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

const REN_STATE_NOTE: Record<string, string> = {
  idle: "Present, not engaged. A slow breath and nothing else.",
  awakening: "Summoned. Three rings travel outward once and the mark lights up.",
  listening: "The aura answers the real microphone level — never a fake pulse.",
  thinking: "Six particles circulate while something is genuinely in flight.",
  speaking: "A steady outward cadence, slower than listening.",
  complete: "The tick draws itself. Shown only for a confirmed result.",
};

export function CinematicShowcase() {
  const folderWidth = useFolderWidth(300);
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

      {/* ---- 3b · the same ring, curved ---- */}
      <section className={styles.block}>
        <div className={styles.blockHead}>
          <h2>03b · The arc</h2>
          <p>
            The same ring, stood on a cylinder: each card is turned by its share of the
            arc and pushed out to the radius, so the way it faces is the real geometry
            rather than a tilt painted on a flat row. The radius is derived from the card
            width and the angle, so changing one never opens a gap in the other. This is
            the carousel the dashboard uses — and it has no arrows to press. Drag it with
            a finger or a cursor, flick it, or use the arrow keys.
          </p>
        </div>
        <Coverflow
          cards={LAUNCHER.map((app) => ({
            id: app.id,
            title: app.name,
            subtitle: app.hint,
            icon: app.icon,
          }))}
          curve={19}
          showCaption
          showPagination
          label="The curved arc"
        />
      </section>

      {/* ---- 4 · REN ---- */}
      <section className={styles.block}>
        <div className={styles.blockHead}>
          <h2>04 · REN</h2>
          <p>
            REN&rsquo;s identity is the NN mark itself, not a generic AI sphere with a logo
            bolted on. In all six states the mark is drawn at full strength in the centre
            and the effects happen around it — rings expand, particles orbit, the aura
            swells. Nothing covers it and nothing replaces it. Press{" "}
            <strong>⌘K</strong> anywhere in NN to summon it.
          </p>
        </div>
        <div className={styles.renStates}>
          {REN_STATES.map((state, index) => (
            <figure key={state}>
              <RenOrb state={state} size={72} level={state === "listening" ? 0.55 : 0} />
              <figcaption>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{REN_STATUS[state]}</strong>
                <em>{REN_STATE_NOTE[state]}</em>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---- 5 · the corridor ---- */}
      <section className={styles.block}>
        <div className={styles.blockHead}>
          <h2>05 · The corridor</h2>
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

      {/* ---- 6 · the folders ---- */}
      <section className={styles.block}>
        <div className={styles.blockHead}>
          <h2>06 · The folders</h2>
          <p>
            Not a picture of a folder. Three real layers — a back panel holding generated
            NN artwork, the things it contains, and a frosted front panel — so the glass
            frosts the contents as they move, because they are genuinely behind it. At
            rest it is closed; under a cursor it leans forward on its bottom hinge; opened,
            the panel falls and the sheets rise and fan out, each one a real control. The
            artwork is a domain-warped noise field lit as a liquid surface, painted here on
            the device and never fetched — and only in NN&apos;s own colours.
          </p>
        </div>
        <div className={styles.folders}>
          <FolderCard
            label="Life &amp; wellbeing"
            meta="7 applications"
            width={folderWidth}
            sheets={[
              { name: "Peace Mode", meta: "In development", icon: "clock" },
              { name: "Body", meta: "In development", icon: "check" },
              { name: "Soul", meta: "In development", icon: "sparkle" },
              { name: "Life", meta: "Open", icon: "calendar" },
            ]}
          />
          <FolderCard
            label="Knowledge"
            meta="Generated material"
            width={folderWidth}
            labelPlacement="top-left"
            sheets={[
              { name: "Field — deep", meta: "marble", art: "deep" },
              { name: "Field — tide", meta: "streak", art: "tide" },
              { name: "Field — violet", meta: "marble", art: "violet" },
            ]}
          />
          <FolderCard
            label="Archive"
            meta="Empty, and says so"
            width={folderWidth}
            labelPlacement="top-right"
            art="none"
            sheets={[]}
            emptyNote="Nothing here yet."
          />
        </div>
      </section>

      {/* ---- 7 · the arrival ---- */}
      <section className={styles.block}>
        <div className={styles.blockHead}>
          <h2>07 · The arrival</h2>
          <p>
            The first thing NN does. The mark is not drawn: a distance field of the
            approved geometry is read as the thickness of a glass slab, and the light
            behind it is bent through the body — splitting into cyan and violet at the
            edges because the three channels refract at slightly different angles. Where
            there is no WebGL, or where reduced motion is asked for, the same mark arrives
            as lit SVG instead. Nothing waits on a GPU it might not get.
          </p>
        </div>
        <div className={styles.reveal}>
          <LogoReveal size={132} duration={2600} />
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
