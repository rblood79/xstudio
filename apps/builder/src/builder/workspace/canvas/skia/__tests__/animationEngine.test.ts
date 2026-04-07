import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { AnimationEngine } from "../animationEngine";
import type { KeyframeAnimation } from "../animationEngine";

const fadeIn: KeyframeAnimation = {
  keyframes: [
    { offset: 0, props: { opacity: 0 } },
    { offset: 1, props: { opacity: 1 } },
  ],
  duration: 1000,
  delay: 0,
  easing: "linear",
  iterationCount: 1,
  direction: "normal",
  fillMode: "forwards",
};

describe("AnimationEngine", () => {
  let now: number;
  beforeEach(() => {
    now = 1000;
    vi.spyOn(performance, "now").mockReturnValue(now);
  });
  afterEach(() => vi.restoreAllMocks());

  test("start → tick halfway → dirty", () => {
    const e = new AnimationEngine();
    e.start("el-1", "fadeIn", fadeIn);
    const dirty = e.tick(now + 500);
    expect(dirty.has("el-1")).toBe(true);
  });

  test("halfway → opacity ≈ 0.5", () => {
    const e = new AnimationEngine();
    e.start("el-1", "fadeIn", fadeIn);
    e.tick(now + 500);
    expect(e.getCurrentValue("el-1", "opacity")).toBeCloseTo(0.5, 1);
  });

  test("forwards → end value persists", () => {
    const e = new AnimationEngine();
    e.start("el-1", "fadeIn", fadeIn);
    e.tick(now + 1500);
    expect(e.getCurrentValue("el-1", "opacity")).toBeCloseTo(1, 2);
  });

  test("fillMode: none → no value after done", () => {
    const e = new AnimationEngine();
    e.start("el-1", "fadeIn", { ...fadeIn, fillMode: "none" });
    e.tick(now + 1500);
    expect(e.getCurrentValue("el-1", "opacity")).toBeUndefined();
  });

  test("alternate direction", () => {
    const e = new AnimationEngine();
    e.start("el-1", "fadeIn", {
      ...fadeIn,
      iterationCount: 2,
      direction: "alternate",
    });
    // 1st iter 75% → 0.75
    e.tick(now + 750);
    expect(e.getCurrentValue("el-1", "opacity")).toBeCloseTo(0.75, 1);
    // 2nd iter 25% reversed → 0.75
    e.tick(now + 1250);
    expect(e.getCurrentValue("el-1", "opacity")).toBeCloseTo(0.75, 1);
  });

  test("infinite → never done", () => {
    const e = new AnimationEngine();
    e.start("el-1", "loop", { ...fadeIn, iterationCount: Infinity });
    e.tick(now + 5500);
    expect(e.isActive()).toBe(true);
  });

  test("stop removes", () => {
    const e = new AnimationEngine();
    e.start("el-1", "fadeIn", fadeIn);
    e.stop("el-1");
    expect(e.isActive()).toBe(false);
  });

  test("3-keyframe", () => {
    const threeStep: KeyframeAnimation = {
      keyframes: [
        { offset: 0, props: { opacity: 0 } },
        { offset: 0.5, props: { opacity: 1 } },
        { offset: 1, props: { opacity: 0.5 } },
      ],
      duration: 1000,
      delay: 0,
      easing: "linear",
      iterationCount: 1,
      direction: "normal",
      fillMode: "forwards",
    };
    const e = new AnimationEngine();
    e.start("el-1", "three", threeStep);
    e.tick(now + 250); // 25% → segment[0→0.5] local=0.5 → lerp(0,1,0.5)=0.5
    expect(e.getCurrentValue("el-1", "opacity")).toBeCloseTo(0.5, 1);
    e.tick(now + 750); // 75% → segment[0.5→1] local=0.5 → lerp(1,0.5,0.5)=0.75
    expect(e.getCurrentValue("el-1", "opacity")).toBeCloseTo(0.75, 1);
  });

  test("delay → backwards fillMode shows first keyframe", () => {
    const delayed: KeyframeAnimation = {
      ...fadeIn,
      delay: 500,
      fillMode: "backwards",
    };
    const e = new AnimationEngine();
    e.start("el-1", "delayed", delayed);
    e.tick(now + 200); // during delay
    expect(e.getCurrentValue("el-1", "opacity")).toBeCloseTo(0, 2);
  });
});
