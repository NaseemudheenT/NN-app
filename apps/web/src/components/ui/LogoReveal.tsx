"use client";

import * as React from "react";
import { buildMarkField } from "@/lib/markSdf";
import { createFrameLoop, prefersReducedMotion } from "@/lib/motion";
import { NNGlassMark } from "./NNGlassMark";
import styles from "./LogoReveal.module.css";

/**
 * The NN mark arriving as a piece of liquid glass.
 *
 * The mark is not drawn. A signed distance field of the approved geometry is
 * uploaded once and read as the *thickness* of a glass slab, and the slab is
 * then lit and refracted properly: the light behind it bends through the
 * body, splits at the edges into cyan and violet because the three channels
 * refract at slightly different angles, and catches a specular highlight that
 * travels as the piece settles. What you see is the light that passed through
 * the mark, not a picture of the mark.
 *
 * The geometry is imported, never restated — see `lib/markSdf`.
 *
 * WebGL2 is not a requirement. Where it is missing, refused, or the founder
 * has asked for reduced motion, this falls back to `NNGlassMark`, which is
 * the same mark given the same optical treatment in SVG. The page never waits
 * on a GPU it might not get.
 */

const VERTEX = `#version 300 es
precision highp float;
out vec2 v_uv;
void main() {
  // one oversized triangle: no vertex buffer, no index buffer, no state
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  v_uv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_field;
uniform vec2  u_resolution;
uniform vec2  u_markAspect;   // mark box, normalised so the longer side is 1
uniform float u_time;
uniform float u_reveal;       // 0 → nothing, 1 → fully arrived
uniform vec3  u_ground;       // deep background
uniform vec3  u_cyan;
uniform vec3  u_violet;
uniform vec3  u_light;        // specular colour

/* ---- the light behind the glass -----------------------------------------
   A slow wave field in NN's own colours. It exists to be refracted: without
   something real behind it, glass has nothing to bend and reads as plastic. */
vec3 field(vec2 p) {
  float t = u_time * 0.06;
  float a = sin(p.x * 2.1 + t * 1.7) * 0.5 + sin(p.y * 1.7 - t * 1.3) * 0.5;
  float b = sin((p.x + p.y) * 1.4 + t * 2.1 + a * 0.8);
  float c = sin(length(p - vec2(0.15, -0.1)) * 3.2 - t * 2.4 + b * 0.6);

  float cyanMix   = smoothstep(-1.0, 1.0, b * 0.7 + a * 0.4);
  float violetMix = smoothstep(-0.8, 1.2, c);

  vec3 col = u_ground;
  col = mix(col, u_cyan,   cyanMix   * 0.55);
  col = mix(col, u_violet, violetMix * 0.38);

  // a soft pool of light up and to the left, so the room has a direction
  col += u_cyan * 0.14 * smoothstep(1.3, 0.0, length(p - vec2(-0.45, 0.4)));
  return col;
}

/** Thickness of the slab at a point: a dome over the inside of the mark. */
float slab(vec2 uv) {
  float d = texture(u_field, uv).r * 2.0 - 1.0;   // +inside, -outside
  float inside = max(d, 0.0);
  // sqrt turns a linear distance into a rounded profile rather than a wedge
  return sqrt(inside) * u_reveal;
}

void main() {
  vec2 res = u_resolution;
  vec2 uv = v_uv;
  float aspect = res.x / res.y;

  // background coordinates, square-corrected so the waves are not stretched
  vec2 bg = (uv - 0.5) * vec2(aspect, 1.0) * 2.0;

  // mark coordinates: centre the field's own box inside the canvas
  vec2 m = (uv - 0.5) * vec2(aspect, 1.0);
  vec2 markUv = m / u_markAspect + 0.5;

  float inBox = step(0.0, markUv.x) * step(markUv.x, 1.0)
              * step(0.0, markUv.y) * step(markUv.y, 1.0);

  float h = inBox > 0.5 ? slab(markUv) : 0.0;

  vec3 colour;

  if (h <= 0.0005) {
    colour = field(bg);
  } else {
    // Surface normal from the slope of the thickness. The texel step is taken
    // in mark space so the normal does not change with canvas size.
    vec2 texel = 1.0 / vec2(textureSize(u_field, 0));
    float hx = slab(markUv + vec2(texel.x, 0.0)) - slab(markUv - vec2(texel.x, 0.0));
    float hy = slab(markUv + vec2(0.0, texel.y)) - slab(markUv - vec2(0.0, texel.y));
    vec3 n = normalize(vec3(-hx * 7.0, -hy * 7.0, 0.22));

    vec3 viewDir = vec3(0.0, 0.0, 1.0);

    // Three refractions at slightly different indices. This is the whole
    // reason the edges go cyan on one side and violet on the other.
    float base = 0.72;
    float spreadAmount = 0.035 * h;
    vec2 rr = refract(-viewDir, n, base - spreadAmount).xy;
    vec2 rg = refract(-viewDir, n, base).xy;
    vec2 rb = refract(-viewDir, n, base + spreadAmount).xy;

    float bend = 0.42 * h;
    colour = vec3(
      field(bg + rr * bend).r,
      field(bg + rg * bend).g,
      field(bg + rb * bend).b
    );

    // the body of the glass carries a little of its own colour
    colour = mix(colour, colour * 1.08 + u_cyan * 0.06, clamp(h * 1.4, 0.0, 1.0));

    // Fresnel: the rim is where you see the most reflected light, which is
    // what makes an edge read as an edge rather than a drawn outline.
    float fresnel = pow(1.0 - clamp(dot(n, viewDir), 0.0, 1.0), 4.0);
    colour += u_light * fresnel * 0.5 * u_reveal;

    // a specular highlight that travels as the piece settles
    float sweepAt = mix(-1.6, 1.6, u_reveal) + sin(u_time * 0.21) * 0.12;
    vec3 lightDir = normalize(vec3(sweepAt, 0.75, 0.85));
    vec3 halfway = normalize(lightDir + viewDir);
    float spec = pow(max(dot(n, halfway), 0.0), 42.0);
    colour += u_light * spec * 0.85 * smoothstep(0.0, 0.35, u_reveal);
  }

  /*
   * Coverage: how much of this pixel is the mark.
   *
   * Outside the glass there is nothing to draw and the card shows through.
   * Inside, the body carries most of it and the rim carries the rest, so the
   * edge stays soft instead of cutting a hard silhouette out of the card.
   * Multiplied into the colour because the context is premultiplied — handing
   * a premultiplied compositor straight colour is what makes an edge look
   * like it has a dark halo around it.
   */
  // h is already sqrt(inside) * u_reveal, so multiplying the coverage by the
  // reveal again squared it: the mark stayed invisible for most of its own
  // arrival and then appeared almost at once near the end.
  float cover = clamp(h * 2.6, 0.0, 1.0);
  outColor = vec4(colour * cover, cover);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // Reported rather than swallowed: a silent shader failure would leave a
    // blank rectangle where the brand should be, and nobody would know why.
    console.error("NN LogoReveal shader failed to compile:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Reads a CSS custom property as a 0–1 RGB triple. */
function readColour(style: CSSStyleDeclaration, name: string, fallback: [number, number, number]) {
  const raw = style.getPropertyValue(name).trim();
  if (!raw) return fallback;
  const hex = /^#([0-9a-f]{6})$/i.exec(raw);
  if (hex) {
    const n = parseInt(hex[1]!, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255] as [number, number, number];
  }
  const triple = raw.split(/[\s,]+/).map(Number);
  if (triple.length >= 3 && triple.every((v) => Number.isFinite(v))) {
    return [triple[0]! / 255, triple[1]! / 255, triple[2]! / 255] as [number, number, number];
  }
  return fallback;
}

export interface LogoRevealProps {
  /** Height of the mark in px. The canvas sizes itself around it. */
  size?: number;
  /** How long the arrival takes, in ms. */
  duration?: number;
  /** Fires once the mark has fully arrived — including on the fallback path. */
  onRevealed?: (() => void) | undefined;
  className?: string | undefined;
}

export function LogoReveal({
  size = 180,
  duration = 2200,
  onRevealed,
  className,
}: LogoRevealProps) {
  const hostRef = React.useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = React.useState(false);
  const revealed = React.useRef(false);

  // The callback is read through a ref so a caller passing an inline arrow
  // does not tear down and restart the GL context on every render.
  const onRevealedRef = React.useRef(onRevealed);
  React.useEffect(() => {
    onRevealedRef.current = onRevealed;
  }, [onRevealed]);

  const announce = React.useCallback(() => {
    if (revealed.current) return;
    revealed.current = true;
    onRevealedRef.current?.();
  }, []);

  React.useEffect(() => {
    if (prefersReducedMotion()) {
      setFallback(true);
      announce();
      return;
    }

    const host = hostRef.current;
    /* A canvas per run of this effect, created here rather than rendered.
       Cleanup loses the context, and a lost context is permanent: ask the
       same element for `webgl2` afterwards and the browser returns the dead
       one, whose shaders then fail to compile with no error text. React keeps
       the DOM node across effect re-runs, so a rendered canvas meant the
       reveal worked once and was a still SVG every time after — the same
       trap the orb was in. */
    const canvas = document.createElement("canvas");
    canvas.className = styles.canvas ?? "";
    canvas.setAttribute("aria-hidden", "true");
    if (!host) return;
    host.appendChild(canvas);
    const drop = () => { canvas.remove(); };

    const gl = canvas.getContext("webgl2", {
      /*
       * The mark sits *in* the glass card, so the canvas has to composite
       * with it. Without an alpha channel a canvas is an opaque tile: every
       * pixel the shader leaves dark is a black hole punched through the
       * card, and the one it punched was 290px of the phone's welcome
       * screen. It also meant the reveal could never actually be a reveal —
       * there was nothing for the mark to arrive *out of*.
       */
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      // A logo reveal is not worth spinning up a discrete GPU.
      powerPreference: "low-power",
    });
    if (!gl) {
      drop();
      setFallback(true);
      announce();
      return;
    }

    const field = buildMarkField(Math.max(96, Math.round(size * 1.6)));
    if (!field) {
      drop();
      setFallback(true);
      announce();
      return;
    }

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = vertex && fragment ? gl.createProgram() : null;
    if (!vertex || !fragment || !program) {
      drop();
      setFallback(true);
      announce();
      return;
    }
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("NN LogoReveal program failed to link:", gl.getProgramInfoLog(program));
      drop();
      setFallback(true);
      announce();
      return;
    }
    gl.useProgram(program);

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    /*
     * Rows, reversed — and this is why the mark arrived upside down.
     *
     * The field is drawn on a 2D canvas, where row 0 is the top. A GL texture
     * addresses row 0 at t = 0, which this shader maps to the *bottom* of the
     * screen. So the canvas's top row was being drawn at the bottom and the N
     * came out inverted, on the door and on the entrance both.
     *
     * `UNPACK_FLIP_Y_WEBGL` cannot fix it: that flag applies only to uploads
     * from an image, canvas or video element, and this is a plain byte array.
     * Flipping the bytes once here keeps every sample site — the slab, the
     * normal, the refraction — reading the same way, which flipping the
     * lookup in the shader would not.
     */
    const rows = new Uint8Array(field.data.length);
    for (let y = 0; y < field.height; y += 1) {
      const from = y * field.width;
      const to = (field.height - 1 - y) * field.width;
      rows.set(field.data.subarray(from, from + field.width), to);
    }
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.R8,
      field.width, field.height, 0,
      gl.RED, gl.UNSIGNED_BYTE, rows,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const u = {
      field: gl.getUniformLocation(program, "u_field"),
      resolution: gl.getUniformLocation(program, "u_resolution"),
      markAspect: gl.getUniformLocation(program, "u_markAspect"),
      time: gl.getUniformLocation(program, "u_time"),
      reveal: gl.getUniformLocation(program, "u_reveal"),
      ground: gl.getUniformLocation(program, "u_ground"),
      cyan: gl.getUniformLocation(program, "u_cyan"),
      violet: gl.getUniformLocation(program, "u_violet"),
      light: gl.getUniformLocation(program, "u_light"),
    };
    gl.uniform1i(u.field, 0);

    /* Palette is read from the tokens once, and again whenever the theme
       changes — never per frame. getComputedStyle in a render loop is a
       guaranteed way to make a smooth animation stutter. */
    const applyPalette = () => {
      const style = getComputedStyle(document.documentElement);
      /* The ground the light falls onto, not a fixed midnight. `--nn-navy-900`
         is the brand's darkest navy and it is correct in the dark theme — but
         in the light theme it painted the entry as a black slab on a white
         page, which is where the founder first saw the light theme not
         following. `--surface-deep` is the same depth in whichever theme is
         on. */
      const ground = readColour(style, "--surface-deep", [0.043, 0.098, 0.188]);
      const cyan = readColour(style, "--nn-spectrum-cyan", [0.161, 0.69, 1]);
      const violet = readColour(style, "--nn-spectrum-violet", [0.718, 0.439, 1]);
      const light = readColour(style, "--nn-icy", [0.663, 0.851, 1]);
      gl.uniform3f(u.ground, ground[0], ground[1], ground[2]);
      gl.uniform3f(u.cyan, cyan[0], cyan[1], cyan[2]);
      gl.uniform3f(u.violet, violet[0], violet[1], violet[2]);
      gl.uniform3f(u.light, light[0], light[1], light[2]);
    };
    applyPalette();
    const themeWatch = new MutationObserver(applyPalette);
    themeWatch.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    let width = 0;
    let height = 0;
    const resize = () => {
      // Two device pixels per CSS pixel is already past what anyone can see
      // on a refraction this soft, and costs four times the fill rate.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const box = host.getBoundingClientRect();
      const w = Math.max(1, Math.round(box.width * dpr));
      const h = Math.max(1, Math.round(box.height * dpr));
      if (w === width && h === height) return;
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.resolution, w, h);

      // The mark's box, in the same square-corrected space the shader uses.
      const markH = (size / box.height) * 1.0;
      const markW = markH * (field.width / field.height);
      gl.uniform2f(u.markAspect, markW, markH);
    };
    resize();

    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
    observer?.observe(host);

    /* Elapsed time is accumulated from the frame delta, not read off the
       clock. The loop pauses whenever the tab is hidden or the canvas is
       scrolled away, and wall time would carry on without it — the founder
       would switch back to a mark that had already arrived without them. */
    let elapsed = 0;
    /*
     * If the reveal never starts, show the mark anyway.
     *
     * The canvas is transparent until the shader draws, so a GPU that is
     * slow, busy, throttled or simply never scheduled leaves the founder
     * looking at an empty card on the first screen of their own
     * environment. Nothing in the GL path can notice that, because the thing
     * that has not happened is the frame loop itself.
     *
     * A timer can. If no frame has been drawn by the time this fires, the
     * SVG mark takes over — the same geometry given the same optical
     * treatment, no GPU required. Falling back costs the animation; not
     * falling back costs the logo.
     */
    let frames = 0;
    const watchdog = window.setTimeout(() => {
      if (frames === 0) setFallback(true);
    }, 1500);

    const stop = createFrameLoop(host, (dt) => {
      frames += 1;
      resize();
      elapsed += dt * 1000;
      const t = Math.min(1, elapsed / duration);
      // ease-out quint: quick to arrive, long to settle
      const eased = 1 - Math.pow(1 - t, 5);
      gl.uniform1f(u.time, elapsed / 1000);
      gl.uniform1f(u.reveal, eased);
      // Transparent, not black: the clear colour is what every pixel the
      // mark does not cover ends up being.
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (t >= 1) announce();
    });

    return () => {
      window.clearTimeout(watchdog);
      stop();
      observer?.disconnect();
      themeWatch.disconnect();
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      // Frees the drawing buffer immediately rather than waiting for the GC,
      // which matters on a machine with 8 GB and a browser holding several
      // contexts open at once.
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      drop();
    };
  }, [size, duration, announce]);

  return (
    <div
      ref={hostRef}
      className={className ? `${styles.host} ${className}` : styles.host}
      style={{ ["--reveal-size" as string]: `${size}px` }}
    >
      {fallback ? (
        /* NNGlassMark already names itself. Adding a second "NN" alongside it
           would have a screen reader read the brand out twice. */
        <span className={styles.fallback}>
          <NNGlassMark size={size} />
        </span>
      ) : (
        <>
          {/* A canvas has no accessible name of its own, and the mark is the
              product's name — so it is given one, as text. */}
          <span className={styles.name}>NN</span>
        </>
      )}
    </div>
  );
}
