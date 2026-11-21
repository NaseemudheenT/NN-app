"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { RenMark } from "@/components/ui/RenMark";
import { NNLogo } from "@/components/ui/NNLogo";
import { currentDestination, destinations, type Destination } from "@/lib/nn/destinations";
import s from "./NNPanel.module.css";

/**
 * The way to anywhere, without a keyboard.
 *
 * NN could already jump to any destination instantly — with ⌘K. The founder
 * uses a phone, which has no ⌘ and no K, so the fastest route through their
 * own environment was one they could not take. Everything else was
 * per-screen navigation: the dashboard switched its own views, the workspace
 * switched its own, and getting from one to the other meant going back
 * through a hub.
 *
 * This is ⌘K's twin for a thumb. It sits as a small island against the edge,
 * and opens into a scrollable list of everywhere NN can go.
 *
 * Why it reads as one object rather than two:
 *
 * - The panel **grows out of the island** rather than fading in over it. A
 *   fade is a different object arriving; a grow is the same object changing
 *   shape, and that is the whole of what makes this kind of control feel
 *   physical.
 * - It is **one list, from one source** — the same `destinations()` the
 *   command palette reads — so the thumb and the keyboard can always reach
 *   exactly the same places.
 * - It offers **only what exists**. A destination with no route is not
 *   listed; NN does not open a screen that is not there.
 *
 * On a phone it moves to the bottom, because the left edge is precisely
 * where a thumb cannot reach, and opens upward into the same arc.
 */

export function NNPanel() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const hostRef = useRef<HTMLDivElement>(null);
  const islandRef = useRef<HTMLButtonElement>(null);

  const here = currentDestination(pathname);
  const places = destinations().filter((d) => d.route !== undefined && d.group === "NN");
  const apps = destinations().filter((d) => d.route !== undefined && d.group === "Applications");

  /*
   * Focus has to go back to the island, and the island does not exist yet.
   *
   * The panel replaces it rather than covering it, so at the moment `close`
   * runs there is nothing to focus — the ref still points at an element
   * React has already unmounted. Calling `.focus()` there does nothing
   * silently, and a keyboard user is left with focus on the document body
   * with no way back. The restore has to wait for the next render.
   */
  const restoring = useRef(false);

  const close = useCallback(() => {
    restoring.current = true;
    setOpen(false);
  }, []);

  useEffect(() => {
    if (open || !restoring.current) return;
    restoring.current = false;
    islandRef.current?.focus();
  }, [open]);

  const go = useCallback((destination: Destination) => {
    if (destination.route === undefined) return;
    setOpen(false);
    router.push(destination.route);
  }, [router]);

  /* Escape, and a press anywhere else, both close it. */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
    };
    const onDown = (event: PointerEvent) => {
      if (!hostRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close]);

  const row = (destination: Destination) => (
    <li key={destination.id}>
      <button
        type="button"
        className={s.item}
        aria-current={here?.id === destination.id ? "page" : undefined}
        onClick={() => go(destination)}
      >
        {destination.mark === "ren"
          ? <RenMark size={21} />
          : <Icon name={destination.icon} size={21} />}
        <span className={s.itemBody}>
          <span className={s.itemName}>{destination.label}</span>
          <span className={s.itemHint}>{destination.hint}</span>
        </span>
      </button>
    </li>
  );

  return (
    <div className={s.host} ref={hostRef}>
      {open ? (
        <div className={s.panel} role="dialog" aria-modal="false" aria-label="Go to">
          <div className={s.head}>
            <span className={s.headName}>{here?.label ?? "NN"}</span>
            <button type="button" className={s.close} aria-label="Close" onClick={close}>
              <Icon name="expand" size={15} />
            </button>
          </div>
          <ul className={s.list}>
            {places.map(row)}
            {apps.length > 0 ? (
              <li className={s.group} aria-hidden="true">Applications</li>
            ) : null}
            {apps.map(row)}
          </ul>
        </div>
      ) : (
        <button
          ref={islandRef}
          type="button"
          className={s.island}
          aria-label={`Go to — currently ${here?.label ?? "NN"}`}
          aria-expanded={false}
          onClick={() => setOpen(true)}
        >
          <span className={s.islandBrand} aria-hidden="true">
            <NNLogo size={18} glow decorative />
          </span>
          <span className={s.islandLabel}>{here?.label ?? "NN"}</span>
        </button>
      )}
    </div>
  );
}

export default NNPanel;
