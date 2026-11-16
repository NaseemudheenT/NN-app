import { describe, expect, it } from "vitest";
import {
  FRAG, VERT, VISIBLE,
  cardSize, offsetOf, restFor, springStep, stackConfig, stackTransform, wrapIndex,
} from "./CurvedCarousel";

/**
 * The carousel's maths, tested on its own.
 *
 * The WebGL half cannot run in jsdom, but none of the behaviour that can be
 * wrong lives there: which slide is centred, which way it travels, and where
 * a flick comes to rest are all pure functions, and these are them.
 */
describe("wrapIndex", () => {
  it("brings any index inside the ring", () => {
    expect(wrapIndex(0, 5)).toBe(0);
    expect(wrapIndex(5, 5)).toBe(0);
    expect(wrapIndex(7, 5)).toBe(2);
    expect(wrapIndex(-1, 5)).toBe(4);
    expect(wrapIndex(-12, 5)).toBe(3);
  });

  it("does not divide by an empty ring", () => {
    expect(wrapIndex(3, 0)).toBe(0);
  });
});

describe("offsetOf", () => {
  it("measures the short way round", () => {
    // Slide 0 is one step behind slide 9 on a ring of ten, not nine ahead.
    expect(offsetOf(0, 9, 10)).toBe(1);
    expect(offsetOf(9, 0, 10)).toBe(-1);
  });

  it("is zero for the centred slide", () => {
    expect(offsetOf(4, 4, 10)).toBe(0);
  });

  it("never reports further than half the ring", () => {
    for (let i = 0; i < 34; i += 1) {
      expect(Math.abs(offsetOf(i, 0, 34))).toBeLessThanOrEqual(17);
    }
  });
});

describe("restFor", () => {
  it("settles on the nearest slide when barely moving", () => {
    expect(restFor(3.1, 0)).toBe(3);
    expect(restFor(3.6, 0)).toBe(4);
  });

  it("carries forward on a flick", () => {
    expect(restFor(0, 10)).toBeGreaterThan(0);
    expect(restFor(0, -10)).toBeLessThan(0);
  });

  it("refuses to fly off: a hard flick is bounded", () => {
    expect(restFor(0, 1000, 3)).toBe(3);
    expect(restFor(0, -1000, 3)).toBe(-3);
  });
});

describe("springStep", () => {
  it("arrives, and arrives without ringing", () => {
    let position = 0;
    let velocity = 0;
    let overshoot = 0;
    for (let i = 0; i < 400; i += 1) {
      [position, velocity] = springStep(position, velocity, 1, 1 / 60);
      overshoot = Math.max(overshoot, position - 1);
    }
    expect(position).toBeCloseTo(1, 3);
    expect(Math.abs(velocity)).toBeLessThan(0.01);
    // Critically damped: it must not sail past the slide and come back.
    expect(overshoot).toBeLessThan(0.02);
  });

  it("stays put when it is already there", () => {
    const [position, velocity] = springStep(2, 0, 2, 1 / 60);
    expect(position).toBe(2);
    expect(velocity).toBe(0);
  });
});

describe("cardSize", () => {
  it("gives a wide stage a smaller share than a narrow one", () => {
    const [phone] = cardSize(390, 720);
    const [desktop] = cardSize(1440, 900);
    expect(phone / 390).toBeGreaterThan(desktop / 1440);
  });

  it("keeps the card portrait and inside the stage", () => {
    for (const [w, h] of [[390, 720], [768, 1024], [1440, 900], [2560, 1400]] as const) {
      const [cw, ch] = cardSize(w, h);
      expect(ch).toBeGreaterThan(cw);
      expect(cw).toBeLessThan(w);
      expect(ch).toBeLessThan(h);
    }
  });
});

