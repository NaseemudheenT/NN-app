"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import styles from "./NNCommandPalette.module.css";

const DESTINATIONS = [
  { id: "home", title: "Home", detail: "The NN entrance", keywords: "start overview entrance", href: "/" },
  { id: "workspace", title: "Workspace", detail: "Your personal environment", keywords: "today timeline goals focus", href: "/workspace" },
  { id: "life", title: "Life", detail: "Tasks and daily planning", keywords: "tasks habits routines personal calendar", href: "/life" },
  { id: "study", title: "Study", detail: "Subjects and academic work", keywords: "college subjects syllabus exams question banks", href: "/study" },
  { id: "design", title: "Design system", detail: "Interface library and themes", keywords: "components glass motion tokens", href: "/design" },
  { id: "signin", title: "Sign in", detail: "Secure access with a passkey", keywords: "account authentication passkey", href: "/sign-in" },
] as const;

/**
 * Search-first navigation for routes that genuinely exist today.
 * New applications join this list only when their route and experience ship.
 */
export function NNCommandPalette() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const listId = useId().replace(/:/g, "");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return DESTINATIONS;
    return DESTINATIONS.filter((item) =>
      `${item.title} ${item.detail} ${item.keywords}`.toLowerCase().includes(term),
    );
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!open) previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        setOpen((value) => !value);
      } else if (event.key === "Escape" && open) {
        event.preventDefault();
        setOpen(false);
      }
    };
    const onOpen = () => {
      previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
    };
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("nn:open-command-palette", onOpen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("nn:open-command-palette", onOpen);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
      setQuery("");
      setActive(0);
      inputRef.current?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      previousFocus.current?.focus();
    }
  }, [open]);

  function navigate(href: (typeof DESTINATIONS)[number]["href"]) {
    setOpen(false);
    router.push(href);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setActive((value) => (value + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setActive((value) => (value - 1 + results.length) % results.length);
    } else if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      navigate(results[active].href);
    }
  }

  function trapTab(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>('input:not([disabled]), button:not([disabled])');
    if (!focusable?.length) return;
    const first = focusable.item(0);
    const last = focusable.item(focusable.length - 1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!open) return null;

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <section
        ref={panelRef}
        className={styles.palette}
        role="dialog"
        aria-modal="true"
        aria-label="NN command palette"
        onKeyDown={trapTab}
      >
        <div className={styles.searchRow}>
          <Icon name="search" size={19} />
          <input
            ref={inputRef}
            type="search"
            role="combobox"
            aria-label="Search NN"
            aria-autocomplete="list"
            aria-expanded={true}
            aria-controls={results.length > 0 ? listId : undefined}
            aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
            placeholder="Where would you like to go?"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActive(0); }}
            onKeyDown={onInputKeyDown}
          />
          <kbd>ESC</kbd>
        </div>

        <div className={styles.listHeader}>
          <span>DESTINATIONS</span>
          <span>{results.length} AVAILABLE</span>
        </div>

        {results.length > 0 ? (
          <div className={styles.results} id={listId} role="listbox" aria-label="Available destinations">
            {results.map((item, index) => (
              <button
                key={item.id}
                id={`${listId}-${item.id}`}
                type="button"
                role="option"
                aria-selected={active === index}
                className={styles.option}
                data-active={active === index}
                onMouseEnter={() => setActive(index)}
                onClick={() => navigate(item.href)}
              >
                <span className={styles.optionIcon}><Icon name={item.id === "home" || item.id === "life" ? "calendar" : item.id === "study" ? "book" : item.id === "workspace" ? "grid" : item.id === "design" ? "sparkle" : "shield"} size={18} /></span>
                <span className={styles.optionCopy}>
                  <strong>{item.title}</strong>
                  <small>{item.detail}</small>
                </span>
                <span className={styles.enterHint}>↵</span>
              </button>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <strong>No matching destination</strong>
            <span>Search Home, Workspace, Life, Study, Design or Sign in.</span>
          </div>
        )}

        <footer className={styles.footer}>
          <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
          <span><kbd>↵</kbd> Open</span>
          <span><kbd>ESC</kbd> Close</span>
        </footer>
      </section>
    </div>
  );
}
