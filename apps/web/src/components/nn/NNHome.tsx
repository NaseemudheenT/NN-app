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
import { APPLICATIONS, GROUPS, getApplication } from "@/lib/apps/registry";
import { useRen } from "@/components/ren/RenProvider";

function HomeExperience({firstName,onSignOut}:{firstName:string;onSignOut?:()=>void}) {
  const router=useRouter();
  const { summon } = useRen();
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
  const openApp=(name:string)=>{if(name==="REN"){setLauncherOpen(false);summon("touch");return;}const app=getApplication(name);if(app?.href){setLauncherOpen(false);router.push(app.href);setActiveDock(app.id);}else{setQuery(name);setLauncherOpen(true);}};
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
          ].map(app=><button className={styles.appTile} key={app.name} onClick={()=>app.name==="More"?setLauncherOpen(true):openApp(app.name)} aria-label={"Open "+app.name}><span className={styles.appIcon+" "+styles.iconSurface+" "+styles[app.tone]}><Icon name={app.icon} size={25}/></span><strong>{app.name}</strong><small>{app.detail}</small></button>)}
        </div>
      </section>
      <section className={styles.dashboardGrid}>
        <article className={styles.panel+" "+styles.focusPanel+" nn-glass-card"}><div className={styles.panelHeading}><div><p>YOUR DAY</p><h2>Today’s focus</h2></div><span className={styles.panelGlyph+" nn-icon-surface"}><Icon name="check" size={19}/></span></div><div className={styles.focusEmpty}><span className={styles.focusRing+" nn-icon-surface"}><Icon name="calendar" size={24}/></span><div><strong>Your day, organised.</strong><p>Open NN Life to view your live tasks, calendar, reminders and goals.</p></div></div><button className={styles.panelLink} onClick={()=>openRoute("/life","life")}>Open Life <span>↗</span></button></article>
        <article className={styles.panel+" "+styles.quickPanel+" nn-glass-card"}><div className={styles.panelHeading}><div><p>MOVE FASTER</p><h2>Quick actions</h2></div><span className={styles.panelGlyph}><Icon name="sparkle" size={19}/></span></div>
          <button className={styles.quickAction} onClick={()=>openRoute("/life","life")}><span className={styles.iconSurface}><Icon name="calendar" size={17}/></span><strong>Open calendar & tasks</strong><i>↗</i></button>
          <button className={styles.quickAction} onClick={()=>openRoute("/life","life")}><span className={styles.iconSurface}><Icon name="file" size={17}/></span><strong>Open notes & reminders</strong><i>↗</i></button>
          <button className={styles.quickAction} onClick={()=>setLauncherOpen(true)}><span className={styles.iconSurface}><Icon name="search" size={17}/></span><strong>Find an NN application</strong><i>↗</i></button>
          <button className={styles.quickAction} onClick={()=>openRoute("/workspace","workspace")}><span className={styles.iconSurface}><Icon name="clock" size={17}/></span><strong>Open workspace</strong><i>↗</i></button>
        </article>
        <article className={styles.panel+" "+styles.goalsPanel+" nn-glass-card"}><div className={styles.panelHeading}><div><p>LONG-TERM DIRECTION</p><h2>Your goals</h2></div><span className={styles.panelGlyph}><Icon name="graph" size={19}/></span></div><div className={styles.goalVisual}><div className={styles.goalOrb}><NNLogo size={42} decorative/></div><div><strong>Make progress measurable.</strong><p>Connect goals and milestones through NN Life as those features become available.</p></div></div><button className={styles.panelLink} onClick={()=>openRoute("/life","life")}>Manage in Life <span>↗</span></button></article>
        <article className={styles.panel+" "+styles.renPanel+" nn-glass-card"}><div className={styles.panelHeading}><div><p>INTELLIGENCE LAYER</p><h2>REN</h2></div><span className={styles.renOrb}><NNLogo size={25} decorative/></span></div><p className={styles.panelBody}>A unified assistant experience for finding information, understanding context and helping you move work forward.</p><div className={styles.renStatus}><span><i/> INTERFACE PRESENT</span><strong>CAPABILITIES EXPANDING</strong></div></article>
      </section>
      <section className={styles.section}><div className={styles.sectionHeading}><div><p>THE NN ECOSYSTEM</p><h2>One system. Many dimensions.</h2></div><button onClick={()=>setLauncherOpen(true)}>Application index <span>↗</span></button></div><div className={styles.categoryGrid}>{GROUPS.map((group,index)=><button className={styles.category} key={group.name} onClick={()=>{setQuery(group.name);setLauncherOpen(true);}}><span className={styles.categoryIcon+" nn-icon-surface"}><Icon name={group.icon} size={21}/></span><span className={styles.categoryCopy}><strong>{group.name}</strong><small>{group.detail}</small></span><span className={styles.categoryCount}>{group.count}</span><span className={styles.categoryIndex}>0{index+1}</span></button>)}</div></section>
      <footer className={styles.footer}><span>NN / PERSONAL OPERATING ENVIRONMENT</span><span>THE FUTURE IS NOW · WITH NN</span></footer>
    </div>
    <div className={styles.dockWrap+" nn-glass-primary nn-glass-card"}><Dock items={[{id:"home",label:"NN Home",icon:"grid"},{id:"life",label:"NN Life",icon:"calendar"},{id:"workspace",label:"Workspace",icon:"clock"},{id:"design",label:"Design system",icon:"sparkle"}]} activeId={activeDock} onSelect={id=>{if(id==="home")openRoute("/home",id);if(id==="life")openRoute("/life",id);if(id==="workspace")openRoute("/workspace",id);if(id==="design")openRoute("/design",id);}}/><button className={styles.dockLauncher} onClick={()=>setLauncherOpen(true)} aria-label="Open application launcher" title="Applications"><Icon name="plus" size={21}/></button></div>
    <Dialog open={launcherOpen} onClose={()=>{setLauncherOpen(false);setQuery("");}} title="Explore NN" description="The complete application map. Open only the surfaces currently available.">
      <label className={styles.launchSearch}><Icon name="search" size={18}/><input autoFocus value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search NN applications…"/>{query?<button type="button" onClick={()=>setQuery("")} aria-label="Clear search"><Icon name="close" size={15}/></button>:null}</label>
      <div className={styles.applicationIndex}>{["Life & wellbeing","Education","Money & work","Creation & communication","Knowledge & insight","System"].map(group=>{const apps=filtered.filter(app=>app.group===group);if(apps.length===0)return null;return <section className={styles.indexGroup} key={group}><h3>{group}<span>{String(apps.length).padStart(2,"0")}</span></h3>{apps.map(app=><article className={styles.indexItem} key={app.name}><span className={styles.indexIcon+" nn-icon-surface"}><Icon name={app.icon} size={17}/></span><span className={styles.indexText}><strong>{app.name}</strong><small>{app.description}</small></span>{app.availability==="available"&&app.href?<button className={styles.openApp} onClick={()=>openApp(app.name)}>OPEN ↗</button>:<span className={styles.indexState}>IN DEVELOPMENT</span>}</article>)}</section>;})}{filtered.length===0?<p className={styles.noResults}>No application matches that search.</p>:null}</div>
      <p className={styles.launchFoot}>NN APP FACTORY IS A SYSTEM CAPABILITY, NOT AN APPLICATION.</p>
    </Dialog>
  </main>;
}
function HomeSurface(){const {user,signOutHere}=useAuth();const firstName=user?.displayName?.trim().split(/\s+/)[0]||"Founder";return <RequireOwner><HomeExperience firstName={firstName} onSignOut={()=>void signOutHere()}/></RequireOwner>;}
export function NNHomePreview(){return <HomeExperience firstName="Founder"/>;}
export default function NNHome(){return <HomeSurface/>;}
