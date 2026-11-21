import type { Metadata } from "next";
import NNLife from "@/components/nn/NNLife";

export const metadata: Metadata = { title: "Life" };

export default function LifePage() {
  return <NNLife />;
}
