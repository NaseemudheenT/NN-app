"use client";

import { HoloPanel, HoloStage, Icon, NNGlassMark, OrinWave, type IconName } from "@/components/ui";
import styles from "./HoloShowcase.module.css";

/** Small glass tiles suspended between the panels, as in the reference. */
const CHIPS: ReadonlyArray<{ x: number; y: number; s: number; icon: IconName; drift: number }> = [
  { x: 42,  y: 66,  s: 42, icon: "shield",   drift: 6.5 },
  { x: 108, y: 392, s: 34, icon: "check",    drift: 8.2 },
  { x: 962, y: 112, s: 44, icon: "graph",    drift: 7.4 },
  { x: 902, y: 388, s: 38, icon: "folder",   drift: 9.1 },
  { x: 306, y: 410, s: 30, icon: "clock",    drift: 7.8 },
  { x: 700, y: 404, s: 34, icon: "calendar", drift: 6.9 },
];

const MINI: readonly IconName[] = ["calendar", "book", "graph", "wallet", "folder", "grid"];

/**
 * The NN environment rendered as what it is — layered planes of glass in real
 * perspective. The centre plane faces the viewer squarely; everything else
 * recedes around it, so the founder's attention lands on the identity first.
 *
 * Built entirely from NN components. No image, no screenshot.
 */
export function HoloShowcase() {
  return (
    <HoloStage designWidth={1040} designHeight={470} perspective={1650} parallax={22}>
      {CHIPS.map((c, i) => (
        <div
          key={i}
          className={styles.chip}
          style={{
            left: c.x, top: c.y, width: c.s, height: c.s,
            ["--drift" as string]: `${c.drift}s`,
            animationDelay: `${-i * 1.3}s`,
          }}
          aria-hidden="true"
        >
          <Icon name={c.icon} size={Math.round(c.s * 0.44)} />
        </div>
      ))}

      {/* far left */}
      <HoloPanel x={8} y={196} width={196} height={158} z={-200} rotateY={19} zIndex={1}>
        <p className={styles.panelTitle}><span className={styles.dot} />Archive</p>
        <div className={styles.bars}>
          <span className={styles.bar} /><span className={styles.bar} style={{ width: "72%" }} />
          <span className={styles.bar} style={{ width: "48%" }} />
        </div>
      </HoloPanel>

      {/* near left — the launcher */}
      <HoloPanel x={150} y={116} width={252} height={252} z={-66} rotateY={13} zIndex={2}>
        <p className={styles.panelTitle}><span className={styles.dot} />Applications</p>
        <div className={styles.miniGrid}>
          {MINI.map((m) => (
            <span key={m} className={styles.mini}><Icon name={m} size={17} /></span>
          ))}
        </div>
      </HoloPanel>

      {/* far right */}
      <HoloPanel x={840} y={56} width={178} height={126} z={-200} rotateY={-20} zIndex={1}>
        <p className={styles.panelTitle}><span className={styles.dot} />Status</p>
        <div className={styles.bars}>
          <span className={styles.bar} style={{ width: "84%" }} />
          <span className={styles.bar} style={{ width: "56%" }} />
        </div>
      </HoloPanel>

      {/* near right — ORIN */}
      <HoloPanel x={636} y={140} width={306} height={204} z={-36} rotateY={-14} zIndex={2}>
        <p className={styles.panelTitle}><span className={styles.dot} />ORIN</p>
        <div style={{ color: "var(--nn-icy)", opacity: 0.9 }}>
          <OrinWave state="speaking" lines={21} />
        </div>
        <div className={styles.searchRow} style={{ marginTop: 10 }}>
          <Icon name="search" size={13} />Ask me anything…
        </div>
      </HoloPanel>

      {/* centre — squarely facing the viewer */}
      <HoloPanel x={338} y={92} width={372} height={278} z={96} rotateY={0} zIndex={5}>
        <div className={styles.centre}>
          <NNGlassMark size={126} bloom={22} />
          <span className={styles.word}>NN</span>
          <span className={styles.tag}>Personal Operating Environment</span>
        </div>
      </HoloPanel>
    </HoloStage>
  );
}
