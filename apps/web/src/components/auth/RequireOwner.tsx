"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { NNLogo } from "@/components/ui";
import { useAuth } from "@/lib/auth";

const TEMPORARY_GUEST_KEY = "nn.temporary-guest";

/**
 * Keeps unauthenticated visitors out of private NN surfaces unless they
 * explicitly entered the temporary, browser-tab guest preview from sign-in.
 * This is only a UI development bypass. Firebase and server-side data rules
 * continue to require a real authenticated owner.
 */
export function RequireOwner({ children }: { children: ReactNode }) {
  const { phase } = useAuth();
  const router = useRouter();
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    if (phase === "signed-in") {
      window.sessionStorage.removeItem(TEMPORARY_GUEST_KEY);
      setGuestMode(false);
      return;
    }

    const temporaryGuest = window.sessionStorage.getItem(TEMPORARY_GUEST_KEY) === "1";
    if (temporaryGuest) {
      setGuestMode(true);
      return;
    }

    setGuestMode(false);
    if (phase === "signed-out" || phase === "unconfigured") router.replace("/sign-in");
  }, [phase, router]);

  if (phase !== "signed-in" && !guestMode) {
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
