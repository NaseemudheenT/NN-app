"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppTransition } from "@/components/nn/AppTransition";
import type { Route } from "next";
import { Icon, type IconName } from "@/components/ui/Icon";
import { destinations } from "@/lib/nn/destinations";
import styles from "./CommandPalette.module.css";

/**
 * Everything in NN, one keystroke away.
 *
 * An operating environment is judged on how fast you can get somewhere, and
 * thirty-four applications behind a carousel is not fast. ⌘K opens this,
 * typing narrows it, the arrows move, Enter goes. It never leaves the
 * keyboard, which is the whole point of it existing.
 *
 * Three things keep it honest:
 *
 * - **It only offers what works.** An application with no route is listed as
 *   planned and cannot be chosen. NN does not open a screen that is not
 *   there — the registry's `href` is typed as a `Route`, so naming a page
 *   that does not exist fails the build rather than the founder's press.
 * - **It matches what you meant, not what you typed.** "fin" finds Finance,
 *   "cal" finds Life's calendar, and an exact name outranks a fuzzy hit.
 * - **It is one tab stop.** The list is a listbox the input owns, so a screen
 *   reader hears the highlighted row as you arrow through it rather than
 *   being dropped into a grid of links.
 */

interface Command {
  id: string;
  label: string;
  hint: string;
  icon: IconName;
  group: string;
  /** Absent when the thing exists but has no working surface yet. */
  route?: Route;
  /** Shown on the right, when there is a direct key for it. */
  keys?: string;
}

/**
 * Everything NN can open.
 *
 * Read from `lib/nn/destinations`, which the dynamic panel reads too. This
 * file used to carry its own copy, and two lists naming the same places is
 * two places to forget one — the symptom being a screen reachable by
 * keyboard and not by thumb, or the reverse.
 */
function commands(): readonly Command[] {
  return destinations().map((destination) => ({
    id: destination.id,
    label: destination.label,
    hint: destination.hint,
    icon: destination.icon,
    group: destination.group,
    ...(destination.route !== undefined ? { route: destination.route } : {}),
    ...(destination.keys !== undefined ? { keys: destination.keys } : {}),
  }));
}

/**
 * How well a command answers what was typed.
 *
 * Higher is better; zero means it does not. The ordering matters more than
 * the numbers: an exact name beats a prefix, a prefix beats a word start,
 * and a description match comes last — so typing "fin" offers Finance before
 * it offers everything whose description mentions finances.
 */
export function score(command: { label: string; hint: string }, query: string): number {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return 1;
  const label = command.label.toLowerCase();
  if (label === q) return 100;
  if (label.startsWith(q)) return 80;
  if (label.split(/\s+/).some((word) => word.startsWith(q))) return 60;
  if (label.includes(q)) return 40;
  if (command.hint.toLowerCase().includes(q)) return 20;
  // Letters in order but not adjacent: "crst" finds "Creator Studio".
  let at = 0;
  for (const letter of q) {
    at = label.indexOf(letter, at);
    if (at === -1) return 0;
    at += 1;
  }
  return 10;
}

export function rank(all: readonly Command[], query: string): readonly Command[] {
  return all
    .map((command) => ({ command, value: score(command, query) }))
    .filter((entry) => entry.value > 0)
    // Working surfaces first at equal relevance: offering a screen that does
    // not exist above one that does is the wrong answer twice over.
    .sort((a, b) =>
      b.value - a.value
      || Number(b.command.route !== undefined) - Number(a.command.route !== undefined)
      || a.command.label.localeCompare(b.command.label))
    .slice(0, 40)
    .map((entry) => entry.command);
}

