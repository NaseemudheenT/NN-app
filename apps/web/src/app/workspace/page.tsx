"use client";

import { NNWorkspace } from "@/components/nn/NNWorkspace";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { useAuth } from "@/lib/auth";

/**
 * The private NN workspace.
 *
 * The surface, the material controls, the navigation, the charts and the
 * launcher are real and interactive. Its contents are illustrative sample data
 * and labelled as such in the footer — what this page proves today is that the
 * environment, the session guard and the glass all genuinely work together.
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
    <NNWorkspace
      ownerUid={user?.uid}
      onSignOut={() => void signOutHere()}
      onSignOutEverywhere={() => void signOutEverywhere()}
    />
  );
}
