"use client";

import { RequireOwner } from "@/components/auth/RequireOwner";
import { NNDashboard } from "@/components/nn/NNDashboard";
import { useAuth } from "@/lib/auth";
import { ownerFirstName } from "@/lib/nn/owner";

/**
 * Home is NN's dashboard.
 *
 * It used to be a wall of folders. The founder's direction is that folders
 * belong to documents — they are how Files works — and the environment's own
 * front door is the adjustable-glass dashboard: today's state, every
 * application through the lens, the record of what has happened, and the
 * system itself. That is what this now opens on.
 */
function HomeSurface() {
  const { user } = useAuth();
  const firstName = ownerFirstName(user?.displayName);

  // Signing out lives in Settings, with everything else about this session.
  return (
    <RequireOwner>
      <NNDashboard firstName={firstName} />
    </RequireOwner>
  );
}

/**
 * A visual-only surface for the design route.
 *
 * It renders the same dashboard with no session, which is exactly what an
 * unauthenticated visitor would see inside it: every live panel reporting
 * that it cannot read, rather than sample numbers pretending to be the
 * founder's.
 */
export function NNHomePreview() {
  return <NNDashboard firstName={ownerFirstName(null)} />;
}

export default function NNHome() {
  return <HomeSurface />;
}
