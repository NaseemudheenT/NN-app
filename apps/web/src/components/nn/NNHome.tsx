"use client";

import { RequireOwner } from "@/components/auth/RequireOwner";
import { NNAppLauncher } from "@/components/nn/NNAppLauncher";
import { NNDashboard } from "@/components/nn/NNDashboard";

function HomeSurface() {
  return <RequireOwner><NNDashboard /></RequireOwner>;
}

export function NNHomePreview() {
  return <NNAppLauncher />;
}

export default function NNHome() {
  return <HomeSurface />;
}
