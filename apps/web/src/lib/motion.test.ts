import { describe, expect, it } from "vitest";
import { clamp, createSpring, rampAcross, remap } from "./motion";

/** Runs a spring to rest at 60 fps, with a cap so a bug cannot hang the suite. */
function settle(spring: ReturnType<typeof createSpring>, maxFrames = 2000) {
  let frames = 0;
  while (spring.step(1 / 60) && frames < maxFrames) frames += 1;
  return frames;
}

describe("createSpring", () => {
  it("starts settled and reports no work to do", () => {
    const spring = createSpring(0);
    expect(spring.settled).toBe(true);
    expect(spring.step(1 / 60)).toBe(false);
  });

  it("converges on its target", () => {
    const spring = createSpring(0);
    spring.set(1);
    const frames = settle(spring);
    expect(frames).toBeLessThan(2000);
    expect(spring.value).toBeCloseTo(1, 5);
    expect(spring.settled).toBe(true);
  });

  it("does not overshoot at the default damping", () => {
    const spring = createSpring(0);
    spring.set(1);
    let peak = 0;
    for (let i = 0; i < 400 && spring.step(1 / 60); i += 1) {
      peak = Math.max(peak, spring.value);
    }
    expect(peak).toBeLessThanOrEqual(1.0001);
  });

  it("tracks a target that moves mid-flight", () => {
    const spring = createSpring(0);
    spring.set(1);
    for (let i = 0; i < 6; i += 1) spring.step(1 / 60);
    spring.set(0.25);
    settle(spring);
    expect(spring.value).toBeCloseTo(0.25, 5);
  });

  it("reads `target` as where it is heading, not where it is", () => {
    const spring = createSpring(0);
    spring.set(1);
    spring.step(1 / 60);
    expect(spring.target).toBe(1);
    expect(spring.value).toBeLessThan(1);
  });

  it("clamps a huge frame gap instead of integrating all of it", () => {
    // A backgrounded tab returning after ten seconds must not launch the
    // spring past its target.
    const spring = createSpring(0);
    spring.set(1);
    spring.step(10);
    expect(spring.value).toBeLessThanOrEqual(1);
    expect(Number.isFinite(spring.value)).toBe(true);
  });

  it("reset jumps and kills velocity", () => {
    const spring = createSpring(0);
    spring.set(1);
    for (let i = 0; i < 10; i += 1) spring.step(1 / 60);
    spring.reset(0.5);
    expect(spring.value).toBe(0.5);
    expect(spring.target).toBe(0.5);
    expect(spring.settled).toBe(true);
    expect(spring.step(1 / 60)).toBe(false);
  });

  it("settles at the same place whatever the frame rate", () => {
    const sixty = createSpring(0);
    const oneTwenty = createSpring(0);
    sixty.set(1);
    oneTwenty.set(1);
    while (sixty.step(1 / 60));
    while (oneTwenty.step(1 / 120));
    expect(oneTwenty.value).toBeCloseTo(sixty.value, 5);
  });
});

describe("rampAcross", () => {
  const stops = [0, 0.18, 0.82, 0.98] as const;
  const outputs = [0, 1, 1, 0] as const;

  it("holds the first output at and before the first stop", () => {
    expect(rampAcross(-1, stops, outputs)).toBe(0);
    expect(rampAcross(0, stops, outputs)).toBe(0);
  });

  it("holds the last output at and beyond the last stop", () => {
    expect(rampAcross(0.98, stops, outputs)).toBeCloseTo(0, 5);
    expect(rampAcross(5, stops, outputs)).toBe(0);
  });

  it("interpolates inside a segment", () => {
    expect(rampAcross(0.09, stops, outputs)).toBeCloseTo(0.5, 5);
    expect(rampAcross(0.5, stops, outputs)).toBe(1);
  });

  it("survives empty and single-stop inputs", () => {
    expect(rampAcross(0.5, [], [])).toBe(0);
    expect(rampAcross(0.5, [0], [7])).toBe(7);
  });
});

describe("remap", () => {
  it("maps and clamps at both ends", () => {
    expect(remap(0.5, 0, 1, 10, 20)).toBe(15);
    expect(remap(-3, 0, 1, 10, 20)).toBe(10);
    expect(remap(99, 0, 1, 10, 20)).toBe(20);
  });

  it("does not divide by zero on a degenerate range", () => {
    expect(remap(5, 2, 2, 10, 20)).toBe(10);
  });
});

describe("clamp", () => {
  it("bounds on both sides", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.4, 0, 1)).toBe(0.4);
  });
});
