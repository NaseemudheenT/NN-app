import { ICON_PATHS, type IconName } from "@/components/ui/Icon";

/**
 * An application's face: its wave, with its own glyph set into the glass.
 *
 * The painted wave alone was abstract — thirty-four beautiful rectangles that
 * told the founder nothing about which one was Finance. The icon is what
 * makes a card a thing rather than a texture, and the founder asked for
 * exactly that: icons, on the wave, floating.
 *
 * Drawn here rather than overlaid in the DOM because the card is a WebGL
 * texture: an HTML icon on top of it would not bend with the lens, and a
 * sticker that stays flat while its card curves is worse than no icon.
 *
 * The painted source is never modified. It is shared and cached by recipe
 * and seed, so drawing into it would stamp one application's glyph onto
 * every card that happens to share a wave.
 */

/** The tile's share of the card's width. */
const TILE = 0.34;
/** How far down the card the tile's centre sits. */
const CENTRE_Y = 0.42;

export function paintCardFace(
  art: HTMLCanvasElement,
  icon: IconName,
  dim = false,
): HTMLCanvasElement {
  const face = document.createElement("canvas");
  face.width = art.width;
  face.height = art.height;
  const c = face.getContext("2d");
  if (!c) return art;

  c.drawImage(art, 0, 0);

  const size = Math.round(face.width * TILE);
  const x = Math.round((face.width - size) / 2);
  const y = Math.round(face.height * CENTRE_Y - size / 2);
  const radius = size * 0.28;

  // The glass tile. A soft drop under it is what lifts it off the wave;
  // without it the tile reads as a hole cut in the card rather than a plate
  // floating above it.
  c.save();
  c.shadowColor = "rgba(4, 10, 28, 0.42)";
  c.shadowBlur = size * 0.28;
  c.shadowOffsetY = size * 0.08;
  roundedRect(c, x, y, size, size, radius);
  c.fillStyle = "rgba(236, 246, 255, 0.13)";
  c.fill();
  c.restore();

  // Top-lit: brighter at the top edge, as a real plate under one light is.
  const sheen = c.createLinearGradient(x, y, x, y + size);
  sheen.addColorStop(0, "rgba(255, 255, 255, 0.30)");
  sheen.addColorStop(0.45, "rgba(255, 255, 255, 0.05)");
  sheen.addColorStop(1, "rgba(255, 255, 255, 0.02)");
  roundedRect(c, x, y, size, size, radius);
  c.fillStyle = sheen;
  c.fill();

  roundedRect(c, x + 0.5, y + 0.5, size - 1, size - 1, radius);
  c.strokeStyle = "rgba(226, 240, 255, 0.42)";
  c.lineWidth = Math.max(1, size * 0.012);
  c.stroke();

  // The glyph, on the icon family's own 24 grid.
  const glyph = size * 0.52;
  const scale = glyph / 24;
  c.save();
  c.translate(x + (size - glyph) / 2, y + (size - glyph) / 2);
  c.scale(scale, scale);
  c.strokeStyle = dim ? "rgba(226, 238, 255, 0.55)" : "rgba(247, 251, 255, 0.95)";
  c.lineWidth = 1.6;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.stroke(new Path2D(ICON_PATHS[icon]));
  c.restore();

  return face;
}

function roundedRect(
  c: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + radius, y);
  c.arcTo(x + w, y, x + w, y + h, radius);
  c.arcTo(x + w, y + h, x, y + h, radius);
  c.arcTo(x, y + h, x, y, radius);
  c.arcTo(x, y, x + w, y, radius);
  c.closePath();
}
