import { ICON_PATHS, type IconName } from "./paths";

/**
 * NN's icons, rendered as real objects.
 *
 * Every icon in NN used to be a stroked path with an SVG filter over it. A
 * filter can fake a lit edge, but it cannot know the shape: it blurs the
 * alpha and lights the blur, so a thin stroke gets a one-pixel bevel and
 * reads as a line with a highlight on it. The founder kept saying the icons
 * did not look real, and that was why.
 *
 * So they are not drawn here, they are **rendered**. Each glyph becomes a
 * signed distance field, the field becomes a height map — a half-round tube
 * along the stroke's spine, exactly the profile of a bar of material — and
 * that surface is shaded per pixel: a key light from the upper left, an
 * environment reflected by the surface normal, a specular, a Fresnel rim
 * that brightens where the surface turns away, chromatic dispersion through
 * the edges, and the shadow the object casts on whatever it sits on. The
 * result is a PNG. The icons in NN are real images of real objects now,
 * which is what was asked for.
 *
 * Three deliberate decisions:
 *
 * - **CPU, not WebGL.** A browser allows about sixteen live WebGL contexts
 *   and NN already spends five on the dock, the rail, the carousel, the orb
 *   and the reveal. Forty-three icons could never have one each, and a
 *   shared context that other components can lose is a worse bug than a
 *   slower render. At 176px a glyph is ~31k pixels and takes a few
 *   milliseconds; it is done once and cached for the life of the page.
 * - **Rendered once per look.** The cache key is the glyph, its tone, the
 *   theme and the pixel size. Thirty-four applications share a handful of
 *   sizes, so the whole family costs well under a second, spread across the
 *   moments each icon first appears.
 * - **It may fail.** No canvas, no 2D context, a tainted read — every path
 *   returns null and the caller keeps the vector icon. An icon that does not
 *   render is still an icon.
 */

/* ------------------------------------------------------------------ sdf -- */

/**
 * One-dimensional squared-distance transform (Felzenszwalb–Huttenlocher),
 * the inner loop of the SDF. Operates in place along one axis.
 */
