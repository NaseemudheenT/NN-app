"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { RenLauncher } from "./RenLauncher";

/**
 * Where REN appears, and where it deliberately does not.
 *
 * Absent from the cinematic entry and the authentication door, because
 * neither is NN yet — and absent from REN's own screen, where the mark has
 * moved into the header. One identity on screen, never two.
 */
export function RenChrome() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        router.push("/ren");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [router]);

  // The launcher is how you reach REN from somewhere else, so it hides on
  // REN's own surfaces — both of them. One identity on screen, never two.
  if (pathname === "/" || pathname === "/sign-in" || pathname.startsWith("/ren")) return null;
  return <RenLauncher />;
}
