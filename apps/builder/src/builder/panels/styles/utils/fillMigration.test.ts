import { describe, expect, it } from "vitest";

import { FillType, type FillItem } from "../../../../types/builder/fill.types";
import {
  ensureFills,
  fillsToCssBackground,
  migrateBackgroundColor,
} from "./fillMigration";

describe("fillMigration", () => {
  it("legacy backgroundColor 를 color fill 로 read-through 한다", () => {
    const fills = migrateBackgroundColor("#ff0000");

    expect(fills).toHaveLength(1);
    expect(fills[0]).toMatchObject({
      type: FillType.Color,
      color: "#FF0000FF",
      enabled: true,
    });
  });

  it("token/transparent backgroundColor 는 synthetic fill 을 만들지 않는다", () => {
    expect(migrateBackgroundColor("transparent")).toEqual([]);
    expect(migrateBackgroundColor("var(--bg)")).toEqual([]);
    expect(migrateBackgroundColor("$--surface")).toEqual([]);
  });

  it("ensureFills 는 authored fills 를 우선한다", () => {
    const authored = [
      {
        id: "fill-1",
        type: FillType.Color,
        color: "#00FF00FF",
        enabled: true,
        opacity: 1,
        blendMode: "normal",
      },
    ] satisfies FillItem[];

    expect(ensureFills(authored, "#ff0000")).toBe(authored);
  });

  it("fillsToCssBackground 는 image fill 을 CSS background 로 변환한다", () => {
    const css = fillsToCssBackground([
      {
        id: "img-1",
        type: FillType.Image,
        url: "https://example.com/hero.png",
        mode: "fit",
        enabled: true,
        opacity: 1,
        blendMode: "normal",
      },
    ]);

    expect(css).toEqual({
      backgroundImage: "url(https://example.com/hero.png)",
      backgroundSize: "contain",
    });
  });
});
