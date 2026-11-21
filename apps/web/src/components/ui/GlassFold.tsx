"use client";

import { useEffect, useRef } from "react";
import { createFrameLoop, onMotionPreferenceChange, prefersReducedMotion } from "@/lib/motion";
import styles from "./GlassFold.module.css";

/**
 * The room NN lives in.
 *
 * Panes of glass folded over one another, rendered on the GPU. Each pane has a
 * single creased edge that catches the light and thins out to nothing behind
 * it; panes screen over one another, so an overlap gets *brighter* rather than
 * muddier — which is how stacked glass actually behaves and why this reads as
 * depth instead of as a gradient.
 *
 * Three colours and nothing else, taken from NN's tokens so the room changes
 * with the theme. No dependencies: the shader is the whole implementation.
 */

export interface GlassFoldProps {
  /** The body of each pane. Defaults to the `--env-pane` token. */
  color1?: string;
  /** The ground the panes sit in. Defaults to `--env-ground`. */
  color2?: string;
  /** The lit creases. Defaults to `--env-light`. */
  color3?: string;
  /** Drift speed. 0 freezes the room. */
  speed?: number;
  /** How tightly the folds pack. Higher means more, smaller folds. */
  scale?: number;
  /** Film grain, 0 to 0.5. Grain is what stops a dark gradient from banding. */
  noise?: number;
  className?: string | undefined;
}

const VERTEX = `
  attribute vec2 position;
  varying vec2 vUv;
  void main() {
    vUv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT = `
  precision highp float;

  uniform float u_time;
  uniform vec3 u_color1;
  uniform vec3 u_color2;
  uniform vec3 u_color3;
  uniform float u_scale;
  uniform float u_noise;
  uniform vec2 u_resolution;
  varying vec2 vUv;

  float grain(vec2 st) {
    return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
  }

  // centered coordinates, y in [-0.5, 0.5], x stretched by the aspect ratio
  vec2 centered(vec2 uv) {
    vec2 p = uv - 0.5;
    p.x *= u_resolution.x / max(u_resolution.y, 1.0);
    return p;
  }

  mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }

  // panes of glass folded over each other. Each pane has one creased edge
  // that catches the light and thins out to nothing behind it; panes screen
  // over one another, so overlaps get brighter instead of darker.
  vec3 shade(vec2 uv, float time) {
    vec2 q = rot(0.6) * centered(uv) * 2.0 * u_scale;
    float t = time * 0.6;
    float pixel = 2.0 * u_scale / max(u_resolution.y, 1.0);

    vec3 color = mix(u_color2, u_color2 * 0.45, clamp(length(centered(uv)) * 1.3, 0.0, 1.0));

    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float bend = mod(fi, 2.0) * 2.0 - 1.0;

      float crease = (fi - 2.5) * 0.4
                   + 0.26 * sin(q.x * (1.05 + 0.12 * fi) + fi * 1.9 + t * (0.25 + 0.05 * fi))
                   + 0.1 * bend * q.x * q.x;
      float s = q.y - crease;
      float pane = smoothstep(-pixel, pixel, s);
      float back = max(s, 0.0);

      // thick near the crease, clear further in
      float body = exp(-back * 1.7);
      float fresnel = exp(-back * 8.0);
      // the lit edge, and a fainter line just inside it for the glass's thickness
      float rim = exp(-back * 80.0);
      float inner = exp(-pow((back - 0.045) / 0.014, 2.0));
      float bloom = exp(-abs(s) * 20.0);

      vec3 tint = mix(u_color1, u_color3, clamp(fresnel * 0.6 + 0.08 + 0.14 * sin(fi * 2.1 + q.x * 0.8 + t * 0.2), 0.0, 1.0));
      vec3 light = tint * pane * (body * 0.42 + fresnel * 0.4)
                 + u_color3 * (pane * (rim * 0.6 + inner * 0.12) + bloom * 0.1);

      // screen blend
      color += light * (1.0 - color);
    }

    return clamp(color, 0.0, 1.0);
  }

  void main() {
    vec3 color = shade(vUv, u_time);
    if (u_noise > 0.001) {
      float g = grain(vUv * 200.0 + u_time * 0.1);
      color *= 1.0 - u_noise * 0.4 + u_noise * g * 0.4;
    }
    gl_FragColor = vec4(color, 1.0);
  }