describe("the stack", () => {
  it("fans a card out, down and over as it leaves the centre", () => {
    const config = stackConfig(1200);
    const centre = stackTransform(0, config);
    expect(centre).toMatchObject({ x: 0, y: 0, rotation: 0, scale: 1 });

    const next = stackTransform(1, config);
    expect(next.x).toBe(config.shift);
    expect(next.y).toBe(config.drop);
    expect(next.rotation).toBeCloseTo((config.lean * Math.PI) / 180, 6);
    expect(next.scale).toBeCloseTo(1 - config.shrink, 6);
  });

  it("drops and shrinks the same on either side, but leans opposite ways", () => {
    const config = stackConfig(1200);
    const left = stackTransform(-2, config);
    const right = stackTransform(2, config);
    expect(left.y).toBe(right.y);
    expect(left.scale).toBe(right.scale);
    expect(left.rotation).toBeCloseTo(-right.rotation, 6);
    expect(left.x).toBeCloseTo(-right.x, 6);
  });

  it("holds the centre card still while the spring settles", () => {
    // Without this the card you are looking at wobbles for the last few
    // hundredths of a step, which reads as the stack never quite arriving.
    const config = stackConfig(1200);
    const settling = stackTransform(0.04, config);
    expect(settling.y).toBe(0);
    expect(settling.rotation).toBe(0);
  });

  it("fades a card in over the last step and a half, so none pops in", () => {
    const config = stackConfig(1200);
    expect(stackTransform(0, config).fade).toBe(1);
    expect(stackTransform(VISIBLE, config).fade).toBe(0);
    const edge = stackTransform(VISIBLE - 0.75, config).fade;
    expect(edge).toBeGreaterThan(0);
    expect(edge).toBeLessThan(1);
  });

  it("is gone before the lens stretches it off the canvas", () => {
    // Past about two and a half steps the perspective term pushes a card's
    // bottom below the stage and it is cut off square — two flat wedges at
    // the edges of the fan. Nothing may still be solid out there.
    const config = stackConfig(1200);
    expect(stackTransform(2.6, config).fade).toBeLessThan(0.3);
  });

  it("stacks rather than rows: a step is far less than a card", () => {
    // This is the whole difference between the old row and the new stack. If
    // a step ever reached a card's width the cards would stop overlapping.
    for (const width of [375, 820, 1440]) {
      const [cardW] = cardSize(width, width * 0.8);
      expect(stackConfig(width).shift, String(width)).toBeLessThan(cardW * 0.9);
    }
  });

  it("keeps the second card within a thumb's reach on a phone", () => {
    expect(stackConfig(375).shift).toBeLessThan(stackConfig(1440).shift);
  });
});

describe("the shaders", () => {
  /**
   * A uniform of the same name must have the same type in both stages.
   *
   * GLSL links the two shaders into one program, so a name declared `float`
   * in the vertex stage and `vec3` in the fragment stage is a link error —
   * and NN's carousel answers a link error by silently falling back to a flat
   * list. It shipped exactly that: `uLift` had been a float in the vertex
   * shader since the row layout, the new fragment's ground colour took the
   * same name, and the Applications view quietly stopped drawing.
   *
   * This is string analysis rather than a real compile, because jsdom has no
   * WebGL. It cannot catch a syntax error — but it catches the one failure
   * that is invisible in review, because the two declarations are four
   * hundred lines apart and each is correct on its own.
   */
  const declarations = (source: string) => {
    const found = new Map<string, string>();
    for (const match of source.matchAll(
      /uniform\s+(float|int|vec2|vec3|vec4|mat2|mat3|mat4|sampler2D)\s+([^;]+);/g,
    )) {
      const type = match[1] ?? "";
      for (const name of (match[2] ?? "").split(",")) found.set(name.trim(), type);
    }
    return found;
  };

  it("declares every shared uniform with the same type in both stages", () => {
    const vertex = declarations(VERT);
    const fragment = declarations(FRAG);
    const shared = [...vertex.keys()].filter((name) => fragment.has(name));
    for (const name of shared) {
      expect(fragment.get(name), `${name} differs between the two stages`)
        .toBe(vertex.get(name));
    }
  });

  it("declares no uniform it never reads", () => {
    // An unused uniform is a name waiting to collide — which is how the last
    // one got in. Checked per stage: a uniform may legitimately be read in
    // only one of them.
    for (const [stage, source] of [["vertex", VERT], ["fragment", FRAG]] as const) {
      for (const name of declarations(source).keys()) {
        const uses = source.split(name).length - 1;
        expect(uses, `${stage} declares ${name} and never reads it`).toBeGreaterThan(1);
      }
    }
  });
});
