import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { applicationsInFamily, familyBySlug, GROUPS } from "@/lib/apps/registry";
import { NNFamilyView } from "@/components/nn/NNFamilyView";

type PageProps = { params: Promise<{ slug: string }> };

/** The six families are fixed, so every one of these pages is built ahead. */
export function generateStaticParams() {
  return GROUPS.map((family) => ({ slug: family.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const family = familyBySlug(slug);
  return { title: family ? family.name : "Family" };
}

export default async function FamilyPage({ params }: PageProps) {
  const { slug } = await params;
  const family = familyBySlug(slug);
  if (!family) notFound();
  return <NNFamilyView family={family} applications={applicationsInFamily(family.name)} />;
}
