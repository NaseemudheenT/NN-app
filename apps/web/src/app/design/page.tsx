import type { Metadata } from "next";
import { DesignSystem } from "./DesignSystem";

export const metadata: Metadata = {
  title: "Design System",
  description: "The NN design system — tokens, glass material and components.",
};

export default function DesignSystemPage() {
  return <DesignSystem />;
}
