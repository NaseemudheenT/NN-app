"use client";

import {
  useCallback, useEffect, useLayoutEffect, useRef, useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Icon, type IconName } from "@/components/ui/Icon";
import styles from "./LiquidNav.module.css";

/**
 * NN's navigation, as a body of water.
 *
 * The selected item is a drop held in a pill. Choose another and the drop
 * stretches toward it; on a long jump the neck breaks and the pieces travel
 * separately before merging back with a ripple. Your cursor lifts a meniscus
 * under it, and every press sends a wave along the pill.
 *
 * The water is one small WebGL fragment shader — a signed-distance pill, the
 * drop and its satellites as metaballs smoothly unioned, and a height field
 * for the waves, lit once. It paints only while on screen and only while
 * something is still moving, so an idle dock costs nothing.
 *
 * Three things are deliberate:
 *
 * - **The physics are not the selection.** The spring reports nothing; the
 *   route changes the instant you press. Water that has not finished sloshing
 *   never delays NN.
 * - **Without WebGL it still works.** The canvas is replaced by a CSS drop
 *   that slides on the same numbers. Nothing disappears.
 * - **Reduced motion means reduced motion.** The drop moves to the new item
 *   immediately, satellites never spawn, and the ambient swell stops.
 *
 * Adapted from the founder's supplied "Waterline" reference. Rewritten for
 * NN's palette, icon set, CSS Modules and routing; no dependency was added.
 */

export interface LiquidNavItem {
  id: string;
  label: string;
  icon: IconName;
  /** A short second line, shown only in the expanded dock. */
  hint?: string;
}

export interface LiquidNavProps {
  items: readonly LiquidNavItem[];
  /** Id of the selected item. Controlled: NN owns which surface is open. */
  activeId: string;
  onSelect: (item: LiquidNavItem, index: number) => void;
  /** Icons only, no labels. The rail uses this; the dock does not. */
  compact?: boolean;
  /** Stack vertically. The desktop rail is vertical, the dock horizontal. */
  orientation?: "horizontal" | "vertical";
  "aria-label"?: string;
  className?: string | undefined;
}

/** Canvas bleed around the pill, so shadows and ripples are not clipped. */
const PAD = 14;

const VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

/**
 * One pass. Everything the dock draws is in here.
 *
 * `dropD` is the union of the head, the tail and up to four satellites, melted
 * together with a smooth minimum — which is what makes a splitting drop read
 * as one body of water rather than several circles.
 */
