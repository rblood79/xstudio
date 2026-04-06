import { describe, test, expect } from "vitest";
import {
  srgbToOklab,
  oklabToSrgb,
  interpolateOklab,
} from "../oklabInterpolation";

describe("G7: oklab interpolation", () => {
  test("white sRGB → oklab → sRGB roundtrip", () => {
    const [L, a, b] = srgbToOklab(1, 1, 1);
    expect(L).toBeCloseTo(1.0, 2);
    const [r, g, bl] = oklabToSrgb(L, a, b);
    expect(r).toBeCloseTo(1.0, 2);
    expect(g).toBeCloseTo(1.0, 2);
    expect(bl).toBeCloseTo(1.0, 2);
  });

  test("black sRGB → oklab L≈0", () => {
    const [L] = srgbToOklab(0, 0, 0);
    expect(L).toBeCloseTo(0, 2);
  });

  test("red sRGB → oklab roundtrip", () => {
    const [L, a, b] = srgbToOklab(1, 0, 0);
    expect(L).toBeGreaterThan(0);
    const [r, g, bl] = oklabToSrgb(L, a, b);
    expect(r).toBeCloseTo(1.0, 1);
    expect(g).toBeCloseTo(0, 1);
    expect(bl).toBeCloseTo(0, 1);
  });

  test("interpolateOklab midpoint of red→blue", () => {
    const red = Float32Array.of(1, 0, 0, 1);
    const blue = Float32Array.of(0, 0, 1, 1);
    const mid = interpolateOklab(red, blue, 0.5);
    // oklab 중간값은 sRGB 중간값과 다름 (지각적으로 더 균일)
    expect(mid[3]).toBeCloseTo(1.0, 2); // alpha
    expect(mid[0]).toBeGreaterThan(0); // r 성분 존재
  });

  test("interpolateOklab t=0 returns colorA", () => {
    const a = Float32Array.of(1, 0, 0, 1);
    const b = Float32Array.of(0, 0, 1, 1);
    const result = interpolateOklab(a, b, 0);
    expect(result[0]).toBeCloseTo(1.0, 2);
    expect(result[2]).toBeCloseTo(0, 2);
  });

  test("interpolateOklab t=1 returns colorB", () => {
    const a = Float32Array.of(1, 0, 0, 1);
    const b = Float32Array.of(0, 0, 1, 1);
    const result = interpolateOklab(a, b, 1);
    expect(result[0]).toBeCloseTo(0, 2);
    expect(result[2]).toBeCloseTo(1.0, 2);
  });
});
