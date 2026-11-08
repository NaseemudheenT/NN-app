import type { Metadata } from "next";
import { NNWorkspace } from "@/components/nn/NNWorkspace";

export const metadata: Metadata = { title: "Workspace preview" };

/**
 * The workspace surface, reviewable without signing in.
 *
 * The real workspace lives behind the owner guard at /workspace. This route
 * renders the same component with the same illustrative sample content so the
 * design can be judged, measured and screenshotted — it reads nothing, writes
 * nothing and is reachable only inside the design system.
 */
export default function WorkspacePreviewPage() {
  return <NNWorkspace />;
}
