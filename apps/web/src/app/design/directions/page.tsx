import type { Metadata } from "next";
import { Directions } from "./Directions";

export const metadata: Metadata = { title: "Design directions" };

export default function DirectionsPage() {
  return <Directions />;
}
