"use client";

import { usePathname } from "next/navigation";
import { CommandPalette } from "@/components/nn/CommandPalette";
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

  /*
   * The palette is everywhere the launcher is not — and everywhere it is.
   * ⌘K used to jump straight to REN; it opens the palette now, and REN has
   * its own key. A command surface that only does one thing is a button
   * with a keyboard shortcut.
   *
   * The sign-in door is the exception: nothing behind it is reachable yet.
   */
  const door = pathname === "/" || pathname === "/sign-in";

  return (
    <>
      {door ? null : <CommandPalette />}
      {carried ? null : <RenLauncher />}
    </>
  );
}
