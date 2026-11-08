import type { Metadata } from "next";
import { GlassPanel, NNLogo } from "@/components/ui";

export const metadata: Metadata = { title: "Offline" };

/** Shown by the service worker when a page is requested with no connection. */
export default function OfflinePage() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "var(--space-8)" }}>
      <GlassPanel tier={3} padding="lg" style={{ width: "min(400px, 100%)", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}><NNLogo size={34} /></div>
        <h1 style={{ marginTop: "var(--space-7)", fontSize: "var(--text-t3-size)", fontWeight: "var(--weight-semibold)" }}>
          No connection
        </h1>
        <p style={{ marginTop: "var(--space-5)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          NN keeps your data on the server, so it needs a connection to show it.
          This page will reload itself when you are back online.
        </p>
      </GlassPanel>
    </main>
  );
}
