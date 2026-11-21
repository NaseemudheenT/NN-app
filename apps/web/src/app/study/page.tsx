import type { Metadata } from "next";
import { NNStudy } from "@/components/nn/NNStudy";
import { RequireOwner } from "@/components/auth/RequireOwner";

export const metadata: Metadata = {
  title: "Study",
  description: "Your private subjects and academic workspace in NN.",
};

export default function StudyPage() {
  return (
    <RequireOwner>
      <NNStudy />
    </RequireOwner>
  );
}
