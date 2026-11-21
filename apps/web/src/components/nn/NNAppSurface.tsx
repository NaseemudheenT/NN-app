"use client";

import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { WaveCard, WaveChip } from "@/components/ui/WaveCard";
import { useRecords, useRecordWriter, type NNRecord, type RecordFault } from "@/lib/nn/records";
import { relativeTime, useClock } from "@/lib/clock";
import type { NNApplication } from "@/lib/apps/registry";
import type { AppField, AppSection } from "@/lib/apps/sections";
import { toDateInputValue, parseRecordField } from "@/lib/apps/record-fields";
import styles from "./NNAppSurface.module.css";
import { NNDomainBlueprint } from "@/components/nn/NNDomainBlueprint";

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
    const inputDate = toDateInputValue(value);
    if (!inputDate) return null;
    const [year, month, day] = inputDate.split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day).toLocaleDateString();
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

function SectionPanel({ section }: { section: AppSection }) {
  const records = useRecords(section.collection, { limit: 120 });
  const writer = useRecordWriter();
  const now = useClock();

  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Record<string, string>>({});

  const title = draft.title?.trim() ?? "";

  const activeRecords = useMemo(() => records.items.filter((record) => !isDone(record)), [records.items]);
  const completedRecords = useMemo(() => records.items.filter(isDone), [records.items]);

  const reset = useCallback(() => { setDraft({}); setAdding(false); }, []);
  const beginEdit = (record: NNRecord) => {
    const next: Record<string, string> = { title: titleOf(record) };
    for (const field of section.fields) {
      const value = record[field.key];
      if (value === undefined || value === null) continue;
      if (field.type === "date") {
        next[field.key] = toDateInputValue(value);
      } else if (typeof value === "string" || typeof value === "number") next[field.key] = String(value);
    }
    setEditingId(record.id);
    setEditDraft(next);
    setAdding(false);
    setProblem(null);
  };
  const saveEdit = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingId || !editDraft.title?.trim() || !writer.ready || busy) return;
    const payload: Record<string, unknown> = { title: editDraft.title.trim() };
    for (const field of section.fields) {
      const raw = editDraft[field.key]?.trim() ?? "";
      const parsed = parseRecordField(field, raw);
      if (!parsed.ok) { setProblem(parsed.error); return; }
      payload[field.key] = parsed.value;
    }
    setBusy(true); setProblem(null);
    try {
      await writer.update(section.collection, editingId, payload);
      setEditingId(null); setEditDraft({});
    } catch (error) {
      setProblem(error instanceof Error ? `Not updated. ${error.message}` : "Not updated. NN could not save those changes.");
    } finally { setBusy(false); }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title || !writer.ready || busy) return;
    setBusy(true);
    setProblem(null);

    const payload: Record<string, unknown> = { title };
    for (const field of section.fields) {
      const raw = draft[field.key]?.trim();
      if (!raw) continue;
      const parsed = parseRecordField(field, raw ?? "");
      if (!parsed.ok) { setProblem(parsed.error); setBusy(false); return; }
      if (parsed.value !== null) payload[field.key] = parsed.value;
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

  const rows = useMemo(() => {
    const all = [...activeRecords, ...completedRecords];
    const needle = search.trim().toLocaleLowerCase();
    if (!needle) return all;
    return all.filter((record) => {
      const searchable = [titleOf(record), ...section.fields.map((field) => fieldValue(record, field) ?? "")]
        .join(" ")
        .toLocaleLowerCase();
      return searchable.includes(needle);
    });
  }, [activeRecords, completedRecords, search, section.fields]);

  return (
    <div className={styles.section}>
      <header className={styles.sectionTop}>
        <h2>{section.name}</h2>
      </header>

      {problem ? (
        <p className={styles.problem} role="alert">
          <Icon name="shield" size={15} />
          {problem}
        </p>
      ) : null}

      {records.items.length > 0 ? (
        <label className={styles.search}>
          <Icon name="search" size={16} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${section.name.toLocaleLowerCase()}…`}
            aria-label={`Search ${section.name}`}
          />
          {search ? (
            <button type="button" onClick={() => setSearch("")} aria-label="Clear search">
              <Icon name="close" size={14} />
            </button>
          ) : null}
        </label>
      ) : null}

      {editingId ? (
        <form className={styles.form} onSubmit={(event) => void saveEdit(event)} aria-label={`Edit ${section.noun}`}>
          <label className={styles.field}><span>Title</span><input autoFocus value={editDraft.title ?? ""} onChange={(event) => setEditDraft((draft) => ({ ...draft, title: event.target.value }))} maxLength={200} required /></label>
          {section.fields.map((field) => (
            <label className={styles.field} key={field.key} data-wide={field.type === "longtext"}>
              <span>{field.label}{field.hint ? <em>{field.hint}</em> : null}</span>
              {field.type === "longtext" ? <textarea rows={3} value={editDraft[field.key] ?? ""} onChange={(event) => setEditDraft((draft) => ({ ...draft, [field.key]: event.target.value }))} maxLength={4000} /> :
               field.type === "choice" ? <select value={editDraft[field.key] ?? field.choices?.[0] ?? ""} onChange={(event) => setEditDraft((draft) => ({ ...draft, [field.key]: event.target.value }))}>{(field.choices ?? []).map((choice) => <option key={choice} value={choice}>{choice}</option>)}</select> :
               <input type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"} step={field.type === "number" ? "any" : undefined} value={editDraft[field.key] ?? ""} onChange={(event) => setEditDraft((draft) => ({ ...draft, [field.key]: event.target.value }))} maxLength={field.type === "text" ? 200 : undefined} />}
            </label>
          ))}
          <div className={styles.formActions}><button type="submit" disabled={!editDraft.title?.trim() || busy || !writer.ready}>{busy ? "Saving…" : "Save changes"}</button><button type="button" className={styles.ghost} onClick={() => { setEditingId(null); setEditDraft({}); }}>Cancel</button></div>
        </form>
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
          {search.trim()
            ? `No match for “${search.trim()}”.`
            : `No ${section.name.toLocaleLowerCase()} yet.`}
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

                <button type="button" className={styles.edit} aria-label={`Edit ${titleOf(record)}`} onClick={() => beginEdit(record)} disabled={!writer.ready || busy}><Icon name="pen" size={14} /></button>

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

export function NNAppSurface({ app, sections }: NNAppSurfaceProps) {
  const [active, setActive] = useState(0);
  const section = sections[active] ?? sections[0];
  if (!section) return null;

  return (
    <div className={styles.root} data-domain={app.group} data-app={app.id}>
      <WaveCard tone="tide" className={styles.banner}>
        <div className={styles.bannerInner}>
          <div>
            <h1>{app.name}</h1>
          </div>
          <WaveChip className={styles.bannerChip}>
            <Icon name={app.icon} size={22} />
          </WaveChip>
        </div>
      </WaveCard>

      <NNDomainBlueprint app={app} />

      {sections.length > 1 ? (
        <div className={styles.tabs} role="tablist" aria-label={`${app.name} sections`}>
          {sections.map((entry, index) => (
            <button
              key={entry.collection}
              type="button"
              role="tab"
              id={`tab-${entry.collection}`}
              aria-selected={index === active}
              aria-controls={`panel-${entry.collection}`}
              tabIndex={index === active ? 0 : -1}
              onKeyDown={(event) => {
                const last = sections.length - 1;
                let next = -1;
                if (event.key === "ArrowRight") next = active === last ? 0 : active + 1;
                else if (event.key === "ArrowLeft") next = active === 0 ? last : active - 1;
                else if (event.key === "Home") next = 0;
                else if (event.key === "End") next = last;
                else return;
                event.preventDefault();
                setActive(next);
                document.getElementById(`tab-${sections[next]!.collection}`)?.focus();
              }}
              onClick={() => setActive(index)}
            >
              {entry.name}
            </button>
          ))}
        </div>
      ) : null}

      <div
        role={sections.length > 1 ? "tabpanel" : undefined}
        id={`panel-${section.collection}`}
        aria-labelledby={sections.length > 1 ? `tab-${section.collection}` : undefined}
      >
        {/* Keyed on the collection so switching tabs mounts a fresh
            subscription rather than painting one section's records into
            another's list while the new query resolves. */}
        <SectionPanel key={section.collection} section={section} />
      </div>
    </div>
  );
}

export default NNAppSurface;
