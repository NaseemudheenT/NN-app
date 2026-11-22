"use client";

import { useMemo, useState } from "react";
import { useRecords, type NNRecord } from "@/lib/nn/records";
import type { NNApplication } from "@/lib/apps/registry";
import type { AppSection } from "@/lib/apps/sections";
import { NNAppSurface } from "@/components/nn/NNAppSurface";
import styles from "./NNVaultWorkspace.module.css";

type Props={app:NNApplication;sections:readonly AppSection[]};
const value=(v:unknown)=>typeof v==="string"?v:"";
const title=(r:NNRecord)=>value(r.title)||value(r.name)||"Untitled";
export function NNVaultWorkspace({app,sections}:Props){
 const library=useRecords("vault_library",{limit:150});
 const cards=useRecords("vault_cards",{limit:200});
 const [revealed,setRevealed]=useState<string|null>(null);
 const [filter,setFilter]=useState("all");
 const finished=useMemo(()=>library.items.filter(x=>x.status==="finished").length,[library.items]);
 const reading=useMemo(()=>library.items.filter(x=>x.status==="reading").length,[library.items]);
 const filtered=cards.items.filter(card=>filter==="all"||value(card.kind)===filter);
 return <main className={styles.root}>
  <section className={styles.hero}><div className={styles.meta}><span>NN / KNOWLEDGE ARCHIVE</span><span>PRIVATE REFERENCE SPACE</span></div><div className={styles.heroBody}><div><p>COLLECT · CONNECT · RECALL</p><h1>Learning<br/><span>Vault.</span></h1><small>A considered home for the books you explore, the ideas you collect and the knowledge you practise remembering.</small></div><div className={styles.vaultMark} aria-hidden="true"><span>V</span><i/><b/></div></div><div className={styles.foot}><span>{library.items.length} LIBRARY ITEMS</span><span>{cards.items.length} FLASHCARDS</span><span>YOUR KNOWLEDGE, ORGANIZED</span></div></section>
  <section className={styles.metrics}><article><small>IN YOUR LIBRARY</small><strong>{library.loading?"—":library.items.length}</strong></article><article><small>CURRENTLY READING</small><strong>{library.loading?"—":reading}</strong></article><article><small>FINISHED</small><strong>{library.loading?"—":finished}</strong></article><article><small>RECALL CARDS</small><strong>{cards.loading?"—":cards.items.length}</strong></article></section>
  <section className={styles.shelf}><header><div><span>YOUR READING SHELF</span><h2>Books & courses</h2></div><span>{library.items.length.toString().padStart(2,"0")} ITEMS</span></header>
   {library.fault?<p className={styles.state}>{library.fault.message}</p>:library.loading?<div className={styles.loading}/>:library.items.length===0?<div className={styles.empty}><strong>Your library is waiting.</strong><p>Save a book, course, paper or video to keep your learning resources together.</p></div>:<div className={styles.bookGrid}>{library.items.map(item=><article className={styles.book} key={item.id}><span>{value(item.kind)||"RESOURCE"}</span><h3>{title(item)}</h3><small>{value(item.status)||"to read"}</small><p>{value(item.source)||"No source added"}</p></article>)}</div>}
  </section>
  <section className={styles.recall}><header><div><span>ACTIVE RECALL</span><h2>Flashcards</h2><p>Test your memory before revealing the answer.</p></div><select aria-label="Filter flashcards" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All cards</option><option value="book">Books</option><option value="course">Courses</option><option value="paper">Papers</option><option value="video">Videos</option></select></header>
   {cards.fault?<p className={styles.state}>{cards.fault.message}</p>:cards.loading?<div className={styles.loading}/>:filtered.length===0?<div className={styles.empty}><strong>No flashcards in this view.</strong><p>Add a prompt and its answer in the learning desk below.</p></div>:<div className={styles.cardGrid}>{filtered.map(card=><article className={styles.flashcard} data-revealed={revealed===card.id} key={card.id}><span>{revealed===card.id?"ANSWER":"RECALL PROMPT"}</span><h3>{revealed===card.id?(value(card.detail)||"No answer saved yet."):title(card)}</h3><button type="button" onClick={()=>setRevealed(current=>current===card.id?null:card.id)}>{revealed===card.id?"Hide answer":"Reveal answer"}</button></article>)}</div>}
  </section>
  <section className={styles.records}><div><span>VAULT MANAGEMENT</span><h2>Organize your knowledge</h2><p>Add resources and create flashcards. Your entries stay in your NN account.</p></div><NNAppSurface app={app} sections={sections}/></section>
 </main>;
}
