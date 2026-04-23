import { describe, expect, it } from "vitest";

import { FillType } from "../../../../types/builder/fill.types";
import { parseCssBackgroundToFills } from "./fillCssIngressParser";

describe("parseCssBackgroundToFills", () => {
  it("allowlist 6종만 canonical fill 로 파싱한다", () => {
    const cases = [
      {
        name: "backgroundColor",
        style: { backgroundColor: "#ABCDEF" },
        expectedType: FillType.Color,
      },
      {
        name: "linear-gradient",
        style: {
          backgroundImage:
            "linear-gradient(90deg, #FF0000 0%, #00FF00 100%)",
        },
        expectedType: FillType.LinearGradient,
      },
      {
        name: "radial-gradient",
        style: {
          backgroundImage:
            "radial-gradient(circle at 25% 75%, #FF0000 0%, #0000FF 100%)",
        },
        expectedType: FillType.RadialGradient,
      },
      {
        name: "conic-gradient",
        style: {
          backgroundImage:
            "conic-gradient(from 45deg at 50% 50%, #FF0000 0%, #00FF00 50%, #0000FF 100%)",
        },
        expectedType: FillType.AngularGradient,
      },
      {
        name: "url + backgroundSize",
        style: {
          backgroundImage: "url(https://example.com/hero.png)",
          backgroundSize: "contain",
        },
        expectedType: FillType.Image,
      },
      {
        name: "mesh svg data url",
        style: {
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(
            [
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">',
              "<defs>",
              '<linearGradient id="t"><stop offset="0" stop-color="#FF0000"/><stop offset="1" stop-color="#FFFF00"/></linearGradient>',
              '<linearGradient id="b"><stop offset="0" stop-color="#0000FF"/><stop offset="1" stop-color="#00FF00"/></linearGradient>',
              '<linearGradient id="m" x2="0" y2="1"><stop offset="0" stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient>',
              '<mask id="fade"><rect width="100" height="100" fill="url(#m)"/></mask>',
              "</defs>",
              '<rect width="100" height="100" fill="url(#b)"/>',
              '<rect width="100" height="100" fill="url(#t)" mask="url(#fade)"/>',
              "</svg>",
            ].join(""),
          )}")`,
          backgroundSize: "100% 100%",
        },
        expectedType: FillType.MeshGradient,
      },
    ] as const;

    for (const testCase of cases) {
      const fills = parseCssBackgroundToFills(testCase.style);
      expect(fills[0]?.type, testCase.name).toBe(testCase.expectedType);
    }
  });

  it("allowlist 밖 payload 는 파싱하지 않는다", () => {
    const fills = parseCssBackgroundToFills({
      backgroundImage:
        "repeating-linear-gradient(90deg, #111111 0%, #222222 10%)",
      backgroundSize: "cover",
    });

    expect(fills).toEqual([]);
  });
});
