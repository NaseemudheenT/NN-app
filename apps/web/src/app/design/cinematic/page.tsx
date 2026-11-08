import type { Metadata } from "next";
import { CinematicShowcase } from "./CinematicShowcase";

export const metadata: Metadata = { title: "Cinematic system" };

export default function CinematicPage() {
  return <CinematicShowcase />;
}
