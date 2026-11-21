"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc, collection, limit, onSnapshot, orderBy, query, serverTimestamp,
} from "firebase/firestore";
import { Icon } from "@/components/ui/Icon";
import { NNAppIcon } from "@/components/ui/NNAppIcon";
import { firebaseAvailable, getFirebase } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import styles from "./NNStudy.module.css";

interface Subject {
  id: string;
  name: string;
  code?: string;
  semester: number;
  credits?: number | null;
}

type LoadState = "loading" | "ready" | "unconfigured" | "denied" | "error";

export function NNStudy() {
  const { user } = useAuth();
  const uid = user?.uid;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [semester, setSemester] = useState("1");
  const [semesterFilter, setSemesterFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!uid) return;
    if (!firebaseAvailable()) {
      setLoadState("unconfigured");
      return;
    }

    let unsubscribe: (() => void) | undefined;
    try {
      const { db } = getFirebase();
      const subjectsRef = collection(db, "users", uid, "subjects");
      const subjectsQuery = query(subjectsRef, orderBy("updatedAt", "desc"), limit(40));
      unsubscribe = onSnapshot(
        subjectsQuery,
        (snapshot) => {
          setSubjects(snapshot.docs.map((item) => ({
            id: item.id,
            ...(item.data() as Omit<Subject, "id">),
          })));
          setLoadState("ready");
          setError("");
        },
        (reason) => {
          setLoadState(reason.code === "permission-denied" ? "denied" : "error");
          setError(reason.code === "permission-denied"
            ? "NN could not access your private subject records."
            : "Subjects could not be loaded. Check your connection and try again.");
        },
      );
    } catch {
      setLoadState("unconfigured");
      setError("NN's data connection is not configured.");
    }
    return () => unsubscribe?.();
  }, [uid, retryKey]);

  const filteredSubjects = useMemo(() => {
    const term = search.trim().toLowerCase();
    return subjects.filter((subject) => {
      const matchesSemester = semesterFilter === "all" || String(subject.semester) === semesterFilter;
      const matchesSearch = !term || `${subject.name} ${subject.code ?? ""}`.toLowerCase().includes(term);
      return matchesSemester && matchesSearch;
    });
  }, [subjects, semesterFilter, search]);

  async function createSubject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase();
    const semesterNumber = Number(semester);
    if (!uid || !cleanName || saving || !Number.isInteger(semesterNumber) || semesterNumber < 1 || semesterNumber > 12) return;

    setSaving(true);
    setError("");
    try {
      const { db } = getFirebase();
      await addDoc(collection(db, "users", uid, "subjects"), {
        name: cleanName,
        code: cleanCode,
        semester: semesterNumber,
        credits: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        schemaVersion: 1,
      });
      setName("");
      setCode("");
    } catch {
      setError("The subject could not be saved. Nothing was added.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.wrap}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <NNAppIcon appId="college" icon="book" size={42} label="Study" />
            <div>
              <p className={styles.eyebrow}>NN APPLICATION</p>
              <p className={styles.brandName}>Study</p>
            </div>
          </div>
          <div className={styles.headerMeta}>PRIVATE LEARNING SPACE</div>
        </header>

        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>YOUR ACADEMIC WORKSPACE</p>
            <h1>Make learning clear.</h1>
            <p className={styles.lede}>Your subjects and study material, organised in one focused place.</p>
          </div>
          <div className={styles.subjectCount}>
            <strong>{subjects.length}</strong>
            <span>SUBJECTS</span>
          </div>
        </section>

        <div className={styles.layout}>
          <section className={styles.mainPanel}>
            <div className={styles.panelHead}>
              <div>
                <p className={styles.eyebrow}>YOUR LIBRARY</p>
                <h2>Subjects</h2>
              </div>
              <span className={styles.count}>{subjects.length} / 40</span>
            </div>

            <div className={styles.filters}>
              <label className={styles.search}>
                <Icon name="search" size={15} />
                <span className={styles.srOnly}>Search subjects</span>
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search subjects or codes" />
              </label>
              <label className={styles.filterLabel}>
                <span className={styles.srOnly}>Filter by semester</span>
                <select value={semesterFilter} onChange={(event) => setSemesterFilter(event.target.value)}>
                  <option value="all">All semesters</option>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map((number) => (
                    <option value={String(number)} key={number}>Semester {number}</option>
                  ))}
                </select>
              </label>
            </div>

            {error ? <p className={styles.error} role="alert">{error}</p> : null}

            {loadState === "loading" ? (
              <div className={styles.loading} aria-busy="true">
                <span /><span /><span />
                <p>Loading your subjects…</p>
              </div>
            ) : loadState === "unconfigured" || loadState === "denied" || loadState === "error" ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}><Icon name="shield" size={22} /></span>
                <h3>{loadState === "denied" ? "Access needs attention" : loadState === "unconfigured" ? "Data connection unavailable" : "Could not load subjects"}</h3>
                <p>{error || "NN could not connect to your private study records."}</p>
                {loadState === "error" ? (
                  <button type="button" className={styles.retry} onClick={() => { setLoadState("loading"); setError(""); setRetryKey((value) => value + 1); }}>Try again</button>
                ) : null}
              </div>
            ) : filteredSubjects.length === 0 ? (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}><Icon name="book" size={22} /></span>
                <h3>{subjects.length === 0 ? "Your study space is ready." : "No matching subjects."}</h3>
                <p>{subjects.length === 0 ? "Add your first subject to begin organising your semester." : "Try another search or semester filter."}</p>
              </div>
            ) : (
              <div className={styles.subjectGrid}>
                {filteredSubjects.map((subject) => (
                  <article className={styles.subjectCard} key={subject.id}>
                    <div className={styles.subjectTop}>
                      <span className={styles.subjectIcon}><Icon name="book" size={18} /></span>
                      <span className={styles.semesterTag}>SEM {subject.semester}</span>
                    </div>
                    <h3>{subject.name}</h3>
                    <p>{subject.code || "No subject code"}</p>
                    {subject.credits ? <span className={styles.credits}>{subject.credits} credits</span> : null}
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className={styles.side}>
            <section className={styles.sidePanel}>
              <p className={styles.eyebrow}>ADD TO YOUR LIBRARY</p>
              <h2>New subject</h2>
              <form className={styles.form} onSubmit={(event) => void createSubject(event)}>
                <label>
                  <span>Subject name</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Engineering Mathematics" maxLength={100} required />
                </label>
                <label>
                  <span>Subject code <small>Optional</small></span>
                  <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="e.g. MA101" maxLength={24} />
                </label>
                <label>
                  <span>Semester</span>
                  <select value={semester} onChange={(event) => setSemester(event.target.value)}>
                    {Array.from({ length: 12 }, (_, index) => index + 1).map((number) => (
                      <option value={String(number)} key={number}>Semester {number}</option>
                    ))}
                  </select>
                </label>
                <button type="submit" disabled={saving || !name.trim()}>
                  <Icon name={saving ? "clock" : "plus"} size={15} />
                  {saving ? "Saving" : "Add subject"}
                </button>
              </form>
            </section>

            <section className={styles.sidePanel}>
              <p className={styles.eyebrow}>STUDY MODULES</p>
              <h2>More than a subject list.</h2>
              <div className={styles.moduleList}>
                {["Syllabus & units", "Question banks", "Assignments", "Timetable", "Attendance", "Marks & analytics", "Revision plans"].map((item) => (
                  <div className={styles.moduleRow} key={item}>
                    <span>{item}</span><span>In development</span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