const FRAG = `precision highp float;
uniform vec2 uRes;uniform float uDpr;uniform float uTime;uniform vec4 uPill;
uniform vec4 uBlob[6];uniform float uSy[6];uniform vec4 uRip[6];uniform vec3 uMouse;uniform float uAmb;
uniform vec3 uTint;uniform vec3 uCore;
float sdRB(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float sdCap(vec2 p,vec4 B,float sy){p-=B.xy;p.y/=sy;p.x=max(abs(p.x)-B.z,0.);return(length(p)-B.w)*min(1.,sy);}
float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
float dropD(vec2 p){float d=1e4;for(int i=0;i<6;i++){if(uBlob[i].w>.5){d=smin(d,sdCap(p,uBlob[i],uSy[i]),13.);}}return d;}
float pillD(vec2 p){vec2 h=uPill.zw*.5;return sdRB(p-uPill.xy-h,h,h.y);}
float lens(float d,float w){float t=clamp(-d/w,0.,1.);return sqrt(1.-(1.-t)*(1.-t));}
float waves(vec2 p){float w=0.;
 for(int i=0;i<6;i++){vec4 R=uRip[i];if(R.w>0.){float x=length(p-R.xy)-R.z*240.;w+=R.w*exp(-R.z*1.7)*sin(x*.3)*exp(-x*x/700.);}}
 vec2 m=p-uMouse.xy;w+=uMouse.z*3.6*exp(-dot(m,m)/1000.);
 w+=uAmb*(sin(p.x*.05+uTime*1.2)*.45+sin(p.x*.13-uTime*.85+p.y*.2)*.25);return w;}
float H(vec2 p){float dp=pillD(p);return lens(dp,uPill.w*.36)*2.4+lens(dropD(p),11.)*7.5+waves(p)*smoothstep(0.,7.,-dp);}
float caus(vec2 p,float t){vec2 q=p;float c=0.;for(int i=0;i<3;i++){q+=vec2(sin(q.y*1.1+t),cos(q.x*1.3-t*.7))*.6;c+=1./(1.+16.*abs(sin(q.x)*sin(q.y)));}return c/3.;}
void main(){
 vec2 p=vec2(gl_FragCoord.x,uRes.y*uDpr-gl_FragCoord.y)/uDpr;
 float dp=pillD(p);float dd=dropD(p);
 float h0=H(p);vec3 n=normalize(vec3(h0-H(p+vec2(1.,0.)),h0-H(p+vec2(0.,1.)),1.));
 vec3 V=vec3(0.,0.,1.);
 float spec=pow(max(dot(reflect(-normalize(vec3(-.45,-.8,.85)),n),V),0.),70.);
 float spec2=pow(max(dot(reflect(-normalize(vec3(.6,.75,.7)),n),V),0.),22.)*.3;
 float fres=clamp((1.-n.z)*4.,0.,1.);
 vec3 irid=.5+.5*cos(6.2831*(vec3(0.,.33,.67)+fres*.85+p.x*.0028+uTime*.035));
 float pm=smoothstep(1.,-1.,dp);float dm=smoothstep(1.,-1.,dd)*smoothstep(1.,-2.,dp);
 float sh=smoothstep(9.,-9.,dropD(p-vec2(0.,5.)))*(1.-dm)*pm*.17;
 vec3 c=vec3(0.,.05,.16)*sh;float a=sh;
 float pa=clamp(pm*(fres*.5+spec*.9+spec2),0.,1.);
 c=mix(vec3(1.),irid,.5*fres)*pa+c*(1.-pa);a=pa+a*(1.-pa);
 float th=lens(dd,11.);
 float cs=caus((p+n.xy*th*18.)*.085,uTime*.9);
 float rim=dm*(1.-smoothstep(0.,8.,-dd));
 float cres=dm*smoothstep(.12,.55,dot(n.xy,normalize(vec2(.55,.85))))*smoothstep(0.,3.,-dd);
 float body=.5+.5*clamp(-n.y*3.,-1.,1.);
 float da=dm*(.30+.16*body);vec3 dc=mix(uTint,vec3(1.),body*.55);
 float la=rim*.26;vec3 lc=uCore;dc=lc*la+dc*da*(1.-la);da=la+da*(1.-la);
 la=clamp(cres*.7+smoothstep(.6,1.,cs)*.28*th*dm,0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);
 la=clamp(dm*(spec*1.2+spec2*.5),0.,1.);dc=vec3(1.)*la+dc*(1.-la);da=la+da*(1.-la);
 la=dm*smoothstep(-2.,0.,dd)*.4;dc=mix(vec3(1.),irid,.35)*la+dc*(1.-la);da=la+da*(1.-la);
 c=dc+c*(1.-da);a=da+a*(1.-da);
 gl_FragColor=vec4(c,a);
}`;

type Body = { x: number; v: number };
type Satellite = { x: number; y: number; vx: number; vy: number; r: number; k: number };
type Ripple = { x: number; y: number; age: number; amp: number };

interface GL {
  gl: WebGLRenderingContext;
  u: Record<string, WebGLUniformLocation | null>;
}

function initGL(canvas: HTMLCanvasElement): GL | null {
  const gl = canvas.getContext("webgl", {
    premultipliedAlpha: true, alpha: true, antialias: false,
    powerPreference: "low-power",
  }) as WebGLRenderingContext | null;
  if (!gl) return null;

  const compile = (type: number, src: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };

  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const location = gl.getAttribLocation(program, "a");
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);

  const u: GL["u"] = {};
  for (const name of [
    "uRes", "uDpr", "uTime", "uPill", "uBlob", "uSy",
    "uRip", "uMouse", "uAmb", "uTint", "uCore",
  ]) {
    u[name] = gl.getUniformLocation(program, name);
  }
  return { gl, u };
}

/** Reads an NN spectrum token as a 0–1 rgb triple, once, off the live theme. */
function readSpectrum(element: Element, token: string, fallback: [number, number, number]) {
  const raw = getComputedStyle(element).getPropertyValue(token).trim();
  const parts = raw.split(/[\s,]+/).map(Number);
  if (parts.length < 3 || parts.some((n) => !Number.isFinite(n))) return fallback;
  return [parts[0]! / 255, parts[1]! / 255, parts[2]! / 255] as [number, number, number];
}

