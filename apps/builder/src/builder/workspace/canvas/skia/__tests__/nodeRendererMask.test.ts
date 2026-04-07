import { describe, test, expect } from "vitest";
import { MASK_SKSL, determineMaskMode } from "../nodeRendererMask";

describe("mask-image SkSL", () => {
  test("SkSL source contains required uniforms", () => {
    expect(MASK_SKSL).toContain("uniform shader content");
    expect(MASK_SKSL).toContain("uniform shader mask");
    expect(MASK_SKSL).toContain("uniform int mode");
  });

  test("SkSL source uses ITU-R BT.709 luminance coefficients", () => {
    expect(MASK_SKSL).toContain("0.2126");
    expect(MASK_SKSL).toContain("0.7152");
    expect(MASK_SKSL).toContain("0.0722");
  });

  test("SkSL source multiplies content by mask alpha", () => {
    expect(MASK_SKSL).toContain("c * a");
  });
});

describe("determineMaskMode", () => {
  test("SVG URL → luminance", () => {
    expect(determineMaskMode("icon.svg")).toBe("luminance");
  });

  test("PNG URL → alpha", () => {
    expect(determineMaskMode("photo.png")).toBe("alpha");
  });

  test("gradient sourceType → alpha", () => {
    expect(determineMaskMode(undefined, "gradient")).toBe("alpha");
  });

  test("explicit alpha override wins over SVG URL", () => {
    expect(determineMaskMode("icon.svg", undefined, "alpha")).toBe("alpha");
  });

  test("explicit luminance override wins over gradient sourceType", () => {
    expect(determineMaskMode(undefined, "gradient", "luminance")).toBe(
      "luminance",
    );
  });

  test("no args → alpha default", () => {
    expect(determineMaskMode()).toBe("alpha");
  });

  test("unknown extension → alpha", () => {
    expect(determineMaskMode("mask.webp")).toBe("alpha");
  });

  test("SVG with explicit alpha → alpha (explicitMode wins)", () => {
    expect(determineMaskMode("sprite.svg", "image", "alpha")).toBe("alpha");
  });
});
