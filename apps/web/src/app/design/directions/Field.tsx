"use client";

import { Icon, NNGlassMark, OrinWave } from "@/components/ui";
import { APPS, CONTEXT, GREETING, WHEN } from "./content";
import s from "./Field.module.css";

/**
 * Direction C — Field.
 *
 * One continuous surface rather than a collection of cards. Regions thicken
 * as attention reaches them: the backing becomes MORE opaque, not less, and
 * the text sharpens.
 *
 * Depth comes from DENSITY. This is the direction that answers the hardest
 * problem in the audit — NN College and NN Finance need many rows on screen
 * at once, and a card-based glass system fails there. Here, density is the
 * native state rather than the exception.
 */
export function Field() {
  return (
    <div className={s.field}>
      <div className={s.inner}>
        <h2 className={s.greeting}>{GREETING}</h2>
        <p className={s.when}>{WHEN}</p>

        <div className={s.orin}>
          <div className={s.orinRow}>
            <NNGlassMark size={30} bloom={12} />
            <span className={s.orinPrompt}>Ask me anything…</span>
            <Icon name="mic" size={18} />
          </div>
          <div style={{ marginTop: 10, color: "var(--nn-icy)", opacity: 0.7 }}>
            <OrinWave state="idle" lines={21} />
          </div>
        </div>

        <section className={s.region}>
          <p className={s.label}>Applications</p>
          <div className={s.rows}>
            {APPS.map((a) => (
              <button key={a.id} type="button" className={s.row}>
                <Icon name={a.icon} size={18} className={s.rowIcon} />
                <span className={s.rowName}>{a.name}</span>
                <span className={s.rowHint}>{a.hint}</span>
              </button>
            ))}
          </div>
        </section>

        <section className={s.region} style={{ marginTop: "var(--space-8)" }}>
          <p className={s.label}>Today</p>
          <div className={s.ctxRow}>
            {CONTEXT.map((c) => (
              <div key={c.id}>
                <p className={s.ctxLabel}>{c.label}</p>
                <p className={s.ctxValue}>{c.value}</p>
                <p className={s.ctxDetail}>{c.detail}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
