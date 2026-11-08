"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { NNLogo } from "@/components/ui";
import { useAuth } from "@/lib/auth";

/**
 * Keeps unauthenticated visitors out of private NN surfaces.
 *
 * This is a usability guard, not the security boundary. The real boundary is
 * the Firestore and Storage rules: even if this component were bypassed
 * entirely, every read and write would still be refused by the server.
 */
export function RequireOwner({ children }: { children: ReactNode }) {
  const { phase } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (phase === "signed-out" || phase === "unconfigured") router.replace("/sign-in");
  }, [phase, router]);

  if (phase !== "signed-in") {
    return (
      <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
          <NNLogo size={28} decorative />
          <p style={{ marginTop: "var(--space-6)", fontSize: "var(--text-caption-size)" }}>
            {phase === "loading" ? "Opening NN…" : "Redirecting to sign in…"}
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
