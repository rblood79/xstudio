import { describe, expect, it } from "vitest";

import { FillType } from "../../../types/builder/fill.types";
import { adaptPropsForElement, adaptStylePatchWithFills } from "../styleAdapter";

describe("styleAdapter fill bridge", () => {
  it("create path applies fills and derives background css from fills", () => {
    const props = adaptPropsForElement(
      "Div",
      {},
      { padding: "16px", backgroundColor: "#FFFFFF" },
      [
        {
          id: "fill-1",
          type: FillType.Color,
          color: "#123456FF",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
        },
      ],
    );

    expect(props.fills).toHaveLength(1);
    expect(props.style).toMatchObject({
      padding: 16,
      backgroundColor: "#123456",
    });
  });

  it("update path clears stale direct background fields when fills are supplied", () => {
    const result = adaptStylePatchWithFills(
      {
        backgroundColor: "#FFFFFF",
        backgroundImage: "linear-gradient(red, blue)",
        padding: 12,
      },
      {},
      [
        {
          id: "fill-1",
          type: FillType.Color,
          color: "#ABCDEF88",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
        },
      ],
    );

    expect(result.style).toMatchObject({
      padding: 12,
      backgroundColor: "#ABCDEF",
    });
    expect(result.style.backgroundImage).toBeUndefined();
  });
});
