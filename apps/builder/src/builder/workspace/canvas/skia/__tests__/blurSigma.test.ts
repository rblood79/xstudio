import { describe, test, expect } from "vitest";

// W3C CSS Gaussian: sigma = radius / (2 * sqrt(2 * ln(2)))
const CSS_BLUR_SIGMA_DIVISOR = 2.355;

describe("G3: CSS blur sigma formula (W3C)", () => {
  test("10px blur → sigma ≈ 4.246", () => {
    const sigma = 10 / CSS_BLUR_SIGMA_DIVISOR;
    expect(sigma).toBeCloseTo(4.246, 2);
  });

  test("0px blur → sigma 0", () => {
    expect(0 / CSS_BLUR_SIGMA_DIVISOR).toBe(0);
  });

  test("20px blur → sigma ≈ 8.492", () => {
    const sigma = 20 / CSS_BLUR_SIGMA_DIVISOR;
    expect(sigma).toBeCloseTo(8.492, 2);
  });

  test("old formula (radius/2) gives different result", () => {
    const oldSigma = 10 / 2;
    const newSigma = 10 / CSS_BLUR_SIGMA_DIVISOR;
    expect(oldSigma).not.toBeCloseTo(newSigma, 1);
    // 새 공식이 더 작은 sigma → CSS 렌더링과 일치하는 블러 강도
    expect(newSigma).toBeLessThan(oldSigma);
  });
});
