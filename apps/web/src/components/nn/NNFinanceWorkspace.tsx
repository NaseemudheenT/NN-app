"use client";
import {useMemo} from "react";
import {useRecords,type NNRecord} from "@/lib/nn/records";
import type {NNApplication} from "@/lib/apps/registry";
import type {AppSection} from "@/lib/apps/sections";
import {NNAppSurface} from "@/components/nn/NNAppSurface";
import styles from "./NNFinanceWorkspace.module.css";
type Props={app:NNApplication;sections:readonly AppSection[]};
const title=(r:NNRecord)=>{for(const k of ["title","name","label"]){const v=r[k];if(typeof v==="string"&&v.trim())return v.trim()}return "Untitled"};
const date=(v:unknown):Date|null=>{if(!v)return null;const d=v&&typeof v==="object"&&"toDate"in v?(v as {toDate:()=>Date}).toDate():new Date(v as string|number);return Number.isNaN(d.getTime())?null:d};
const money=(v:unknown,currency:unknown)=>{const n=typeof v==="number"?v:Number(v??0),code=typeof currency==="string"&&/^[A-Z]{3}$/.test(currency)?currency:null;if(!Number.isFinite(n))return "—";try{return code?new Intl.NumberFormat("en-IN",{style:"currency",currency:code,maximumFractionDigits:2}).format(n):new Intl.NumberFormat("en-IN",{maximumFractionDigits:2}).format(n)}catch{return n.toLocaleString("en-IN")+(code?" "+code:"")}};
function grouped(items:readonly NNRecord[],field:string){const map=new Map<string,number>();for(const item of items){const code=typeof item.currency==="string"&&/^[A-Z]{3}$/.test(item.currency)?item.currency:"—",value=Number(item[field]??0);if(Number.isFinite(value))map.set(code,(map.get(code)??0)+value)}return [...map.entries()].sort(([a],[b])=>a.localeCompare(b))}
export function NNFinanceWorkspace({app,sections}:Props){
 const accounts=useRecords("finance_accounts",{limit:100}),transactions=useRecords("finance_transactions",{orderBy:"at",direction:"desc",limit:250}),budgets=useRecords("finance_budgets",{limit:100});
 const month=useMemo(()=>{const now=new Date();return transactions.items.filter(t=>{const d=date(t.at);return d&&d.getFullYear()===now.getFullYear()&&d.getMonth()===now.getMonth()})},[transactions.items]);
 const monthly=useMemo(()=>{const map=new Map<string,{inflow:number;outflow:number}>();for(const t of month){const code=typeof t.currency==="string"&&/^[A-Z]{3}$/.test(t.currency)?t.currency:"—",n=Number(t.amount??0);if(!Number.isFinite(n))continue;const row=map.get(code)??{inflow:0,outflow:0};if(n>=0)row.inflow+=n;else row.outflow+=Math.abs(n);map.set(code,row)}return [...map.entries()]},[month]);
 const balances=grouped(accounts.items,"balance"),jump=()=>{const el=document.getElementById("finance-record-workspace");if(el&&typeof el.scrollIntoView==="function")el.scrollIntoView({behavior:"smooth",block:"start"})};
 const faults=accounts.fault||transactions.fault||budgets.fault;
 return <main className={styles.root}>
  <section className={styles.hero}><div className={styles.orbit}/><div className={styles.meta}><span>NN / MONEY ENVIRONMENT</span><span>● PRIVATE FINANCIAL SPACE</span></div><div className={styles.heroBody}><div><p>YOUR MONEY, MADE CLEAR</p><h1>Finance<span>.</span></h1><small>A considered view of your accounts, cash movement and spending plans.</small></div><button onClick={jump}>Open financial records ↗</button></div><footer className={styles.heroFoot}>MANUAL RECORDS · OWNER CONTROLLED <span>02 — FINANCE</span></footer></section>
  <section className={styles.metrics}><article><label>ACCOUNTS</label><strong>{accounts.loading?"—":accounts.items.length}</strong><small>Balances you entered</small></article><article><label>TRANSACTIONS</label><strong>{transactions.loading?"—":transactions.items.length}</strong><small>Recorded entries</small></article><article><label>BUDGET LINES</label><strong>{budgets.loading?"—":budgets.items.length}</strong><small>Spending limits</small></article><article><label>RECORDED BALANCES</label>{accounts.loading?<strong>—</strong>:balances.length?balances.map(([code,total])=><strong key={code} className={styles.balance}>{money(total,code==="—"?null:code)}</strong>):<strong>—</strong>}<small>Grouped by currency · not bank synced</small></article></section>
  {faults&&<p className={styles.notice}>Some financial records could not be loaded. Check the live workspace below for the actual access or connection status.</p>}
  <section className={styles.columns}>
   <article className={styles.panel}><header><div><label>THIS MONTH</label><h2>Cash movement</h2></div><button onClick={jump}>Details ↗</button></header>
    {transactions.loading?<p className={styles.empty}>Loading transactions…</p>:monthly.length?<div className={styles.flow}>{monthly.map(([code,v])=><div key={code} className={styles.flowGroup}><small>{code==="—"?"CURRENCY NOT SET":code}</small><div><span>Money in</span><strong className={styles.positive}>+{money(v.inflow,code==="—"?null:code)}</strong></div><div><span>Money out</span><strong className={styles.negative}>−{money(v.outflow,code==="—"?null:code)}</strong></div><div className={styles.net}><span>Net movement</span><strong>{money(v.inflow-v.outflow,code==="—"?null:code)}</strong></div></div>)}</div>:<p className={styles.empty}>No transactions recorded this month. <button onClick={jump}>Add a transaction ↗</button></p>}
   </article>
   <article className={styles.panel}><header><div><label>YOUR ALLOCATIONS</label><h2>Budgets</h2></div><button onClick={jump}>Manage ↗</button></header>
    {budgets.loading?<p className={styles.empty}>Loading budgets…</p>:budgets.items.length?<div className={styles.budgets}>{budgets.items.slice(0,6).map(b=><div key={b.id}><span><strong>{typeof b.category==="string"&&b.category?b.category:title(b)}</strong><small>Planned limit</small></span><b>{money(b.amount,null)}</b></div>)}</div>:<p className={styles.empty}>Your budget plan starts here. <button onClick={jump}>Create a budget ↗</button></p>}
   </article>
  </section>
  <section className={styles.panel+" "+styles.accountPanel}><header><div><label>ACCOUNT OVERVIEW</label><h2>Your accounts</h2></div><button onClick={jump}>Manage ↗</button></header>
   {accounts.loading?<p className={styles.empty}>Loading accounts…</p>:accounts.items.length?<div className={styles.accounts}>{accounts.items.slice(0,8).map(a=><article key={a.id}><small>ACCOUNT / {String(a.currency??"—").toUpperCase()}</small><strong>{title(a)}</strong><b>{money(a.balance,a.currency)}</b></article>)}</div>:<p className={styles.empty}>No accounts recorded yet. Add the balances you want to track. <button onClick={jump}>Add an account ↗</button></p>}
  </section>
  <section className={styles.callout}><div><label>DATA BOUNDARY</label><strong>NN shows only the financial records you enter. It does not connect to your bank or fetch live market prices.</strong></div><button onClick={jump}>Go to finance workspace ↗</button></section>
  <section id="finance-record-workspace" className={styles.records}><header><label>FINANCIAL RECORDS / LIVE</label><h2>Workspace</h2></header><NNAppSurface app={app} sections={sections}/></section>
 </main>;
}