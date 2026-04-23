import { describe, expect, it, vi } from "vitest";

vi.mock("../../../../utils/featureFlags", () => ({
  isFillV2Enabled: () => true,
}));

import { FillType } from "../../../../types/builder/fill.types";
import {
  normalizeExternalFillIngress,
  normalizeExternalFillIngressBatch,
} from "./fillExternalIngress";

describe("normalizeExternalFillIngress", () => {
  it("fills 가 이미 있으면 derived background style 을 제거하고 fills 는 유지한다", () => {
    const normalized = normalizeExternalFillIngress({
      id: "el-1",
      tag: "Box",
      fills: [
        {
          id: "fill-1",
          type: FillType.Color,
          color: "#123456FF",
          enabled: true,
          opacity: 1,
          blendMode: "normal",
        },
      ],
      props: {
        style: {
          backgroundColor: "#123456",
          backgroundImage: "linear-gradient(red, blue)",
          backgroundSize: "cover",
          paddingTop: "8px",
        },
      },
    });

    expect(normalized.fills).toHaveLength(1);
    expect(normalized.props.style).toMatchObject({ paddingTop: "8px" });
    expect(normalized.props.style?.backgroundColor).toBeUndefined();
    expect(normalized.props.style?.backgroundImage).toBeUndefined();
    expect(normalized.props.style?.backgroundSize).toBeUndefined();
  });

  it("legacy solid backgroundColor 는 fills 로 승격한다", () => {
    const normalized = normalizeExternalFillIngress({
      id: "el-2",
      tag: "Box",
      props: {
        style: {
          backgroundColor: "#ABCDEF",
          marginTop: "4px",
        },
      },
    });

    expect(normalized.fills).toHaveLength(1);
    expect(normalized.props.style).toMatchObject({ marginTop: "4px" });
    expect(normalized.props.style?.backgroundColor).toBeUndefined();
  });

  it("legacy linear-gradient backgroundImage 는 gradient fill 로 승격한다", () => {
    const normalized = normalizeExternalFillIngress({
      id: "el-3",
      tag: "Box",
      props: {
        style: {
          backgroundImage: "linear-gradient(90deg, #FF0000 0%, #00FF00 100%)",
          paddingLeft: "6px",
        },
      },
    });

    expect(normalized.fills).toHaveLength(1);
    expect(normalized.fills?.[0]?.type).toBe(FillType.LinearGradient);
    expect(normalized.props.style).toMatchObject({ paddingLeft: "6px" });
    expect(normalized.props.style?.backgroundImage).toBeUndefined();
  });

  it("legacy radial-gradient backgroundImage 는 radial fill 로 승격한다", () => {
    const normalized = normalizeExternalFillIngress({
      id: "el-3b",
      tag: "Box",
      props: {
        style: {
          backgroundImage:
            "radial-gradient(circle at 25% 75%, #FF0000 0%, #0000FF 100%)",
          paddingRight: "12px",
        },
      },
    });

    expect(normalized.fills).toHaveLength(1);
    expect(normalized.fills?.[0]?.type).toBe(FillType.RadialGradient);
    expect(normalized.props.style).toMatchObject({ paddingRight: "12px" });
    expect(normalized.props.style?.backgroundImage).toBeUndefined();
  });

  it("legacy conic-gradient backgroundImage 는 angular fill 로 승격한다", () => {
    const normalized = normalizeExternalFillIngress({
      id: "el-3c",
      tag: "Box",
      props: {
        style: {
          backgroundImage:
            "conic-gradient(from 45deg at 50% 50%, #FF0000 0%, #00FF00 50%, #0000FF 100%)",
          marginBottom: "14px",
        },
      },
    });

    expect(normalized.fills).toHaveLength(1);
    expect(normalized.fills?.[0]?.type).toBe(FillType.AngularGradient);
    expect(normalized.props.style).toMatchObject({ marginBottom: "14px" });
    expect(normalized.props.style?.backgroundImage).toBeUndefined();
  });

  it("legacy image backgroundImage 는 image fill 로 승격한다", () => {
    const normalized = normalizeExternalFillIngress({
      id: "el-4",
      tag: "Box",
      props: {
        style: {
          backgroundImage: "url(https://example.com/hero.png)",
          backgroundSize: "contain",
        },
      },
    });

    expect(normalized.fills).toHaveLength(1);
    expect(normalized.fills?.[0]?.type).toBe(FillType.Image);
    expect((normalized.fills?.[0] as { mode?: string }).mode).toBe("fit");
    expect(normalized.props.style?.backgroundImage).toBeUndefined();
    expect(normalized.props.style?.backgroundSize).toBeUndefined();
  });

  it("mesh adapter SVG data url 은 mesh fill 로 승격한다", () => {
    const svg = [
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
    ].join("");

    const normalized = normalizeExternalFillIngress({
      id: "el-5",
      tag: "Box",
      props: {
        style: {
          backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
          backgroundSize: "100% 100%",
        },
      },
    });

    expect(normalized.fills).toHaveLength(1);
    expect(normalized.fills?.[0]?.type).toBe(FillType.MeshGradient);
    expect(normalized.props.style?.backgroundImage).toBeUndefined();
    expect(normalized.props.style?.backgroundSize).toBeUndefined();
  });

  it("batch normalizer 는 preview-generated payload 도 canonical fills 로 정규화한다", () => {
    const normalized = normalizeExternalFillIngressBatch([
      {
        id: "el-6",
        tag: "Box",
        props: {
          style: {
            backgroundImage:
              "linear-gradient(180deg, #111111 0%, #222222 100%)",
            paddingTop: "10px",
          },
        },
      },
    ]);

    expect(normalized).toHaveLength(1);
    expect(normalized[0]?.fills?.[0]?.type).toBe(FillType.LinearGradient);
    expect(normalized[0]?.props.style?.backgroundImage).toBeUndefined();
    expect(normalized[0]?.props.style).toMatchObject({ paddingTop: "10px" });
  });
});
