"use client";
import { useMemo } from "react";
import { useRecords,type NNRecord } from "@/lib/nn/records";
import type { NNApplication } from "@/lib/apps/registry";
import type { AppSection } from "@/lib/apps/sections";
import { NNAppSurface } from "@/components/nn/NNAppSurface";
import styles from "./NNCollegeWorkspace.module.css";
type Props={app:NNApplication;sections:readonly AppSection[]};
const title=(r:NNRecord)=>{for(const k of ["title","name","label"]){const v=r[k];if(typeof v==="string"&&v.trim())return v.trim()}return "Untitled"};
const date=(v:unknown):Date|null=>{if(!v)return null;const d=v&&typeof v==="object"&&"toDate"in v?(v as {toDate:()=>Date}).toDate():new Date(v as string|number);return Number.isNaN(d.getTime())?null:d};
const days=(v:unknown)=>{const d=date(v);if(!d)return null;const n=new Date(),a=new Date(n.getFullYear(),n.getMonth(),n.getDate()),b=new Date(d.getFullYear(),d.getMonth(),d.getDate());return Math.round((b.getTime()-a.getTime())/86400000)};
export function NNCollegeWorkspace({app,sections}:Props){
 const subjects=useRecords("college_subjects",{limit:100}),exams=useRecords("college_exams",{orderBy:"at",direction:"asc",limit:100}),notes=useRecords("college_notes",{limit:100});
 const upcoming=useMemo(()=>exams.items.map(exam=>({exam,days:days(exam.at)})).filter(x=>x.days!==null&&x.days>=0&&x.exam.status!=="passed").sort((a,b)=>(a.days??99999)-(b.days??99999)),[exams.items]);
 const next=upcoming[0],jump=()=>{const el=document.getElementById("college-record-workspace");if(el&&typeof el.scrollIntoView==="function")el.scrollIntoView({behavior:"smooth",block:"start"})};
 return <main className={styles.root}>
  <section className={styles.hero}><div className={styles.orbit}/><div className={styles.meta}><span>NN / LEARNING ENVIRONMENT</span><span>● PERSONAL ACADEMIC SPACE</span></div><div className={styles.heroBody}><div><p>YOUR ACADEMIC YEAR</p><h1>College<span>.</span></h1><small>A clear view of your semester, preparation and academic progress.</small></div><button onClick={jump}>Open academic records ↗</button></div><footer>STUDY WITH INTENTION <span>01 — ACADEMICS</span></footer></section>
  <section className={styles.metrics}><article><label>SUBJECTS</label><strong>{subjects.loading?"—":subjects.items.length}</strong><small>In your workspace</small></article><article><label>UPCOMING EXAMS</label><strong>{exams.loading?"—":upcoming.length}</strong><small>Not marked as passed</small></article><article><label>STUDY NOTES</label><strong>{notes.loading?"—":notes.items.length}</strong><small>Saved to your account</small></article><article><label>NEXT EXAM</label><strong>{exams.loading?"—":next?(next.days===0?"Today":String(next.days)+"d"):"—"}</strong><small>{next?title(next.exam):"No upcoming exam recorded"}</small></article></section>
  {(subjects.fault||exams.fault||notes.fault)&&<p className={styles.notice}>Some academic records could not be loaded. Check the live workspace below for the access or connection status.</p>}
  <section className={styles.columns}>
   <article className={styles.panel}><header><div><label>YOUR CURRICULUM</label><h2>Subjects</h2></div><button onClick={jump}>Manage ↗</button></header>
    {subjects.loading?<p className={styles.empty}>Loading your subjects…</p>:subjects.items.length?<div className={styles.subjects}>{subjects.items.slice(0,8).map((s,i)=><div key={s.id}><small>{String(i+1).padStart(2,"0")}</small><strong>{title(s)}</strong><label>{typeof s.code==="string"&&s.code?s.code:"SUBJECT"}</label></div>)}</div>:<p className={styles.empty}>Your subjects start here. <button onClick={jump}>Add subjects ↗</button></p>}
   </article>
   <article className={styles.panel}><header><div><label>PREPARATION TIMELINE</label><h2>Upcoming exams</h2></div><button onClick={jump}>Manage ↗</button></header>
    {exams.loading?<p className={styles.empty}>Loading your exam timeline…</p>:upcoming.length?<div className={styles.examList}>{upcoming.slice(0,6).map(({exam,days:d})=><div key={exam.id}><time>{date(exam.at)?.toLocaleDateString("en-IN",{day:"2-digit",month:"short"})??"DATE"}</time><span><strong>{title(exam)}</strong><small>{d===0?"Today":String(d)+" days away"}</small></span><label>{d===0?"TODAY":String(d)+" DAYS"}</label></div>)}</div>:<p className={styles.empty}>No exams on your timeline. <button onClick={jump}>Add an exam ↗</button></p>}
   </article>
  </section>
  <section className={styles.callout}><div><label>YOUR NEXT STEP</label><strong>Keep the plan visible. Make progress measurable.</strong></div><button onClick={jump}>Go to academic workspace ↗</button></section>
  <section id="college-record-workspace" className={styles.records}><header><label>ACADEMIC RECORDS / LIVE</label><h2>Workspace</h2></header><NNAppSurface app={app} sections={sections}/></section>
 </main>
}