import { describe, test, expect } from "vitest";
import type { TextShadow } from "../types";
import { parseTextShadow } from "../../sprites/styleConverter";

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

describe("G4: parseTextShadow", () => {
  test("single shadow with blur", () => {
    const shadows = parseTextShadow("2px 3px 4px rgba(0,0,0,0.5)");
    expect(shadows).toHaveLength(1);
    expect(shadows[0].offsetX).toBe(2);
    expect(shadows[0].offsetY).toBe(3);
    expect(shadows[0].sigma).toBeCloseTo(4 / 2.355, 2);
    expect(shadows[0].color[3]).toBeCloseTo(0.5, 2); // alpha
  });

  test("multiple shadows", () => {
    const shadows = parseTextShadow("1px 1px red, 2px 2px 5px blue");
    expect(shadows).toHaveLength(2);
    expect(shadows[0].offsetX).toBe(1);
    expect(shadows[1].offsetX).toBe(2);
    expect(shadows[1].sigma).toBeCloseTo(5 / 2.355, 2);
  });

  test("no blur → sigma 0", () => {
    const shadows = parseTextShadow("1px 2px black");
    expect(shadows).toHaveLength(1);
    expect(shadows[0].offsetX).toBe(1);
    expect(shadows[0].offsetY).toBe(2);
    expect(shadows[0].sigma).toBe(0);
  });

  test("empty string → empty array", () => {
    expect(parseTextShadow("")).toHaveLength(0);
  });

  test("none → empty array", () => {
    expect(parseTextShadow("none")).toHaveLength(0);
  });

  test("negative offset", () => {
    const shadows = parseTextShadow("-2px -3px black");
    expect(shadows[0].offsetX).toBe(-2);
    expect(shadows[0].offsetY).toBe(-3);
  });

  test("color channel values (red)", () => {
    const shadows = parseTextShadow("0px 0px red");
    // red → [1, 0, 0, 1]
    expect(shadows[0].color[0]).toBeCloseTo(1, 1);
    expect(shadows[0].color[1]).toBeCloseTo(0, 1);
    expect(shadows[0].color[2]).toBeCloseTo(0, 1);
    expect(shadows[0].color[3]).toBeCloseTo(1, 1);
  });
});
