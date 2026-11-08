"use client";

import { Icon, type IconName } from "./Icon";
import styles from "./Dock.module.css";

export interface DockItem {
  id: string;
  label: string;
  icon: IconName;
}

export interface DockProps {
  items: readonly DockItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  className?: string;
}

export function Dock({ items, activeId, onSelect, className }: DockProps) {
  return (
    <nav
      className={[styles.dock, className ?? ""].filter(Boolean).join(" ")}
      aria-label="Application dock"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={styles.item}
          aria-current={activeId === item.id}
          aria-label={item.label}
          title={item.label}
          onClick={() => onSelect(item.id)}
        >
          <Icon name={item.icon} size={20} />
        </button>
      ))}
    </nav>
  );
}
