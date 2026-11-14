"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { NNLogo } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { inPreview, leavePreview } from "@/lib/preview";
import { PreviewBanner } from "./PreviewBanner";

/**
 * Keeps visitors out of NN's private surfaces.
 *
 * The one way past it is the preview door, entered deliberately from the
 * sign-in page and alive for a single browser tab. It grants nothing: no
 * session, no token, and the Firestore rules still require a real owner, so
 * every panel behind it reports honestly that it could not read. What it
 * opens is the environment, not anyone's records.
 *
 * Surfaces reached that way carry a banner that cannot be dismissed, because
 * a preview mistaken for the real thing is worse than no preview.
 */
export function RequireOwner({ children }: { children: ReactNode }) {
  const { phase } = useAuth();
  const router = useRouter();
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    if (phase === "signed-in") {
      // A real session supersedes the preview, and clearing it here means the
      // banner cannot linger over a surface that is genuinely the founder's.
      leavePreview();
      setGuestMode(false);
      return;
    }

    if (inPreview()) {
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
  return (
    <>
      {guestMode ? <PreviewBanner /> : null}
      {children}
    </>
  );
}
