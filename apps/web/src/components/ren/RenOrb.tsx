"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./RenOrb.module.css";

/**
 * REN.
 *
 * A sphere of moving light. Not an avatar, not a face, not a robot — a body
 * of coloured light that changes how it moves depending on what REN is doing,
 * so you can tell at a glance whether it is waiting, hearing you, working or
 * answering, without reading a word.
 *
 * One WebGL2 fragment shader draws it: a ray marched against a sphere whose
 * surface is displaced by domain-warped noise, lit from inside so the colour
 * comes through the shell rather than off it. The colour is NN's own
 * spectrum — cyan through violet — read from the live theme tokens, so
 * retheming NN rethemes REN without this file knowing.
 *
 * Four states, four different motions:
 *
 * - **idle** — almost still. A slow breath. REN is not doing anything and
 *   does not pretend to be.
 * - **listening** — the surface opens and tracks, quick and responsive.
 * - **thinking** — a tight, fast swirl that does not resolve. Work in
 *   progress reads as work in progress.
 * - **speaking** — a steady rhythm, because something is coming out.
 *
 * It paints only while on screen and stops entirely under reduced motion,
 * where it settles into a still frame rather than disappearing.
 */

/**
 * REN's own six states, so the orb speaks the same vocabulary as the state
 * machine and nothing has to translate at the call site.
 */
export type RenOrbState =
  | "idle" | "awakening" | "listening" | "thinking" | "speaking" | "complete";

export interface RenOrbProps {
  state?: RenOrbState;
  /** Rendered size in CSS px. */
  size?: number;
  /** 0–1. How loud REN is hearing or speaking; drives the surface. */
  level?: number;
  className?: string | undefined;
}

const VERT = `#version 300 es
in vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

/**
 * The orb.
 *
 * `shell` is a unit sphere displaced by two octaves of warped value noise.
 * The march is short because the surface is shallow — twenty-eight steps is
 * enough and keeps a phone cool. Colour is picked from the spectrum by the
 * displacement itself, so where the surface rises it also changes hue.
 */
const FRAG = `#version 300 es
precision highp float;
out vec4 outColor;

uniform vec2  uRes;
uniform float uTime;
uniform float uLevel;     // 0..1 loudness
uniform float uCalm;      // 1 = idle, 0 = fully active
uniform float uSwirl;     // thinking
uniform float uPulse;     // speaking rhythm
uniform vec3  uA;         // cyan
uniform vec3  uB;         // blue
uniform vec3  uC;         // indigo
uniform vec3  uD;         // violet

float hash(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }

