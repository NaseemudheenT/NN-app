import type { Metadata } from "next";
import { NNLife } from "@/components/nn/NNLife";
import { RequireOwner } from "@/components/auth/RequireOwner";

export const metadata: Metadata = {
  title: "Life",
  description: "Your private day, tasks and routines in NN.",
};

export default function LifePage() {
  return (
    <RequireOwner>
      <NNLife />
    </RequireOwner>
  );
}
