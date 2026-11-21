import type { Metadata } from "next";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { RenWorkspace } from "@/components/ren/RenWorkspace";

export const metadata: Metadata = {
  title: "REN — Chat",
  description: "A conversation with REN.",
};

/**
 * REN Chat — the conversation workspace.
 *
 * Experience B in the founder's brief, and deliberately not what opening REN
 * gives you. Text, attachments, history and transcripts belong here; the
 * full-screen console at `/ren` is where REN is spoken to and watched.
 *
 * The same intelligence, identity, memory, permissions and task engine sit
 * under both. They are two interfaces to one assistant, not two assistants.
 */
export default async function RenChatPage({ searchParams }: { searchParams: Promise<{ workspace?: string; handoff?: string }> }) {
  const { workspace, handoff } = await searchParams;
  return (
    <RequireOwner>
      <RenWorkspace workspaceId={workspace} handoffId={handoff} />
    </RequireOwner>
  );
}
