import type { Metadata } from "next";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { AppShell } from "@/components/nn/AppShell";
import { SettingsSurface } from "./SettingsSurface";

export const metadata: Metadata = {
  title: "Settings · NN",
  description: "How NN looks and behaves on this device.",
};

export default function SettingsPage() {
  return (
    <RequireOwner>
      <AppShell title="Settings">
        <SettingsSurface />
      </AppShell>
    </RequireOwner>
  );
}
