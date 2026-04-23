import { describe, expect, it } from "vitest";

import {
  isFillDerivedStyleProp,
  sanitizeFillDerivedStylePatch,
} from "./fillDerivedStyleProps";

describe("fillDerivedStyleProps", () => {
  it("background 파생 필드를 식별한다", () => {
    expect(isFillDerivedStyleProp("backgroundColor")).toBe(true);
    expect(isFillDerivedStyleProp("backgroundImage")).toBe(true);
    expect(isFillDerivedStyleProp("backgroundSize")).toBe(true);
    expect(isFillDerivedStyleProp("borderColor")).toBe(false);
  });

  it("Fill V2 가 켜지면 background 파생 필드를 patch 에서 제거한다", () => {
    expect(
      sanitizeFillDerivedStylePatch(
        {
          backgroundColor: "#ffffff",
          backgroundImage: "linear-gradient(red, blue)",
          borderColor: "#000000",
        },
        true,
      ),
    ).toEqual({
      borderColor: "#000000",
    });
  });

  it("Fill V2 가 꺼지면 patch 를 그대로 유지한다", () => {
    const patch = {
      backgroundColor: "#ffffff",
      borderColor: "#000000",
    };
    expect(sanitizeFillDerivedStylePatch(patch, false)).toEqual(patch);
  });
});
