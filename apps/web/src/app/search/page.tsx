import type { Metadata } from "next";
import NNSearch from "@/components/nn/NNSearch";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return <NNSearch />;
}
