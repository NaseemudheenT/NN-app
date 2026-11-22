import type { Metadata } from "next";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { SetupFlow } from "./SetupFlow";

export const metadata: Metadata = {
  // The root layout appends "· NN" through its title template.
  title: "Set up",
  description: "Setting NN up on this device.",
};

export default function SetupPage() {
  // Behind the owner guard: the first run configures the founder's own
  // environment, and an unauthenticated visitor has none to configure.
  return (
    <RequireOwner>
      <SetupFlow />
    </RequireOwner>
  );
}
