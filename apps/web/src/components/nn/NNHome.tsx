"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { Icon, type IconName } from "@/components/ui/Icon";
import { NNLogo } from "@/components/ui/NNLogo";
import styles from "./NNHome.module.css";

type AppItem={name:string;group:string;icon:IconName;description:string;href?:string;ready:boolean};
const APPS:readonly AppItem[]=[
{name:"NN Home",group:"Personal",icon:"grid",description:"Your daily command surface",href:"/home",ready:true},
{name:"Workspace",group:"Personal",icon:"calendar",description:"Explore the interactive workspace",href:"/workspace",ready:true},
{name:"Design system",group:"System",icon:"sparkle",description:"Materials, motion and components",href:"/design",ready:true},
{name:"Calendar",group:"Life",icon:"calendar",description:"Time, events and commitments",ready:false},
{name:"Tasks",group:"Life",icon:"check",description:"Turn plans into progress",ready:false},
{name:"Reminders",group:"Life",icon:"clock",description:"Timely prompts and follow-through",ready:false},
{name:"Notes",group:"Life",icon:"file",description:"A private space for your thoughts",ready:false},
{name:"Goals",group:"Life",icon:"graph",description:"Milestones and long-term direction",ready:false},
{name:"College",group:"Learning",icon:"book",description:"Subjects, exams and revision",ready:false},
{name:"Academy",group:"Learning",icon:"sparkle",description:"Structured skill development",ready:false},
{name:"Projects",group:"Work",icon:"grid",description:"Build and ship meaningful work",ready:false},
{name:"Business",group:"Work",icon:"wallet",description:"Operations and decisions",ready:false},
{name:"Files",group:"Personal",icon:"folder",description:"Your private library",ready:false},
{name:"Finance",group:"Personal",icon:"wallet",description:"A clear view of your money",ready:false},
{name:"Security",group:"System",icon:"shield",description:"Identity, sessions and privacy",ready:false}
];
function HomeSurface(){
 const {user,signOutHere}=useAuth();
 const [query,setQuery]=useState("");
 const [launcherOpen,setLauncherOpen]=useState(false);
 const [capture,setCapture]=useState("");
 const [drafts,setDrafts]=useState<string[]>([]);
 const [captureOpen,setCaptureOpen]=useState(false);
 const filtered=useMemo(()=>APPS.filter(a=>(a.name+" "+a.group+" "+a.description).toLowerCase().includes(query.toLowerCase())),[query]);
 useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setLauncherOpen(true);}if(event.key==="Escape"){setLauncherOpen(false);setQuery("");}};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);},[]);
 const firstName=user?.displayName?.trim().split(/\s+/)[0]||"Founder";
 function addDraft(){const value=capture.trim();if(!value)return;setDrafts(items=>[value,...items].slice(0,4));setCapture("");setCaptureOpen(false);}
 return <main className={styles.root}>
  <aside className={styles.sidebar} aria-label="Primary navigation">
   <Link href="/home" className={styles.brand}><NNLogo size={34} decorative/><span>NN<small>PERSONAL OS</small></span></Link>
   <div className={styles.navLabel}>WORKSPACE</div>
   <Link href="/home" className={styles.navItem} aria-current="page"><Icon name="grid"/>Overview</Link>
   <Link href="/workspace" className={styles.navItem}><Icon name="calendar"/>Workspace</Link>
   <button className={styles.navItem} onClick={()=>setLauncherOpen(true)}><Icon name="search"/>All applications</button>
   <div className={styles.navLabel}>YOUR SYSTEM</div>
   {["Personal","Life","Learning","Work","System"].map(group=><button key={group} className={styles.groupButton} onClick={()=>{setQuery(group);setLauncherOpen(true);}}>{group}<span>{String(APPS.filter(a=>a.group===group).length).padStart(2,"0")}</span></button>)}
   <div className={styles.sidebarBottom}><Link href="/design" className={styles.navItem}><Icon name="sparkle"/>Design system</Link>
    <div className={styles.profile}><b>{firstName.slice(0,1).toUpperCase()}</b><span><strong>{firstName}</strong><small>Owner account</small></span><button onClick={()=>void signOutHere()} aria-label="Sign out"><Icon name="close" size={16}/></button></div>
   </div>
  </aside>
  <section className={styles.content}>
   <header className={styles.topbar}><div>NN <i>/</i> <strong>Overview</strong></div><div className={styles.topActions}><button className={styles.searchButton} onClick={()=>setLauncherOpen(true)}><Icon name="search" size={17}/><span>Search applications</span><kbd>⌘ K</kbd></button><span className={styles.connection}><i/>Private workspace</span><b className={styles.avatar}>{firstName.slice(0,1).toUpperCase()}</b></div></header>
   <div className={styles.page}>
    <div className={styles.eyebrow}> <i/> YOUR PERSONAL ENVIRONMENT</div>
    <div className={styles.headingRow}><div><h1>Good to see you, {firstName}.</h1><p>A quieter place to think, organise and move forward.</p></div><button className={styles.launchButton} onClick={()=>setLauncherOpen(true)}><Icon name="grid" size={17}/>Open app launcher</button></div>
    <section className={styles.hero}><div className={styles.heroCopy}><span className={styles.heroTag}><i/> NN / PRIVATE SYSTEM</span><h2>Your life.<br/><em>In one system.</em></h2><p>One considered environment for your time, learning, work and personal world. Built around your priorities—not somebody else's workflow.</p><button onClick={()=>setLauncherOpen(true)}>Explore your applications <b>↗</b></button></div><div className={styles.orbit} aria-hidden="true"><div/><div/><span><NNLogo size={52} decorative/></span><i><Icon name="calendar"/></i><i><Icon name="book"/></i><i><Icon name="grid"/></i></div><small className={styles.heroIndex}>01 / 05</small></section>
    <div className={styles.sectionHead}><div><small>THE ENVIRONMENT</small><h2>Applications</h2></div><button onClick={()=>setLauncherOpen(true)}>View all ↗</button></div>
    <div className={styles.appGrid}>{APPS.filter(a=>["NN Home","Calendar","Tasks","College","Academy","Projects"].includes(a.name)).map((app,index)=><article className={styles.appCard} key={app.name} style={{animationDelay:(index*55)+"ms"}}><div className={styles.appTop}><span><Icon name={app.icon} size={19}/></span><small data-ready={app.ready}>{app.ready?"AVAILABLE":"IN DEVELOPMENT"}</small></div><h3>{app.name}</h3><p>{app.description}</p>{app.href?<Link href={app.href}>Open application ↗</Link>:<label>Being built</label>}</article>)}</div>
    <div className={styles.lowerGrid}>
     <section className={styles.panel}><div className={styles.panelHead}><div><small>QUICK CAPTURE</small><h2>Get it out of your head.</h2></div><Icon name="file"/></div><p>Capture a thought while it is fresh. Drafts stay in this page session; persistent notes are not connected yet.</p>{captureOpen?<form onSubmit={e=>{e.preventDefault();addDraft();}}><input autoFocus value={capture} onChange={e=>setCapture(e.target.value)} placeholder="Write a thought…" maxLength={240}/><button disabled={!capture.trim()}>Add draft</button></form>:<button className={styles.captureTrigger} onClick={()=>setCaptureOpen(true)}><Icon name="plus" size={17}/>Capture a thought ↗</button>}{drafts.length>0&&<div className={styles.drafts}><small>SESSION DRAFTS</small>{drafts.map((d,i)=><div key={d+"-"+i}>{d}</div>)}</div>}</section>
     <section className={styles.panel}><div className={styles.panelHead}><div><small>YOUR INTELLIGENCE</small><h2>REN is being prepared.</h2></div><span className={styles.renOrb}/></div><p>REN's interface is present across NN. Reasoning, memory and tool execution remain disabled until their services are implemented and verified.</p><div className={styles.renStatus}><span>● DESIGNED</span><b>NOT CONNECTED</b></div></section>
    </div>
    <footer className={styles.footer}>NN / PERSONAL OPERATING ENVIRONMENT <span>Designed for clarity. Built with intent.</span></footer>
   </div>
  </section>
  {launcherOpen&&<div className={styles.overlay} onMouseDown={e=>{if(e.target===e.currentTarget){setLauncherOpen(false);setQuery("");}}}><section className={styles.launcher} role="dialog" aria-modal="true" aria-labelledby="launcher-title"><header><div><small>NN APPLICATION INDEX</small><h2 id="launcher-title">Where to?</h2></div><button onClick={()=>{setLauncherOpen(false);setQuery("");}} aria-label="Close"><Icon name="close"/></button></header><label className={styles.launchSearch}><Icon name="search"/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find an application…"/></label><div className={styles.launchList}>{filtered.map(app=><div key={app.name}>{app.href?<Link href={app.href} onClick={()=>setLauncherOpen(false)}><span><Icon name={app.icon}/></span><strong>{app.name}<small>{app.description}</small></strong><em>OPEN ↗</em></Link>:<article><span><Icon name={app.icon}/></span><strong>{app.name}<small>{app.description}</small></strong><em>IN DEVELOPMENT</em></article>}</div>)}</div><p>Only verified routes are openable. Applications in development are shown for orientation, not as working features.</p></section></div>}
 </main>;
}
export default function NNHome(){return <RequireOwner><HomeSurface/></RequireOwner>;}
