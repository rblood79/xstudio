import { describe, test, expect } from "vitest";
import {
  srgbToOklab,
  oklabToSrgb,
  interpolateOklab,
  amplifyGradientStops,
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

describe("amplifyGradientStops", () => {
  test("2 stops → 2 + 8 intermediate = 10 stops", () => {
    const colors = [Float32Array.of(1, 0, 0, 1), Float32Array.of(0, 0, 1, 1)];
    const positions = [0, 1];
    const result = amplifyGradientStops(colors, positions, 8);
    expect(result.colors.length).toBe(10);
    expect(result.positions.length).toBe(10);
    expect(result.positions[0]).toBe(0);
    expect(result.positions[9]).toBe(1);
  });

  test("single stop → no change", () => {
    const colors = [Float32Array.of(1, 0, 0, 1)];
    const positions = [0];
    const result = amplifyGradientStops(colors, positions);
    expect(result.colors.length).toBe(1);
  });

  test("3 stops → amplified between each pair", () => {
    const colors = [
      Float32Array.of(1, 0, 0, 1),
      Float32Array.of(0, 1, 0, 1),
      Float32Array.of(0, 0, 1, 1),
    ];
    const positions = [0, 0.5, 1];
    const result = amplifyGradientStops(colors, positions, 4);
    // 2 pairs × (1 original + 4 intermediates) + 1 final = 11
    expect(result.colors.length).toBe(11);
  });

  test("intermediate positions are monotonically increasing", () => {
    const colors = [Float32Array.of(1, 0, 0, 1), Float32Array.of(0, 0, 1, 1)];
    const positions = [0, 1];
    const result = amplifyGradientStops(colors, positions, 4);
    for (let i = 1; i < result.positions.length; i++) {
      expect(result.positions[i]).toBeGreaterThan(result.positions[i - 1]);
    }
  });

  test("alpha is linearly interpolated", () => {
    const colors = [Float32Array.of(1, 0, 0, 0), Float32Array.of(0, 0, 1, 1)];
    const positions = [0, 1];
    const result = amplifyGradientStops(colors, positions, 1);
    // 중간점 (t = 1/2): alpha = 0 + (1 - 0) * 0.5 = 0.5
    expect(result.colors[1][3]).toBeCloseTo(0.5, 2);
  });
});
