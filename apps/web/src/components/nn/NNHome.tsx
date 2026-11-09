"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { Dialog } from "@/components/ui/Dialog";
import { Dock } from "@/components/ui/Dock";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LiquidButton } from "@/components/ui/LiquidButton";
import { NNLogo } from "@/components/ui/NNLogo";
import { useAuth } from "@/lib/auth";
import styles from "./NNHome.module.css";

type AppItem = { name: string; group: string; icon: IconName; description: string };
const APPLICATIONS: readonly AppItem[] = [
  {name:"Life",group:"Life & wellbeing",icon:"calendar",description:"Calendar, tasks, reminders, notes, habits, goals and routines"},
  {name:"Soul",group:"Life & wellbeing",icon:"sparkle",description:"Faith, purpose, gratitude and reflection"},
  {name:"Mind",group:"Life & wellbeing",icon:"graph",description:"Focus, resilience, reflection and personal growth"},
  {name:"Body",group:"Life & wellbeing",icon:"check",description:"Fitness, nutrition, sleep and recovery"},
  {name:"Contacts",group:"Life & wellbeing",icon:"grid",description:"People, important dates and follow-ups"},
  {name:"Nature & Universe",group:"Life & wellbeing",icon:"sparkle",description:"Science, astronomy and discovery"},
  {name:"Peace Mode",group:"Life & wellbeing",icon:"clock",description:"A quieter environment for focus and reflection"},
  {name:"College",group:"Education",icon:"book",description:"SMVEC subjects, exams, notes and academic progress"},
  {name:"Academy",group:"Education",icon:"book",description:"Structured technical and professional learning"},
  {name:"Formula Engine",group:"Education",icon:"graph",description:"Verified formulas, calculations and visualisation"},
  {name:"Logic Lab",group:"Education",icon:"grid",description:"Reasoning, aptitude and programming challenges"},
  {name:"Learning Vault",group:"Education",icon:"folder",description:"Books, research, flashcards and knowledge paths"},
  {name:"Finance",group:"Money & work",icon:"wallet",description:"Personal money, budgets, assets and financial goals"},
  {name:"Invest",group:"Money & work",icon:"graph",description:"Investment research, watchlists and portfolio tracking"},
  {name:"Business",group:"Money & work",icon:"grid",description:"Ventures, validation, operations and decisions"},
  {name:"Freelance",group:"Money & work",icon:"file",description:"Clients, proposals, deliverables and invoices"},
  {name:"Career",group:"Money & work",icon:"book",description:"Skills, portfolio, interviews and career progress"},
  {name:"Projects",group:"Money & work",icon:"grid",description:"Milestones, dependencies and execution"},
  {name:"Achievements",group:"Money & work",icon:"sparkle",description:"Verified milestones, certificates and evidence"},
  {name:"Creator Studio",group:"Creation & communication",icon:"sparkle",description:"Photography, video, design and content planning"},
  {name:"Studio",group:"Creation & communication",icon:"file",description:"Writing, documents and publishing drafts"},
  {name:"Mail",group:"Creation & communication",icon:"file",description:"Connected inboxes, drafts and follow-ups"},
  {name:"English",group:"Creation & communication",icon:"mic",description:"Speaking, listening, grammar and writing practice"},
  {name:"Files",group:"Knowledge & insight",icon:"folder",description:"Private documents, media and file organisation"},
  {name:"Memory",group:"Knowledge & insight",icon:"sparkle",description:"Owner-controlled knowledge with source and provenance"},
  {name:"Life Archive",group:"Knowledge & insight",icon:"clock",description:"A chronological record of milestones and memories"},
  {name:"Analytics",group:"Knowledge & insight",icon:"graph",description:"Measured progress from real stored data"},
  {name:"Travel",group:"Knowledge & insight",icon:"calendar",description:"Trips, itineraries, maps and travel planning"},
  {name:"Simulator",group:"Knowledge & insight",icon:"grid",description:"Safe financial, business, science and coding scenarios"},
  {name:"Command Centre",group:"System",icon:"sparkle",description:"Natural-language entry point and quick actions"},
  {name:"Search",group:"System",icon:"search",description:"Permission-aware search across NN"},
  {name:"Automation Studio",group:"System",icon:"settings",description:"Triggers, workflows, approvals and run history"},
  {name:"Security Centre",group:"System",icon:"shield",description:"Passkeys, devices, sessions and audit history"},
  {name:"Control Room",group:"System",icon:"settings",description:"System health, integrations, jobs and cost visibility"},
  {name:"REN",group:"System",icon:"sparkle",description:"The NN intelligence layer for context, assistance and connected actions"}
];
const GROUPS = [
  {name:"Life & wellbeing",detail:"Plan, organise and live well",icon:"calendar" as const,count:"07"},
  {name:"Education",detail:"Learn, practise and master",icon:"book" as const,count:"05"},
  {name:"Money & work",detail:"Build, manage and measure",icon:"wallet" as const,count:"07"},
  {name:"Creation & communication",detail:"Create, write and communicate",icon:"sparkle" as const,count:"04"},
  {name:"Knowledge & insight",detail:"Store, recall and understand",icon:"folder" as const,count:"06"},
  {name:"System",detail:"Control, search and protect NN",icon:"settings" as const,count:"06"}
];