float noise(vec3 p){
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n = mix(
    mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
        mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
    mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
        mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  return n * 2.0 - 1.0;
}

float fbm(vec3 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

/** Displacement of the shell at a direction on the sphere. */
float relief(vec3 n, out float band){
  float t = uTime;
  // Warp the sampling direction with itself: this is what makes the surface
  // fold rather than merely ripple.
  vec3 q = n * 2.1 + vec3(0.0, 0.0, t * 0.22);
  vec3 w = vec3(fbm(q), fbm(q + 5.2), fbm(q + 9.1));
  float swirl = uSwirl * 1.4;
  vec3 r = n * 2.6 + w * (1.0 + swirl) + vec3(t * 0.35 * (0.3 + swirl), 0.0, 0.0);
  float f = fbm(r);
  band = f * 0.5 + 0.5;
  float breath = 0.012 * sin(t * 0.9);
  float voice = uLevel * 0.10 * (0.5 + 0.5 * sin(t * 7.0 + f * 4.0)) * uPulse;
  return f * mix(0.035, 0.115, 1.0 - uCalm) + breath + voice;
}

vec3 spectrum(float x){
  x = clamp(x, 0.0, 1.0);
  return x < 0.33 ? mix(uA, uB, x / 0.33)
       : x < 0.66 ? mix(uB, uC, (x - 0.33) / 0.33)
                  : mix(uC, uD, (x - 0.66) / 0.34);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / min(uRes.x, uRes.y) * 2.2;
  float r2 = dot(uv, uv);
  if (r2 > 1.32) { outColor = vec4(0.0); return; }

  // The sphere's surface point for this pixel, and its normal.
  float z = sqrt(max(0.0, 1.0 - r2));
  vec3 n = normalize(vec3(uv, z));

  float band;
  float d = relief(n, band);

  // Light from inside: the shell glows where it is thin, so the colour comes
  // through rather than bouncing off, which is what stops it reading as a ball.
  float fres = pow(1.0 - max(z, 0.0), 2.1);
  float core = smoothstep(1.12, 0.1, r2);

  // The whole spectrum across the surface, not a slice of it: a narrow
  // mapping made REN one flat violet ball instead of a body of light.
  vec3 colour = spectrum(band * 1.25 + d * 3.4 - 0.12);
  // The rim runs cooler than the core, which is what gives it depth.
  colour = mix(colour, spectrum(band * 0.5), fres * 0.55);
  colour += spectrum(0.08) * fres * fres * 0.55;

  // A bright filament where the relief peaks — the thread of light in the
  // founder's reference, and what makes the surface read as moving.
  float thread = smoothstep(0.042, 0.082, d) * (0.7 + 0.9 * uLevel);
  colour += vec3(0.88, 0.97, 1.0) * thread * 0.95;

  // A specular glint, kept small: too much and it becomes a glass marble.
  vec3 L = normalize(vec3(-0.42, 0.68, 0.72));
  float spec = pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 48.0);
  colour += vec3(1.0) * spec * 0.22;

  float alpha = core * (0.34 + 0.66 * smoothstep(0.0, 0.5, fres + thread + 0.26));
  // A soft halo just outside the sphere, so it sits in the room rather than
  // being cut out of it.
  alpha += smoothstep(1.32, 0.98, r2) * 0.16;

  outColor = vec4(colour * alpha, clamp(alpha, 0.0, 1.0));
}`;

/** Per-state motion. `calm` 1 is still; `swirl` and `pulse` shape the rest. */
const PROFILE: Record<RenOrbState, { calm: number; swirl: number; pulse: number; speed: number }> = {
  idle:      { calm: 1.00, swirl: 0.00, pulse: 0.0, speed: 0.45 },
  // Coming awake: everything opens at once, briefly, before settling into
  // listening. It is the only state that is louder than the one after it.
  awakening: { calm: 0.10, swirl: 0.35, pulse: 0.5, speed: 1.45 },
  listening: { calm: 0.30, swirl: 0.20, pulse: 0.3, speed: 1.00 },
  thinking:  { calm: 0.40, swirl: 1.00, pulse: 0.0, speed: 1.35 },
  speaking:  { calm: 0.20, swirl: 0.15, pulse: 1.0, speed: 1.10 },
  // Finished: almost back to rest, with one last turn still unwinding.
  complete:  { calm: 0.80, swirl: 0.05, pulse: 0.1, speed: 0.65 },
};

/** Reads an NN spectrum token as a 0–1 triple off the live theme. */
function spectrumToken(element: Element, token: string, fallback: [number, number, number]) {
  const raw = getComputedStyle(element).getPropertyValue(token).trim();
  const parts = raw.split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return fallback;
  return [parts[0]! / 255, parts[1]! / 255, parts[2]! / 255] as [number, number, number];
}

const LABEL: Record<RenOrbState, string> = {
  idle: "REN is idle",
  awakening: "REN is waking",
  listening: "REN is listening",
  thinking: "REN is working",
  speaking: "REN is speaking",
  complete: "REN has finished",
};

export function RenOrb({ state = "idle", size = 120, level = 0, className }: RenOrbProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  // Live values the frame loop reads, so changing state never restarts the
  // shader or resets the clock REN is animating against.
  const live = useRef({ state, level });
  live.current = { state, level };

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true, premultipliedAlpha: true, antialias: false,
      powerPreference: "low-power",
    });
    if (!gl) { setFallback(true); return; }

    const compile = (type: number, src: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    const program = gl.createProgram();
    if (!vs || !fs || !program) { setFallback(true); return; }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { setFallback(true); return; }
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const location = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);

    const u: Record<string, WebGLUniformLocation | null> = {};
    for (const name of ["uRes", "uTime", "uLevel", "uCalm", "uSwirl", "uPulse", "uA", "uB", "uC", "uD"]) {
      u[name] = gl.getUniformLocation(program, name);
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Read once, and again only when the theme actually changes — never per
    // frame: getComputedStyle forces a style recalculation every time.
    let colours = {
      a: spectrumToken(host, "--nn-spectrum-cyan", [0.16, 0.69, 1]),
      b: spectrumToken(host, "--nn-spectrum-blue", [0.14, 0.4, 1]),
      c: spectrumToken(host, "--nn-spectrum-indigo", [0.42, 0.44, 1]),
      d: spectrumToken(host, "--nn-spectrum-violet", [0.72, 0.44, 1]),
    };
    const readColours = () => {
      colours = {
        a: spectrumToken(host, "--nn-spectrum-cyan", colours.a),
        b: spectrumToken(host, "--nn-spectrum-blue", colours.b),
        c: spectrumToken(host, "--nn-spectrum-indigo", colours.c),
        d: spectrumToken(host, "--nn-spectrum-violet", colours.d),
      };
    };
    const themeWatch = new MutationObserver(readColours);
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let visible = true;
    let last = 0;
    // Accumulated rather than read from the wall clock, so a backgrounded tab
    // resumes where REN left off instead of jumping.
    let elapsed = 0;
    // Eased towards the target so switching state is a transition, not a cut.
    let calm = 1, swirl = 0, pulse = 0, loud = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.uRes!, canvas.width, canvas.height);
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;

      const profile = PROFILE[live.current.state];
      const ease = Math.min(1, dt * 3.5);
      calm += (profile.calm - calm) * ease;
      swirl += (profile.swirl - swirl) * ease;
      pulse += (profile.pulse - pulse) * ease;
      loud += (Math.max(0, Math.min(1, live.current.level)) - loud) * Math.min(1, dt * 9);
      elapsed += dt * profile.speed;

      resize();
      gl.uniform1f(u.uTime!, elapsed);
      gl.uniform1f(u.uLevel!, loud);
      gl.uniform1f(u.uCalm!, calm);
      gl.uniform1f(u.uSwirl!, swirl);
      gl.uniform1f(u.uPulse!, pulse);
      gl.uniform3fv(u.uA!, colours.a);
      gl.uniform3fv(u.uB!, colours.b);
      gl.uniform3fv(u.uC!, colours.c);
      gl.uniform3fv(u.uD!, colours.d);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Reduced motion gets one settled frame and then stops, rather than
      // losing REN entirely: a still orb is still REN.
      if (visible && !reduced.matches) raf = requestAnimationFrame(frame);
    };

    const kick = () => { if (!raf && visible) { last = 0; raf = requestAnimationFrame(frame); } };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) kick();
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    });
    io.observe(host);

    const onVisibility = () => { visible = document.visibilityState === "visible"; if (visible) kick(); };
    document.addEventListener("visibilitychange", onVisibility);
    const onMotion = () => kick();
    reduced.addEventListener("change", onMotion);
    const ro = new ResizeObserver(() => kick());
    ro.observe(host);

    kick();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      themeWatch.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onMotion);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className={[styles.orb, className ?? ""].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
      data-state={state}
      role="img"
      aria-label={LABEL[state]}
    >
      {/* Without WebGL the orb is still an orb: the same spectrum as a
          conic gradient, breathing on the compositor. */}
      {fallback ? <span className={styles.flat} aria-hidden="true" /> : null}
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />
    </div>
  );
}

export default RenOrb;
