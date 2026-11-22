"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { NNLogo } from "@/components/ui";
import type { Route } from "next";
import { useAuth } from "@/lib/auth";
import { needsSetup } from "@/lib/nn/setup";
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

      /*
       * The first run, on a device that has not had one.
       *
       * Checked here rather than in a layout so it covers every private
       * surface at once — whichever one the founder lands on first is the
       * one that sends them to setup. The setup route is excluded, or it
       * would redirect to itself forever.
       */
      if (needsSetup() && !window.location.pathname.startsWith("/setup")) {
        router.replace("/setup" as Route);
      }
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
          <NNLogo size={28} glow decorative />
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
