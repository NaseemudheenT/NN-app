"use client";
import {useEffect,useRef,useState} from "react";
import {Icon} from "@/components/ui/Icon";
import {NNLogo} from "@/components/ui/NNLogo";
import styles from "./NNIsland.module.css";
type Props={title:string;onHome:()=>void;onSearch:()=>void};
export function NNIsland({title,onHome,onSearch}:Props){
 const [expanded,setExpanded]=useState(false),root=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(!expanded)return;const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setExpanded(false)};const escape=(e:KeyboardEvent)=>{if(e.key==="Escape")setExpanded(false)};document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape)}},[expanded]);
 const action=(fn:()=>void)=>{setExpanded(false);fn()};
 return <div ref={root} className={styles.root}>
  <button type="button" className={styles.trigger} aria-label="NN Dynamic Island" aria-expanded={expanded} aria-controls="nn-island-panel" onClick={()=>setExpanded(v=>!v)}>
   <span className={styles.logo}><NNLogo size={17} decorative/></span><span className={styles.label}><small>ACTIVE WORKSPACE</small><strong>{title}</strong></span><i className={styles.pulse}/><span className={styles.chevron} aria-hidden="true">{expanded?"⌃":"⌄"}</span>
  </button>
  {expanded&&<section id="nn-island-panel" className={styles.panel} role="region" aria-label="NN quick controls">
   <header><span>QUICK CONTROLS</span><button type="button" onClick={()=>setExpanded(false)} aria-label="Close quick controls"><Icon name="close" size={14}/></button></header>
   <div className={styles.current}><span className={styles.currentMark}><NNLogo size={20} decorative/></span><span><small>YOU ARE IN</small><strong>{title}</strong></span><i>ACTIVE</i></div>
   <div className={styles.actions}><button type="button" onClick={()=>action(onHome)}><Icon name="grid" size={16}/><span>NN Home</span><b>↗</b></button><button type="button" onClick={()=>action(onSearch)}><Icon name="search" size={16}/><span>Search workspace</span><b>⌘ K</b></button></div>
   <footer><span>NN OPERATING ENVIRONMENT</span><span>v1</span></footer>
  </section>}
 </div>;
}