"use client";

import { useMemo } from "react";
import { useRecords, type NNRecord } from "@/lib/nn/records";
import type { NNApplication } from "@/lib/apps/registry";
import type { AppSection } from "@/lib/apps/sections";
import { NNAppSurface } from "@/components/nn/NNAppSurface";
import styles from "./NNAcademyWorkspace.module.css";

type Props = { app: NNApplication; sections: readonly AppSection[] };
const title = (r: NNRecord) => {
  for (const key of ["title", "name", "label"]) {
    const value = r[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "Untitled";
};
const dateOf = (value: unknown): Date | null => {
  if (!value) return null;
  const date = value && typeof value === "object" && "toDate" in value
    ? (value as { toDate: () => Date }).toDate()
    : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
};
const studiedLabel = (value: unknown) => {
  const date = dateOf(value);
  return date ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date) : "Study session";
};

export function NNAcademyWorkspace({ app, sections }: Props) {
  const paths = useRecords("academy_paths", { limit: 100 });
  const lessons = useRecords("academy_lessons", { orderBy: "at", direction: "desc", limit: 100 });
  const progress = useMemo(() => {
    const total = paths.items.length;
    const completed = paths.items.filter((path) => path.status === "done").length;
    const active = paths.items.filter((path) => path.status === "in progress").length;
    return { total, completed, active, planned: Math.max(0, total - completed - active) };
  }, [paths.items]);
  const recent = lessons.items.slice(0, 5);
  const jump = () => {
    const node = document.getElementById("academy-record-workspace");
    node?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  };

  return (
    <main className={styles.root}>
      <section className={styles.hero} aria-labelledby="ac...[truncated]