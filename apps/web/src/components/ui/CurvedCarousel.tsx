"use client";

import {
  useCallback, useEffect, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { ART_PRESETS, presetFor, seedFor, type ArtPreset, type ArtRecipe } from "@/lib/folderArt";
import { paintArt } from "@/lib/artPainter";
import styles from "./CurvedCarousel.module.css";

/**
 * NN's applications, seen through a curved lens.
 *
 * The cards sit on one WebGL canvas. The middle one reads flat; the further a
 * card travels from the centre the taller and more bent it grows, with a
 * fringe of chromatic split at the rim — so the row has depth without any
 * card being hidden. Drag it, flick it, use the arrow keys or the buttons; it
 * settles on a spring and loops.
 *
 * Two NN-specific decisions:
 *
 * - **Nothing is fetched.** The reference carousel loads photographs. NN's
 *   cards are painted on the device from the approved palette, by the same
 *   painter the folders use and sharing its frame budget, so the carousel adds
 *   no network request and no asset to ship.
 * - **The canvas is decoration.** Every control it offers also exists as a
 *   real button: previous, next, open, and a list of every slide. Without
 *   WebGL the canvas simply does not appear and that list becomes the
 *   carousel — which is why there is no separate fallback to maintain.
 *
 * Adapted from the founder's supplied curved-lens reference.
 */

export interface CarouselSlide {
  id: string;
  title: string;
  /** Small line above the title — the family, or the state. */
  kicker?: string;
  /** One short line under it. */
  caption?: string;
  /** Overrides the artwork chosen from the title. */
  art?: ArtPreset | ArtRecipe;
  /** Whether choosing this slide leads anywhere yet. */
  ready?: boolean;
}

export interface CurvedCarouselProps {
  slides: readonly CarouselSlide[];
  label?: string;
  /** How hard the lens bends the outer cards. 0 is flat. */
  bend?: number;
  /** Fired when a slide reaches the centre. Mounting is not choosing. */
  onChange?: (slide: CarouselSlide, index: number) => void;
  /** Fired when the founder opens the centred slide. */
  onOpen?: (slide: CarouselSlide, index: number) => void;
  className?: string | undefined;
}

/* ---------------------------------------------------------------- motion -- */

/** Wraps any index into 0..n-1, including negatives. */
export function wrapIndex(i: number, n: number): number {
  return n > 0 ? ((i % n) + n) % n : 0;
}

/** Signed distance of slide i from the scroll position, the short way round. */
export function offsetOf(i: number, position: number, n: number): number {
  if (n <= 0) return 0;
  return wrapIndex(i - position + n / 2, n) - n / 2;
}

/** Where a flick comes to rest: the nearest whole slide, at most `max` away. */
export function restFor(position: number, velocity: number, max = 3): number {
  const thrown = position + Math.max(-max, Math.min(max, velocity * 0.18));
  return Math.round(thrown);
}

/** One step of a critically damped spring (slides, slides/s, seconds). */
export function springStep(
  position: number, velocity: number, target: number, dt: number, omega = 11,
): [number, number] {
  const acceleration = (target - position) * omega * omega - velocity * 2 * omega;
  const next = velocity + acceleration * dt;
  return [position + next * dt, next];
}

/** Card size for a stage of w × h: portrait, a smaller share of a wide stage. */
export function cardSize(w: number, h: number): [number, number] {
  const width = Math.min(w < 640 ? w * 0.56 : w * 0.22, h * 0.34);
  return [Math.round(width), Math.round(width * 1.25)];
}

/* ---------------------------------------------------------------- shader -- */

const VERT =
  "attribute vec2 aPos;" +
  "uniform vec2 uRes;uniform vec2 uSize;uniform float uX;uniform float uBend;uniform float uVel;uniform float uIntro;uniform float uLift;" +
  "varying vec2 vUv;varying float vX;" +
  "void main(){" +
  "vec2 p=vec2(uX+(aPos.x-.5)*uSize.x,(aPos.y-.5)*uSize.y);" +
  "p.y-=(1.-uIntro)*uSize.y*.9;" +
  "vec2 n=p/(uRes*.5);" +
  "float x=clamp(n.x,-1.4,1.4);" +
  "n.y*=1.+uBend*x*x;" +
  "n.y+=uVel*.05*sin(aPos.x*3.14159)*(aPos.y-.5);" +
  "n.x*=1.-.06*uBend*x*x;n.y+=uLift;" +
  "vUv=aPos;vX=x;" +
  "gl_Position=vec4(n,0.,1.);}";

const FRAG =
  "precision highp float;" +
  "uniform sampler2D uTex;uniform vec2 uSize;uniform float uAspect;uniform float uVel;uniform float uIntro;uniform float uShift;uniform float uReady;" +
  "varying vec2 vUv;varying float vX;" +
  "float box(vec2 q,vec2 b,float r){vec2 d=abs(q)-b+r;return length(max(d,0.))+min(max(d.x,d.y),0.)-r;}" +
  "void main(){" +
  "float a=uSize.x/uSize.y;vec2 uv=vUv-.5;" +
  "if(uAspect>a)uv.x*=a/uAspect;else uv.y*=uAspect/a;" +
  "uv=uv/1.12+.5;uv.x+=uShift;" +
  "float ca=(.0012+.0045*vX*vX)*(1.+abs(uVel)*1.2);" +
  "vec3 c=vec3(texture2D(uTex,uv+vec2(ca,0.)).r,texture2D(uTex,uv).g,texture2D(uTex,uv-vec2(ca,0.)).b);" +
  "c=mix(vec3(.05,.08,.18),c,uReady);" +
  "c*=1.-.42*min(1.,vX*vX);" +
  "float d=box((vUv-.5)*uSize,uSize*.5,14.);" +
  "float rim=smoothstep(-5.,0.,d);" +
  "c+=rim*.10;" +
  "c+=.07*smoothstep(.55,1.,vUv.y)*(1.-abs(vX));" +
  "float al=smoothstep(.75,-.75,d)*uIntro;" +
  "gl_FragColor=vec4(c*al,al);}";

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

/** A (segX × segY) grid of quads as triangles, positions 0..1. */
function grid(segX: number, segY: number): Float32Array {
  const out: number[] = [];
  for (let y = 0; y < segY; y += 1) {
    for (let x = 0; x < segX; x += 1) {
      const x0 = x / segX;
      const x1 = (x + 1) / segX;
      const y0 = y / segY;
      const y1 = (y + 1) / segY;
      out.push(x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1);
    }
  }
  return new Float32Array(out);
}

/* ------------------------------------------------------------- component -- */

export function CurvedCarousel({
  slides,
  label = "Applications",
  bend = 0.55,
  onChange,
  onOpen,
  className,
}: CurvedCarouselProps) {
  const count = slides.length;
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [index, setIndex] = useState(0);
  const [hasGL, setHasGL] = useState(true);
  // Filled in once the GL effect has run. Until then the buttons are live
  // but do nothing, which is correct: there is no carousel to move yet.
  const api = useRef<{ go: (delta: number) => void; jump: (to: number) => void }>({
    go: () => {},
    jump: () => {},
  });

  // Held in refs so the frame loop reads the current handlers without being
  // torn down and rebuilt — restarting the loop would reset the spring.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const slidesRef = useRef(slides);
  slidesRef.current = slides;

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!canvas || !root || !stage || count === 0) return;

    const gl = canvas.getContext("webgl", {
      premultipliedAlpha: true, antialias: true, alpha: true,
      powerPreference: "low-power",
    });
    if (!gl) { setHasGL(false); return; }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const program = gl.createProgram();
    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!program || !vs || !fs) { setHasGL(false); return; }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { setHasGL(false); return; }
    gl.useProgram(program);

    const mesh = grid(36, 12);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
    const attribute = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(attribute);
    gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);

    const u: Record<string, WebGLUniformLocation | null> = {};
    for (const name of [
      "uRes", "uSize", "uX", "uBend", "uVel", "uIntro",
      "uTex", "uAspect", "uShift", "uReady", "uLift",
    ]) {
      u[name] = gl.getUniformLocation(program, name);
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    let disposed = false;

    // One texture per slide, starting as a single deep-navy pixel so a card
    // that has not been painted yet reads as an empty card rather than noise.
    const textures = slidesRef.current.map((slide) => {
      const texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([13, 20, 46, 255]),
      );
      for (const [p, v] of [
        [gl.TEXTURE_MIN_FILTER, gl.LINEAR],
        [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
        [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE],
        [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE],
      ] as const) {
        gl.texParameteri(gl.TEXTURE_2D, p, v);
      }

      const entry = { texture, aspect: 0.8, ready: false };
      const recipe: ArtRecipe =
        slide.art === undefined
          ? ART_PRESETS[presetFor(slide.title)]
          : typeof slide.art === "string"
            ? ART_PRESETS[slide.art]
            : slide.art;

      void paintArt(recipe, seedFor(slide.title), 256, 320, 0).then((source) => {
        if (disposed) return;
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        entry.aspect = source.width / source.height;
        entry.ready = true;
        kick();
      });
      return entry;
    });

    // Stage geometry, measured on resize only; the frame loop just reads it.
    let stageW = 1;
    let stageH = 1;
    let cardW = 1;
    let cardH = 1;
    let gap = 1;
    let position = 0;
    let velocity = 0;
    let target = 0;
    let intro = reduced.matches ? 1 : 0;
    let introStart = -1;
    let dragging = false;
    let dragX = 0;
    let dragPosition = 0;
    let lastX = 0;
    let lastTime = 0;
    let flick = 0;
    let raf = 0;
    let last = 0;
    let visible = true;
    let current = 0;

    const resize = (w: number, h: number) => {
      stageW = Math.max(1, w);
      stageH = Math.max(1, h);
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(stageW * dpr);
      canvas.height = Math.round(stageH * dpr);
      [cardW, cardH] = cardSize(stageW, stageH);
      gap = cardW * 0.14;
      gl.viewport(0, 0, canvas.width, canvas.height);
      kick();
    };

    const draw = () => {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u.uRes!, stageW, stageH);
      gl.uniform2f(u.uSize!, cardW, cardH);
      gl.uniform1f(u.uBend!, bend);
      gl.uniform1f(u.uVel!, reduced.matches ? 0 : Math.max(-1, Math.min(1, velocity * 0.12)));
      gl.uniform1f(u.uLift!, 0);
      const step = cardW + gap;

      for (let i = 0; i < count; i += 1) {
        const distance = offsetOf(i, position, count);
        const x = distance * step;
        // Skip anything the lens cannot reach: at 34 applications most of the
        // ring is behind the viewer on any given frame.
        if (Math.abs(x) > stageW * 0.5 + step * 1.5) continue;
        const order = Math.abs(distance);
        const t = Math.max(0, Math.min(1, (intro - order * 0.12) / 0.6));
        const eased = 1 - Math.pow(1 - t, 3);
        const entry = textures[i]!;
        gl.bindTexture(gl.TEXTURE_2D, entry.texture);
        gl.uniform1f(u.uX!, x);
        gl.uniform1f(u.uIntro!, eased);
        gl.uniform1f(u.uAspect!, entry.aspect);
        gl.uniform1f(u.uReady!, entry.ready ? 1 : 0);
        gl.uniform1f(u.uShift!, Math.max(-0.05, Math.min(0.05, -distance * 0.035)));
        gl.drawArrays(gl.TRIANGLES, 0, mesh.length / 2);
      }
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;

      if (intro < 1) {
        if (introStart < 0) introStart = now;
        intro = Math.min(1.5, (now - introStart) / 1100);
        if (intro >= 1.5) intro = 1;
      }

      if (!dragging) {
        if (reduced.matches) { position = target; velocity = 0; }
        else [position, velocity] = springStep(position, velocity, target, dt);
      }

      const next = wrapIndex(Math.round(position), count);
      if (next !== current) {
        current = next;
        setIndex(next);
        const slide = slidesRef.current[next];
        if (slide) onChangeRef.current?.(slide, next);
      }

      draw();

      const settled =
        !dragging &&
        Math.abs(target - position) < 0.0005 &&
        Math.abs(velocity) < 0.001 &&
        (intro >= 1 || reduced.matches);

      if (settled) { position = target; draw(); last = 0; }
      else if (visible) raf = requestAnimationFrame(frame);
    };

    function kick() {
      if (!raf && visible && !disposed) raf = requestAnimationFrame(frame);
    }

    api.current.go = (delta: number) => { target = Math.round(target) + delta; kick(); };
    api.current.jump = (to: number) => {
      // Travel the short way round rather than unwinding the whole ring.
      target = Math.round(target) + offsetOf(to, wrapIndex(Math.round(target), count), count);
      kick();
    };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      dragging = true;
      dragX = event.clientX;
      lastX = event.clientX;
      lastTime = event.timeStamp;
      dragPosition = position;
      flick = 0;
      canvas.setPointerCapture(event.pointerId);
      kick();
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging) return;
      const step = cardW + gap;
      const dts = Math.max(1, event.timeStamp - lastTime) / 1000;
      flick = flick * 0.6 + (-(event.clientX - lastX) / step / dts) * 0.4;
      velocity = flick;
      lastX = event.clientX;
      lastTime = event.timeStamp;
      position = dragPosition - (event.clientX - dragX) / step;
      kick();
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      target = restFor(position, flick);
      velocity = flick;
      kick();
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    const onMotion = () => kick();
    reduced.addEventListener("change", onMotion);

    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box) resize(box.width, box.height);
    });
    ro.observe(stage);

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible) kick();
    });
    io.observe(stage);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      reduced.removeEventListener("change", onMotion);
      for (const entry of textures) gl.deleteTexture(entry.texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, [count, bend]);

  const go = useCallback((delta: number) => { api.current.go(delta); }, []);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") go(1);
    else if (event.key === "ArrowLeft") go(-1);
    else if (event.key === "Home") api.current.jump(0);
    else if (event.key === "End") api.current.jump(count - 1);
    else return;
    event.preventDefault();
  };

  const slide = slides[index] ?? slides[0];
  if (!slide) return null;

  return (
    <div
      ref={rootRef}
      className={[styles.root, hasGL ? "" : styles.flat, className ?? ""].filter(Boolean).join(" ")}
      role="group"
      aria-roledescription="carousel"
      aria-label={label}
    >
      {/* The lens gets its own band. The reference overlays its copy on the
          cards because it shows nine of them with dead space either side; NN
          shows thirty-four, so the row is full width and an overlay would
          land on a card at every size. */}
      <div className={styles.stage} ref={stageRef}>
        {hasGL ? (
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            aria-hidden="true"
            tabIndex={-1}
          />
        ) : null}
      </div>

      <div className={styles.footer}>
      <div className={styles.copy}>
        {slide.kicker ? <span className={styles.kicker}>{slide.kicker}</span> : null}
        <h3 className={styles.title}>{slide.title}</h3>
        {slide.caption ? <p className={styles.caption}>{slide.caption}</p> : null}
        <button
          type="button"
          className={styles.open}
          onClick={() => onOpen?.(slide, index)}
        >
          {slide.ready === false ? `About ${slide.title}` : `Open ${slide.title}`}
        </button>
      </div>

      {/* The real controls. The canvas above is decoration; everything the
          carousel can do is reachable from here, with or without WebGL. */}
      <div className={styles.controls} onKeyDown={onKeyDown}>
        <p className={styles.count} aria-live="polite">
          <span>{String(index + 1).padStart(2, "0")}</span>
          <i> / {String(count).padStart(2, "0")}</i>
          <span className={styles.srOnly}> — {slide.title}</span>
        </p>
        <span className={styles.bar} aria-hidden="true">
          <span style={{ transform: `scaleX(${count ? (index + 1) / count : 0})` }} />
        </span>
        <div className={styles.buttons}>
          <button type="button" aria-label="Previous application" onClick={() => go(-1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button type="button" aria-label="Next application" onClick={() => go(1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
      </div>

      <ul className={styles.list} aria-label={`All ${label.toLowerCase()}`}>
        {slides.map((entry, i) => (
          <li key={entry.id}>
            <button
              type="button"
              aria-current={i === index ? "true" : undefined}
              onClick={() => { api.current.jump(i); setIndex(i); }}
            >
              {entry.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
