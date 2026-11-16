"use client";

import { useIconImage } from "@/lib/icons/useIconImage";
import { Icon, type IconName } from "./Icon";
import styles from "./RealIcon.module.css";

/**
 * An icon as a real object.
 *
 * The glyph is rendered to an image — a half-round bar of material lit from
 * the upper left, reflecting the room, with a Fresnel rim, dispersion
 * through its edges and the shadow it casts underneath — and shown as that
 * image. See `lib/icons/render.ts` for how, and why it is not a filter.
 *
 * Until the render arrives, and anywhere it cannot happen at all — the
 * server, a test environment, a browser that refuses the canvas read — the
 * vector icon is shown instead. Both occupy the same box, so nothing moves
 * when one replaces the other.
 */

export interface RealIconProps {
  name: IconName;
  /** Rendered size in px. */
  size?: number;
  /** Which of NN's spectrum hues the object is made of. */
  tone?: string;
  /** Supply when the icon is the only thing naming its control. */
  title?: string;
  className?: string | undefined;
}

export function RealIcon({ name, size = 20, tone = "blue", title, className }: RealIconProps) {
  const url = useIconImage(name, tone, size);

  if (url === null) {
    return (
      <Icon name={name} size={size} solid {...(title !== undefined ? { title } : {})} className={className} />
    );
  }

  return (
    /* Not next/image. The source is a data URL this page rendered a
       millisecond ago: there is nothing for an image CDN to fetch, resize or
       cache, and routing it through one would add a network round trip to a
       picture that is already in memory. */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={title ?? ""}
      width={size}
      height={size}
      draggable={false}
      className={[styles.object, className ?? ""].filter(Boolean).join(" ")}
      {...(title === undefined ? { "aria-hidden": true } : {})}
    />
  );
}

export default RealIcon;
