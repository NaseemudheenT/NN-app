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

  /*
   * The launcher is how you reach REN from somewhere else.
   *
   * So it hides on REN's own surfaces — both of them — and on the dashboard,
   * where the navigation already carries REN as one of its four items. A
   * floating orb over a tab bar that holds the same orb is two identities on
   * one screen, and on a phone it lands on the content as well.
   */
  const carried = pathname === "/" || pathname === "/sign-in"
    || pathname === "/home" || pathname.startsWith("/ren");
  if (carried) return null;
  return <RenLauncher />;
}
