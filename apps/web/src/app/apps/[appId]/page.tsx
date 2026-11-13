import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getApplication } from "@/lib/apps/registry";
import { APP_SECTIONS } from "@/lib/apps/sections";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { AppShell } from "@/components/nn/AppShell";
import { NNAppSurface } from "@/components/nn/NNAppSurface";

type PageProps = { params: Promise<{ appId: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { appId } = await params;
  const app = getApplication(appId);
  return { title: app ? `${app.name} · NN` : "Application" };
}

/**
 * An application.
 *
 * Applications with a surface of their own — Life, Files, Search — are sent
 * there. Every other one works right here, on the shared surface, against its
 * own collections.
 *
 * There used to be a third branch: a design preview, for applications that
 * did not exist. They all exist now, so it is gone. A registry test keeps it
 * that way, because an application nobody can open is worse than no entry.
 */
export default async function ApplicationPage({ params }: PageProps) {
  const { appId } = await params;
  const app = getApplication(appId);
  if (!app) notFound();

  // Only ever a *different* route. An application whose href is this page
  // would redirect to itself for as long as the browser allowed.
  if (app.href && app.href !== app.overviewHref) redirect(app.href);

  const sections = APP_SECTIONS[app.id];
  if (!sections || sections.length === 0) notFound();

  return (
    <RequireOwner>
      <AppShell title={app.name} subtitle={app.description}>
        <NNAppSurface app={app} sections={sections} />
      </AppShell>
    </RequireOwner>
  );
}