export function LiquidNav({
  items,
  activeId,
  onSelect,
  compact = false,
  orientation = "horizontal",
  "aria-label": ariaLabel = "NN navigation",
  className,
}: LiquidNavProps) {
  const navRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropRef = useRef<HTMLSpanElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [hasGL, setHasGL] = useState(true);

  const current = Math.max(0, items.findIndex((item) => item.id === activeId));

  const state = useRef({
    a: { x: 0, v: 0 } as Body,
    b: { x: 0, v: 0 } as Body,
    sy: { s: 1, v: 0 },
    lead: 0 as 0 | 1,
    lagFrom: 0,
    satellites: [] as Satellite[],
    ripples: [] as Ripple[],
    target: { x: 0, cy: 0, q: 0, r: 21 },
    q: 0,
    mouse: { x: 0, y: 0, s: 0, on: false },
    moving: false,
    split: false,
    ready: false,
    w: 0,
    h: 0,
    visible: true,
    reduce: false,
    raf: 0,
    last: 0,
    time: 0,
    tint: [0.32, 0.81, 1] as [number, number, number],
    core: [0.14, 0.4, 1] as [number, number, number],
    gl: null as GL | null,
  });

  const draw = useCallback(() => {
    const s = state.current;
    const target = s.target;
    const separation = Math.abs(s.a.x - s.b.x);
    const thin = Math.min(separation / (2 * (s.q + target.r) || 1), 1);
    const radius = target.r * (1 - 0.3 * thin);

    if (s.gl) {
      const { gl, u } = s.gl;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
      gl.uniform2f(u.uRes!, s.w + PAD * 2, s.h + PAD * 2);
      gl.uniform1f(u.uDpr!, dpr);
      gl.uniform1f(u.uTime!, s.time);
      gl.uniform4f(u.uPill!, PAD, PAD, s.w, s.h);

      const blobs = new Float32Array(24);
      const squash = new Float32Array(6).fill(1);
      const head = s.lead === 0 ? s.a : s.b;
      const tail = s.lead === 0 ? s.b : s.a;
      blobs.set([
        head.x, target.cy, s.q * (1 - 0.25 * thin), target.r * (1 - 0.12 * thin),
        tail.x, target.cy, s.q * (1 - 0.8 * thin), target.r * (1 - 0.5 * thin),
      ], 0);
      squash[0] = s.sy.s;
      squash[1] = s.sy.s;
      s.satellites.slice(0, 4).forEach((drop, i) => {
        blobs.set([drop.x, drop.y, 0, drop.r], 8 + i * 4);
      });
      gl.uniform4fv(u.uBlob!, blobs);
      gl.uniform1fv(u.uSy!, squash);

      const ripples = new Float32Array(24);
      s.ripples.slice(-6).forEach((r, i) => {
        ripples.set([r.x, r.y, r.age, r.amp], i * 4);
      });
      gl.uniform4fv(u.uRip!, ripples);
      gl.uniform3f(u.uMouse!, s.mouse.x, s.mouse.y, s.mouse.s);
      gl.uniform1f(u.uAmb!, s.reduce ? 0 : 1);
      gl.uniform3fv(u.uTint!, s.tint);
      gl.uniform3fv(u.uCore!, s.core);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return;
    }

    // No WebGL: the same numbers drive a plain CSS drop.
    if (dropRef.current) {
      const left = Math.min(s.a.x, s.b.x) - s.q - radius - PAD;
      dropRef.current.style.width = `${separation + 2 * (s.q + radius)}px`;
      dropRef.current.style.transform = `translateX(${left}px) scaleY(${s.sy.s})`;
    }
  }, []);

  const step = useCallback((dt: number, now: number) => {
    const s = state.current;
    const target = s.target;
    s.time += dt;
    s.q += (target.q - s.q) * Math.min(1, dt * 12);

    let still = true;

    if (s.reduce) {
      s.a.x = target.x; s.b.x = target.x;
      s.a.v = 0; s.b.v = 0;
      s.sy.s = 1; s.satellites = [];
    } else {
      const bodies: [Body, Body] = [s.a, s.b];
      bodies.forEach((body, i) => {
        const leads = i === s.lead;
        const stiffness = leads ? 210 : 72;
        const damping = leads ? 25 : 13;
        // The tail waits a beat before setting off, which is what opens the
        // neck between the two halves and lets it break.
        const hold = !leads && now < s.lagFrom ? 0.08 : 1;
        body.v += (stiffness * (target.x - body.x) - damping * body.v) * dt * hold;
        body.x += body.v * dt;

        const low = PAD + 6 + s.q + target.r - 3;
        const high = PAD + s.w - 6 - s.q - target.r + 3;
        if (body.x < low || body.x > high) {
          s.sy.v -= Math.min(Math.abs(body.v), 900) * 0.0016;
          body.x = Math.max(low, Math.min(high, body.x));
          body.v *= -0.25;
        }
        if (Math.abs(target.x - body.x) > 0.3 || Math.abs(body.v) > 3) still = false;
      });

      const leader = bodies[s.lead];
      const squashTarget = 1 - 0.2 * Math.min(Math.abs(leader.v) / 1500, 1);
      s.sy.v += (280 * (squashTarget - s.sy.s) - 9 * s.sy.v) * dt;
      s.sy.s += s.sy.v * dt;
      if (Math.abs(s.sy.s - 1) > 0.002 || Math.abs(s.sy.v) > 0.02) still = false;

      // The neck gives: spawn satellites between the two halves.
      const separation = Math.abs(s.a.x - s.b.x);
      const thin = Math.min(separation / (2 * (target.q + target.r) || 1), 1);
      const radius = target.r * (1 - 0.3 * thin);
      if (!s.split && s.moving && separation - 2 * target.q - 2 * radius > -6) {
        s.split = true;
        // Indexed explicitly rather than with `1 - lead`: the arithmetic
        // loses the 0 | 1 type and the tuple access stops being provably safe.
        const high = s.lead === 0 ? bodies[0] : bodies[1];
        const low = s.lead === 0 ? bodies[1] : bodies[0];
        [0.3, 0.5, 0.72].forEach((t, j) => {
          s.satellites.push({
            x: low.x + (high.x - low.x) * t + (t * 97 % 7 - 3),
            y: target.cy + (j * 5 - 5),
            vx: (low.v + high.v) * 0.45,
            vy: (j - 1) * 24,
            r: 5 + j * 1.5 - j * 0.5,
            k: 70 + j * 45,
          });
        });
      }

      s.satellites = s.satellites.filter((drop) => {
        drop.vx += (drop.k * (target.x - drop.x) - 9 * drop.vx) * dt;
        drop.vy += (90 * (target.cy - drop.y) - 7 * drop.vy) * dt;
        drop.x += drop.vx * dt;
        drop.y += drop.vy * dt;
        drop.x = Math.max(PAD + 8 + drop.r, Math.min(PAD + s.w - 8 - drop.r, drop.x));
        drop.y = Math.max(target.cy - target.r + drop.r, Math.min(target.cy + target.r - drop.r, drop.y));
        // Absorbed once it reaches the main body.
        if (Math.abs(target.x - drop.x) < s.q + target.r * 0.5) drop.r -= dt * 26;
        return drop.r > 0.6;
      });
      if (s.satellites.length) still = false;
    }

    if (s.moving && still) {
      s.moving = false;
      if (!s.reduce) {
        s.ripples.push({ x: target.x, y: target.cy, age: 0, amp: s.split ? 1.2 : 0.7 });
      }
    }

    s.ripples.forEach((ripple) => { ripple.age += dt; });
    s.ripples = s.ripples.filter((ripple) => ripple.age < 2.4);
    s.mouse.s += ((s.mouse.on ? 1 : 0) - s.mouse.s) * Math.min(1, dt * 7);
  }, []);

  const loop = useCallback(() => {
    const s = state.current;
    if (s.raf) return;
    s.last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - s.last) / 1000, 1 / 30);
      s.last = now;
      step(dt, now);
      draw();
      const busy =
        s.moving || s.ripples.length > 0 || s.satellites.length > 0 || s.mouse.s > 0.01;
      // Ambient swell keeps a visible dock alive; reduced motion only animates
      // while something is actually happening.
      if (s.visible && (!s.reduce || busy)) s.raf = requestAnimationFrame(tick);
      else s.raf = 0;
    };
    s.raf = requestAnimationFrame(tick);
  }, [draw, step]);

  /** Re-reads the pill and the selected item's box, then kicks the loop. */
  const measure = useCallback(() => {
    const nav = navRef.current;
    const element = itemRefs.current[current];
    if (!nav || !element) return;
    const s = state.current;
    s.w = nav.offsetWidth;
    s.h = nav.offsetHeight;

    const target = s.target;
    target.r = element.offsetHeight / 2;
    target.q = Math.max(0, element.offsetWidth / 2 - target.r);
    target.cy = PAD + element.offsetTop + element.offsetHeight / 2;
    const next = PAD + element.offsetLeft + element.offsetWidth / 2;

    if (!s.ready) {
      s.a.x = next; s.b.x = next; s.q = target.q; s.ready = true;
    } else if (Math.abs(next - target.x) > 0.5) {
      // Whichever half is nearer leads, so the drop never crosses itself.
      s.lead = Math.abs(next - s.a.x) <= Math.abs(next - s.b.x) ? 0 : 1;
      s.lagFrom = performance.now() + 70;
      s.moving = true;
      s.split = false;
    }
    target.x = next;

    const canvas = canvasRef.current;
    if (canvas) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = s.w + PAD * 2;
      const height = s.h + PAD * 2;
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }
    }
    loop();
  }, [current, loop]);

  useEffect(() => {
    const s = state.current;
    const nav = navRef.current;
    s.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const canvas = canvasRef.current;
    s.gl = canvas ? initGL(canvas) : null;
    if (!s.gl) setHasGL(false);

    if (nav) {
      s.tint = readSpectrum(nav, "--nn-spectrum-aqua", s.tint);
      s.core = readSpectrum(nav, "--nn-spectrum-blue", s.core);
    }

    const onLost = (event: Event) => {
      event.preventDefault();
      s.gl = null;
      setHasGL(false);
    };
    canvas?.addEventListener("webglcontextlost", onLost);

    const io = new IntersectionObserver(([entry]) => {
      s.visible = entry?.isIntersecting ?? true;
      if (s.visible) loop();
    });
    if (nav) io.observe(nav);

    const onVisibility = () => {
      s.visible = document.visibilityState === "visible";
      if (s.visible) loop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      canvas?.removeEventListener("webglcontextlost", onLost);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(s.raf);
      s.raf = 0;
    };
  }, [loop]);

  useLayoutEffect(() => { measure(); }, [measure, items.length, compact, orientation]);

  // Held in a ref so the observer is installed once and still calls the
  // current measure: re-observing on every selection would thrash layout.
  const measureRef = useRef(measure);
  measureRef.current = measure;
  useEffect(() => {
    let lastWidth = -1;
    const ro = new ResizeObserver(() => {
      const width = navRef.current?.offsetWidth ?? 0;
      if (width !== lastWidth) {
        lastWidth = width;
        state.current.ready = false;   // re-seat rather than slide across a reflow
        measureRef.current();
      }
    });
    if (navRef.current) ro.observe(navRef.current);
    return () => ro.disconnect();
  }, []);

  const localPoint = (clientX: number, clientY: number) => {
    const box = navRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return { x: clientX - box.left + PAD, y: clientY - box.top + PAD };
  };

  const ripple = (x: number, y: number, amp: number) => {
    const s = state.current;
    if (s.reduce) return;
    s.ripples.push({ x, y, age: 0, amp });
    loop();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const forward = orientation === "vertical" ? "ArrowDown" : "ArrowRight";
    const back = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
    let next = -1;
    if (event.key === forward) next = (current + 1) % items.length;
    else if (event.key === back) next = (current - 1 + items.length) % items.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    const item = items[next];
    if (item) {
      onSelect(item, next);
      itemRefs.current[next]?.focus();
    }
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const point = localPoint(event.clientX, event.clientY);
    const s = state.current;
    s.mouse.x = point.x;
    s.mouse.y = point.y;
    s.mouse.on = true;
    loop();
  };

  return (
    <nav
      ref={navRef}
      className={[
        styles.nav,
        compact ? styles.compact : "",
        orientation === "vertical" ? styles.vertical : "",
        className ?? "",
      ].filter(Boolean).join(" ")}
      data-gl={hasGL ? "on" : "off"}
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      onPointerMove={onPointerMove}
      onPointerLeave={() => { state.current.mouse.on = false; loop(); }}
      onPointerDown={(event) => {
        const point = localPoint(event.clientX, event.clientY);
        ripple(point.x, point.y, 0.8);
      }}
    >
      <span className={styles.glass} aria-hidden="true" />
      <canvas className={styles.water} ref={canvasRef} aria-hidden="true" />
      <span className={styles.drop} ref={dropRef} aria-hidden="true" />

      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          ref={(element) => { itemRefs.current[index] = element; }}
          className={styles.item}
          // Roving tab index: the dock is one stop, arrows move within it.
          tabIndex={index === current ? 0 : -1}
          aria-current={index === current ? "page" : undefined}
          // Named explicitly. Composed from the children, the label and the
          // hint ran together — a screen reader said "LifeToday and ahead".
          aria-label={item.hint ? `${item.label} — ${item.hint}` : item.label}
          title={compact ? item.label : undefined}
          onClick={() => onSelect(item, index)}
        >
          <span className={styles.glyph}>
            <Icon name={item.icon} size={18} />
          </span>
          <span className={styles.label} aria-hidden="true">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
