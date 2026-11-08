"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui";
import { Atmosphere } from "./Atmosphere";
import { Field } from "./Field";
import { Strata } from "./Strata";
import { SAMPLE_NOTICE } from "./content";
import s from "./directions.module.css";

const DIRECTIONS = [
  {
    id: "atmosphere",
    name: "A · Atmosphere",
    depth: "Light",
    idea: "The environment is a dark, lit room. Surfaces are almost invisible until light reaches them.",
    navigation: "Attention is the navigation — what you look at is what you can read.",
    risk: "Unlit content is genuinely hard to find. Punishing on a bright screen or outdoors.",
  },
  {
    id: "strata",
    name: "B · Strata",
    depth: "Layering",
    idea: "Three discrete planes of glass. Your working context comes forward; the rest recedes in visible steps.",
    navigation: "Navigation is a change of depth, not a change of page.",
    risk: "Only three tiers read clearly. Beyond that the steps blur together.",
  },
  {
    id: "field",
    name: "C · Field",
    depth: "Density",
    idea: "One continuous surface. Regions thicken under attention — backing becomes MORE opaque, text sharpens.",
    navigation: "Information condenses where you look; the surface never breaks into cards.",
    risk: "Least overtly cinematic of the three on first impression.",
  },
] as const;

type DirectionId = (typeof DIRECTIONS)[number]["id"];

/**
 * Stage B — three interpretations of "an intelligent environment", built as
 * real interactive pages on identical content so the comparison is fair.
 *
 * Each renders the same greeting, the same ORIN surface, the same eight
 * applications and the same three context entries. Only the depth philosophy
 * differs.
 */
export function Directions() {
  const [active, setActive] = useState<DirectionId>("atmosphere");

  // Deep-linkable, so a direction can be reopened or shared.
  useEffect(() => {
    const apply = () => {
      const h = window.location.hash.replace("#", "");
      if (DIRECTIONS.some((d) => d.id === h)) {
        setActive(h as DirectionId);
        window.scrollTo({ top: 0 });
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const current = DIRECTIONS.find((d) => d.id === active) ?? DIRECTIONS[0];

  return (
    <main className={s.page}>
      <div className={s.wrap}>
        <p className={s.eyebrow}>NN · Design Stage B · Creative exploration</p>
        <h1 className={s.h1}>Three ways NN could feel</h1>
        <p className={s.lede}>
          Three genuinely different answers to &ldquo;an intelligent environment&rdquo;, each
          built as a working page on identical content. Move your pointer through them —
          they respond differently on purpose. Choose one and it becomes NN.
        </p>

        <p className={s.notice}>
          <Icon name="shield" size={15} />
          {SAMPLE_NOTICE} ORIN is a designed surface here and performs nothing.
        </p>

        <nav className={s.tabs} aria-label="Design directions">
          {DIRECTIONS.map((d) => (
            <button
              key={d.id} type="button" className={s.tab}
              aria-current={active === d.id}
              onClick={() => {
                setActive(d.id);
                window.history.replaceState(null, "", `#${d.id}`);
              }}
            >
              {d.name}
            </button>
          ))}
        </nav>

        <div className={s.meta}>
          <div className={s.metaBox}>
            <p className={s.metaLabel}>Depth comes from</p>
            <p className={s.metaValue}>{current.depth}</p>
          </div>
          <div className={s.metaBox}>
            <p className={s.metaLabel}>Navigation</p>
            <p className={s.metaValue}>{current.navigation}</p>
          </div>
          <div className={s.metaBox}>
            <p className={s.metaLabel}>Honest risk</p>
            <p className={s.metaValue}>{current.risk}</p>
          </div>
        </div>

        <div className={s.stage}>
          {active === "atmosphere" ? <Atmosphere /> : null}
          {active === "strata" ? <Strata /> : null}
          {active === "field" ? <Field /> : null}
        </div>

        <p className={s.note}>{current.idea}</p>

        <div className={s.verdict}>
          <p className={s.verdictTitle}>My recommendation: C · Field, with A&rsquo;s lighting</p>
          <p className={s.verdictBody}>
            <strong>Field</strong> is the only direction that solves the hardest problem in the
            audit. NN College must show a timetable, marks and a question bank at once; NN
            Finance needs transaction tables. Atmosphere actively hides content, and Strata
            runs out of legible depth past three tiers. Field makes density the native state
            and does the counter-intuitive right thing — the surface becomes <em>more</em>{" "}
            opaque under attention, not less, so dense data stays readable.
            <br /><br />
            It is also the least cinematic at first glance, which is why I would take{" "}
            <strong>Atmosphere&rsquo;s pointer-tracked lighting</strong> and apply it to
            Field&rsquo;s surface. That gives the room its atmosphere without hiding anything,
            and keeps Strata&rsquo;s depth for the one place it genuinely belongs — floating
            application windows.
            <br /><br />
            Your call. Tell me a letter, or tell me to combine them differently.
          </p>
        </div>
      </div>
    </main>
  );
}
