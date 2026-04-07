import { describe, test, expect } from "vitest";
import {
  lerpNumber,
  lerpColor,
  lerpTransform,
  lerpBoxShadow,
  interpolateProperty,
} from "../interpolators";

describe("interpolators", () => {
  describe("lerpNumber", () => {
    test("t=0 → start", () => expect(lerpNumber(10, 20, 0)).toBe(10));
    test("t=1 → end", () => expect(lerpNumber(10, 20, 1)).toBe(20));
    test("t=0.5 → midpoint", () => expect(lerpNumber(10, 20, 0.5)).toBe(15));
    test("negative values", () => expect(lerpNumber(-10, 10, 0.5)).toBe(0));
  });

  describe("lerpColor", () => {
    test("black to white at t=0.5", () => {
      const result = lerpColor(
        new Float32Array([0, 0, 0, 1]),
        new Float32Array([1, 1, 1, 1]),
        0.5,
      );
      expect(result[0]).toBeCloseTo(0.5);
      expect(result[1]).toBeCloseTo(0.5);
      expect(result[2]).toBeCloseTo(0.5);
      expect(result[3]).toBeCloseTo(1);
    });

    test("alpha interpolation", () => {
      const result = lerpColor(
        new Float32Array([1, 0, 0, 0]),
        new Float32Array([1, 0, 0, 1]),
        0.5,
      );
      expect(result[3]).toBeCloseTo(0.5);
    });
  });

  describe("lerpTransform", () => {
    test("interpolate translate + scale + rotate", () => {
      const a = {
        translateX: 0,
        translateY: 0,
        scaleX: 1,
        scaleY: 1,
        rotate: 0,
      };
      const b = {
        translateX: 100,
        translateY: 50,
        scaleX: 2,
        scaleY: 2,
        rotate: 90,
      };
      const result = lerpTransform(a, b, 0.5);
      expect(result.translateX).toBe(50);
      expect(result.translateY).toBe(25);
      expect(result.scaleX).toBe(1.5);
      expect(result.scaleY).toBe(1.5);
      expect(result.rotate).toBe(45);
    });
  });

  describe("lerpBoxShadow", () => {
    test("interpolate dx/dy/sigma/spread at t=0.5", () => {
      const a = {
        dx: 0,
        dy: 0,
        sigmaX: 0,
        sigmaY: 0,
        spread: 0,
        color: new Float32Array([0, 0, 0, 1]),
      };
      const b = {
        dx: 10,
        dy: 20,
        sigmaX: 4,
        sigmaY: 4,
        spread: 2,
        color: new Float32Array([1, 1, 1, 1]),
      };
      const result = lerpBoxShadow(a, b, 0.5);
      expect(result.dx).toBe(5);
      expect(result.dy).toBe(10);
      expect(result.sigmaX).toBe(2);
      expect(result.spread).toBe(1);
      expect(result.color[0]).toBeCloseTo(0.5);
    });
  });

  describe("interpolateProperty", () => {
    test("opacity → lerpNumber", () => {
      expect(interpolateProperty("opacity", 0, 1, 0.5)).toBe(0.5);
    });
    test("width → lerpNumber", () => {
      expect(interpolateProperty("width", 100, 200, 0.25)).toBe(125);
    });
    test("backgroundColor → lerpColor", () => {
      const result = interpolateProperty(
        "backgroundColor",
        new Float32Array([1, 0, 0, 1]),
        new Float32Array([0, 0, 1, 1]),
        0.5,
      );
      expect(result).toBeInstanceOf(Float32Array);
    });
    test("unknown prop discrete → t<0.5 returns start", () => {
      expect(interpolateProperty("display", "block", "flex", 0.3)).toBe(
        "block",
      );
    });
    test("unknown prop discrete → t>=0.5 returns end", () => {
      expect(interpolateProperty("display", "block", "flex", 0.7)).toBe("flex");
    });
    test("unknown prop discrete → t=0.5 returns end", () => {
      expect(interpolateProperty("display", "block", "flex", 0.5)).toBe("flex");
    });
  });
});
