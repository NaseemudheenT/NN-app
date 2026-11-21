"use client";
import {useMemo,useState} from "react";
import {useRecords,useRecordWriter,type NNRecord} from "@/lib/nn/records";
import type {NNApplication} from "@/lib/apps/registry";
import type {AppSection} from "@/lib/apps/sections";
import {NNAppSurface} from "@/components/nn/NNAppSurface";
import styles from "./NNStudioWorkspace.module.css";
type Props={app:NNApplication;sections:readonly AppSection[]};
const text=(v:unknown)=>typeof v==="string"?v:"";
const title=(r:NNRecord)=>text(r.title)||text(r.name)||"Untitled content";
const when=(v:unknown)=>{if(!v)return "No date";const d=v&&typeof v==="object"&&"toDate"in v?(v as{toDate:()=>Date}).toDate():new Date(v as string|number);return Number.isNaN(d.getTime())?"No date":new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"short"}).format(d)};
const stages=["idea","making","editing","published"] as const;
export function NNStudioWorkspace({app,sections}:Props){
 const content=useRecords("creator_content",{orderBy:"at",direction:"asc",limit:200});
 const writer=useRecordWriter();const [busy,setBusy]=useState<string|null>(null);const [problem,setProblem]=useState("");
 const counts=useMemo(()=>Object.fromEntries(stages.map(stage=>[stage,content.items.filter(item=>item.status===stage).length])) as Record<(typeof stages)[number],number>,[content.items]);
 const update=async(record:NNRecord,status:(typeof stages)[number])=>{if(!writer.ready||busy)return;setBusy(record.id);setProblem("");try{await writer.update("creator_content",record.id,{status});}catch(e){setProblem(e instanceof Error?e.message:"Could not update this content.");}finally{setBusy(null);}};
 return <main className={styles.root}>
  <section className={styles.hero}><div className={styles.meta}><span>NN / CREATIVE WORKSPACE</span><span>IDEA TO RELEASE</span></div><div className={styles.heroBody}><div><p>MAKE THE WORK. SHIP THE WORK.</p><h1>Creator<br/><span>Studio.</span></h1><small>A clear production pipeline for your videos, designs and creative ideas — from first thought to published work.</small></div><div className={styles.aperture} aria-hidden="true"><i/><i/><i/><b>✳</b></div></div><div className={styles.foot}><span>{content.items.length} PIECES IN PIPELINE</span><span>{counts.published} PUBLISHED</span><span>CREATE WITH INTENTION</span></div></section>
  <section className={styles.metrics}>{stages.map((stage,index)=><article key={stage}><small>0{index+1} / {stage.toUpperCase()}</small><strong>{content.loading?"—":counts[stage]}</strong></article>)}</section>
  <section className={styles.pipeline}><header><div><span>PRODUCTION FLOW</span><h2>Content pipeline</h2><p>Move each piece forward as the work progresses.</p></div><span className={styles.live}>● LIVE RECORDS</span></header>
   {problem&&<p className={styles.problem} role="alert">{problem}</p>}
   {content.fault?<p className={styles.problem}>{content.fault.message}</p>:content.loading?<div className={styles.loading}/>:content.items.length===0?<div className={styles.empty}><strong>Start with an idea.</strong><p>Add a video, design or post below. Your production pipeline will build as you work.</p></div>:<div className={styles.columns}>{stages.map((stage,index)=><section className={styles.column} key={stage}><header><span>{stage}</span><b>{counts[stage].toString().padStart(2,"0")}</b></header>{content.items.filter(item=>item.status===stage).map(item=><article className={styles.item} key={item.id}><span>{when(item.at)}</span><h3>{title(item)}</h3><p>{text(item.detail)||"No production notes yet."}</p><div className={styles.itemActions}>{index<3&&<button type="button" disabled={busy===item.id||!writer.ready} onClick={()=>void update(item,stages[index+1]!)}>{busy===item.id?"Saving…":"Move to "+stages[index+1]}</button>}{index>0&&<button className={styles.back} type="button" disabled={busy===item.id||!writer.ready} onClick={()=>void update(item,stages[index-1]!)}>Back</button>}</div></article>)}</section>)}</div>}
  </section>
  <section className={styles.records}><div><span>STUDIO LIBRARY</span><h2>Manage creative work</h2><p>Add content, set a planned date and keep production notes. Updates are saved to NN.</p></div><NNAppSurface app={app} sections={sections}/></section>
 </main>;
}