`;

type Rgb = [number, number, number];

function hexToVec3(hex: string): Rgb {
  const h = hex.trim().replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return [0, 0, 0];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Compiles a stage and reports the log instead of failing silently. */
function compile(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    // Without this check a bad shader paints pure black with no explanation.
    console.error("NN GlassFold shader failed to compile:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function GlassFold({
  color1,
  color2,
  color3,
  speed = 0.32,
  scale = 1,
  noise = 0.1,
  className,
}: GlassFoldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // The draw loop reads the latest props from here, so changing one never
  // rebuilds the WebGL program.
  const props = useRef({ color1, color2, color3, speed, scale, noise });
  props.current = { color1, color2, color3, speed, scale, noise };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      // Keeps a MacBook on its integrated GPU: NN is a window the founder
      // leaves open, and the room is not worth waking a discrete card for.
      powerPreference: "low-power",
    });
    if (!gl) {
      canvas.dataset["fallback"] = "true";
      return;
    }

    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) {
      canvas.dataset["fallback"] = "true";
      return;
    }

    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("NN GlassFold program failed to link:", gl.getProgramInfoLog(program));
      canvas.dataset["fallback"] = "true";
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uniform = (name: string) => gl.getUniformLocation(program, name);
    const u = {
      time: uniform("u_time"),
      color1: uniform("u_color1"),
      color2: uniform("u_color2"),
      color3: uniform("u_color3"),
      scale: uniform("u_scale"),
      noise: uniform("u_noise"),
      resolution: uniform("u_resolution"),
    };

    /* The room's colours come from NN's tokens, so it follows the theme. They
       are resolved once and re-resolved on a theme change rather than every
       frame — getComputedStyle in a draw loop would force layout 60x a second. */
    let palette: { pane: Rgb; ground: Rgb; light: Rgb } = {
      pane: [0, 0, 0],
      ground: [0, 0, 0],
      light: [0, 0, 0],
    };
    const resolvePalette = () => {
      const style = getComputedStyle(canvas);
      const token = (name: string, fallback: string) => {
        const value = style.getPropertyValue(name).trim();
        return value.length > 0 ? value : fallback;
      };
      const p = props.current;
      palette = {
        pane: hexToVec3(p.color1 ?? token("--env-pane", "#1F4C96")),
        ground: hexToVec3(p.color2 ?? token("--env-ground", "#07111F")),
        light: hexToVec3(p.color3 ?? token("--env-light", "#9CC8FF")),
      };
    };
    resolvePalette();

    // Resize only when the canvas or device-pixel ratio actually changes.
    // Reading layout dimensions and resetting the viewport on every animation
    // frame adds avoidable main-thread work to a surface that runs all session.
    let bufferWidth = 0;
    let bufferHeight = 0;
    const resize = () => {
      // Capped at 2x: a 3x retina canvas costs 2.25x the fill rate for a
      // difference nobody can see in a soft, noisy gradient.
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (width === bufferWidth && height === bufferHeight) return false;
      bufferWidth = width;
      bufferHeight = height;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      return true;
    };

    let elapsed = 0;

    const draw = (dt: number) => {
      const p = props.current;
      // Accumulate speed over time, so changing it never makes the room jump.
      elapsed += dt * p.speed;

      gl.uniform1f(u.time, elapsed);
      gl.uniform3fv(u.color1, palette.pane);
      gl.uniform3fv(u.color2, palette.ground);
      gl.uniform3fv(u.color3, palette.light);
      gl.uniform1f(u.scale, p.scale);
      gl.uniform1f(u.noise, p.noise);
      gl.uniform2f(u.resolution, canvas.width, canvas.height);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    // Establish the correct drawing buffer before either the animated or
    // reduced-motion first frame is painted.
    resize();

    let still = prefersReducedMotion();
    let stopLoop: (() => void) | null = null;

    const applyMotionPreference = () => {
      still = prefersReducedMotion();
      if (still) {
        stopLoop?.();
        stopLoop = null;
        draw(0);
      } else if (!stopLoop) {
        stopLoop = createFrameLoop(canvas, (dt) => draw(dt));
      }
    };
    applyMotionPreference();
    const stopMotionWatcher = onMotionPreferenceChange(applyMotionPreference);

    const themeWatcher = new MutationObserver(() => {
      resolvePalette();
      if (still) draw(0);
    });
    themeWatcher.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // The observer handles element changes; window resize also catches
    // display-scale changes where CSS dimensions remain identical but
    // devicePixelRatio changes.
    const observer = new ResizeObserver(() => {
      if (resize() && still) draw(0);
    });
    observer.observe(canvas);
    const onWindowResize = () => {
      if (resize() && still) draw(0);
    };
    window.addEventListener("resize", onWindowResize, { passive: true });

    return () => {
      stopLoop?.();
      stopMotionWatcher();
      themeWatcher.disconnect();
      observer.disconnect();
      window.removeEventListener("resize", onWindowResize);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={[styles.canvas, className ?? ""].filter(Boolean).join(" ")}
    />
  );
}