function edt1d(
  grid: Float64Array, offset: number, stride: number, n: number,
  f: Float64Array, v: Uint16Array, z: Float64Array,
): void {
  const INF = 1e20;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  f[0] = grid[offset]!;
  for (let q = 1, k = 0, s = 0; q < n; q += 1) {
    f[q] = grid[offset + q * stride]!;
    const q2 = q * q;
    do {
      const r = v[k]!;
      s = (f[q]! - f[r]! + q2 - r * r) / (q - r) / 2;
    } while (s <= z[k]! && --k > -1);
    k += 1;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  for (let q = 0, k = 0; q < n; q += 1) {
    while (z[k + 1]! < q) k += 1;
    const r = v[k]!;
    const qr = q - r;
    grid[offset + q * stride] = f[r]! + qr * qr;
  }
}

/** Signed distance in pixels from an alpha channel: negative inside. */
function signedDistance(alpha: Float64Array, n: number): Float32Array {
  const INF = 1e20;
  const size = n * n;
  const outer = new Float64Array(size);
  const inner = new Float64Array(size);
  for (let i = 0; i < size; i += 1) {
    const a = alpha[i]!;
    if (a >= 1) { outer[i] = 0; inner[i] = INF; }
    else if (a <= 0) { outer[i] = INF; inner[i] = 0; }
    else {
      // Sub-pixel: a half-covered pixel is half a pixel from the edge.
      const d = 0.5 - a;
      outer[i] = d > 0 ? d * d : 0;
      inner[i] = d < 0 ? d * d : 0;
    }
  }
  const f = new Float64Array(n);
  const z = new Float64Array(n + 1);
  const v = new Uint16Array(n);
  for (const grid of [outer, inner]) {
    for (let x = 0; x < n; x += 1) edt1d(grid, x, n, n, f, v, z);
    for (let y = 0; y < n; y += 1) edt1d(grid, y * n, 1, n, f, v, z);
  }
  const sdf = new Float32Array(size);
  for (let i = 0; i < size; i += 1) sdf[i] = Math.sqrt(outer[i]!) - Math.sqrt(inner[i]!);
  return sdf;
}

/* --------------------------------------------------------------- shading -- */

export type IconMaterial = {
  /** The object's own colour, 0–1 rgb. */
  body: [number, number, number];
  /** What it reflects at a grazing angle — the room above it. */
  skyTop: [number, number, number];
  /** And below. */
  skyBottom: [number, number, number];
  /** How dark the shadow it casts is, 0–1. */
  shadow: number;
};

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * The look of one icon, as pixels.
 *
 * `px` is the finished image's size. The glyph is drawn on NN's 24 grid with
 * a margin wide enough for the cast shadow and the bloom to live inside the
 * image rather than being clipped by it.
 */
export function renderIconPixels(
  name: IconName, px: number, material: IconMaterial,
): ImageData | null {
  if (typeof document === "undefined") return null;
  const draw = document.createElement("canvas");
  draw.width = px;
  draw.height = px;
  const dc = draw.getContext("2d", { willReadFrequently: true });
  if (!dc) return null;

  // 24-unit grid inside an 80% box: the remaining fifth is where the shadow
  // and the rim light go.
  const scale = (px * 0.8) / 24;
  const inset = px * 0.1;
  dc.translate(inset, inset);
  dc.scale(scale, scale);
  dc.strokeStyle = "#ffffff";
  dc.lineWidth = 2.35;
  dc.lineCap = "round";
  dc.lineJoin = "round";
  dc.stroke(new Path2D(ICON_PATHS[name]));

  const raw = dc.getImageData(0, 0, px, px).data;
  const size = px * px;
  const alpha = new Float64Array(size);
  for (let i = 0; i < size; i += 1) alpha[i] = raw[i * 4 + 3]! / 255;

  const sdf = signedDistance(alpha, px);

  // Half the stroke's width in pixels: the radius of the tube.
  const radius = (2.35 / 2) * scale;

  // The height field. A half-round profile across the stroke, which is the
  // whole reason this reads as a bar of material rather than a flat shape.
  const height = new Float32Array(size);
  for (let i = 0; i < size; i += 1) {
    const t = clamp01(-sdf[i]! / radius);
    height[i] = Math.sqrt(t * (2 - t));
  }

  const out = dc.createImageData(px, px);
  const data = out.data;
  const [br, bg, bb] = material.body;
  const [tr, tg, tb] = material.skyTop;
  const [sr, sg, sb] = material.skyBottom;

  // Key light from the upper left, the direction NN lights everything from.
  const lx = -0.42, ly = -0.58, lz = 0.70;
  // Half vector for a view straight down the z axis.
  const hx = lx, hy = ly, hz = lz + 1;
  const hl = Math.hypot(hx, hy, hz);
  const hnx = hx / hl, hny = hy / hl, hnz = hz / hl;

  // How far the shadow is offset, in pixels: down and slightly right.
  const shX = Math.max(1, Math.round(px * 0.022));
  const shY = Math.max(1, Math.round(px * 0.034));
  const shSoft = Math.max(1.2, px * 0.026);

  // Slope gain. The normal is the gradient of the height field, and the
  // field only rises over `radius` pixels, so the gradient has to be scaled
  // by that radius to be a real surface rather than a cliff.
  const gain = radius * 0.85;

  for (let y = 0; y < px; y += 1) {
    for (let x = 0; x < px; x += 1) {
      const i = y * px + x;
      const o = i * 4;

      // The shadow this object casts, read from the glyph's coverage at an
      // offset and softened by the distance field around it.
      const sx = x - shX;
      const sy = y - shY;
      let cast = 0;
      if (sx >= 0 && sy >= 0 && sx < px && sy < px) {
        const sd = sdf[sy * px + sx]!;
        cast = clamp01(1 - sd / shSoft) * material.shadow;
      }

      const d = sdf[i]!;
      const cover = clamp01(0.5 - d);
      if (cover <= 0.002) {
        if (cast > 0.002) {
          data[o] = 2; data[o + 1] = 5; data[o + 2] = 16;
          data[o + 3] = Math.round(cast * 255);
        }
        continue;
      }

      // Surface normal from the height field.
      const xm = x > 0 ? height[i - 1]! : height[i]!;
      const xp = x < px - 1 ? height[i + 1]! : height[i]!;
      const ym = y > 0 ? height[i - px]! : height[i]!;
      const yp = y < px - 1 ? height[i + px]! : height[i]!;
      let nx = -(xp - xm) * 0.5 * gain;
      let ny = -(yp - ym) * 0.5 * gain;
      const nl = Math.hypot(nx, ny, 1);
      nx /= nl;
      ny /= nl;
      const nz = 1 / nl;

      const diff = Math.max(0, nx * lx + ny * ly + nz * lz);
      const specDot = Math.max(0, nx * hnx + ny * hny + nz * hnz);
      const spec = specDot ** 30;
      // Fresnel: a real material gets brighter where it turns away from you.
      const fres = (1 - nz) ** 1.9;

      // The room, reflected. Up the normal sees the ceiling, down the floor.
      const sky = clamp01(-ny * 0.5 + 0.5);
      const er = sr + (tr - sr) * sky;
      const eg = sg + (tg - sg) * sky;
      const eb = sb + (tb - sb) * sky;

      // Dispersion: the edge splits what it reflects, strongest where the
      // surface is steepest and signed by which way it leans.
      const chroma = fres * nx * 0.16;

      // Ambient, key, the room's reflection, the highlight. The ambient term
      // is what keeps an 18px icon from reading as a grey smudge: a real
      // object this small is mostly its own colour, not its lighting.
      let r = br * (0.46 + 0.7 * diff) + er * fres * 0.5 + spec * 1.05 + chroma;
      let g = bg * (0.46 + 0.7 * diff) + eg * fres * 0.5 + spec * 1.05;
      let b = bb * (0.46 + 0.7 * diff) + eb * fres * 0.5 + spec * 1.05 - chroma;

      // Ambient occlusion in the crease where the tube meets the ground.
      const crease = clamp01(1 + d / (radius * 0.5));
      const ao = 0.76 + 0.24 * crease;
      r *= ao; g *= ao; b *= ao;

      const a = cover;
      // Composited over its own shadow, so the two never double-darken.
      const sa = cast * (1 - a);
      data[o] = Math.round(clamp01(r) * 255 * a + 2 * sa);
      data[o + 1] = Math.round(clamp01(g) * 255 * a + 5 * sa);
      data[o + 2] = Math.round(clamp01(b) * 255 * a + 16 * sa);
      data[o + 3] = Math.round(clamp01(a + sa) * 255);
    }
  }
  return out;
}

/* ----------------------------------------------------------------- cache -- */

const images = new Map<string, string | null>();

/** Reads a `--nn-spectrum-*` token as 0–1 rgb. */
function spectrum(token: string, fallback: [number, number, number]): [number, number, number] {
  if (typeof window === "undefined") return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  const parts = raw.split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return fallback;
  return [parts[0]! / 255, parts[1]! / 255, parts[2]! / 255];
}

const TONE_TOKEN: Record<string, string> = {
  blue: "--nn-spectrum-blue",
  cyan: "--nn-spectrum-cyan",
  aqua: "--nn-spectrum-aqua",
  violet: "--nn-spectrum-violet",
  slate: "--nn-spectrum-indigo",
};

const TONE_FIXED: Record<string, [number, number, number]> = {
  green: [0.25, 0.83, 0.65],
  amber: [0.91, 0.76, 0.48],
  red: [0.91, 0.52, 0.52],
  /* The navigation. At 18px against deep navy a tinted object is a smudge,
     so the dock's icons are made of something nearer to polished ice: the
     colour is in the water under them, not in the glyph. */
  ice: [0.86, 0.93, 1],
};

/** The material an icon is made of, in this theme and this tone. */
export function materialFor(tone: string, dark: boolean): IconMaterial {
  const token = TONE_TOKEN[tone];
  const hue = token
    ? spectrum(token, [0.4, 0.6, 1])
    : (TONE_FIXED[tone] ?? [0.4, 0.6, 1]);

  // Lifted toward white so the object has somewhere to go under the key
  // light: a fully saturated body has no highlight, only a brighter stain.
  //
  // Lifted *toward* white rather than scaled and offset, because the offset
  // form pushed an already-pale tone past 1 and clipped it — `ice` came out
  // flat white with its cool tint gone. This form cannot leave the range and
  // keeps the hue's own balance whatever it starts at.
  const k = dark ? 0.33 : 0.08;
  const lift = (c: number) => c + (1 - c) * k;
  const body: [number, number, number] = [lift(hue[0]), lift(hue[1]), lift(hue[2])];

  return dark
    ? {
        body,
        skyTop: [0.82, 0.92, 1],
        skyBottom: [0.1, 0.16, 0.34],
        shadow: 0.46,
      }
    : {
        body,
        skyTop: [1, 1, 1],
        skyBottom: [0.58, 0.68, 0.84],
        shadow: 0.3,
      };
}

/**
 * The icon as a PNG data URL, rendered once and kept.
 *
 * Returns null when it cannot render — no DOM, no 2D context, a browser that
 * refuses the read. The caller keeps the vector icon in that case, which is
 * also what the server and the test environment always see.
 */
export function iconImage(name: IconName, tone: string, dark: boolean, px: number): string | null {
  const key = `${name}|${tone}|${dark ? "d" : "l"}|${px}`;
  const made = images.get(key);
  if (made !== undefined) return made;

  let url: string | null = null;
  try {
    const pixels = renderIconPixels(name, px, materialFor(tone, dark));
    if (pixels) {
      const canvas = document.createElement("canvas");
      canvas.width = px;
      canvas.height = px;
      const c = canvas.getContext("2d");
      if (c) {
        c.putImageData(pixels, 0, 0);
        url = canvas.toDataURL("image/png");
      }
    }
  } catch {
    url = null;
  }
  images.set(key, url);
  return url;
}

/** Drops every rendered icon. The theme changed, so the light did. */
export function clearIconImages(): void {
  images.clear();
}
