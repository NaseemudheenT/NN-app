"use client";

import { useIconImage } from "@/lib/icons/useIconImage";
import { ICON_PATHS, type IconName } from "@/lib/icons/paths";
import styles from "./Icon.module.css";

/**
 * Every icon in NN.
 *
 * The glyph is **rendered**, not drawn: `lib/icons/render.ts` turns the path
 * into a signed distance field, the field into a half-round height map, and
 * shades that surface per pixel — key light, the room reflected by the
 * surface normal, a specular, a Fresnel rim, dispersion through the edges and
 * the shadow it casts. What you see is a picture of an object.
 *
 * The vector below is what the server renders, what the first client frame
 * renders so the markup matches, and what stays wherever the render cannot
 * happen — no canvas, a refused read, a test environment. An icon that cannot
 * be rendered is still an icon, and it is the same geometry either way.
 */

export { ICON_PATHS };
export type { IconName };

export interface IconProps {
  name: IconName;
  size?: number;
  /** Supply when the icon is the only content of a control. */
  title?: string;
  /**
   * Draw the glyph as a lit solid rather than a flat stroke.
   *
   * The stroke is extruded — a dark copy below it for depth, a cast shadow
   * under that, and a point light reflected off the top-left — so it reads as
   * a bar of material rather than a line. Costs one SVG filter, which is why
   * it is opt-in: a dense list of twenty rows does not need twenty of them,
   * but the keys in the dock and on the cards do.
   *
   * Needs {@link IconDefs} mounted, which the root layout does once.
   */
  solid?: boolean;
  /**
   * Which of NN's spectrum hues the object is made of.
   *
   * The default is `ice`, near-white and cool: an icon in NN's chrome sits on
   * dark glass with coloured water moving under it, and a tinted object there
   * competes with the water instead of standing on it. Tiles and cards pass
   * their own tone.
   */
  tone?: string;
  className?: string | undefined;
}

export function Icon({ name, size = 20, title, solid, tone = "ice", className }: IconProps) {
  const url = useIconImage(name, tone, size);
  if (url !== null) {
    return (
      /* Not next/image: the source is a data URL this page rendered a moment
         ago, so there is nothing for an image CDN to fetch or cache. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={title ?? ""}
        width={size}
        height={size}
        draggable={false}
        data-nn-icon={name}
        className={[styles.object, className ?? ""].filter(Boolean).join(" ")}
        {...(title === undefined ? { "aria-hidden": true } : {})}
      />
    );
  }
  return (
    <IconVector
      name={name}
      size={size}
      className={className}
      {...(solid !== undefined ? { solid } : {})}
      {...(title !== undefined ? { title } : {})}
    />
  );
}

/** The geometry, drawn. See the note above for when this is what you get. */
function IconVector({ name, size = 20, title, solid, className }: IconProps) {
  const d = ICON_PATHS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      data-nn-icon={name}
      data-solid={solid || undefined}
      {...(title !== undefined
        ? { role: "img" as const }
        : { "aria-hidden": true as const, role: "presentation" as const })}
    >
      {title !== undefined ? <title>{title}</title> : null}
      {solid ? (
        <>
          {/* The shadow the object casts on whatever it is sitting on. */}
          <path d={d} stroke="#040B1E" filter="url(#nn-icon-contact)" />
          {/* The side of the bar, seen from slightly above. Four copies a
              third of a unit apart rather than one: a single offset reads as
              a drop shadow, and a continuous side is what the eye accepts as
              thickness. They darken with depth, because the further down the
              side you look the less of the key light reaches it. */}
          <path d={d} stroke="var(--nn-icon-body, #050C22)" transform="translate(0 1.5)" />
          <path d={d} stroke="var(--nn-icon-body, #050C22)" transform="translate(0 1.1)" opacity="0.92" />
          <path d={d} stroke="var(--nn-icon-body, #09142E)" transform="translate(0 0.75)" opacity="0.86" />
          <path d={d} stroke="var(--nn-icon-body, #0D1A3A)" transform="translate(0 0.4)" opacity="0.8" />
          {/* The lit face. */}
          <path d={d} stroke="var(--nn-icon-face, url(#nn-icon-face))" filter="url(#nn-icon-lit)" />
          {/* The hairline where the face meets the air. One lit edge is what
              separates a thick object from a thick smudge. */}
          <path
            d={d}
            stroke="var(--nn-icon-rim, rgb(255 255 255 / 62%))"
            strokeWidth={0.5}
            transform="translate(0 -0.34)"
          />
        </>
      ) : (
        <path d={d} />
      )}
    </svg>
  );
}
