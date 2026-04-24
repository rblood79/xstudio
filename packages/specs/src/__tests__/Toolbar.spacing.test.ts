/**
 * ADR-907 Phase 4 — Toolbar Layer D spacing contract
 *
 * 검증 대상: `ToolbarSpec.render.shapes()` 의 container layout gap/padding 이
 * resolveContainerSpacing 경유로 style.gap/padding 을 소비하는지 확증.
 *
 * Phase 4 이전: `size.gap`, `size.paddingX/Y` 하드코딩 (matrix (b) X)
 * Phase 4 이후: style 우선, size fallback
 */

import { describe, expect, it } from "vitest";
import { ToolbarSpec } from "../components/Toolbar.spec";
import type { Shape } from "../types";

type ContainerShape = Extract<Shape, { type: "container" }>;

function renderShapes(props: Record<string, unknown>): Shape[] {
  const size = ToolbarSpec.sizes.md as typeof ToolbarSpec.sizes.md;
  return ToolbarSpec.render.shapes(
    props as Parameters<typeof ToolbarSpec.render.shapes>[0],
    size,
    "default",
  );
}

function findContainer(shapes: Shape[]): ContainerShape | undefined {
  return shapes.find((s): s is ContainerShape => s.type === "container");
}

describe("ToolbarSpec Layer D — style gap/padding 우선", () => {
  it("style 미지정 → size.gap/paddingY/X fallback", () => {
    const shapes = renderShapes({});
    const container = findContainer(shapes);
    expect(container).toBeDefined();
    // md: gap=8, paddingX=12, paddingY=6
    expect(container!.layout!.gap).toBe(8);
    expect(container!.layout!.padding).toEqual([6, 12, 6, 12]);
  });

  it("style.gap 명시 → 적용 (horizontal orientation = columnGap)", () => {
    const shapes = renderShapes({
      orientation: "horizontal",
      style: { gap: 20 },
    });
    const container = findContainer(shapes);
    expect(container!.layout!.gap).toBe(20);
  });

  it("vertical orientation 에서 style.gap → rowGap 적용", () => {
    const shapes = renderShapes({
      orientation: "vertical",
      style: { gap: 14 },
    });
    const container = findContainer(shapes);
    expect(container!.layout!.gap).toBe(14);
  });

  it("style.padding shorthand 4-way → top/right/bottom/left 전부 동일", () => {
    const shapes = renderShapes({ style: { padding: 16 } });
    const container = findContainer(shapes);
    expect(container!.layout!.padding).toEqual([16, 16, 16, 16]);
  });

  it("style.paddingTop longhand + padding shorthand → top override", () => {
    const shapes = renderShapes({
      style: { padding: 8, paddingTop: 24 },
    });
    const container = findContainer(shapes);
    expect(container!.layout!.padding).toEqual([24, 8, 8, 8]);
  });
});
