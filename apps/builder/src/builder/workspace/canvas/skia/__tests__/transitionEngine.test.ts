import { describe, test, expect } from "vitest";
import {
  cubicBezier,
  lerp,
  EASINGS,
  parseEasing,
  computeTransitionValue,
  type TransitionState,
} from "../transitionEngine";

describe("CSS transition engine", () => {
  describe("cubicBezier", () => {
    test("linear (0,0,1,1) at t=0.5 → 0.5", () => {
      expect(cubicBezier(0, 0, 1, 1, 0.5)).toBeCloseTo(0.5, 3);
    });

    test("ease at t=0.5 → ~0.80", () => {
      const result = cubicBezier(0.25, 0.1, 0.25, 1.0, 0.5);
      expect(result).toBeCloseTo(0.8, 1);
    });

    test("t=0 → 0", () => {
      expect(cubicBezier(0.25, 0.1, 0.25, 1.0, 0)).toBe(0);
    });

    test("t=1 → 1", () => {
      expect(cubicBezier(0.25, 0.1, 0.25, 1.0, 1)).toBe(1);
    });

    test("ease-in starts slow", () => {
      const early = cubicBezier(0.42, 0, 1, 1, 0.1);
      expect(early).toBeLessThan(0.1);
    });

    test("ease-out ends slow", () => {
      const late = cubicBezier(0, 0, 0.58, 1, 0.9);
      expect(late).toBeGreaterThan(0.9);
    });
  });

  describe("lerp", () => {
    test("midpoint", () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
    });

    test("quarter", () => {
      expect(lerp(10, 20, 0.25)).toBe(12.5);
    });

    test("t=0 returns start", () => {
      expect(lerp(5, 15, 0)).toBe(5);
    });

    test("t=1 returns end", () => {
      expect(lerp(5, 15, 1)).toBe(15);
    });
  });

  describe("EASINGS", () => {
    test("linear at 0.5 → 0.5", () => {
      expect(EASINGS.linear(0.5)).toBe(0.5);
    });

    test("all named easings are functions", () => {
      for (const [name, fn] of Object.entries(EASINGS)) {
        expect(typeof fn, `${name} should be a function`).toBe("function");
        expect(fn(0), `${name}(0) should be ~0`).toBeCloseTo(0, 2);
        expect(fn(1), `${name}(1) should be ~1`).toBeCloseTo(1, 2);
      }
    });
  });

  describe("parseEasing", () => {
    test("named easing", () => {
      const fn = parseEasing("ease");
      expect(fn(0.5)).toBeCloseTo(0.8, 1);
    });

    test("cubic-bezier string", () => {
      const fn = parseEasing("cubic-bezier(0.25, 0.1, 0.25, 1.0)");
      expect(fn(0.5)).toBeCloseTo(0.8, 1);
    });

    test("unknown → linear fallback", () => {
      const fn = parseEasing("unknown");
      expect(fn(0.5)).toBe(0.5);
    });
  });

  describe("computeTransitionValue", () => {
    test("before start → startValue", () => {
      const state: TransitionState = {
        property: "opacity",
        startValue: 0,
        endValue: 1,
        startTime: 100,
        duration: 300,
        easing: EASINGS.linear,
      };
      const { value, done } = computeTransitionValue(state, 50);
      expect(value).toBe(0);
      expect(done).toBe(false);
    });

    test("after end → endValue + done", () => {
      const state: TransitionState = {
        property: "opacity",
        startValue: 0,
        endValue: 1,
        startTime: 100,
        duration: 300,
        easing: EASINGS.linear,
      };
      const { value, done } = computeTransitionValue(state, 500);
      expect(value).toBe(1);
      expect(done).toBe(true);
    });

    test("midpoint with linear → 0.5", () => {
      const state: TransitionState = {
        property: "width",
        startValue: 100,
        endValue: 200,
        startTime: 0,
        duration: 1000,
        easing: EASINGS.linear,
      };
      const { value } = computeTransitionValue(state, 500);
      expect(value).toBe(150);
    });
  });
});
