import type { Metadata } from "next";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { AppShell } from "@/components/nn/AppShell";
import { NNFiles } from "@/components/nn/NNFiles";

export const metadata: Metadata = {
  title: "Files · NN",
  description: "Your documents, held in folders.",
};

/**
 * Files is owner-gated like every surface that reads the founder's records.
 * The folders themselves hold nothing until the rules say who is asking.
 */
export default function FilesPage() {
  return (
    <RequireOwner>
      <AppShell title="Files">
        <NNFiles />
      </AppShell>
    </RequireOwner>
  );
}
