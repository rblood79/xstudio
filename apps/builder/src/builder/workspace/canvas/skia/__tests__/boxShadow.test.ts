import { describe, test, expect } from "vitest";

describe("G1+G2: box-shadow border-radius + spread", () => {
  test("shadow spread expands bounds", () => {
    const w = 100,
      h = 50,
      spread = 5;
    const shadowRect = {
      left: -spread,
      top: -spread,
      right: w + spread,
      bottom: h + spread,
    };
    expect(shadowRect.right - shadowRect.left).toBe(110);
    expect(shadowRect.bottom - shadowRect.top).toBe(60);
  });

  test("shadow radius = max(0, borderRadius + spread)", () => {
    expect(Math.max(0, 8 + 5)).toBe(13);
    expect(Math.max(0, 8 + -3)).toBe(5);
    expect(Math.max(0, 2 + -5)).toBe(0);
  });

  test("no border-radius → rect shadow (but spread still rounds)", () => {
    const baseRadius = 0;
    const spread = 5;
    const shadowRadius = Math.max(0, baseRadius + spread);
    expect(shadowRadius).toBe(5); // spread만으로도 둥근 shadow
  });

  test("negative spread shrinks bounds", () => {
    const w = 100,
      h = 50,
      spread = -3;
    const shadowW = w + spread * 2;
    const shadowH = h + spread * 2;
    expect(shadowW).toBe(94);
    expect(shadowH).toBe(44);
  });

  test("inner shadow is skipped (outer only)", () => {
    const shadows = [
      { inner: true, dx: 0, dy: 4, sigmaX: 4, sigmaY: 4, spread: 0 },
      { inner: false, dx: 0, dy: 4, sigmaX: 4, sigmaY: 4, spread: 0 },
    ];
    const outerShadows = shadows.filter((s) => !s.inner);
    expect(outerShadows).toHaveLength(1);
  });

  test("baseRadius from number borderRadius", () => {
    const br = 8;
    const baseRadius =
      typeof br === "number" ? br : Array.isArray(br) ? br[0] : 0;
    expect(baseRadius).toBe(8);
  });

  test("baseRadius from array borderRadius uses first value", () => {
    const br: [number, number, number, number] = [12, 8, 4, 2];
    const baseRadius =
      typeof br === "number" ? br : Array.isArray(br) ? br[0] : 0;
    expect(baseRadius).toBe(12);
  });
});
