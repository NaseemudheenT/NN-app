"use client";

import { Button, GlassPanel, NNLockup } from "@/components/ui";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { useAuth } from "@/lib/auth";

/**
 * The private NN workspace.
 *
 * Intentionally minimal: the NN OS experience — workspace, launcher, windows,
 * dock, ORIN — is the next stage. A mock dashboard here would be exactly the
 * placeholder the specification forbids. What this page proves today is that
 * authentication, the session guard and sign-out genuinely work.
 */
export default function WorkspacePage() {
  return (
    <RequireOwner>
      <WorkspaceInner />
    </RequireOwner>
  );
}

function WorkspaceInner() {
  const { user, signOutHere, signOutEverywhere } = useAuth();

  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "var(--space-8)" }}>
      <GlassPanel tier={3} padding="lg" style={{ width: "min(520px, 100%)" }}>
        <NNLockup size={26} />
        <h1 style={{
          marginTop: "var(--space-8)", fontSize: "var(--text-t2-size)",
          fontWeight: "var(--weight-semibold)", letterSpacing: "var(--text-t2-ls)",
        }}>
          You are signed in.
        </h1>
        <p style={{ marginTop: "var(--space-5)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          Authentication, the owner-scoped security rules and session handling are working.
          The NN OS workspace, launcher and ORIN are the next stage.
        </p>
        <p style={{
          marginTop: "var(--space-6)", fontFamily: "var(--font-mono)",
          fontSize: 11, color: "var(--text-muted)", wordBreak: "break-all",
        }}>
          owner uid · {user?.uid ?? "unknown"}
        </p>
        <div style={{ display: "flex", gap: "var(--space-5)", marginTop: "var(--space-9)", flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={() => void signOutHere()}>Sign out</Button>
          <Button variant="danger" onClick={() => void signOutEverywhere()}>
            Sign out on all devices
          </Button>
        </div>
      </GlassPanel>
    </main>
  );
}
