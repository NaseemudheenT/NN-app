"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { Coverflow, type CoverflowCard } from "@/components/ui/Coverflow";
import { Dialog } from "@/components/ui/Dialog";
import { Dock } from "@/components/ui/Dock";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LiquidButton } from "@/components/ui/LiquidButton";
import { NNLogo } from "@/components/ui/NNLogo";
import { useAuth } from "@/lib/auth";
import styles from "./NNHome.module.css";

type AppRoute = "/home" | "/workspace" | "/design" | "/life";
type AppItem = { name: string; group: string; icon: IconName; description: string };
const APPLICATIONS: readonly AppItem[] = [
  { name:"Life",group:"Life & wellbeing",icon:"calendar",description:"Calendar, tasks, reminders, notes, habits, goals and routines" },
  { name:"Soul",group:"Life & wellbeing",icon:"sparkle",description:"Faith, purpose, gratitude and reflection" },
  { name:"Mind",group:"Life & wellbeing",icon:"graph",description:"Focus, resilience, reflection and personal growth" },
  { name:"Body",group:"Life & wellbeing",icon:"check",description:"Fitness, nutrition, sleep and recovery" },
  { name:"Contacts",group:"Life & wellbeing",icon:"grid",description:"People, important dates and follow-ups" },
  { name:"Nature & Universe",group:"Life & wellbeing",icon:"sparkle",description:"Science, astronomy and discovery" },
  { name:"Peace Mode",group:"Life & wellbeing",icon:"clock",description:"A quieter environment for focus and reflection" },
  { name:"College",group:"Education",icon:"book",description:"SMVEC subjects, exams, notes and academic progress" },
  { name:"Academy",group:"Education",icon:"book",description:"Structured technical and professional learning" },
  { name:"Formula Engine",group:"Education",icon:"graph",description:"Verified formulas, calculations and visualisation" },
  { name:"Logic Lab",group:"Education",icon:"grid",description:"Reasoning, aptitude and programming challenges" },
  { name:"Learning Vault",group:"Education",icon:"folder",description:"Books, research, flashcards and knowledge paths" },
  { name:"Finance",group:"Money & work",icon:"wallet",description:"Personal money, budgets, assets and financial goals" },
  { name:"Invest",group:"Money & work",icon:"graph",description:"Investment research, watchlists and portfolio tracking" },
  { name:"Business",group:"Money & work",icon:"grid",description:"Ventures, validation, operations and decisions" },
  { name:"Freelance",group:"Money & work",icon:"file",description:"Clients, proposals, deliverables and invoices" },
  { name:"Career",group:"Money & work",icon:"book",description:"Skills, portfolio, interviews and career progress" },
  { name:"Projects",group:"Money & work",icon:"grid",description:"Milestones, dependencies and execution" },
  { name:"Achievements",group:"Money & work",icon:"sparkle",description:"Verified milestones, certificates and evidence" },
  { name:"Creator Studio",group:"Creation & communication",icon:"sparkle",description:"Photography, video, design and content planning" },
  { name:"Studio",group:"Creation & communication",icon:"file",description:"Writing, documents and publishing drafts" },
  { name:"Mail",group:"Creation & communication",icon:"file",description:"Connected inboxes, drafts and follow-ups" },
  { name:"English",group:"Creation & communication",icon:"mic",description:"Speaking, listening, grammar and writing practice" },
  { name:"Files",group:"Knowledge & insight",icon:"folder",description:"Private documents, media and file organisation" },
  { name:"Memory",group:"Knowledge & insight",icon:"sparkle",description:"Owner-controlled knowledge with source and provenance" },
  { name:"Life Archive",group:"Knowledge & insight",icon:"clock",description:"A chronological record of milestones and memories" },
  { name:"Analytics",group:"Knowledge & insight",icon:"graph",description:"Measured progress from real stored data" },
  { name:"Travel",group:"Knowledge & insight",icon:"calendar",description:"Trips, itineraries, maps and travel planning" },
  { name:"Simulator",group:"Knowledge & insight",icon:"grid",description:"Safe financial, business, science and coding scenarios" },
  { name:"Command Centre",group:"System",icon:"sparkle",description:"Natural-language entry point and quick actions" },
  { name:"Search",group:"System",icon:"search",description:"Permission-aware search across NN" },
  { name:"Automation Studio",group:"System",icon:"settings",description:"Triggers, workflows, approvals and run history" },
  { name:"Security Centre",group:"System",icon:"shield",description:"Passkeys, devices, sessions and audit history" },
  { name:"Control Room",group:"System",icon:"settings",description:"System health, integrations, jobs and cost visibility" },
];
const ROUTES: readonly { name:string; description:string; icon:IconName; href:AppRoute }[] = [
  {name:"NN Home",description:"Your personal operating environment",icon:"grid",href:"/home"},\n  {name:"NN Life",description:"Your calendar, tasks, reminders, notes and goals",icon:"calendar",href:"/life"},
  {name:"Workspace",description:"Interactive glass workspace prototype",icon:"calendar",href:"/workspace"},
  {name:"Design System",description:"NN materials, motion and component laboratory",icon:"sparkle",href:"/design"},
];
const CAROUSEL_CARDS: readonly CoverflowCard[] = ROUTES.map((app) => ({
  id:app.href,title:app.name,subtitle:app.description,icon:app.icon,meta:[{label:"SURFACE",value:"AVAILABLE"}],
}));
function HomeExperience({ firstName, onSignOut }: { firstName: string; onSignOut?: () => void }) {
  const router=useRouter();
  const [launcherOpen,setLauncherOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [activeDock,setActiveDock]=useState("home");
  const filtered=useMemo(()=>APPLICATIONS.filter(app=>(app.name+" "+app.group+" "+app.description).toLowerCase().includes(query.trim().toLowerCase())),[query]);
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setLauncherOpen(true);}
    };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[]);
  const openRoute=(href:AppRoute,id:string)=>{setActiveDock(id);router.push(href);};
  return <main className={styles.root}>
    <header className={styles.topbar}>
      <div className={styles.identity}><NNLogo size={31} decorative/><span>NN <i>/</i> <strong>HOME</strong></span></div>
      <div className={styles.topActions}>
        <button className={styles.searchButton} onClick={()=>setLauncherOpen(true)}><Icon name="search" size={17}/><span>Search NN</span><kbd>⌘ K</kbd></button>
        <span className={styles.privateState}><i/> PRIVATE ENVIRONMENT</span>
        {onSignOut ? <button className={styles.profile} onClick={onSignOut} aria-label={`Sign out ${firstName}`} title="Sign out">{firstName.slice(0,1).toUpperCase()}</button> : <span className={styles.profile} aria-label="Preview identity">{firstName.slice(0,1).toUpperCase()}</span>}
      </div>
    </header>
    <div className={styles.page}>
      <div className={styles.eyebrow}><span/> YOUR PERSONAL OPERATING ENVIRONMENT <span className={styles.dateLine}>NN / 001</span></div>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.heroKicker}>A SYSTEM THAT MOVES WITH YOU</p>
          <h1>Good to see you,<br/><em>{firstName}.</em></h1>
          <p className={styles.heroDescription}>Your life, learning and work—connected through one calm, considered environment. Start anywhere. Everything has its place.</p>
          <div className={styles.heroActions}>
            <LiquidButton variant="accent" size="lg" onClick={()=>setLauncherOpen(true)}>Explore NN <span aria-hidden="true">↗</span></LiquidButton>
            <LiquidButton size="lg" href="/workspace">Open workspace</LiquidButton>
          </div>
        </div>
        <div className={styles.spatialMark} aria-hidden="true">
          <div className={styles.ringOne}/><div className={styles.ringTwo}/><div className={styles.ringThree}/>
          <div className={styles.core}><NNLogo size={65} decorative/></div>
          <span className={styles.nodeOne}><Icon name="calendar" size={17}/></span><span className={styles.nodeTwo}><Icon name="book" size={17}/></span><span className={styles.nodeThree}><Icon name="grid" size={17}/></span><span className={styles.nodeFour}><Icon name="sparkle" size={17}/></span>
        </div>
        <div className={styles.heroFoot}><span>PRIVATE BY DESIGN</span><span>01 <i>/</i> ENVIRONMENT</span></div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHeading}><div><p>THE NN ENVIRONMENT</p><h2>One system. Many dimensions.</h2></div><button onClick={()=>setLauncherOpen(true)}>Application index <span>↗</span></button></div>
        <div className={styles.categoryGrid}>
          {[
            {name:"Life & wellbeing",count:"07",detail:"Your daily life, wellbeing and reflection",icon:"calendar" as const},
            {name:"Education",count:"05",detail:"Learn, practise and master new skills",icon:"book" as const},
            {name:"Money & work",count:"07",detail:"Build, manage and measure your work",icon:"wallet" as const},
            {name:"Creation & communication",count:"04",detail:"Create, write and communicate",icon:"sparkle" as const},
            {name:"Knowledge & insight",count:"06",detail:"Store, recall and understand information",icon:"folder" as const},
            {name:"System",count:"05",detail:"Control, search, automate and protect NN",icon:"settings" as const},
          ].map((group,index)=><button className={styles.category} key={group.name} onClick={()=>{setQuery(group.name);setLauncherOpen(true);}}>
            <span className={styles.categoryIcon}><Icon name={group.icon} size={19}/></span><span className={styles.categoryCopy}><strong>{group.name}</strong><small>{group.detail}</small></span><span className={styles.categoryCount}>{group.count}</span><span className={styles.categoryArrow}>↗</span><span className={styles.categoryIndex}>0{index+1}</span>
          </button>)}
        </div>
      </section>
      <section className={styles.bottomGrid}>
        <article className={styles.statusPanel}>
          <div className={styles.panelHeading}><div><p>INTELLIGENCE LAYER</p><h2>REN</h2></div><span className={styles.renOrb}><NNLogo size={26} decorative/></span></div>
          <p className={styles.panelBody}>REN is designed as the intelligence layer across NN. Its visual identity is present; reasoning, memory and tool execution are not connected yet.</p>
          <div className={styles.panelStatus}><span>INTERFACE DESIGNED</span><strong>NOT CONNECTED</strong></div>
        </article>
        <article className={styles.statusPanel}>
          <div className={styles.panelHeading}><div><p>DESIGN LANGUAGE</p><h2>Spatial by nature.</h2></div><Icon name="sparkle" size={22}/></div>
          <p className={styles.panelBody}>Liquid glass, depth, cinematic motion and precise information surfaces—unified across every NN application.</p>
          <button className={styles.textAction} onClick={()=>router.push("/design")}>Explore the design system <span>↗</span></button>
        </article>
      </section>
      <footer className={styles.footer}><span>NN / PERSONAL OPERATING ENVIRONMENT</span><span>BUILT WITH INTENT · PRIVATE BY DESIGN</span></footer>
    </div>
    <div className={styles.dockWrap}>
      <Dock items={[{id:"home",label:"NN Home",icon:"grid"},{id:"life",label:"NN Life",icon:"calendar"},{id:"workspace",label:"Workspace",icon:"clock"},{id:"design",label:"Design system",icon:"sparkle"}]} activeId={activeDock} onSelect={(id)=>{
        if(id==="home")openRoute("/home",id);
        if(id==="life")openRoute("/life",id);\n        if(id==="workspace")openRoute("/workspace",id);
        if(id==="design")openRoute("/design",id);
      }}/>
      <button className={styles.dockLauncher} onClick={()=>setLauncherOpen(true)} aria-label="Open application launcher" title="Applications"><Icon name="plus" size={21}/></button>
    </div>
    <Dialog open={launcherOpen} onClose={()=>{setLauncherOpen(false);setQuery("");}} title="Explore NN" description="The complete application map. Only routes already implemented are openable.">
      <label className={styles.launchSearch}><Icon name="search" size={18}/><input autoFocus value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search the 34 applications…"/>{query?<button type="button" onClick={()=>setQuery("")} aria-label="Clear search"><Icon name="close" size={15}/></button>:null}</label>
      {!query?<div className={styles.coverflowWrap}><p className={styles.launchSectionLabel}>AVAILABLE SURFACES · SPATIAL VIEW</p><Coverflow cards={CAROUSEL_CARDS} cardWidth="clamp(160px, 24vw, 230px)" rotate={38} depth={0.48} showCaption showPagination showNavigation label="Available NN surfaces" onSelect={(id)=>{
        const app=ROUTES.find(item=>item.href===id);
        if(app){setLauncherOpen(false);openRoute(app.href,id==="/home"?"home":id==="/workspace"?"workspace":"design");}
      }}/></div>:null}
      <div className={styles.applicationIndex}>
        {["Life & wellbeing","Education","Money & work","Creation & communication","Knowledge & insight","System"].map(group=>{
          const apps=filtered.filter(app=>app.group===group);
          if(apps.length===0)return null;
          return <section className={styles.indexGroup} key={group}><h3>{group}<span>{String(apps.length).padStart(2,"0")}</span></h3>
            {apps.map(app=><article className={styles.indexItem} key={app.name}><span className={styles.indexIcon}><Icon name={app.icon} size={17}/></span><span className={styles.indexText}><strong>{app.name}</strong><small>{app.description}</small></span>{app.name==="Life"?<button className={styles.openApp} onClick={()=>{setLauncherOpen(false);openRoute("/life","life");}}>OPEN ↗</button>:<span className={styles.indexState}>IN DEVELOPMENT</span>}</article>)}
          </section>;
        })}
        {filtered.length===0?<p className={styles.noResults}>No application matches that search.</p>:null}
      </div>
      <p className={styles.launchFoot}>NN APP FACTORY IS A SYSTEM CAPABILITY, NOT A 35TH APPLICATION.</p>
    </Dialog>
  </main>;
}
function HomeSurface() {
  const { user, signOutHere } = useAuth();
  const firstName = user?.displayName?.trim().split(/\s+/)[0] || "Founder";
  return <RequireOwner><HomeExperience firstName={firstName} onSignOut={() => void signOutHere()} /></RequireOwner>;
}
export function NNHomePreview() {
  return <HomeExperience firstName="Founder" />;
}
export default function NNHome() { return <HomeSurface />; }
