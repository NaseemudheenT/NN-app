/**
 * A signed distance field for the NN mark.
 *
 * The refraction shader needs to know, for every pixel, how far it is from
 * the edge of the mark and on which side. That is what lets the glass have a
 * *thickness* — a dome that is deepest at the centre of a stroke and thins to
 * nothing at the edge — rather than a flat cut-out with a blurred border.
 *
 * The distance is computed with 8SSEDT (Danielsson's two-pass sweep): exact
 * enough to be indistinguishable from a true Euclidean field at this size,
 * and linear in the number of pixels rather than quadratic.
 *
 * The geometry comes from NN_MARK_PATH. Nothing here redraws the mark.
 */

import { NN_MARK_H, NN_MARK_PATH, NN_MARK_W } from "@/components/ui/NNLogo";

export interface MarkField {
  width: number;
  height: number;
  /**
   * One byte per pixel. 128 is the edge; above is inside the mark, below is
   * outside. `spread` says how many pixels one step of 1/255 covers.
   */
  data: Uint8Array;
  spread: number;
}

const FAR = 1e9;

/** Squared length of a lattice offset, kept as ints to avoid sqrt in the sweep. */
function dist2(dx: number, dy: number): number {
  return dx * dx + dy * dy;
}

/**
 * One pass of the sweep over a vector grid.
 *
 * Each cell keeps the offset to the nearest edge pixel found so far. A cell
 * can only improve by borrowing a neighbour's answer and stepping one pixel
 * towards itself, which is why two passes — one forward, one backward — are
 * enough to propagate every answer across the whole grid.
 */
function sweep(gx: Int32Array, gy: Int32Array, w: number, h: number): void {
  const at = (x: number, y: number) => y * w + x;
  const compare = (x: number, y: number, ox: number, oy: number) => {
    const nx = x + ox;
    const ny = y + oy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) return;
    const other = at(nx, ny);
    const cdx = gx[other]! - ox;
    const cdy = gy[other]! - oy;
    const here = at(x, y);
    if (dist2(cdx, cdy) < dist2(gx[here]!, gy[here]!)) {
      gx[here] = cdx;
      gy[here] = cdy;
    }
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      compare(x, y, -1, 0);
      compare(x, y, 0, -1);
      compare(x, y, -1, -1);
      compare(x, y, 1, -1);
    }
    for (let x = w - 1; x >= 0; x--) compare(x, y, 1, 0);
  }

  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      compare(x, y, 1, 0);
      compare(x, y, 0, 1);
      compare(x, y, 1, 1);
      compare(x, y, -1, 1);
    }
    for (let x = 0; x < w; x++) compare(x, y, -1, 0);
  }
}

/**
 * Rasterises the NN mark and returns its distance field.
 *
 * Returns null where there is no 2D canvas to rasterise into — on the server,
 * or in a context that refuses one. Callers must have a path that does not
 * need the field.
 */
export function buildMarkField(height: number, padding = 0.22): MarkField | null {
  if (typeof document === "undefined") return null;

  const ratio = NN_MARK_W / NN_MARK_H;
  const inner = Math.max(16, Math.round(height));
  const pad = Math.round(inner * padding);
  const h = inner + pad * 2;
  const w = Math.round(inner * ratio) + pad * 2;

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  const scale = inner / NN_MARK_H;
  context.clearRect(0, 0, w, h);
  context.fillStyle = "#ffffff";
  context.translate(pad, pad);
  context.scale(scale, scale);
  // `evenodd` matches the fill rule the mark is drawn with everywhere else.
  // The mark's three strokes are outlines; filled nonzero their counters close
  // up, and the glass would refract a solid slab instead of the letter.
  context.fill(new Path2D(NN_MARK_PATH), "evenodd");

  const pixels = context.getImageData(0, 0, w, h).data;
  const count = w * h;

  // Two vector grids: one measuring out of the mark, one measuring into it.
  const outX = new Int32Array(count);
  const outY = new Int32Array(count);
  const inX = new Int32Array(count);
  const inY = new Int32Array(count);

  for (let i = 0; i < count; i++) {
    const solid = pixels[i * 4 + 3]! > 127;
    if (solid) {
      outX[i] = 0;
      outY[i] = 0;
      inX[i] = FAR;
      inY[i] = FAR;
    } else {
      outX[i] = FAR;
      outY[i] = FAR;
      inX[i] = 0;
      inY[i] = 0;
    }
  }

  sweep(outX, outY, w, h);
  sweep(inX, inY, w, h);

  // How far the field reaches before it saturates. Tied to the padding so a
  // taller mark does not get a proportionally flatter dome.
  const spread = Math.max(2, pad * 0.9);
  const data = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const outside = Math.sqrt(dist2(outX[i]!, outY[i]!));
    const insideDepth = Math.sqrt(dist2(inX[i]!, inY[i]!));
    // positive inside, negative outside, in pixels
    const signed = insideDepth - outside;
    const normalised = 128 + (signed / spread) * 127;
    data[i] = normalised < 0 ? 0 : normalised > 255 ? 255 : Math.round(normalised);
  }

  return { width: w, height: h, data, spread };
}