function HomeExperience({firstName,onSignOut}:{firstName:string;onSignOut?:()=>void}) {
  const router=useRouter();
  const [launcherOpen,setLauncherOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [activeDock,setActiveDock]=useState("home");
  const [clock,setClock]=useState({date:"",time:""});
  const filtered=useMemo(()=>APPLICATIONS.filter(app=>(app.name+" "+app.group+" "+app.description).toLowerCase().includes(query.trim().toLowerCase())),[query]);
  useEffect(()=>{
    const update=()=>{const now=new Date();setClock({date:new Intl.DateTimeFormat(undefined,{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(now),time:new Intl.DateTimeFormat(undefined,{hour:"2-digit",minute:"2-digit"}).format(now)});};
    update();const timer=window.setInterval(update,30000);return()=>window.clearInterval(timer);
  },[]);
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setLauncherOpen(true);}if(event.key==="Escape")setLauncherOpen(false);};
    window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);
  },[]);
  const openRoute=(href:"/home"|"/life"|"/workspace"|"/design",id:string)=>{setActiveDock(id);router.push(href);};
  const openApp=(name:string)=>{if(name==="Life"){setLauncherOpen(false);openRoute("/life","life");}else{setQuery(name);setLauncherOpen(true);}};
  return <main className={styles.root}>
    <header className={styles.topbar}>
      <div className={styles.identity}><NNLogo size={32} decorative/><span>NN <i>/</i> <strong>PERSONAL OS</strong></span></div>
      <div className={styles.topActions}>
        <button className={styles.searchButton} onClick={()=>setLauncherOpen(true)} aria-label="Search NN"><Icon name="search" size={17}/><span>Search anything in NN</span><kbd>⌘ K</kbd></button>
        <span className={styles.privateState}><i/> PRIVATE ENVIRONMENT</span>
        {onSignOut?<button className={styles.profile} onClick={onSignOut} aria-label={"Sign out "+firstName} title="Sign out">{firstName.slice(0,1).toUpperCase()}</button>:<span className={styles.profile} aria-label="Preview identity">{firstName.slice(0,1).toUpperCase()}</span>}
      </div>
    </header>
    <div className={styles.page}>
      <section className={styles.welcomeRow}>
        <div className={styles.welcomeCopy}><p className={styles.eyebrow}><span/> YOUR PERSONAL OPERATING ENVIRONMENT</p><h1>Good evening, <em>{firstName}.</em></h1><p className={styles.welcomeSub}>Dream bigger. Build greater. Your next chapter starts here.</p></div>
        <div className={styles.timeCard}><span className={styles.timeOrb}><span/></span><div><p>{clock.date||"Your day, in focus"}</p><strong>{clock.time||"--:--"}</strong><small>LOCAL TIME · NN</small></div></div>
      </section>
      <section className={styles.hero+" nn-glass-primary nn-glass-card"}>
        <div className={styles.heroText}><p className={styles.heroKicker}>YOUR NEXT CHAPTER</p><h2>Keep going<span>.</span></h2><p className={styles.heroDescription}>One calm environment for your life, learning, projects and ambitions. Everything important, within reach.</p><div className={styles.heroActions}><LiquidButton variant="accent" size="lg" onClick={()=>setLauncherOpen(true)}>Explore NN <span aria-hidden="true">↗</span></LiquidButton><LiquidButton size="lg" href="/life">Open NN Life</LiquidButton></div></div>
        <div className={styles.spatialMark} aria-hidden="true"><div className={styles.orbit+" "+styles.orbitOne}/><div className={styles.orbit+" "+styles.orbitTwo}/><div className={styles.orbit+" "+styles.orbitThree}/><div className={styles.core}><NNLogo size={70} decorative/></div><span className={styles.nodeOne}><Icon name="calendar" size={17}/></span><span className={styles.nodeTwo}><Icon name="book" size={17}/></span><span className={styles.nodeThree}><Icon name="grid" size={17}/></span><span className={styles.nodeFour}><Icon name="sparkle" size={17}/></span></div>
        <div className={styles.heroFoot}><span>PRIVATE BY DESIGN</span><span>NN OS <i>·</i> BUILT WITH INTENT</span></div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHeading}><div><p>YOUR APPLICATIONS</p><h2>Everything in one place.</h2></div><button onClick={()=>setLauncherOpen(true)}>View all applications <span>↗</span></button></div>
        <div className={styles.appGrid}>
          {[
            {name:"Life",icon:"calendar" as const,detail:"Plan · Organise · Live",tone:"cyan"},
            {name:"Academy",icon:"book" as const,detail:"Learn · Grow · Excel",tone:"blue"},
            {name:"Projects",icon:"grid" as const,detail:"Build · Innovate · Ship",tone:"violet"},
            {name:"Finance",icon:"wallet" as const,detail:"Save · Invest · Grow",tone:"cyan"},
            {name:"REN",icon:"sparkle" as const,detail:"Intelligence · Assistance",tone:"violet"},
            {name:"More",icon:"grid" as const,detail:"Explore · Discover",tone:"blue"}
          ].map(app=><button className={styles.appTile} key={app.name} onClick={()=>app.name==="More"?setLauncherOpen(true):openApp(app.name)} aria-label={"Open "+app.name}><span className={styles.appIcon+" "+styles[app.tone]}><Icon name={app.icon} size={25}/></span><strong>{app.name}</strong><small>{app.detail}</small></button>)}
        </div>
      </section>
      <section className={styles.dashboardGrid}>
        <article className={styles.panel+" "+styles.focusPanel+" nn-glass-card"}><div className={styles.panelHeading}><div><p>YOUR DAY</p><h2>Today’s focus</h2></div><span className={styles.panelGlyph}><Icon name="check" size={19}/></span></div><div className={styles.focusEmpty}><span className={styles.focusRing}><Icon name="calendar" size={24}/></span><div><strong>Your day, organised.</strong><p>Open NN Life to view your live tasks, calendar, reminders and goals.</p></div></div><button className={styles.panelLink} onClick={()=>openRoute("/life","life")}>Open Life <span>↗</span></button></article>
        <article className={styles.panel+" "+styles.quickPanel+" nn-glass-card"}><div className={styles.panelHeading}><div><p>MOVE FASTER</p><h2>Quick actions</h2></div><span className={styles.panelGlyph}><Icon name="sparkle" size={19}/></span></div>
          <button className={styles.quickAction} onClick={()=>openRoute("/life","life")}><span><Icon name="calendar" size={17}/></span><strong>Open calendar & tasks</strong><i>↗</i></button>
          <button className={styles.quickAction} onClick={()=>openRoute("/life","life")}><span><Icon name="file" size={17}/></span><strong>Open notes & reminders</strong><i>↗</i></button>
          <button className={styles.quickAction} onClick={()=>setLauncherOpen(true)}><span><Icon name="search" size={17}/></span><strong>Find an NN application</strong><i>↗</i></button>
          <button className={styles.quickAction} onClick={()=>openRoute("/workspace","workspace")}><span><Icon name="clock" size={17}/></span><strong>Open workspace</strong><i>↗</i></button>
        </article>
        <article className={styles.panel+" "+styles.goalsPanel+" nn-glass-card"}><div className={styles.panelHeading}><div><p>LONG-TERM DIRECTION</p><h2>Your goals</h2></div><span className={styles.panelGlyph}><Icon name="graph" size={19}/></span></div><div className={styles.goalVisual}><div className={styles.goalOrb}><NNLogo size={42} decorative/></div><div><strong>Make progress measurable.</strong><p>Connect goals and milestones through NN Life as those features become available.</p></div></div><button className={styles.panelLink} onClick={()=>openRoute("/life","life")}>Manage in Life <span>↗</span></button></article>
        <article className={styles.panel+" "+styles.renPanel+" nn-glass-card"}><div className={styles.panelHeading}><div><p>INTELLIGENCE LAYER</p><h2>REN</h2></div><span className={styles.renOrb}><NNLogo size={25} decorative/></span></div><p className={styles.panelBody}>A unified assistant experience for finding information, understanding context and helping you move work forward.</p><div className={styles.renStatus}><span><i/> INTERFACE PRESENT</span><strong>CAPABILITIES EXPANDING</strong></div></article>
      </section>
      <section className={styles.section}><div className={styles.sectionHeading}><div><p>THE NN ECOSYSTEM</p><h2>One system. Many dimensions.</h2></div><button onClick={()=>setLauncherOpen(true)}>Application index <span>↗</span></button></div><div className={styles.categoryGrid}>{GROUPS.map((group,index)=><button className={styles.category} key={group.name} onClick={()=>{setQuery(group.name);setLauncherOpen(true);}}><span className={styles.categoryIcon}><Icon name={group.icon} size={21}/></span><span className={styles.categoryCopy}><strong>{group.name}</strong><small>{group.detail}</small></span><span className={styles.categoryCount}>{group.count}</span><span className={styles.categoryIndex}>0{index+1}</span></button>)}</div></section>
      <footer className={styles.footer}><span>NN / PERSONAL OPERATING ENVIRONMENT</span><span>THE FUTURE IS NOW · WITH NN</span></footer>
    </div>
    <div className={styles.dockWrap+" nn-glass-primary nn-glass-card"}><Dock items={[{id:"home",label:"NN Home",icon:"grid"},{id:"life",label:"NN Life",icon:"calendar"},{id:"workspace",label:"Workspace",icon:"clock"},{id:"design",label:"Design system",icon:"sparkle"}]} activeId={activeDock} onSelect={id=>{if(id==="home")openRoute("/home",id);if(id==="life")openRoute("/life",id);if(id==="workspace")openRoute("/workspace",id);if(id==="design")openRoute("/design",id);}}/><button className={styles.dockLauncher} onClick={()=>setLauncherOpen(true)} aria-label="Open application launcher" title="Applications"><Icon name="plus" size={21}/></button></div>
    <Dialog open={launcherOpen} onClose={()=>{setLauncherOpen(false);setQuery("");}} title="Explore NN" description="The complete application map. Open only the surfaces currently available.">
      <label className={styles.launchSearch}><Icon name="search" size={18}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search NN applications…"/>{query?<button type="button" onClick={()=>setQuery("")} aria-label="Clear search"><Icon name="close" size={15}/></button>:null}</label>
      <div className={styles.applicationIndex}>{["Life & wellbeing","Education","Money & work","Creation & communication","Knowledge & insight","System"].map(group=>{const apps=filtered.filter(app=>app.group===group);if(apps.length===0)return null;return <section className={styles.indexGroup} key={group}><h3>{group}<span>{String(apps.length).padStart(2,"0")}</span></h3>{apps.map(app=><article className={styles.indexItem} key={app.name}><span className={styles.indexIcon}><Icon name={app.icon} size={17}/></span><span className={styles.indexText}><strong>{app.name}</strong><small>{app.description}</small></span>{app.name==="Life"?<button className={styles.openApp} onClick={()=>openApp("Life")}>OPEN ↗</button>:<span className={styles.indexState}>PLANNED SURFACE</span>}</article>)}</section>;})}{filtered.length===0?<p className={styles.noResults}>No application matches that search.</p>:null}</div>
      <p className={styles.launchFoot}>NN APP FACTORY IS A SYSTEM CAPABILITY, NOT AN APPLICATION.</p>
    </Dialog>
  </main>;
}
function HomeSurface(){const {user,signOutHere}=useAuth();const firstName=user?.displayName?.trim().split(/\s+/)[0]||"Founder";return <RequireOwner><HomeExperience firstName={firstName} onSignOut={()=>void signOutHere()}/></RequireOwner>;}
export function NNHomePreview(){return <HomeExperience firstName="Founder"/>;}
export default function NNHome(){return <HomeSurface/>;}
