import { describe, test, expect } from "vitest";
import { resolveRadialSize } from "../radialGradientKeywords";

describe("G6: radial-gradient keywords", () => {
  // 100×80 요소, 중심 (50, 40)
  const w = 100;
  const h = 80;
  const cx = 50;
  const cy = 40;

  test("closest-side at center", () => {
    const { rx, ry } = resolveRadialSize("closest-side", cx, cy, w, h);
    expect(rx).toBe(50); // min(50, 50)
    expect(ry).toBe(40); // min(40, 40)
  });

  test("farthest-side at center", () => {
    const { rx, ry } = resolveRadialSize("farthest-side", cx, cy, w, h);
    expect(rx).toBe(50); // max(50, 50)
    expect(ry).toBe(40); // max(40, 40)
  });

  test("closest-side at offset (30, 20)", () => {
    const { rx, ry } = resolveRadialSize("closest-side", 30, 20, w, h);
    expect(rx).toBe(30); // min(30, 70)
    expect(ry).toBe(20); // min(20, 60)
  });

  test("farthest-side at offset (30, 20)", () => {
    const { rx, ry } = resolveRadialSize("farthest-side", 30, 20, w, h);
    expect(rx).toBe(70); // max(30, 70)
    expect(ry).toBe(60); // max(20, 60)
  });

  test("closest-corner", () => {
    const { rx, ry } = resolveRadialSize("closest-corner", 30, 20, w, h);
    const dx = Math.min(30, 70); // 30
    const dy = Math.min(20, 60); // 20
    const expected = Math.sqrt(30 * 30 + 20 * 20);
    expect(rx).toBeCloseTo(expected, 5);
    expect(ry).toBeCloseTo(expected, 5);
  });

  test("farthest-corner (CSS default)", () => {
    const { rx, ry } = resolveRadialSize("farthest-corner", 30, 20, w, h);
    const dx = Math.max(30, 70); // 70
    const dy = Math.max(20, 60); // 60
    const expected = Math.sqrt(70 * 70 + 60 * 60);
    expect(rx).toBeCloseTo(expected, 5);
    expect(ry).toBeCloseTo(expected, 5);
  });

  test("unknown keyword → farthest-corner (default)", () => {
    const { rx, ry } = resolveRadialSize("invalid", cx, cy, w, h);
    const dx = Math.max(cx, w - cx);
    const dy = Math.max(cy, h - cy);
    const expected = Math.sqrt(dx * dx + dy * dy);
    expect(rx).toBeCloseTo(expected, 5);
  });
});
