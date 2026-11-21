"use client";

import { usePathname } from "next/navigation";
import { CommandPalette } from "@/components/nn/CommandPalette";
import { NNPanel } from "@/components/nn/NNPanel";
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
   * It hides on REN's own surfaces, where the mark has moved into the header.
   * Home is now an application launcher rather than a dashboard with REN in
   * its navigation, so the assistant launcher remains available there too.
   */
  const carried = pathname === "/" || pathname === "/sign-in"
    || pathname.startsWith("/ren");

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
      {/*
       * The palette's twin, for a thumb.
       *
       * Mounted here rather than per-surface, which is the whole point: the
       * dashboard, the workspace and every application surface carried
       * three *different* navigations, so they could not match however
       * carefully each was styled. One panel, mounted once, and they match
       * by construction.
       *
       * Hidden behind the same door as the palette: nothing past it is
       * reachable until the founder is signed in.
       */}
      {door ? null : <NNPanel />}
      {carried ? null : <RenLauncher />}
    </>
  );
}
