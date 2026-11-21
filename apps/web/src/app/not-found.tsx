import { GlassPanel, LiquidButton, NNLogo } from "@/components/ui";

export default function NotFound() {
  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "max(28px, env(safe-area-inset-top)) 24px max(28px, env(safe-area-inset-bottom))" }}>
      <GlassPanel tier={3} padding="lg" style={{ width: "min(440px, 100%)", textAlign: "center" }}>
        <div style={{ display: "grid", placeItems: "center" }}><NNLogo size={38} decorative /></div>
        <p style={{ marginTop: 28, color: "var(--text-muted)", fontSize: 11, letterSpacing: ".16em", fontWeight: 700 }}>NN · 404</p>
        <h1 style={{ marginTop: 12, fontSize: "clamp(28px, 6vw, 38px)", letterSpacing: "-.04em", fontWeight: 600 }}>This space is not here.</h1>
        <p style={{ margin: "14px auto 26px", maxWidth: 300, color: "var(--text-secondary)", lineHeight: 1.65 }}>The address may have changed, or the page may not exist. Return to your NN entrance and continue from there.</p>
        <LiquidButton href="/" size="lg" variant="accent">Return to NN</LiquidButton>
      </GlassPanel>
    </main>
  );
}
