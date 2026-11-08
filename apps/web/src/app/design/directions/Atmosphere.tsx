"use client";

import { useCallback, useRef, type PointerEvent } from "react";
import { Icon, NNGlassMark, OrinWave } from "@/components/ui";
import { APPS, CONTEXT, GREETING, WHEN } from "./content";
import s from "./Atmosphere.module.css";

/**
 * Direction A — Atmosphere.
 *
 * The environment is a dark, lit room. Surfaces are almost invisible until
 * light reaches them, so attention itself becomes the navigation: what you
 * look at is what you can read.
 *
 * Depth comes from LIGHT. There is no layering, no parallax and no scaling —
 * only illumination. Every value is written straight to CSS variables, so
 * moving the light causes no React re-render.
 */
export function Atmosphere() {
  const room = useRef<HTMLDivElement>(null);
  const frame = useRef<number | null>(null);

  const move = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const el = room.current;
    if (el === null) return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      el.style.setProperty("--lx", `${((x / r.width) * 100).toFixed(1)}%`);
      el.style.setProperty("--ly", `${((y / r.height) * 100).toFixed(1)}%`);

      // Each surface is lit according to how close the light actually is.
      for (const card of el.querySelectorAll<HTMLElement>("[data-lit]")) {
        const c = card.getBoundingClientRect();
        const cx = c.left + c.width / 2 - r.left;
        const cy = c.top + c.height / 2 - r.top;
        const d = Math.hypot(x - cx, y - cy);
        const lit = Math.max(0, 1 - d / 420);
        card.style.setProperty("--lit", lit.toFixed(3));
        card.style.setProperty("--cx", `${(((x - c.left + r.left) / c.width) * 100).toFixed(0)}%`);
        card.style.setProperty("--cy", `${(((y - c.top + r.top) / c.height) * 100).toFixed(0)}%`);
      }
    });
  }, []);

  return (
    <div ref={room} className={s.room} onPointerMove={move}>
      <div className={s.inner}>
        <h2 className={s.greeting}>{GREETING}</h2>
        <p className={s.when}>{WHEN}</p>

        <div className={s.orin}>
          <div className={s.orinRow}>
            <NNGlassMark size={30} bloom={10} />
            <span className={s.orinPrompt}>Ask me anything…</span>
            <Icon name="mic" size={18} />
          </div>
          <div style={{ marginTop: 10, color: "var(--nn-icy)", opacity: 0.55 }}>
            <OrinWave state="idle" lines={19} />
          </div>
        </div>

        <p className={s.sectionLabel}>Applications</p>
        <div className={s.grid}>
          {APPS.map((a) => (
            <button key={a.id} type="button" className={s.card} data-lit>
              <Icon name={a.icon} size={19} className={s.cardIcon} />
              <span className={s.cardName} style={{ display: "block" }}>{a.name}</span>
              <span className={s.cardHint} style={{ display: "block" }}>{a.hint}</span>
            </button>
          ))}
        </div>

        <div className={s.context}>
          {CONTEXT.map((c) => (
            <div key={c.id} className={s.ctx} data-lit>
              <p className={s.ctxLabel}>{c.label}</p>
              <p className={s.ctxValue}>{c.value}</p>
              <p className={s.ctxDetail}>{c.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
