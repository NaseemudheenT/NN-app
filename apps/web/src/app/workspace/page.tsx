"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NNWorkspace } from "@/components/nn/NNWorkspace";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { useAuth } from "@/lib/auth";

const TEMPORARY_GUEST_KEY = "nn.temporary-guest";

/**
 * The NN workspace. Its current records are illustrative sample data; the
 * temporary guest path is a UI preview and does not create an authenticated
 * owner or grant access to protected Firebase data.
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
  const router = useRouter();
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    setGuestMode(window.sessionStorage.getItem(TEMPORARY_GUEST_KEY) === "1");
  }, []);

  const exitSession = () => {
    window.sessionStorage.removeItem(TEMPORARY_GUEST_KEY);
    if (user) void signOutHere();
    else router.replace("/sign-in");
  };

  const exitAllSessions = () => {
    window.sessionStorage.removeItem(TEMPORARY_GUEST_KEY);
    if (user) void signOutEverywhere();
    else router.replace("/sign-in");
  };

  const isGuest = guestMode && user === null;

  return (
    <NNWorkspace
      userName={isGuest ? "Guest Founder" : "Founder"}
      ownerUid={user?.uid}
      footerNote={isGuest
        ? "TEMPORARY GUEST PREVIEW · sample data only; no private account is signed in."
        : undefined}
      onSignOut={exitSession}
      onSignOutEverywhere={exitAllSessions}
    />
  );
}
