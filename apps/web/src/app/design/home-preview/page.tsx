import { notFound } from "next/navigation";
import { NNHomePreview } from "@/components/nn/NNHome";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Home visual preview" };

/** Preview-only visual route. Never expose this unguarded surface in production. */
export default function HomeVisualPreviewPage() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return <NNHomePreview />;
}
