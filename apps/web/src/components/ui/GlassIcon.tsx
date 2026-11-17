import { Icon, type IconName } from "./Icon";
import styles from "./GlassIcon.module.css";

/**
 * An icon in a slab of glass.
 *
 * NN has no bare glyphs. The founder's instruction was "all icons have to be
 * inside the liquid glass only", and the reason it is right is that a stroked
 * glyph floating on a moving surface has nothing to sit on: it reads as a
 * sticker. Set into a tile with a lit top edge and a shadow under it, the
 * same glyph becomes a key you could press.
 *
 * The tile takes its colour from `tone` — one of NN's spectrum hues — but
 * only as a tint through the glass, never as a flat fill. The material, the
 * edge and the lift all come from tokens, so it is correct in both themes
 * without knowing which one it is in.
 *
 * The glyph inside is a rendered object, not a stroke: a bar of material
 * with a round profile, lit, reflecting the room, with dispersion through
 * its edges and a shadow under it. A flat line on a thick piece of glass is
 * the one combination that reads as unfinished, because the tile has depth
 * and the thing in it does not.
 */

export type GlassIconTone = "blue" | "cyan" | "violet" | "aqua" | "slate" | "green" | "amber" | "red";

export interface GlassIconProps {
  name: IconName;
  /** Tile size in px. The glyph is 54% of it, which holds down to 22. */
  size?: number;
  tone?: GlassIconTone;
  /** Supply when the icon is the only thing naming its control. */
  title?: string;
  className?: string | undefined;
}

export function GlassIcon({ name, size = 26, tone = "blue", title, className }: GlassIconProps) {
  return (
    <span
      className={[styles.tile, className ?? ""].filter(Boolean).join(" ")}
      data-tone={tone}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.3) }}
    >
      <Icon
        name={name}
        size={Math.round(size * 0.54)}
        tone={tone}
        {...(title !== undefined ? { title } : {})}
      />
    </span>
  );
}

export default GlassIcon;
