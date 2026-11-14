"use client";

import { NNSettings } from "@/components/nn/NNSettings";
import { useAuth } from "@/lib/auth";

/** Settings needs the session, so the page itself stays a server component. */
export function SettingsSurface() {
  const { user, signOutHere, signOutEverywhere } = useAuth();
  return (
    <NNSettings
      {...(user ? { onSignOut: () => void signOutHere() } : {})}
      {...(user ? { onSignOutEverywhere: () => void signOutEverywhere() } : {})}
    />
  );
}
