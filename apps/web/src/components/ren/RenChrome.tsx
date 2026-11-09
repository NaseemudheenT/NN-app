"use client";

import { usePathname } from "next/navigation";
import { RenLauncher } from "./RenLauncher";
import { RenPanel } from "./RenPanel";

/** REN is intentionally absent from the cinematic entry and authentication door. */
export function RenChrome() {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/sign-in") return null;
  return (
    <>
      <RenLauncher />
      <RenPanel />
    </>
  );
}
