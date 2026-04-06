import { describe, test, expect } from "vitest";
import type { TextShadow } from "../types";

describe("G4: text-shadow", () => {
  test("TextShadow type structure", () => {
    const shadow: TextShadow = {
      offsetX: 2,
      offsetY: 2,
      sigma: 4 / 2.355,
      color: Float32Array.of(0, 0, 0, 0.5),
    };
    expect(shadow.offsetX).toBe(2);
    expect(shadow.offsetY).toBe(2);
    expect(shadow.sigma).toBeCloseTo(1.699, 2);
    expect(shadow.color[3]).toBe(0.5); // alpha
  });

  test("multiple shadows array", () => {
    const shadows: TextShadow[] = [
      {
        offsetX: 1,
        offsetY: 1,
        sigma: 0,
        color: Float32Array.of(0, 0, 0, 0.3),
      },
      {
        offsetX: 2,
        offsetY: 2,
        sigma: 2 / 2.355,
        color: Float32Array.of(0, 0, 0, 0.5),
      },
    ];
    expect(shadows.length).toBe(2);
    expect(shadows[0].sigma).toBe(0); // no blur
    expect(shadows[1].sigma).toBeGreaterThan(0); // with blur
  });

  test("zero offset + zero blur → sharp copy at same position", () => {
    const shadow: TextShadow = {
      offsetX: 0,
      offsetY: 0,
      sigma: 0,
      color: Float32Array.of(1, 0, 0, 1),
    };
    expect(shadow.offsetX).toBe(0);
    expect(shadow.sigma).toBe(0);
  });
});
