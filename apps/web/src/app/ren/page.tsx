import type { Metadata } from "next";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { RenWorkspace } from "@/components/ren/RenWorkspace";

export const metadata: Metadata = {
  title: "REN",
  description: "The intelligence inside NN.",
};

/**
 * REN's own screen.
 *
 * Behind the owner guard like everything else: REN can read and write the
 * founder's records, so reaching it must cost exactly what reaching them
 * costs.
 */
export default function RenPage() {
  return (
    <RequireOwner>
      <RenWorkspace />
    </RequireOwner>
  );
}
