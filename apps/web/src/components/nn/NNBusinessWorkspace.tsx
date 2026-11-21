"use client";
import { useMemo, useState } from "react";
import { useRecords, useRecordWriter, type NNRecord } from "@/lib/nn/records";
import type { NNApplication } from "@/lib/apps/registry";
import type { AppSection } from "@/lib/apps/sections";
import { NNAppSurface } from "@/components/nn/NNAppSurface";
import styles from "./NNBusinessWorkspace.module.css";

type Props = { app: NNApplication; sections: readonly AppSection[] };
const stages = ["idea", "validating", "running", "closed"] as const;
type Stage = (typeof stages)[number];
const value = (v: unknown) => typeof v === "string" ? v : "";
const title = (r: NNRecord) => value(r.title) || value(r.name) || "Untitled venture";
const detail = (r: NNRecord) => value(r.detail) || "No operating notes recorded.";
export function NNBusinessWorkspace({ app, sections }: Props) {
  const ventures = useRecords("business_ventures", { limit: 200 });
  const decisions = useRecords("business_decisions", { orderBy: "at", direction: "desc", limit: 100 });
  const writer = useRecordWriter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const totals = useMemo(() => Object.fromEntries(stages.map(s => [s, ventures.items.filter(v => v.status === s).length])) as Record<Stage, number>, [ventures.items]);
  const move = async (record: NNRecord, next: Stage) => {
    if (!writer.ready || busy) return;
    setBusy(record.id); setError("");
    try { await writer.update("business_ventures", record.id, { status: next }); }
    catch (e) { setError(e instanceof Error ? e.message : "The venture could not be updated."); }
    finally { setBusy(null); }
  };
  return <main className={styles.root}>
    <section className={styles.hero}>
      <div className={styles.topline}><span>NN / VENTURE OPERATING SYSTEM</span><span>PRIVATE WORKSPACE · OWNER CONTROLLED</span></div>
      <div className={styles.heroGrid}><div><p>BUILD WITH EVIDENCE</p><h1>Business<span>.</span></h1><h2>From first thesis to a running venture.</h2><small>Keep experiments, operating decisions and venture status in one deliberate place. No invented metrics. No assumed revenue.</small></div><div className={styles.seal}><span>NN</span><i>VENTURE OFFICE</i><b>EST. BY YOU</b></div></div>
      <div className={styles.bottomline}><span>THINK CLEARLY. TEST THE MARKET.</span><span>01 — VENTURE PORTFOLIO</span></div>
    </section>
    <section className={styles.metrics}>
      {stages.map((stage, i) => <article key={stage}><span>0{i + 1} / {stage.toUpperCase()}</span><strong>{ventures.loading ? "—" : totals[stage]}</strong><small>{["Unvalidated concepts", "Testing assumptions", "Operating ventures", "Closed or archived"][i]}</small></article>)}
    </section>
    {error && <p className={styles.error} role="alert">{error}</p>}
    <section className={styles.board}>
      <header><div><span>VENTURE PIPELINE</span><h2>Portfolio overview</h2><p>Move a venture only when its current stage is supported by evidence.</p></div><b>LIVE OWNER RECORDS</b></header>
      {ventures.fault ? <p className={styles.empty}>{ventures.fault.message}</p> : ventures.loading ? <p className={styles.empty}>Loading venture records…</p> : ventures.items.length === 0 ? <div className={styles.empty}><strong>Your venture portfolio is clear.</strong><p>Create your first venture below. NN will not seed fictional companies or performance figures.</p></div> :
        <div className={styles.columns}>{stages.map((stage, i) => <section className={styles.column} key={stage}><header><span>{stage}</span><b>{String(totals[stage]).padStart(2, "0")}</b></header>{ventures.items.filter(v => v.status === stage).map(v => <article className={styles.venture} key={v.id}><span className={styles.ref}>VENTURE RECORD</span><h3>{title(v)}</h3><p>{detail(v)}</p><div className={styles.actions}>{i < stages.length - 1 && <button disabled={!writer.ready || busy === v.id} onClick={() => void move(v, stages[i + 1]!)}>{busy === v.id ? "Saving…" : "Advance stage ↗"}</button>}{i > 0 && <button className={styles.back} disabled={!writer.ready || busy === v.id} onClick={() => void move(v, stages[i - 1]!)}>Move back</button>}</div></article>)}</section>)}</div>}
    </section>
    <section className={styles.decisions}><header><div><span>DECISION REGISTER</span><h2>Decisions with a record</h2><p>Capture what was decided and the reasoning behind it.</p></div><b>{decisions.loading ? "—" : decisions.items.length + " RECORDED"}</b></header>
      {decisions.fault ? <p className={styles.empty}>{decisions.fault.message}</p> : decisions.loading ? <p className={styles.empty}>Loading decisions…</p> : decisions.items.length ? <div className={styles.decisionList}>{decisions.items.slice(0, 8).map((d, i) => <article key={d.id}><span>{String(i + 1).padStart(2, "0")}</span><div><h3>{title(d)}</h3><p>{detail(d)}</p></div></article>)}</div> : <p className={styles.empty}>No decisions recorded yet. Add the first decision in the register below.</p>}
    </section>
    <section className={styles.records}><span>THE OPERATING LEDGER</span><h2>Manage venture records</h2><p>Create ventures and decisions, preserve context and keep the source of every update clear.</p><NNAppSurface app={app} sections={sections} /></section>
  </main>;
}
