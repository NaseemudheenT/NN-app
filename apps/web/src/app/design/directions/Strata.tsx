"use client";

import { useCallback, useRef, useState, type PointerEvent } from "react";
import { Icon, NNGlassMark, OrinWave } from "@/components/ui";
import { APPS, CONTEXT, GREETING, WHEN } from "./content";
import s from "./Strata.module.css";

type Layer = "orin" | "apps" | "context";

/**
 * Direction B — Strata.
 *
 * Three discrete planes of glass. The plane you are working on comes forward,
 * brightens and sharpens; the others recede, dim and soften. Selecting a
 * region promotes it — so navigation is a change of depth rather than a
 * change of page.
 *
 * Depth comes from LAYERING: visible steps in Z, scale, opacity and blur.
 * Parallax is proportional to depth and driven entirely by CSS variables.
 */
export function Strata() {
  const scene = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);
  const [focus, setFocus] = useState<Layer>("orin");
  const [selected, setSelected] = useState<string | null>(null);

  const move = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const el = scene.current;
    if (el === null) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--px", (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
      el.style.setProperty("--py", (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
    });
  }, []);

  /** Depth class for a region, given what currently has focus. */
  const depth = (layer: Layer): string => {
    if (focus === layer) return `${s.plane} ${s.near}`;
    const order: Layer[] = ["orin", "apps", "context"];
    const gap = Math.abs(order.indexOf(layer) - order.indexOf(focus));
    return `${s.plane} ${gap === 1 ? s.mid : s.far}`;
  };

  return (
    <div ref={scene} className={s.scene} onPointerMove={move}>
      <div className={s.inner}>
        <h2 className={s.greeting}>{GREETING}</h2>
        <p className={s.when}>{WHEN}</p>

        <div className={s.stack} style={{ marginTop: "var(--space-9)" }}>
          <section
            className={depth("orin")}
            onFocus={() => setFocus("orin")}
            onMouseEnter={() => setFocus("orin")}
          >
            <div className={`${s.sheet} ${focus === "orin" ? s.sheetNear : ""}`}>
              <div className={s.orinRow}>
                <NNGlassMark size={28} bloom={10} />
                <span className={s.orinPrompt}>Ask me anything…</span>
                <Icon name="mic" size={18} />
              </div>
              <div style={{ marginTop: 8, color: "var(--nn-icy)", opacity: 0.8 }}>
                <OrinWave state={focus === "orin" ? "speaking" : "idle"} lines={19} />
              </div>
            </div>
          </section>

          <section
            className={depth("apps")}
            onFocus={() => setFocus("apps")}
            onMouseEnter={() => setFocus("apps")}
          >
            <div className={`${s.sheet} ${focus === "apps" ? s.sheetNear : ""}`}>
              <p className={s.label}>Applications</p>
              <div className={s.grid}>
                {APPS.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={`${s.tile} ${selected === a.id ? s.tileSelected : ""}`}
                    aria-pressed={selected === a.id}
                    onClick={() => setSelected(selected === a.id ? null : a.id)}
                  >
                    <Icon name={a.icon} size={19} className={s.tileIcon} />
                    <span className={s.tileName} style={{ display: "block" }}>{a.name}</span>
                    <span className={s.tileHint} style={{ display: "block" }}>{a.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section
            className={depth("context")}
            onFocus={() => setFocus("context")}
            onMouseEnter={() => setFocus("context")}
          >
            <div className={`${s.sheet} ${focus === "context" ? s.sheetNear : ""}`}>
              <p className={s.label}>Today</p>
              <div className={s.ctxRow}>
                {CONTEXT.map((c) => (
                  <div key={c.id} className={s.ctx}>
                    <p className={s.ctxLabel}>{c.label}</p>
                    <p className={s.ctxValue}>{c.value}</p>
                    <p className={s.ctxDetail}>{c.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
