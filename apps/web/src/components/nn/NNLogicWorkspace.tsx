"use client";

import { useMemo, useState } from "react";
import { useRecords, useRecordWriter, type NNRecord } from "@/lib/nn/records";
import type { NNApplication } from "@/lib/apps/registry";
import type { AppSection } from "@/lib/apps/sections";
import { NNAppSurface } from "@/components/nn/NNAppSurface";
import styles from "./NNLogicWorkspace.module.css";

type Props={app:NNApplication;sections:readonly AppSection[]};
const value=(v:unknown)=>typeof v==="string"?v:"";
const title=(r:NNRecord)=>value(r.title)||value(r.name)||"Untitled challenge";
type Filter="all"|"to do"|"review"|"solved";
export function NNLogicWorkspace({app,sections}:Props){
 const challenges=useRecords("logic_challenges",{limit:200});
 const writer=useRecordWriter();
 const [filter,setFilter]=useState<Filter>("all");
 const [problem,setProblem]=useState("");
 const [busy,setBusy]=useState<string|null>(null);
 const counts=useMemo(()=>({todo:challenges.items.filter(x=>!x.status||x.status==="to do").length,review:challenges.items.filter(x=>x.status==="review").length,solved:challenges.items.filter(x=>x.status==="solved").length}),[challenges.items]);
 const visible=challenges.items.filter(x=>filter==="all"?(x.status!=="solved"):filter==="to do"?(!x.status||x.status==="to do"):x.status===filter);
 const changeStatus=async(record:NNRecord,status:"to do"|"review"|"solved")=>{if(!writer.ready||busy)return;setBusy(record.id);setProblem("");try{await writer.update("logic_challenges",record.id,{status});}catch(e){setProblem(e instanceof Error?e.message:"Could not update this challenge.");}finally{setBusy(null);}};
 return <main className={styles.root}>
  <section className={styles.hero}><div className={styles.meta}><span>NN / REASONING ENVIRONMENT</span><span>TRAIN YOUR THINKING</span></div><div className={styles.heroBody}><div><p>THINK CLEARLY. SOLVE DELIBERATELY.</p><h1>Logic<br/><span>Lab.</span></h1><small>A focused practice space for reasoning, problem solving and the lessons hidden inside mistakes.</small></div><div className={styles.circuit} aria-hidden="true"><i/><i/><i/><b>∴</b></div></div><div className={styles.foot}><span>{challenges.items.length} CHALLENGES</span><span>{counts.solved} SOLVED</span><span>PROGRESS IS EARNED</span></div></section>
  <section className={styles.metrics}><article><small>TO SOLVE</small><strong>{challenges.loading?"—":counts.todo}</strong></article><article><small>NEEDS REVIEW</small><strong>{challenges.loading?"—":counts.review}</strong></article><article><small>SOLVED</small><strong>{challenges.loading?"—":counts.solved}</strong></article></section>
  <section className={styles.board}><header><div><span>PRACTICE QUEUE</span><h2>Challenge board</h2><p>Move each problem through your own learning process.</p></div><div className={styles.filters}>{(["all","to do","review","solved"] as Filter[]).map(x=><button type="button" key={x} aria-pressed={filter===x} onClick={()=>setFilter(x)}>{x==="all"?"Active":x}</button>)}</div></header>
   {problem&&<p className={styles.problem} role="alert">{problem}</p>}
   {challenges.fault?<p className={styles.problem}>{challenges.fault.message}</p>:challenges.loading?<div className={styles.loading}/>:visible.length===0?<div className={styles.empty}><strong>{filter==="all"?"Your challenge board is clear.":"No challenges in this view."}</strong><p>Add a challenge below, then work it through to a verified solution.</p></div>:<div className={styles.list}>{visible.map(record=>{const status=value(record.status)||"to do";return <article className={styles.challenge} key={record.id}><div className={styles.challengeTop}><span data-status={status}>{status}</span><small>CHALLENGE / {record.id.slice(0,5).toUpperCase()}</small></div><h3>{title(record)}</h3><p>{value(record.detail)||"No working notes saved yet."}</p>{value(record.source)&&<small className={styles.source}>SOURCE · {value(record.source)}</small>}<div className={styles.actions}>{status!=="solved"&&<button type="button" disabled={busy===record.id||!writer.ready} onClick={()=>void changeStatus(record,"solved")}>{busy===record.id?"Saving…":"Mark solved"}</button>}{status!=="review"&&<button type="button" className={styles.secondary} disabled={busy===record.id||!writer.ready} onClick={()=>void changeStatus(record,"review")}>Needs review</button>}{status!=="to do"&&<button type="button" className={styles.secondary} disabled={busy===record.id||!writer.ready} onClick={()=>void changeStatus(record,"to do")}>Reopen</button>}</div></article>})}</div>}
  </section>
  <section className={styles.records}><div><span>CHALLENGE LIBRARY</span><h2>Manage practice</h2><p>Add challenges, keep your working notes and record the source.</p></div><NNAppSurface app={app} sections={sections}/></section>
 </main>;
}
