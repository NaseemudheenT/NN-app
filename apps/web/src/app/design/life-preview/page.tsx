import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NNLifePreview } from "@/components/nn/NNLife";

export const metadata: Metadata = { title: "Life visual preview" };

/** Unauthenticated, data-free preview. Never exposed on production. */
export default function LifeVisualPreviewPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <NNLifePreview />;
}
