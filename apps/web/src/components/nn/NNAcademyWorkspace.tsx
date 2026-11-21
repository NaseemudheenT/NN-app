"use client";

import { useMemo } from "react";
import { useRecords, type NNRecord } from "@/lib/nn/records";
import type { NNApplication } from "@/lib/apps/registry";
import type { AppSection } from "@/lib/apps/sections";
import { NNAppSurface } from "@/components/nn/NNAppSurface";
import styles from "./NNAcademyWorkspace.module.css";

type Props = { app: NNApplication; sections: readonly AppSection[] };
const title = (r: NNRecord) => {
  for (const key of ["title", "name", "label"]) {
    const value = r[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "Untitled";
};
const dateOf = (value: unknown): Date | null => {
  if (!value) return null;
  const date = value && typeof value === "object" && "toDate" in value
    ? (value as { toDate: () => Date }).toDate()
    : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
};
const studiedLabel = (value: unknown) => {
  const date = dateOf(value);
  return date ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date) : "Study session";
};

export function NNAcademyWorkspace({ app, sections }: Props) {
  const paths = useRecords("academy_paths", { limit: 100 });
  const lessons = useRecords("academy_lessons", { orderBy: "at", direction: "desc", limit: 100 });
  const progress = useMemo(() => {
    const total = paths.items.length;
    const completed = paths.items.filter((path) => path.status === "done").length;
    const active = paths.items.filter((path) => path.status === "in progress").length;
    return { total, completed, active, planned: Math.max(0, total - completed - active) };
  }, [paths.items]);
  const recent = lessons.items.slice(0, 5);
  const jump = () => {
    const node = document.getElementById("academy-record-workspace");
    node?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  return (
    <main className={styles.root}>
      <section className={styles.hero} aria-labelledby="academy-title">
        <div className={styles.heroGlow} />
        <div className={styles.topline}><span>NN / KNOWLEDGE SYSTEM</span><span>PERSONAL LEARNING SPACE</span></div>
        <div className={styles.heroBody}>
          <div>
            <p className={styles.eyebrow}>LEARN WITH INTENTION</p>
            <h1 id="academy-title">Academy<span>.</span></h1>
            <p className={styles.intro}>A living map of the skills you are building, the lessons you have studied and the knowledge you want to retain.</p>
          </div>
          <button className={styles.primary} type="button" onClick={jump}>Open learning desk <span aria-hidden="true">↗</span></button>
        </div>
        <div className={styles.heroFoot}><span>01 — LEARNING PATHS</span><span>02 — STUDY LOG</span><span>03 — CONTINUOUS PROGRESS</span></div>
      </section>

      <section className={styles.metrics} aria-label="Learning overview">
        <article><span>LEARNING PATHS</span><strong>{paths.loading ? "—" : progress.total}</strong><small>Skills you have chosen to build</small></article>
        <article><span>IN PROGRESS</span><strong>{paths.loading ? "—" : progress.active}</strong><small>Paths currently being developed</small></article>
        <article><span>COMPLETED</span><strong>{paths.loading ? "—" : progress.completed}</strong><small>Paths marked as complete</small></article>
        <article><span>LESSONS LOGGED</span><strong>{lessons.loading ? "—" : lessons.items.length}</strong><small>Study records in your library</small></article>
      </section>

      <section className={styles.contentGrid}>
        <article className={styles.pathsPanel}>
          <header><div><span className={styles.sectionLabel}>YOUR CURRICULUM</span><h2>Learning paths</h2></div><span className={styles.counter}>{progress.total.toString().padStart(2, "0")} PATHS</span></header>
          {paths.fault ? <p className={styles.state}>{paths.fault.message}</p> : paths.loading ? <div className={styles.loading}><i /><i /><i /></div> : paths.items.length === 0 ? <div className={styles.empty}><span className={styles.emptyMark}>＋</span><strong>Your first learning path starts here.</strong><p>Add a skill or subject below to create a structured place for your progress.</p></div> : (
            <div className={styles.pathList}>{paths.items.map((path) => {
              const status = typeof path.status === "string" ? path.status : "planned";
              return <div className={styles.pathRow} key={path.id}><span className={styles.pathGlyph}>↗</span><div className={styles.pathInfo}><strong>{title(path)}</strong><small>{status}</small></div><span className={styles.pathStatus} data-status={status}>{status}</span></div>;
            })}</div>
          )}
          <div className={styles.progressLine}><span style={{ width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%` }} /></div>
          <small className={styles.progressCaption}>{progress.total ? `${progress.completed} of ${progress.total} paths completed` : "Progress appears here as you complete paths."}</small>
        </article>

        <article className={styles.lessonsPanel}>
          <header><div><span className={styles.sectionLabel}>RECENT ACTIVITY</span><h2>Study log</h2></div><span className={styles.counter}>{lessons.items.length.toString().padStart(2, "0")} NOTES</span></header>
          {lessons.fault ? <p className={styles.state}>{lessons.fault.message}</p> : lessons.loading ? <div className={styles.loading}><i /><i /><i /></div> : recent.length === 0 ? <div className={styles.empty}><span className={styles.emptyMark}>◷</span><strong>No lessons logged yet.</strong><p>Record what you study so your learning history stays in one place.</p></div> : <div className={styles.lessonList}>{recent.map((lesson) => <div className={styles.lessonRow} key={lesson.id}><span className={styles.lessonDot} /><div><strong>{title(lesson)}</strong><small>{typeof lesson.source === "string" && lesson.source ? lesson.source : "Personal study"}</small></div><time>{studiedLabel(lesson.at)}</time></div>)}</div>}
        </article>
      </section>

      <section className={styles.records} id="academy-record-workspace"><div><span className={styles.sectionLabel}>LEARNING DESK</span><h2>Manage your knowledge</h2><p>Create and update learning paths and lessons. Changes are saved to your NN account.</p></div><NNAppSurface app={app} sections={sections} /></section>
    </main>
  );
}