export function CommandPalette() {
  const travel = useAppTransition();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [at, setAt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const all = useMemo(() => commands(), []);
  const shown = useMemo(() => rank(all, query), [all, query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setAt(0);
  }, []);

  const go = useCallback((command: Command | undefined) => {
    if (command?.route === undefined) return;
    close();
    travel.open(command.route, command.label);
  }, [close, travel]);

  /* The keys, globally. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const meta = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (meta && key === "k") {
        event.preventDefault();
        setOpen((was) => !was);
        return;
      }
      if (!meta) return;
      // Direct keys. Each one is a place that exists; none of them is a
      // shortcut to something NN cannot actually open.
      const direct: Record<string, { href: Route; label: string }> = {
        j: { href: "/ren" as Route, label: "REN" },
        h: { href: "/home" as Route, label: "Today" },
        ",": { href: "/settings" as Route, label: "Settings" },
      };
      const destination = direct[key];
      if (destination !== undefined) {
        event.preventDefault();
        travel.open(destination.href, destination.label);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [travel]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    inputRef.current?.focus();
    return () => {
      const previous = returnFocusRef.current;
      if (previous?.isConnected) previous.focus();
      returnFocusRef.current = null;
    };
  }, [open]);

  useEffect(() => { setAt(0); }, [query]);

  // Keeps the highlighted row in view while arrowing, without stealing focus
  // from the input — which is what makes this stay a keyboard surface.
  useEffect(() => {
    if (!open) return;
    const row = listRef.current?.children[at];
    // Guarded because not every environment has it — jsdom does not, and a
    // missing scroll is not worth an exception thrown at the founder.
    if (row instanceof HTMLElement && typeof row.scrollIntoView === "function") {
      row.scrollIntoView({ block: "nearest" });
    }
  }, [at, open]);

  if (!open) return null;

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Tab") {
      event.preventDefault();
      inputRef.current?.focus();
      return;
    }
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setAt((was) => (shown.length === 0 ? 0 : (was + 1) % shown.length));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setAt((was) => (shown.length === 0 ? 0 : (was - 1 + shown.length) % shown.length));
      return;
    }
    if (event.key === "Enter") { event.preventDefault(); go(shown[at]); }
  };

  return (
    <div className={styles.scrim} onPointerDown={close} role="presentation">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label="Go to"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className={styles.field}>
          <Icon name="search" size={17} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            onKeyDown={onKeyDown}
            placeholder="Go to anything in NN"
            aria-label="Go to anything in NN"
            aria-controls="nn-palette-list"
            aria-activedescendant={shown[at] ? `nn-palette-${shown[at].id}` : undefined}
            role="combobox"
            aria-expanded="true"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className={`${styles.key} ${styles.esc}`}>esc</kbd>
        </div>

        {shown.length === 0 ? (
          <p className={styles.empty}>Nothing in NN matches “{query}”.</p>
        ) : (
          <ul className={styles.list} id="nn-palette-list" role="listbox" ref={listRef}>
            {shown.map((command, index) => (
              <li
                key={command.id}
                id={`nn-palette-${command.id}`}
                role="option"
                aria-selected={index === at}
                aria-disabled={command.route === undefined}
                data-at={index === at || undefined}
                data-planned={command.route === undefined || undefined}
                onPointerEnter={() => setAt(index)}
                onPointerDown={(event) => { event.preventDefault(); go(command); }}
              >
                <Icon name={command.icon} size={17} />
                <span className={styles.label}>
                  {command.label}
                  <small>{command.hint}</small>
                </span>
                {command.route === undefined
                  ? <span className={styles.planned}>Planned</span>
                  : command.keys !== undefined
                    ? <kbd className={styles.key}>{command.keys}</kbd>
                    : null}
              </li>
            ))}
          </ul>
        )}

        <footer className={styles.footer}>
          <span><kbd className={styles.key}>↑</kbd><kbd className={styles.key}>↓</kbd> move</span>
          <span><kbd className={styles.key}>↵</kbd> open</span>
          <span><kbd className={styles.key}>⌘J</kbd> REN</span>
          <span><kbd className={styles.key}>⌘H</kbd> Today</span>
        </footer>
      </div>
    </div>
  );
}

export default CommandPalette;
