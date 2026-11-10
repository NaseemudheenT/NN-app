import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { APPLICATIONS, getApplication } from "@/lib/apps/registry";
import { NNAppPreview } from "@/components/nn/NNAppPreview";

type PageProps = { params: Promise<{ appId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { appId } = await params;
  const app = getApplication(appId);
  return { title: app ? app.name : "Application" };
}

export default async function ApplicationOverviewPage({ params }: PageProps) {
  const { appId } = await params;
  const app = getApplication(appId);
  if (!app) notFound();
  if (app.availability === "available" && app.href) redirect(app.href);
  const related = APPLICATIONS.filter((candidate) => candidate.group === app.group && candidate.id !== app.id).slice(0, 3);
  return <NNAppPreview app={app} related={related} />;
}
