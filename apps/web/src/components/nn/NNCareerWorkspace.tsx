"use client";
import {useMemo,useState} from "react";
import {useRecords,useRecordWriter,type NNRecord} from "@/lib/nn/records";
import type {NNApplication} from "@/lib/apps/registry";
import type {AppSection} from "@/lib/apps/sections";
import {NNAppSurface} from "@/components/nn/NNAppSurface";
import styles from "./NNCareerWorkspace.module.css";
type Props={app:NNApplication;sections:readonly AppSection[]};
const levels=["learning","working","strong"] as const;
type Level=(typeof levels)[number];
const str=(v:unknown)=>typeof v==="string"?v:"";
const title=(r:NNRecord)=>str(r.title)||str(r.name)||"Untitled record";
const dateLabel=(v:unknown)=>{if(!v)return "Date not set";const d=v&&typeof v==="object"&&"toDate"in v?(v as{toDate:()=>Date}).toDate():new Date(v as string|number);return Number.isNaN(d.getTime())?"Date not set":new Intl.DateTimeFormat("en-IN",{day:"numeric",month:"short",year:"numeric"}).format(d)};
export function NNCareerWorkspace({app,sections}:Props){
 const skills=useRecords("career_skills",{limit:200});const interviews=useRecords("career_interviews",{orderBy:"at",direction:"desc",limit:100});const writer=useRecordWriter();
 const[busy,setBusy]=useState<string|null>(null);const[error,setError]=useState("");
 const counts=useMemo(()=>Object.fromEntries(levels.map(x=>[x,skills.items.filter(s=>s.status===x).length])) as Record<Level,number>,[skills.items]);
 const update=async(r:NNRecord,status:Level)=>{if(!writer.ready||busy)return;setBusy(r.id);setError("");try{await writer.update("career_skills",r.id,{status});}catch(e){setError(e instanceof Error?e.message:"Could not update skill evidence.");}finally{setBusy(null);}};
 return <main className={styles.root}>
  <section className={styles.hero}><div className={styles.kicker}><span>NN / CAREER DEVELOPMENT</span><span>SKILL → EVIDENCE → OPPORTUNITY</span></div><div className={styles.heroBody}><div><p>BUILD A CAREER THAT CAN BE DEMONSTRATED</p><h1>Career<span>.</span></h1><small>Track capabilities, keep proof close to each skill and learn from every interview. Progress is based on your records, not an invented score.</small></div><div className={styles.compass}><i/><i/><b>N</b><span>CAREER VECTOR</span></div></div><div className={styles.foot}><span>YOUR WORK IS THE PROOF</span><span>PERSONAL DEVELOPMENT SYSTEM</span></div></section>
  <section className={styles.stats}>{levels.map((s,i)=><article key={s}><span>0{i+1} / {s.toUpperCase()}</span><strong>{skills.loading?"—":counts[s]}</strong><small>{["Building foundations","Applying in practice","Confident capability"][i]}</small></article>)}</section>
  {error&&<p className={styles.error} role="alert">{error}</p>}
  <section className={styles.skills}><header><div><span>CAPABILITY MAP</span><h2>Skills in development</h2><p>Advance a skill when you have real practice or evidence to support it.</p></div><b>{skills.loading?"—":skills.items.length+" SKILLS"}</b></header>
   {skills.fault?<p className={styles.empty}>{skills.fault.message}</p>:skills.loading?<p className={styles.empty}>Loading your skills…</p>:skills.items.length===0?<p className={styles.empty}>No skills have been added. Start with one capability you are actively developing.</p>:<div className={styles.skillGrid}>{skills.items.map(s=>{const index=levels.indexOf(s.status as Level);return <article key={s.id}><div className={styles.skillTop}><span>CAPABILITY</span><b>{index<0?"UNCLASSIFIED":"LEVEL 0"+(index+1)}</b></div><h3>{title(s)}</h3><p>{str(s.detail)||"Add practice notes and evidence in the skill record."}</p><div className={styles.track}>{levels.map((l,i)=><i key={l} data-active={index>=i}/>)}</div><div className={styles.skillFoot}><span>{str(s.status)||"not set"}</span><button disabled={!writer.ready||busy===s.id||index===2} onClick={()=>void update(s,levels[Math.max(0,index+1)]!)}>{busy===s.id?"Saving…":index<0?"Set learning":index===2?"Established":"Advance level ↗"}</button></div></article>})}</div>}
  </section>
  <section className={styles.interviews}><header><div><span>CONVERSATION LOG</span><h2>Interview history</h2><p>Capture the context, date and lessons from each conversation.</p></div><b>{interviews.loading?"—":interviews.items.length+" ENTRIES"}</b></header>
   {interviews.fault?<p className={styles.empty}>{interviews.fault.message}</p>:interviews.loading?<p className={styles.empty}>Loading interview history…</p>:interviews.items.length?<div className={styles.timeline}>{interviews.items.slice(0,10).map((r,i)=><article key={r.id}><span>{dateLabel(r.at)}</span><div><b>{title(r)}</b><p>{str(r.detail)||"No reflection recorded."}</p></div><small>{String(i+1).padStart(2,"0")}</small></article>)}</div>:<p className={styles.empty}>No interviews recorded. Add one after your next career conversation.</p>}
  </section>
  <section className={styles.records}><span>CAREER NOTEBOOK / LIVE</span><h2>Manage skills and interviews</h2><p>Record what you are learning, the work that demonstrates it and what each interview taught you.</p><NNAppSurface app={app} sections={sections}/></section>
 </main>;
}