import { describe, test, expect } from "vitest";
import type { BackdropFilterEffect } from "../types";

describe("backdrop-filter", () => {
  test("BackdropFilterEffect type structure", () => {
    const effect: BackdropFilterEffect = {
      type: "backdrop-filter",
      sigma: 10 / 2.355,
    };
    expect(effect.type).toBe("backdrop-filter");
    expect(effect.sigma).toBeGreaterThan(0);
  });

  test("sigma from CSS blur(10px)", () => {
    const cssBlur = 10;
    const sigma = cssBlur / 2.355;
    const effect: BackdropFilterEffect = {
      type: "backdrop-filter",
      sigma,
    };
    expect(effect.sigma).toBeCloseTo(4.246, 2);
  });

  test("zero blur → sigma 0", () => {
    const effect: BackdropFilterEffect = {
      type: "backdrop-filter",
      sigma: 0,
    };
    expect(effect.sigma).toBe(0);
  });
});
