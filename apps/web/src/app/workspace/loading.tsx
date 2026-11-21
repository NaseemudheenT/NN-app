import { GlassPanel, NNLogo } from "@/components/ui";

export default function WorkspaceLoading() {
  return (
    <main aria-busy="true" aria-label="Loading NN workspace" style={{ minHeight: "100svh", padding: "88px 24px 40px 84px" }}>
      <div style={{ width: "min(1120px, 100%)", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28, color: "var(--text-secondary)" }}>
          <NNLogo size={24} decorative />
          <span style={{ fontSize: 12, letterSpacing: ".12em", fontWeight: 700 }}>NN WORKSPACE</span>
        </div>
        <GlassPanel tier={2} padding="lg">
          <div style={{ display: "grid", gap: 18 }}>
            <div style={{ width: 140, height: 10, borderRadius: 99, background: "var(--glass-2-bg)" }} />
            <div style={{ width: "min(360px, 75%)", height: 34, borderRadius: 10, background: "var(--glass-2-bg)" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))", gap: 14, marginTop: 18 }}>
              {[0, 1, 2].map((item) => <div key={item} style={{ minHeight: 142, borderRadius: 18, border: "1px solid var(--border-subtle)", background: "var(--glass-1-bg)" }} />)}
            </div>
            <p style={{ marginTop: 4, color: "var(--text-muted)", fontSize: 12 }}>Preparing your workspace…</p>
          </div>
        </GlassPanel>
      </div>
    </main>
  );
}
