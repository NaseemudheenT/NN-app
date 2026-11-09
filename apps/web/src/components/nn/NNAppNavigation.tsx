"use client";

import { usePathname, useRouter } from "next/navigation";
import { Dock } from "@/components/ui/Dock";
import { Icon } from "@/components/ui/Icon";
import { useRen } from "@/components/ren/RenProvider";
import styles from "./NNAppNavigation.module.css";

const ITEMS = [
  { id: "home", label: "NN Home", icon: "grid" as const, href: "/home" },
  { id: "life", label: "NN Life", icon: "calendar" as const, href: "/life" },
  { id: "workspace", label: "Workspace", icon: "clock" as const, href: "/workspace" },
  { id: "design", label: "Design system", icon: "sparkle" as const, href: "/design" },
] as const;

const APP_PATHS = new Set(ITEMS.map((item) => item.href));

/**
 * A compact, route-aware navigation dock shared by NN application surfaces.
 * Home and Life retain their purpose-built navigation. This dock connects the
 * Workspace and Design surfaces without introducing a side rail or menu.
 */
export function NNAppNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { summon } = useRen();

  if (!pathname || !APP_PATHS.has(pathname as (typeof ITEMS)[number]["href"]) || (pathname === "/home" || pathname === "/life")) {
    return null;
  }

  const activeId = ITEMS.find((item) => item.href === pathname)?.id ?? null;

  return (
    <div className={styles.positioner}>
      <div className={[styles.surface, "nn-glass-primary", "nn-glass-card"].join(" ")}>
        <Dock
          items={ITEMS.map(({ id, label, icon }) => ({ id, label, icon }))}
          activeId={activeId}
          onSelect={(id) => {
            const destination = ITEMS.find((item) => item.id === id);
            if (destination) router.push(destination.href);
          }}
          className={styles.dock}
        />
        <span className={styles.divider} aria-hidden="true" />
        <button
          type="button"
          className={styles.ren}
          onClick={() => summon("touch")}
          aria-label="Open REN assistant"
          title="Open REN"
        >
          <Icon name="sparkle" size={19} />
          <span>REN</span>
        </button>
      </div>
    </div>
  );
}
