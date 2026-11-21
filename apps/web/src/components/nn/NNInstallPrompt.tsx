"use client";
import {useEffect,useState} from "react";
import {Icon} from "@/components/ui/Icon";
import styles from "./NNInstallPrompt.module.css";
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed";platform:string}>};
export function NNInstallPrompt(){
 const[mode,setMode]=useState<"hidden"|"ios"|"prompt"|"fallback">("hidden");
 const[open,setOpen]=useState(false);const[installEvent,setInstallEvent]=useState<InstallEvent|null>(null);const[busy,setBusy]=useState(false);
 useEffect(()=>{
  const standalone=window.matchMedia("(display-mode: standalone)").matches||("standalone" in navigator&&(navigator as Navigator&{standalone?:boolean}).standalone===true);
  if(standalone)return;
  const ua=navigator.userAgent;
  const ios=/iPad|iPhone|iPod/.test(ua)||(/Macintosh/.test(ua)&&navigator.maxTouchPoints>1);
  setMode(ios?"ios":"fallback");
  const onPrompt=(event:Event)=>{event.preventDefault();setInstallEvent(event as InstallEvent);setMode("prompt")};
  window.addEventListener("beforeinstallprompt",onPrompt);
  return()=>window.removeEventListener("beforeinstallprompt",onPrompt);
 },[]);
 const install=async()=>{if(!installEvent||busy)return;setBusy(true);try{await installEvent.prompt();await installEvent.userChoice;setInstallEvent(null);setMode("fallback");}catch{setMode("fallback");}finally{setBusy(false)}};
 if(mode==="hidden")return null;
 return <section className={styles.root} aria-label="Install NN">
  <div className={styles.copy}><span className={styles.icon}><Icon name="grid" size={19}/></span><div><strong>Take NN with you</strong><p>Install NN on your device for a focused, app-like experience.</p></div></div>
  <div className={styles.actions}>
   {mode==="prompt"?<button type="button" onClick={()=>void install()} disabled={busy}>{busy?"Opening…":"Install NN"}</button>:<button type="button" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>{open?"Close":"How to install"}</button>}
   <button className={styles.dismiss} type="button" aria-label="Dismiss install guide" onClick={()=>setMode("hidden")}><Icon name="close" size={15}/></button>
  </div>
  {open&&<div className={styles.guide}><b>{mode==="ios"?"On iPhone or iPad":"Add NN to your home screen"}</b>{mode==="ios"?<ol><li>Open this page in <strong>Safari</strong>.</li><li>Tap the <strong>Share</strong> button.</li><li>Choose <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>. Open NN from its new home-screen icon.</li></ol>:<ol><li>Open your browser menu.</li><li>Choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</li><li>Confirm, then launch NN from your device.</li></ol>}<small>Installation options depend on your browser and device.</small></div>}
 </section>;
}