import type { Metadata } from "next";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { RenConsole } from "@/components/ren/RenConsole";

export const metadata: Metadata = {
  title: "REN",
  description: "The intelligence inside NN.",
};

/**
 * REN's own screen — the operating environment, not a chat.
 *
 * The founder's brief is explicit: opening REN must not open a conversation
 * window. A chat is where you compose a message; this is where you speak to
 * an assistant and watch it work. The conversation workspace still exists and
 * is still the same REN — it is one deliberate press away, at `/ren/chat`.
 *
 * Behind the owner guard like everything else: REN can read and write the
 * founder's records, so reaching it must cost exactly what reaching them
 * costs.
 */
export default function RenPage() {
  return (
    <RequireOwner>
      <RenConsole />
    </RequireOwner>
  );
}
