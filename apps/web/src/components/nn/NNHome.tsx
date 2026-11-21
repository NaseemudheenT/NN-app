"use client";

import { RequireOwner } from "@/components/auth/RequireOwner";
import { NNAppLauncher } from "@/components/nn/NNAppLauncher";

function HomeSurface() {
  return <RequireOwner><NNAppLauncher /></RequireOwner>;
}

export function NNHomePreview() {
  return <NNAppLauncher />;
}

export default function NNHome() {
  return <HomeSurface />;
}
