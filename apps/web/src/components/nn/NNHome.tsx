"use client";
import { useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { useAppTransition } from "@/components/nn/AppTransition";
import {
  APPLICATION_COUNT,
  APP_FAMILIES,
  applicationsIn,
  matchApplications,
  openableApplications,
} from "@/lib/nn/apps";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { Coverflow, type CoverflowCard } from "@/components/ui/Coverflow";
import { Dialog } from "@/components/ui/Dialog";
import { Dock } from "@/components/ui/Dock";
import { FolderCard, useFolderWidth, type FolderSheet } from "@/components/ui/FolderCard";
import { Icon, type IconName } from "@/components/ui/Icon";
import { LiquidButton } from "@/components/ui/LiquidButton";
import { NNLogo } from "@/components/ui/NNLogo";
import { useAuth } from "@/lib/auth";
import styles from "./NNHome.module.css";

type AppRoute = Route;

/* The surfaces that actually exist, taken from the registry rather than a
   second list that would quietly fall out of step with it. */
const ROUTES: readonly { name: string; description: string; icon: IconName; href: AppRoute }[] =
  openableApplications().map((app) => ({
    name: app.name, description: app.description, icon: app.icon, href: app.route!,
  }));

const CAROUSEL_CARDS: readonly CoverflowCard[] = ROUTES.map((app) => ({
  id: app.href, title: app.name, subtitle: app.description, icon: app.icon,
  meta: [{ label: "SURFACE", value: "AVAILABLE" }],
}));

function HomeExperience({ firstName, onSignOut }: { firstName: string; onSignOut?: () => void }) {
  const travel=useAppTransition();
  const cardWidth=useFolderWidth();
  const [launcherOpen,setLauncherOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [activeDock,setActiveDock]=useState<string>("/home");
  const filtered=useMemo(()=>matchApplications(query),[query]);
  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==="k"){event.preventDefault();setLauncherOpen(true);}
    };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[]);
  const openRoute=(href:AppRoute,id:string,label:string)=>{setActiveDock(id);travel.open(href,label);};
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
      <section className={`${styles.hero} nn-holo`}>
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
          {APP_FAMILIES.map((family, index) => {
            const apps = applicationsIn(family);
            /* Whatever the founder can actually open sits nearest the glass;
               the rest are behind it, named, and honest about their state. */
            const ordered = [...apps].sort(
              (a, b) => Number(a.route !== null) - Number(b.route !== null),
            );
            const sheets: FolderSheet[] = ordered.map((app) => ({
              name: app.name,
              meta: app.route ? "Open" : "In development",
              icon: app.icon,
            }));
            return (
              <FolderCard
                key={family}
                label={family}
                meta={`${apps.length} applications`}
                sheets={sheets}
                width={cardWidth}
                appearDelay={index * 90}
                onSheetSelect={(sheet) => {
                  const app = apps.find((entry) => entry.name === sheet.name);
                  if (app?.route) {
                    openRoute(app.route, app.slug, app.name);
                    return;
                  }
                  // Not built yet — so this opens the index at that entry
                  // rather than pretending to open an application.
                  setQuery(sheet.name);
                  setLauncherOpen(true);
                }}
              />
            );
          })}
        </div>
      </section>
      <section className={styles.bottomGrid}>
        <article className={`${styles.statusPanel} nn-holo`}>
          <div className={styles.panelHeading}><div><p>INTELLIGENCE LAYER</p><h2>REN</h2></div><span className={styles.renOrb}><NNLogo size={26} decorative/></span></div>
          <p className={styles.panelBody}>REN is designed as the intelligence layer across NN. Its visual identity is present; reasoning, memory and tool execution are not connected yet.</p>
          <div className={styles.panelStatus}><span>INTERFACE DESIGNED</span><strong>NOT CONNECTED</strong></div>
        </article>
        <article className={styles.statusPanel}>
          <div className={styles.panelHeading}><div><p>DESIGN LANGUAGE</p><h2>Spatial by nature.</h2></div><Icon name="sparkle" size={22}/></div>
          <p className={styles.panelBody}>Liquid glass, depth, cinematic motion and precise information surfaces—unified across every NN application.</p>
          <button className={styles.textAction} onClick={()=>travel.open("/design","Design system")}>Explore the design system <span>↗</span></button>
        </article>
      </section>
      <footer className={styles.footer}><span>NN / PERSONAL OPERATING ENVIRONMENT</span><span>BUILT WITH INTENT · PRIVATE BY DESIGN</span></footer>
    </div>
    <div className={`${styles.dockWrap} nn-holo`}>
      <Dock items={[{id:"/home" as Route,label:"NN Home",icon:"grid" as const},...ROUTES.map(app=>({id:app.href,label:app.name,icon:app.icon}))]} activeId={activeDock} onSelect={(id)=>{
        if(id==="/home"){setActiveDock(id);travel.open("/home" as Route,"NN Home");return;}
        const app=ROUTES.find(entry=>entry.href===id);
        if(app)openRoute(app.href,app.href,app.name);
      }}/>
      <button className={styles.dockLauncher} onClick={()=>setLauncherOpen(true)} aria-label="Open application launcher" title="Applications"><Icon name="plus" size={21}/></button>
    </div>
    <Dialog open={launcherOpen} onClose={()=>{setLauncherOpen(false);setQuery("");}} title="Explore NN" description="The complete application map. Only routes already implemented are openable.">
      <label className={styles.launchSearch}><Icon name="search" size={18}/><input autoFocus value={query} onChange={(event)=>setQuery(event.target.value)} placeholder={`Search the ${APPLICATION_COUNT} applications…`}/>{query?<button type="button" onClick={()=>setQuery("")} aria-label="Clear search"><Icon name="close" size={15}/></button>:null}</label>
      {!query?<div className={styles.coverflowWrap}><p className={styles.launchSectionLabel}>AVAILABLE SURFACES · DRAG TO TURN</p><Coverflow cards={CAROUSEL_CARDS} cardWidth="clamp(160px, 24vw, 230px)" curve={19} showCaption showPagination label="Available NN surfaces" onSelect={(id)=>{
        const app=ROUTES.find(item=>item.href===id);
        if(app){setLauncherOpen(false);openRoute(app.href,id,app.name);}
      }}/></div>:null}
      <div className={styles.applicationIndex}>
        {APP_FAMILIES.map(group=>{
          const apps=filtered.filter(app=>app.family===group);
          if(apps.length===0)return null;
          return <section className={styles.indexGroup} key={group}><h3>{group}<span>{String(apps.length).padStart(2,"0")}</span></h3>
            {apps.map(app=><article className={styles.indexItem} key={app.name}><span className={styles.indexIcon}><Icon name={app.icon} size={17}/></span><span className={styles.indexText}><strong>{app.name}</strong><small>{app.description}</small></span>{app.route?<button className={styles.openApp} onClick={()=>{setLauncherOpen(false);openRoute(app.route!,app.slug,app.name);}}>OPEN ↗</button>:<span className={styles.indexState}>IN DEVELOPMENT</span>}</article>)}
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
