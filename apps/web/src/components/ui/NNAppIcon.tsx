import { Icon, type IconName } from "./Icon";
import styles from "./NNAppIcon.module.css";

export interface NNAppIconProps {
  /** Stable application identifier from the NN application registry. */
  appId: string;
  /** The app's semantic glyph, drawn from the single NN icon family. */
  icon: IconName;
  size?: number;
  label?: string;
}

/**
 * NN's application icon treatment.
 *
 * Each app receives a stable signature material and colour identity while
 * retaining one shared geometry, optical scale and lighting language.
 */
export function NNAppIcon({ appId, icon, size = 52, label }: NNAppIconProps) {
  return (
    <span
      className={styles.icon}
      data-app={appId}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? appId.replace(/-/g, " ")}
    >
      <span className={styles.gloss} aria-hidden="true" />
      <Icon name={icon} size={Math.round(size * 0.48)} />
    </span>
  );
}
