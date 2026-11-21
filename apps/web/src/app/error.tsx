"use client";

import { useEffect } from "react";
import { Button, GlassPanel, LiquidButton, NNLogo } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Keep the error boundary useful without exposing internal details in the UI.
  }, []);

  return (
    <main style={{ minHeight: "100svh", display: "grid", placeItems: "center", padding: "max(28px, env(safe-area-inset-top)) 24px max(28px, env(safe-area-inset-bottom))" }}>
      <GlassPanel tier={3} padding="lg" style={{ width: "min(440px, 100%)", textAlign: "center" }}>
        <div style={{ display: "grid", placeItems: "center" }}><NNLogo size={38} decorative /></div>
        <p style={{ marginTop: 28, color: "var(--text-muted)", fontSize: 11, letterSpacing: ".16em", fontWeight: 700 }}>NN · RECOVERY</p>
        <h1 style={{ marginTop: 12, fontSize: "clamp(28px, 6vw, 38px)", letterSpacing: "-.04em", fontWeight: 600 }}>A momentary interruption.</h1>
        <p style={{ margin: "14px auto 26px", maxWidth: 310, color: "var(--text-secondary)", lineHeight: 1.65 }}>This part of NN could not finish loading. You can safely try again or return to the entrance.</p>
        <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 10 }}>
          <Button variant="secondary" size="lg" onClick={reset}>Try again</Button>
          <LiquidButton href="/" size="lg" variant="accent">Return to NN</LiquidButton>
        </div>
      </GlassPanel>
    </main>
  );
}
