import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";
import styles from "./AppTile.module.css";

export interface AppTileProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  name: string;
  icon: IconName;
  description?: string;
  /** Square label-under-icon form, for the launcher grid. */
  compact?: boolean;
}

export function AppTile({
  name, icon, description, compact = false, className, ...rest
}: AppTileProps) {
  const cls = ["nn-holo", "nn-glass-card", styles.tile, compact ? styles.compact : "", className ?? ""]
    .filter(Boolean).join(" ");
  return (
    <button type="button" className={cls} {...rest}>
      <span className={styles.badge}><Icon name={icon} size={compact ? 20 : 22} /></span>
      <span>
        <span className={styles.name} style={{ display: "block" }}>{name}</span>
        {description !== undefined && !compact ? (
          <span className={styles.desc} style={{ display: "block", marginTop: 4 }}>{description}</span>
        ) : null}
      </span>
    </button>
  );
}
