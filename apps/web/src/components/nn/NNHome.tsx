"use client";

import { RequireOwner } from "@/components/auth/RequireOwner";
import { NNAppLauncher } from "@/components/nn/NNAppLauncher";
import { useAuth } from "@/lib/auth";
import { ownerFirstName } from "@/lib/nn/owner";

/** The private front door to NN: application discovery, not an analytics dashboard. */
function HomeSurface() {
  const { user } = useAuth();
  const firstName = ownerFirstName(user?.displayName);

  return (
    <RequireOwner>
      <NNAppLauncher firstName={firstName} />
    </RequireOwner>
  );
}

/** The design route sees the same honest launcher without a real owner session. */
export function NNHomePreview() {
  return <NNAppLauncher firstName={ownerFirstName(null)} />;
}

export default function NNHome() {
  return <HomeSurface />;
}
