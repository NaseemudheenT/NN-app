"use client";

import { useMemo, useState } from "react";
import { useRecords, type NNRecord } from "@/lib/nn/records";
import type { NNApplication } from "@/lib/apps/registry";
import type { AppSection } from "@/lib/apps/sections";
import { NNAppSurface } from "@/components/nn/NNAppSurface";
import styles from "./NNFormulaWorkspace.module.css";

type Props = { app: NNApplication; sections: readonly AppSection[] };
const text = (value: unknown) => typeof value === "string" ? value : "";
const title = (record: NNRecord) => text(record.title) || text(record.name) || "Untitled formula";

export function NNFormulaWorkspace({ app, sections }: Props) {
  const formulas = useRecords("formula_library", { limit: 200 });
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const visible = useMemo(() => formulas.items.filter((record) => {
    const query = search.trim().toLowerCase();
    return !query || [title(record), text(record.expression), text(record.units), text(record.detail)]
      .some((value) => value.toLowerCase().includes(query));
  }), [formulas.items, search]);
  const copy = async (record: NNRecord) => {
    const expression = text(record.expression);
    if (!expression || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(expression);
      setCopied(record.id);
      window.setTimeout(() => setCopied((current) => current === record.id ? null : current), 1600);
    } catch { setCopied(null); }
  };

  return <main className={styles.root}>
    <section className={styles.hero}>
      <div className={styles.heroMeta}><span>NN / REFERENCE ENGINE</span><span>PERSONAL FORMULA LIBRARY</span></div>
      <div className={styles.heroBody}><div><p>KNOW THE RELATIONSHIP</p><h1>Formula<br/><span>Engine.</span></h1><small>A searchable reference for the expressions, units and principles you want close at hand.</small></div><div className={styles.orbit} aria-hidden="true"><span>∑</span><i>∫</i><b>π</b></div></div>
      <div className={styles.heroFoot}><span>{formulas.loading ? "SYNCING LIBRARY" : `${formulas.items.length.toString().padStart(2,"0")} SAVED EXPRESSIONS`}</span><span>YOUR KNOWLEDGE · YOUR REFERENCE</span></div>
    </section>
    <section className={styles.library}>
      <header><div><span>REFERENCE LIBRARY</span><h2>Find a formula</h2><p>Search names, expressions, units or notes in your saved library.</p></div><label className={styles.search}><span>⌕</span><input aria-label="Search formulas" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search formulas…" /></label></header>
      {formulas.fault ? <p className={styles.state}>{formulas.fault.message}</p> : formulas.loading ? <div className={styles.loading}><i/><i/><i/></div> : visible.length === 0 ? <div className={styles.empty}><span>∑</span><strong>{search ? "No matching formulas." : "Your formula library is ready."}</strong><p>{search ? "Try another term or clear your search." : "Add your first formula below. It will appear here for quick reference."}</p></div> : <div className={styles.grid}>{visible.map((record) => <article className={styles.formula} key={record.id}><div className={styles.cardTop}><span>FORMULA / {record.id.slice(0,5).toUpperCase()}</span>{text(record.units) && <small>{text(record.units)}</small>}</div><h3>{title(record)}</h3><code>{text(record.expression) || "Expression not added"}</code><p>{text(record.detail) || "No explanation saved."}</p><button type="button" onClick={() => void copy(record)} disabled={!text(record.expression)}>{copied === record.id ? "Copied" : "Copy expression"} <span aria-hidden="true">{copied === record.id ? "✓" : "↗"}</span></button></article>)}</div>}
    </section>
    <section className={styles.records}><div><span>CURATE YOUR REFERENCE</span><h2>Manage formulas</h2><p>Add, edit and remove your saved expressions. Records sync with your NN account.</p></div><NNAppSurface app={app} sections={sections}/></section>
  </main>;
}
