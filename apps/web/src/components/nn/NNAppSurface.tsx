"use client";

import { useCallback, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { useRecords, useRecordWriter, type NNRecord, type RecordFault } from "@/lib/nn/records";
import { relativeTime, useClock } from "@/lib/clock";
import type { NNApplication } from "@/lib/apps/registry";
import type { AppField, AppSection } from "@/lib/apps/sections";
import styles from "./NNAppSurface.module.css";

/**
 * The work surface every NN application gets.
 *
 * An application is not a screen; it is a set of the founder's own records
 * with a shape. So there is one surface, and what makes Finance different
 * from Contacts is which collections it points at and which fields a record
 * holds — not thirty-four hand-built pages that would each rot separately.
 *
 * Everything here is real. The lists are live subscriptions to the founder's
 * own Firestore collections; adding a record writes one; completing and
 * deleting change it. Nothing is seeded, nothing is sample data, and when a
 * read or a write is refused the surface says so in the words of the actual
 * fault rather than showing an empty list that looks like "you have none".
 */

export interface NNAppSurfaceProps {
  app: NNApplication;
  sections: readonly AppSection[];
}

/** A record's title, however the founder happened to store it. */
function titleOf(record: NNRecord): string {
  for (const key of ["title", "name", "label"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "Untitled";
}

function fieldValue(record: NNRecord, field: AppField): string | null {
  const value = record[field.key];
  if (value === undefined || value === null || value === "") return null;
  if (field.type === "date") {
    const date =
      value && typeof value === "object" && "toDate" in value
        ? (value as { toDate: () => Date }).toDate()
        : new Date(value as string | number);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
  }
  if (field.type === "number") {
    return typeof value === "number" ? String(value) : null;
  }
  return typeof value === "string" ? value : null;
}

function explain(fault: RecordFault): string {
  switch (fault.kind) {
    case "signed-out": return "Sign in to see and add your own records.";
    case "unconfigured": return "This deployment has no Firebase configuration, so there is nothing to read from.";
    case "denied": return "These records are not yours to read.";
    case "unavailable": return "NN will show them as soon as it can reach your data.";
    default: return "This is a fault in NN, not in your data.";
  }
}

/** A record is done when it says so, in any of the ways it might. */
function isDone(record: NNRecord): boolean {
  if (record.done === true || record.completed === true) return true;
  const status = typeof record.status === "string" ? record.status.toLowerCase() : "";
  return ["done", "finished", "paid", "published", "final", "delivered", "closed", "reached", "answered", "solved", "passed"].includes(status);
}

function SectionPanel({ section, appName }: { section: AppSection; appName: string }) {
  const records = useRecords(section.collection, { limit: 120 });
  const writer = useRecordWriter();
  const now = useClock();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const title = draft.title?.trim() ?? "";

  const open = useMemo(() => records.items.filter((r) => !isDone(r)), [records.items]);
  const done = useMemo(() => records.items.filter(isDone), [records.items]);

  const reset = useCallback(() => { setDraft({}); setAdding(false); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title || !writer.ready || busy) return;
    setBusy(true);
    setProblem(null);

    const payload: Record<string, unknown> = { title };
    for (const field of section.fields) {
      const raw = draft[field.key]?.trim();
      if (!raw) continue;
      if (field.type === "number") {
        const n = Number(raw);
        // A field the founder typed into must not silently become nothing.
        if (!Number.isFinite(n)) { setProblem(`${field.label} must be a number.`); setBusy(false); return; }
        payload[field.key] = n;
      } else {
        payload[field.key] = raw;
      }
    }

    try {
      await writer.create(section.collection, payload);
      reset();
    } catch (error) {
      // Saying "added" when Firestore refused is the one thing NN must never
      // do: the founder would believe a record exists that does not.
      setProblem(
        error instanceof Error
          ? `Not saved. ${error.message}`
          : "Not saved. NN could not write that record.",
      );
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (record: NNRecord) => {
    if (!writer.ready) return;
    setProblem(null);
    try {
      await writer.update(section.collection, record.id, { done: !isDone(record) });
    } catch (error) {
      setProblem(error instanceof Error ? `Not changed. ${error.message}` : "Not changed.");
    }
  };

  const remove = async (record: NNRecord) => {
    if (!writer.ready) return;
    setProblem(null);
    try {
      // Soft delete: this goes to the trash, where it can be taken back.
      await writer.remove(section.collection, record.id);
    } catch (error) {
      setProblem(error instanceof Error ? `Not deleted. ${error.message}` : "Not deleted.");
    }
  };

  const rows = [...open, ...done];

  return (
    <div className={styles.section}>
      <header className={styles.sectionTop}>
        <div>
          <h2>{section.name}</h2>
          <p>{section.hint}</p>
        </div>
        <p className={styles.tally}>
          {records.fault || records.loading
            ? "—"
            : `${open.length} open${done.length ? ` · ${done.length} done` : ""}`}
        </p>
      </header>

      {problem ? (
        <p className={styles.problem} role="alert">
          <Icon name="shield" size={15} />
          {problem}
        </p>
      ) : null}

      {adding ? (
        <form className={styles.form} onSubmit={(e) => void submit(e)}>
          <label className={styles.field}>
            <span>Title</span>
            <input
              autoFocus
              value={draft.title ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder={`Add ${section.noun}`}
              maxLength={200}
              required
            />
          </label>

          {section.fields.map((field) => (
            <label className={styles.field} key={field.key} data-wide={field.type === "longtext"}>
              <span>
                {field.label}
                {field.hint ? <em>{field.hint}</em> : null}
              </span>
              {field.type === "longtext" ? (
                <textarea
                  rows={3}
                  value={draft[field.key] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                  maxLength={4000}
                />
              ) : field.type === "choice" ? (
                <select
                  value={draft[field.key] ?? field.choices?.[0] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                >
                  {(field.choices ?? []).map((choice) => (
                    <option key={choice} value={choice}>{choice}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  value={draft[field.key] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [field.key]: e.target.value }))}
                  step={field.type === "number" ? "any" : undefined}
                  maxLength={field.type === "text" ? 200 : undefined}
                />
              )}
            </label>
          ))}

          <div className={styles.formActions}>
            <button type="submit" disabled={!title || busy || !writer.ready}>
              {busy ? "Saving…" : "Save"}
            </button>
            <button type="button" className={styles.ghost} onClick={reset}>Cancel</button>
            {!writer.ready ? <span className={styles.quiet}>Sign in to save.</span> : null}
          </div>
        </form>
      ) : (
        <button
          type="button"
          className={styles.add}
          onClick={() => setAdding(true)}
          disabled={!writer.ready}
        >
          <Icon name="plus" size={16} />
          Add {section.noun}
        </button>
      )}

      {records.fault ? (
        <p className={styles.fault} role="status">
          <Icon name="shield" size={15} />
          <span>
            <strong>{records.fault.message}</strong>
            <span>{explain(records.fault)}</span>
          </span>
        </p>
      ) : records.loading ? (
        <div className={styles.skeleton} aria-hidden="true"><span /><span /><span /></div>
      ) : rows.length === 0 ? (
        <p className={styles.empty}>
          Nothing here yet. {appName} will hold {section.noun} once you add one.
        </p>
      ) : (
        <ul className={styles.rows}>
          {rows.map((record) => {
            const complete = isDone(record);
            return (
              <li key={record.id} data-done={complete || undefined}>
                <button
                  type="button"
                  className={styles.tick}
                  aria-pressed={complete}
                  aria-label={complete ? `Reopen ${titleOf(record)}` : `Complete ${titleOf(record)}`}
                  onClick={() => void toggle(record)}
                  disabled={!writer.ready}
                >
                  {complete ? <Icon name="check" size={14} /> : null}
                </button>

                <div className={styles.rowBody}>
                  <strong>{titleOf(record)}</strong>
                  <p>
                    {section.fields
                      .map((field) => {
                        const value = fieldValue(record, field);
                        return value === null ? null : `${field.label}: ${value}`;
                      })
                      .filter(Boolean)
                      .join("  ·  ") || "No further detail"}
                  </p>
                </div>

                <span className={styles.rowWhen}>
                  {(() => {
                    const updated = record.updatedAt;
                    if (now === null || !updated || typeof updated !== "object" || !("toDate" in updated)) return "";
                    return relativeTime((updated as { toDate: () => Date }).toDate(), now);
                  })()}
                </span>

                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Delete ${titleOf(record)}`}
                  onClick={() => void remove(record)}
                  disabled={!writer.ready}
                >
                  <Icon name="close" size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

type AppIdentity = { mark: string; discipline: string; tagline: string; hue: number };
const APP_IDENTITIES: Record<string, AppIdentity> = {
  life:{mark:"LF",discipline:"Personal operating system",tagline:"Your days, intentionally arranged.",hue:194},
  soul:{mark:"SL",discipline:"Life & wellbeing",tagline:"A private space for purpose and reflection.",hue:34},
  mind:{mark:"MN",discipline:"Life & wellbeing",tagline:"Make room for focus, clarity and growth.",hue:267},
  body:{mark:"BD",discipline:"Life & wellbeing",tagline:"Understand the habits that support your energy.",hue:8},
  contacts:{mark:"CT",discipline:"Life & wellbeing",tagline:"Keep the people who matter within reach.",hue:202},
  "nature-universe":{mark:"NU",discipline:"Life & wellbeing",tagline:"A field notebook for a curious mind.",hue:157},
  "peace-mode":{mark:"PM",discipline:"Life & wellbeing",tagline:"A quieter place to pause and reset.",hue:224},
  college:{mark:"CL",discipline:"Education",tagline:"Bring your semester, subjects and preparation into focus.",hue:210},
  academy:{mark:"AC",discipline:"Education",tagline:"Build skills through deliberate practice.",hue:185},
  "formula-engine":{mark:"FE",discipline:"Education",tagline:"A precise library of expressions and principles.",hue:46},
  "logic-lab":{mark:"LL",discipline:"Education",tagline:"Train the reasoning behind every answer.",hue:274},
  "learning-vault":{mark:"LV",discipline:"Education",tagline:"A considered home for what you learn.",hue:320},
  finance:{mark:"FN",discipline:"Money & work",tagline:"See the structure behind your money.",hue:148},
  invest:{mark:"IV",discipline:"Money & work",tagline:"Research holdings with discipline and context.",hue:169},
  business:{mark:"BS",discipline:"Money & work",tagline:"Turn decisions into deliberate execution.",hue:29},
  freelance:{mark:"FR",discipline:"Money & work",tagline:"Keep clients, delivery and billing in order.",hue:195},
  career:{mark:"CR",discipline:"Money & work",tagline:"Make progress visible through evidence.",hue:215},
  projects:{mark:"PJ",discipline:"Money & work",tagline:"Move important work from plan to completion.",hue:246},
  achievements:{mark:"AH",discipline:"Money & work",tagline:"Keep a record of outcomes worth remembering.",hue:42},
  "creator-studio":{mark:"CS",discipline:"Creation & communication",tagline:"Shape ideas into finished work.",hue:333},
  studio:{mark:"ST",discipline:"Creation & communication",tagline:"A focused space for writing and documents.",hue:286},
  mail:{mark:"ML",discipline:"Creation & communication",tagline:"Prepare thoughtful communication, on your terms.",hue:204},
  english:{mark:"EN",discipline:"Creation & communication",tagline:"Practise the language, one skill at a time.",hue:174},
  memory:{mark:"MM",discipline:"Knowledge & insight",tagline:"Keep useful knowledge connected to its source.",hue:250},
  "life-archive":{mark:"LA",discipline:"Knowledge & insight",tagline:"A personal timeline of meaningful moments.",hue:22},
  analytics:{mark:"AN",discipline:"Knowledge & insight",tagline:"Read the patterns in the measures you track.",hue:190},
  travel:{mark:"TR",discipline:"Knowledge & insight",tagline:"Collect destinations, plans and the details between.",hue:180},
  simulator:{mark:"SM",discipline:"Knowledge & insight",tagline:"Explore scenarios with assumptions made visible.",hue:262},
  "command-centre":{mark:"CC",discipline:"System",tagline:"A clear record of requests and outcomes.",hue:207},
  search:{mark:"SR",discipline:"System",tagline:"Find what matters across your NN workspace.",hue:191},
  "automation-studio":{mark:"AS",discipline:"System",tagline:"Design automations with explicit control.",hue:158},
  "security-centre":{mark:"SC",discipline:"System",tagline:"Keep the security posture understandable.",hue:224},
  "control-room":{mark:"CO",discipline:"System",tagline:"A measured view of system checks and signals.",hue:279},
  files:{mark:"FI",discipline:"System",tagline:"A deliberate home for your files and folders.",hue:215}
};
function identityFor(app: NNApplication): AppIdentity {
  return APP_IDENTITIES[app.id] ?? {mark:app.name.slice(0,2).toUpperCase(),discipline:app.group,tagline:app.description,hue:205};
}
export function NNAppSurface({ app, sections }: NNAppSurfaceProps) {
  const [active,setActive]=useState(0);
  const section=sections[active]??sections[0];
  const identity=identityFor(app);
  if(!section)return null;
  const rootStyle={"--app-hue":identity.hue} as CSSProperties;
  const moveSection=(next:number)=>{
    setActive(next);
    document.getElementById("workspace-tab-"+sections[next]!.collection)?.focus();
  };
  return (
    <main className={styles.root} data-app={app.id} data-family={app.group} style={rootStyle}>
      <section className={styles.hero} aria-labelledby="nn-workspace-title">
        <div className={styles.heroAtmosphere} aria-hidden="true"><span className={styles.heroOrb}/><span className={styles.heroRing}/><span className={styles.heroHorizon}/></div>
        <div className={styles.heroContent}>
          <div className={styles.heroMeta}><span>NN / APPLICATION WORKSPACE</span><span className={styles.privateLabel}><i/> PRIVATE SPACE</span></div>
          <div className={styles.heroIdentity}>
            <div className={styles.appSeal} aria-label={app.name+" app mark"}><span>{identity.mark}</span><i/></div>
            <div className={styles.heroTitles}><p className={styles.group}>{identity.discipline}</p><h1 id="nn-workspace-title">{app.name}</h1><p className={styles.tagline}>{identity.tagline}</p></div>
          </div>
          <p className={styles.description}>{app.description}</p>
        </div>
        <div className={styles.heroIndex} aria-hidden="true"><span>NN</span><strong>{identity.mark}</strong><i/><small>WORKSPACE</small></div>
      </section>
      <section className={styles.workspace} aria-label={app.name+" workspace"}>
        <aside className={styles.rail}>
          <div className={styles.railHeading}><span>WORKSPACE</span><span>{String(sections.length).padStart(2,"0")} MODULES</span></div>
          <div className={styles.sectionNav} role="tablist" aria-label={app.name+" modules"} aria-orientation="vertical">
            {sections.map((entry,index)=>(
              <button key={entry.collection} type="button" role="tab" id={"workspace-tab-"+entry.collection} aria-selected={index===active} aria-controls={"workspace-panel-"+entry.collection} tabIndex={index===active?0:-1} className={styles.sectionTab}
                onKeyDown={event=>{
                  const last=sections.length-1;let next=-1;
                  if(event.key==="ArrowDown"||event.key==="ArrowRight")next=active===last?0:active+1;
                  else if(event.key==="ArrowUp"||event.key==="ArrowLeft")next=active===0?last:active-1;
                  else if(event.key==="Home")next=0;else if(event.key==="End")next=last;else return;
                  event.preventDefault();moveSection(next);
                }} onClick={()=>setActive(index)}>
                <span className={styles.tabIndex}>{String(index+1).padStart(2,"0")}</span><span className={styles.tabLabel}>{entry.name}</span><span className={styles.tabArrow} aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
          <div className={styles.railFoot}><span className={styles.railSignal}/><span>OWNER DATA</span><span>OWNER SCOPED</span></div>
        </aside>
        <div className={styles.workArea}>
          <header className={styles.moduleHeader}>
            <div><p className={styles.moduleEyebrow}>MODULE / {String(active+1).padStart(2,"0")}</p><h2>{section.name}</h2><p>{section.hint}</p></div>
            <div className={styles.liveStatus}><i/> LIVE DATA</div>
          </header>
          <div role={sections.length>1?"tabpanel":undefined} id={"workspace-panel-"+section.collection} aria-labelledby={sections.length>1?"workspace-tab-"+section.collection:undefined} className={styles.modulePanel}>
            <SectionPanel key={section.collection} section={section} appName={app.name}/>
          </div>
        </div>
      </section>
    </main>
  );
}
export default NNAppSurface;
