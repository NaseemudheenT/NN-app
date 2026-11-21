"use client";
import{useMemo}from"react";import{useRecords,type NNRecord}from"@/lib/nn/records";import type{NNApplication}from"@/lib/apps/registry";import type{AppSection}from"@/lib/apps/sections";import{NNAppSurface}from"@/components/nn/NNAppSurface";import styles from"./NNProjectsWorkspace.module.css";
type Props={app:NNApplication;sections:readonly AppSection[]};
const title=(r:NNRecord)=>{for(const k of["title","name","label"]){const v=r[k];if(typeof v==="string"&&v.trim())return v.trim()}return"Untitled"};
const date=(v:unknown):Date|null=>{if(!v)return null;const d=v&&typeof v==="object"&&"toDate"in v?(v as{toDate:()=>Date}).toDate():new Date(v as string|number);return Number.isNaN(d.getTime())?null:d};
const dayText=(v:unknown)=>{const d=date(v);return d?new Intl.DateTimeFormat("en-IN",{day:"2-digit",month:"short",year:"numeric"}).format(d):"Date not set"};
export function NNProjectsWorkspace({app,sections}:Props){
 const projects=useRecords("projects_projects",{limit:150}),milestones=useRecords("projects_milestones",{orderBy:"at",direction:"asc",limit:200});
 const counts=useMemo(()=>({active:projects.items.filter(p=>p.status==="active").length,blocked:projects.items.filter(p=>p.status==="blocked").length,done:projects.items.filter(p=>p.status==="done").length,planned:projects.items.filter(p=>p.status==="planned").length}),[projects.items]);
 const upcoming=useMemo(()=>milestones.items.map(m=>({milestone:m,when:date(m.at)})).filter(x=>x.when&&x.when.getTime()>=new Date(new Date().setHours(0,0,0,0)).getTime()&&x.milestone.status!=="reached").sort((a,b)=>(a.when?.getTime()??0)-(b.when?.getTime()??0)),[milestones.items]);
 const jump=()=>{const el=document.getElementById("projects-record-workspace");if(el&&typeof el.scrollIntoView==="function")el.scrollIntoView({behavior:"smooth",block:"start"})};
 const status=(v:unknown)=>typeof v==="string"?v:"not set";
 return <main className={styles.root}>
  <section className={styles.hero}><div className={styles.orbit}/><div className={styles.meta}><span>NN / EXECUTION ENVIRONMENT</span><span>● OWNER CONTROLLED</span></div><div className={styles.heroBody}><div><p>FROM INTENTION TO DELIVERY</p><h1>Projects<span>.</span></h1><small>Keep scope, decisions and verified milestones connected to the work.</small></div><button onClick={jump}>Open project workspace ↗</button></div><footer className={styles.heroFoot}>MAKE PROGRESS VISIBLE <span>03 — EXECUTION</span></footer></section>
  <section className={styles.metrics}><article><label>ACTIVE</label><strong>{projects.loading?"—":counts.active}</strong><small>Currently in motion</small></article><article><label>PLANNED</label><strong>{projects.loading?"—":counts.planned}</strong><small>Not started yet</small></article><article><label>BLOCKED</label><strong>{projects.loading?"—":counts.blocked}</strong><small>Needs attention</small></article><article><label>COMPLETED</label><strong>{projects.loading?"—":counts.done}</strong><small>Marked as done</small></article></section>
  {(projects.fault||milestones.fault)&&<p className={styles.notice}>Some project records could not be loaded. Check the live workspace below for the actual access or connection status.</p>}
  <section className={styles.columns}>
   <article className={styles.panel}><header><div><label>PROJECT PORTFOLIO</label><h2>Current work</h2></div><button onClick={jump}>Manage ↗</button></header>
    {projects.loading?<p className={styles.empty}>Loading your projects…</p>:projects.items.length?<div className={styles.projectList}>{projects.items.slice(0,8).map((p,i)=><div key={p.id}><span className={styles.index}>{String(i+1).padStart(2,"0")}</span><span className={styles.projectInfo}><strong>{title(p)}</strong><small>{typeof p.detail==="string"&&p.detail?p.detail:"Project record"}</small></span><label data-status={status(p.status)}>{status(p.status).toUpperCase()}</label></div>)}</div>:<p className={styles.empty}>Your project portfolio starts here. <button onClick={jump}>Create a project ↗</button></p>}
   </article>
   <article className={styles.panel}><header><div><label>VERIFIABLE CHECKPOINTS</label><h2>Milestones</h2></div><button onClick={jump}>Manage ↗</button></header>
    {milestones.loading?<p className={styles.empty}>Loading milestones…</p>:upcoming.length?<div className={styles.milestones}>{upcoming.slice(0,7).map(({milestone:m,when},i)=><div key={m.id}><span className={styles.dot}/><span><strong>{title(m)}</strong><small>{dayText(m.at)}</small></span><label>{status(m.status).toUpperCase()}</label></div>)}</div>:<p className={styles.empty}>No upcoming milestones recorded. <button onClick={jump}>Add a milestone ↗</button></p>}
   </article>
  </section>
  <section className={styles.callout}><div><label>EXECUTION PRINCIPLE</label><strong>A milestone is complete when the result can be checked, not just when the task feels finished.</strong></div><button onClick={jump}>Go to project records ↗</button></section>
  <section id="projects-record-workspace" className={styles.records}><header><label>PROJECT RECORDS / LIVE</label><h2>Workspace</h2></header><NNAppSurface app={app} sections={sections}/></section>
 </main>;
}