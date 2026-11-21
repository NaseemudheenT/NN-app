"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { RenMark } from "@/components/ui/RenMark";
import { NNLogo } from "@/components/ui/NNLogo";
import { currentDestination, destinations, type Destination } from "@/lib/nn/destinations";
import { getApplication, GROUPS } from "@/lib/apps/registry";
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
 * The island stays at the top on every viewport, with the panel expanding
 * beneath it. This gives the operating environment one stable navigation anchor.
 */

const ALL_DESTINATIONS = destinations();
const NN_PLACES = ALL_DESTINATIONS.filter((destination) => destination.route !== undefined && destination.group === "NN");
const APP_DESTINATIONS = ALL_DESTINATIONS.filter((destination) => destination.route !== undefined && destination.group === "Applications");

export function NNPanel() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const hostRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const islandRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const here = currentDestination(pathname);
  const places = NN_PLACES;
  const apps = APP_DESTINATIONS;
  const needle = query.trim().toLowerCase();
  const visiblePlaces = useMemo(
    () => places.filter((destination) => !needle || (destination.label + " " + destination.hint).toLowerCase().includes(needle)),
    [needle],
  );
  const visibleGroups = useMemo(() => GROUPS.map((group) => ({
    ...group,
    destinations: apps.filter((destination) => {
      const app = getApplication(destination.id.slice(4));
      return app?.group === group.name
        && (!needle || (destination.label + " " + destination.hint + " " + group.label).toLowerCase().includes(needle));
    }),
  })).filter((group) => group.destinations.length > 0), [apps, needle]);

  /*
   * The island and its expanded panel stay mounted as two visual states of
   * one control. Focus moves into the panel when it opens and returns to the
   * island after an explicit close; outside clicks leave focus with the
   * control the user deliberately chose.
   */
  const restoring = useRef(false);

  const close = useCallback(() => {
    restoring.current = true;
    setQuery("");
    setOpen(false);
  }, []);

  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
      return;
    }
    if (!restoring.current) return;
    restoring.current = false;
    islandRef.current?.focus();
  }, [open]);

  const containPanelFocus = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const controls = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!controls?.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }, []);

  const go = useCallback((destination: Destination) => {
    if (destination.route === undefined) return;
    close();
    router.push(destination.route);
  }, [close, router]);

  /* Escape, and a press anywhere else, both close it. */
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
    };
    const onDown = (event: PointerEvent) => {
      if (!hostRef.current?.contains(event.target as Node)) { setQuery(""); setOpen(false); }
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
      <button
        ref={islandRef}
        type="button"
        className={s.island}
        aria-label={`Go to — currently ${here?.label ?? "NN"}`}
        aria-expanded={open}
        aria-hidden={open}
        tabIndex={open ? -1 : 0}
        onClick={() => setOpen(true)}
      >
        <span className={s.islandBrand} aria-hidden="true">
          <NNLogo size={18} glow decorative />
        </span>
        <span className={s.islandLabel}>{here?.label ?? "NN"}</span>
        <span className={s.islandSignal} aria-hidden="true" />
      </button>

      <div
        ref={panelRef}
        onKeyDown={containPanelFocus}
        className={s.panel}
        data-open={open || undefined}
        role="dialog"
        aria-modal="false"
        aria-label="Go to"
        aria-hidden={!open}
        inert={!open}
      >
        <div className={s.head}>
          <span className={s.headMark}><NNLogo size={18} glow decorative /></span>
          <span className={s.headName}>{here?.label ?? "NN"}</span>
          <span className={s.headStatus}>NN SYSTEM</span>
          <button ref={closeRef} type="button" className={s.close} aria-label="Close" onClick={close}>
            <Icon name="close" size={15} />
          </button>
        </div>
        <label className={s.filter}>
          <Icon name="search" size={16} />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query) {
                event.preventDefault();
                event.stopPropagation();
                setQuery("");
              }
            }}
            placeholder="Find an app or destination"
            aria-label="Search destinations"
            autoComplete="off"
            spellCheck={false}
          />
          {query ? (
            <button type="button" className={s.clear} aria-label="Clear destination search" onClick={() => setQuery("")}>
              <Icon name="close" size={14} />
            </button>
          ) : null}
        </label>
        <p className={s.resultCount} role="status">
          {resultCount} {resultCount === 1 ? "destination" : "destinations"}
        </p>
        <ul className={s.list}>
          {visiblePlaces.map(row)}
          {visibleGroups.map((group) => (
            <li key={group.slug}>
              <div className={s.group}>{group.label}</div>
              <ul className={s.groupList}>{group.destinations.map(row)}</ul>
            </li>
          ))}
          {visiblePlaces.length === 0 && visibleGroups.length === 0 ? (
            <li className={s.noResults} role="status">No destinations found</li>
          ) : null}
        </ul>
        <div className={s.panelFoot}>
          <span>PRIVATE ENVIRONMENT</span>
          <span className={s.panelFootDot} />
          <span>NAVIGATION</span>
        </div>
      </div>
    </div>
  );
}

export default NNPanel;
