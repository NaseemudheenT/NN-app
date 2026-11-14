import { describe, expect, it } from "vitest";
import {
  cardSize, offsetOf, restFor, springStep, wrapIndex,
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
