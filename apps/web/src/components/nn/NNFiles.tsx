"use client";

import { useCallback, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { FolderCard, useFolderWidth, type FolderSheet } from "@/components/ui/FolderCard";
import { useRecords, useRecordWriter, type RecordFault } from "@/lib/nn/records";
import styles from "./NNFiles.module.css";

/**
 * Files — NN's documents, as folders you can actually open.
 *
 * This is the one place the founder's glass-folder reference belongs. A
 * folder is a real object here: a back panel holding generated artwork, the
 * documents it contains as real elements between real panels, and a frosted
 * front that leans forward on its bottom hinge when you reach for it. The
 * documents are not a picture of documents — the glass frosts them as they
 * rise, because they are genuinely behind it.
 *
 * The folders are the founder's own `documents` collection, grouped by their
 * `folder` field. Two things follow from that and both are deliberate:
 *
 * - **A folder shows four documents.** Past four they read as a crowd rather
 *   than a stack. The key at the corner opens the folder's full contents, so
 *   nothing is ever hidden behind the preview.
 * - **An empty NN shows no folders and says so.** Inventing "Invoices" and
 *   "Moodboard" would be a lie about what the founder has.
 */

interface Folder {
  name: string;
  documents: readonly { id: string; title: string; meta: string }[];
}

const MAX_PREVIEW = 4;

function describeFault(fault: RecordFault): string {
  return fault.kind === "signed-out"
    ? "Sign in to see your documents."
    : fault.message;
}

/** Bytes as a person reads them. */
function size(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function NNFiles() {
  const cardWidth = useFolderWidth();
  const documents = useRecords("documents", { limit: 200 });
  const writer = useRecordWriter();
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const folders = useMemo<Folder[]>(() => {
    const byName = new Map<string, Folder["documents"][number][]>();
    for (const record of documents.items) {
      const folder =
        typeof record.folder === "string" && record.folder.trim()
          ? record.folder.trim()
          : "Unfiled";
      const title =
        typeof record.title === "string" && record.title.trim()
          ? record.title.trim()
          : typeof record.name === "string" && record.name.trim()
            ? record.name.trim()
            : "Untitled";
      const kind = typeof record.kind === "string" ? record.kind.toUpperCase() : "";
      const bytes = typeof record.bytes === "number" ? size(record.bytes) : "";
      const meta = [kind, bytes].filter(Boolean).join(" · ") || "Document";

      const list = byName.get(folder) ?? [];
      list.push({ id: record.id, title, meta });
      byName.set(folder, list);
    }
    return [...byName.entries()]
      .map(([name, items]) => ({ name, documents: items }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [documents.items]);

  const addTo = useCallback(
    async (folder: string) => {
      if (!writer.ready || busy) return;
      setBusy(true);
      setProblem(null);
      try {
        await writer.create("documents", {
          title: "Untitled document",
          folder,
          kind: "note",
        });
      } catch (error) {
        // The write either happened or it did not. Saying "added" when
        // Firestore refused would be the one thing NN must never do.
        setProblem(
          error instanceof Error
            ? `Not added. ${error.message}`
            : "Not added. NN could not write that document.",
        );
      } finally {
        setBusy(false);
      }
    },
    [writer, busy],
  );

  return (
    <div className={styles.root}>
      <header className={styles.head}>
        <div>
          <p className={styles.kicker}>Creation &amp; record</p>
          <h1>Files</h1>
          <p className={styles.line}>
            Your documents, held in folders. Everything here is private to you
            and read straight from your own records.
          </p>
        </div>
        <p className={styles.total}>
          {documents.fault || documents.loading
            ? "—"
            : `${documents.items.length} ${documents.items.length === 1 ? "document" : "documents"}`}
        </p>
      </header>

      {problem ? (
        <p className={styles.problem} role="alert">
          <Icon name="shield" size={15} />
          {problem}
        </p>
      ) : null}

      {documents.fault ? (
        <p className={styles.fault} role="status">
          <Icon name="shield" size={15} />
          {describeFault(documents.fault)}
        </p>
      ) : documents.loading ? (
        <p className={styles.quiet}>Reading your documents…</p>
      ) : folders.length === 0 ? (
        <div className={styles.blank}>
          <Icon name="folder" size={28} />
          <h2>No documents yet</h2>
          <p>
            When you add a document it appears here, in the folder you file it
            under. NN does not create folders you did not ask for.
          </p>
          <button
            type="button"
            onClick={() => void addTo("Unfiled")}
            disabled={!writer.ready || busy}
          >
            {busy ? "Adding…" : "Add your first document"}
          </button>
          {!writer.ready ? (
            <span className={styles.quiet}>
              Sign in to add documents.
            </span>
          ) : null}
        </div>
      ) : (
        <div className={styles.grid}>
          {folders.map((folder, index) => {
            // The newest documents sit nearest the glass.
            const preview = folder.documents.slice(-MAX_PREVIEW);
            const sheets: FolderSheet[] = preview.map((document) => ({
              name: document.title,
              meta: document.meta,
              icon: "file",
            }));

            return (
              <FolderCard
                key={folder.name}
                label={folder.name}
                meta={`${folder.documents.length} ${folder.documents.length === 1 ? "document" : "documents"}`}
                sheets={sheets}
                width={cardWidth}
                appearDelay={index * 90}
                open={open === folder.name}
                onOpenChange={(next) => setOpen(next ? folder.name : null)}
                actionLabel={`Add a document to ${folder.name}`}
                onAction={() => void addTo(folder.name)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NNFiles;
