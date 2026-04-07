import { describe, test, expect } from "vitest";
import { resolveRadialExtent } from "../fills";

describe("G6: radial-gradient keywords", () => {
  test("closest-side at center of 100x80", () => {
    // cx=50 → left=50, right=50 → rx = min(50,50) = 50
    // cy=40 → top=40, bottom=40 → ry = min(40,40) = 40
    const r = resolveRadialExtent("closest-side", 50, 40, 100, 80);
    expect(r.rx).toBe(50);
    expect(r.ry).toBe(40);
  });

  test("farthest-side at offset (30, 20)", () => {
    const r = resolveRadialExtent("farthest-side", 30, 20, 100, 80);
    expect(r.rx).toBe(70);
    expect(r.ry).toBe(60);
  });

  test("closest-corner at center", () => {
    const r = resolveRadialExtent("closest-corner", 50, 40, 100, 80);
    const expected = Math.sqrt(50 ** 2 + 40 ** 2);
    expect(r.rx).toBeCloseTo(expected, 2);
  });

  test("farthest-corner at offset", () => {
    const r = resolveRadialExtent("farthest-corner", 30, 20, 100, 80);
    const expected = Math.sqrt(70 ** 2 + 60 ** 2);
    expect(r.rx).toBeCloseTo(expected, 2);
  });

  test("unknown keyword → farthest-corner fallback", () => {
    const r = resolveRadialExtent("unknown", 50, 40, 100, 80);
    const expected = Math.sqrt(50 ** 2 + 40 ** 2);
    expect(r.rx).toBeCloseTo(expected, 2);
  });
});
