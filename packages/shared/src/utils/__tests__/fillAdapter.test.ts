import { describe, expect, it } from "vitest";

import {
  adaptElementFillStyle,
  fillsToCssBackgroundStyle,
} from "../fillAdapter";

describe("fillAdapter", () => {
  it("color fill 을 backgroundColor 로 변환한다", () => {
    expect(
      fillsToCssBackgroundStyle([
        {
          type: "color",
          enabled: true,
          color: "#112233FF",
        },
      ]),
    ).toEqual({
      backgroundColor: "#112233",
    });
  });

  it("fills 가 있으면 기존 background 필드를 지우고 파생 CSS 로 치환한다", () => {
    const adapted = adaptElementFillStyle({
      id: "el-1",
      type: "Box",
      fills: [
        {
          type: "linear-gradient",
          enabled: true,
          rotation: 90,
          stops: [
            { color: "#FF0000FF", position: 0 },
            { color: "#00FF00FF", position: 1 },
          ],
        },
      ],
      props: {
        style: {
          backgroundColor: "#ffffff",
          borderRadius: "12px",
        },
      },
    });

    expect(adapted.props?.style).toEqual({
      borderRadius: "12px",
      backgroundImage: "linear-gradient(90deg, #FF0000 0%, #00FF00 100%)",
    });
  });
});
