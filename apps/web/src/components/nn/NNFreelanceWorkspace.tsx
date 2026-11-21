"use client";
import {useMemo,useState} from "react";
import {useRecords,useRecordWriter,type NNRecord} from "@/lib/nn/records";
import type {NNApplication} from "@/lib/apps/registry";
import type {AppSection} from "@/lib/apps/sections";
import {NNAppSurface} from "@/components/nn/NNAppSurface";
import styles from "./NNFreelanceWorkspace.module.css";
type Props={app:NNApplication;sections:readonly AppSection[]};
const str=(v:unknown)=>typeof v==="string"?v:"";
const title=(r:NNRecord)=>str(r.title)||str(r.name)||"Untitled";
const fmt=(v:unknown)=>typeof v==="number"&&Number.isFinite(v)?new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(v):"—";
const deliverableStages=["agreed","in progress","delivered"] as const;
const invoiceStages=["draft","sent","paid"] as const;
export function NNFreelanceWorkspace({app,sections}:Props){
 const clients=useRecords("freelance_clients",{limit:200});
 const work=useRecords("freelance_deliverables",{limit:200});
 const invoices=useRecords("freelance_invoices",{limit:200});
 const writer=useRecordWriter();const[busy,setBusy]=useState<string|null>(null);const[error,setError]=useState("");
 const paid=useMemo(()=>invoices.items.filter(x=>x.status==="paid").reduce((sum,x)=>sum+(typeof x.amount==="number"?x.amount:0),0),[invoices.items]);
 const outstanding=useMemo(()=>invoices.items.filter(x=>x.status==="sent").reduce((sum,x)=>sum+(typeof x.amount==="number"?x.amount:0),0),[invoices.items]);
 const update=async(collection:string,r:NNRecord,status:string)=>{if(!writer.ready||busy)return;setBusy(r.id);setError("");try{await writer.update(collection,r.id,{status});}catch(e){setError(e instanceof Error?e.message:"Could not save the status change.");}finally{setBusy(null);}};
 return <main className={styles.root}>
  <section className={styles.hero}><div className={styles.meta}><span>NN / INDEPENDENT WORK</span><span>CLIENTS · DELIVERY · BILLING</span></div><div className={styles.heroBody}><div><p>MAKE GOOD WORK REPEATABLE</p><h1>Freelance<span>.</span></h1><small>A compact operating desk for client relationships, agreed deliverables and invoice follow-through. Amounts are calculated only from records you enter.</small></div><div className={styles.glyph}><i/><i/><b>F</b><span>WORK OFFICE</span></div></div><div className={styles.foot}><span>AGREE CLEARLY. DELIVER WELL. GET PAID.</span><span>CLIENT OPERATIONS</span></div></section>
  <section className={styles.metrics}><article><span>CLIENTS</span><strong>{clients.loading?"—":clients.items.length}</strong><small>Relationships on record</small></article><article><span>DELIVERABLES</span><strong>{work.loading?"—":work.items.length}</strong><small>Agreed pieces of work</small></article><article><span>PAID · RECORDED</span><strong>{invoices.loading?"—":fmt(paid)}</strong><small>From invoices marked paid</small></article><article><span>OUTSTANDING · RECORDED</span><strong>{invoices.loading?"—":fmt(outstanding)}</strong><small>Invoices marked sent</small></article></section>
  {error&&<p className={styles.error} role="alert">{error}</p>}
  <section className={styles.delivery}><header><div><span>DELIVERY TRACKER</span><h2>Work in motion</h2><p>Move deliverables forward as agreed work is completed.</p></div><b>{work.loading?"—":work.items.length+" RECORDS"}</b></header>
   {work.fault?<p className={styles.empty}>{work.fault.message}</p>:work.loading?<p className={styles.empty}>Loading deliverables…</p>:work.items.length===0?<p className={styles.empty}>No deliverables yet. Add the first agreed piece of work in the ledger below.</p>:<div className={styles.workList}>{work.items.map(r=>{const index=deliverableStages.indexOf(r.status as typeof deliverableStages[number]);return <article key={r.id}><div className={styles.workCopy}><span>{str(r.status)||"not set"}</span><h3>{title(r)}</h3><p>{str(r.detail)||"No scope notes recorded."}</p></div><div className={styles.workAction}>{index<2&&<button disabled={!writer.ready||busy===r.id} onClick={()=>void update("freelance_deliverables",r,deliverableStages[index+1]!)}>{busy===r.id?"Saving…":"Advance ↗"}</button>}{index===2&&<b>DELIVERED</b>}</div></article>})}</div>}
  </section>
  <section className={styles.billing}><header><div><span>INVOICE REGISTER</span><h2>Billing follow-through</h2><p>Track draft, sent and paid states. NN does not issue or send invoices.</p></div><b>{invoices.loading?"—":invoices.items.length+" INVOICES"}</b></header>
   {invoices.fault?<p className={styles.empty}>{invoices.fault.message}</p>:invoices.loading?<p className={styles.empty}>Loading invoices…</p>:invoices.items.length===0?<p className={styles.empty}>No invoices recorded. Create one below when you have an agreed amount to bill.</p>:<div className={styles.invoiceList}>{invoices.items.map(r=>{const index=invoiceStages.indexOf(r.status as typeof invoiceStages[number]);return <article key={r.id}><div><span>{str(r.status)||"not set"}</span><h3>{title(r)}</h3><small>{fmt(r.amount)}</small></div><button disabled={!writer.ready||busy===r.id||index===2} onClick={()=>void update("freelance_invoices",r,invoiceStages[index < 0 ? 1 : index + 1]!)}>{busy===r.id?"Saving…":index===2?"Paid":"Mark "+(index===0?"sent":"paid")}</button></article>})}</div>}
  </section>
  <section className={styles.clients}><header><div><span>RELATIONSHIP BOOK</span><h2>Clients</h2></div><b>{clients.loading?"—":clients.items.length+" ON FILE"}</b></header>
   {clients.fault?<p className={styles.empty}>{clients.fault.message}</p>:clients.loading?<p className={styles.empty}>Loading clients…</p>:clients.items.length?<div className={styles.clientGrid}>{clients.items.slice(0,8).map(c=><article key={c.id}><span>CLIENT</span><h3>{title(c)}</h3><p>{str(c.contact)||"No contact details recorded."}</p></article>)}</div>:<p className={styles.empty}>Your client list is empty. Add a client when you are ready to start a working relationship.</p>}
  </section>
  <section className={styles.records}><span>FREELANCE LEDGER / LIVE</span><h2>Manage clients, work and invoices</h2><p>Every workflow above is connected to your own records below.</p><NNAppSurface app={app} sections={sections}/></section>
 </main>;
}