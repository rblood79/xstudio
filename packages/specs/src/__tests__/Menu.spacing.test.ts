/**
 * ADR-907 Phase 4 — Menu Layer D spacing contract
 *
 * 검증 대상: `MenuSpec.render.shapes()` 가 style.paddingLeft/Right/padding 을
 * resolveContainerSpacing 경유로 소비하여 text 좌표에 반영하는지 확증.
 *
 * Phase 4 이전: `size.paddingX` 하드코딩 (matrix (b) X)
 * Phase 4 이후: style 우선, size fallback
 */

import { describe, expect, it } from "vitest";
import { MenuSpec } from "../components/Menu.spec";
import type { Shape } from "../types";

type TextShape = Extract<Shape, { type: "text" }>;

function renderShapes(props: Record<string, unknown>): Shape[] {
  const size = MenuSpec.sizes.md as typeof MenuSpec.sizes.md;
  const shapes = MenuSpec.render.shapes(
    props as Parameters<typeof MenuSpec.render.shapes>[0],
    size,
    "default",
  );
  return shapes;
}

function findText(shapes: Shape[]): TextShape | undefined {
  return shapes.find((s): s is TextShape => s.type === "text");
}

describe("MenuSpec Layer D — style paddingLeft 우선", () => {
  it("style 미지정 → size.paddingX fallback (md = 12)", () => {
    const shapes = renderShapes({ children: "Test" });
    const text = findText(shapes);
    expect(text).toBeDefined();
    expect(text!.x).toBe(12);
  });

  it("style.paddingLeft 명시 → override (24)", () => {
    const shapes = renderShapes({
      children: "Test",
      style: { paddingLeft: 24 },
    });
    const text = findText(shapes);
    expect(text!.x).toBe(24);
  });

  it("style.padding shorthand → 4-way 적용, paddingLeft=16", () => {
    const shapes = renderShapes({
      children: "Test",
      style: { padding: 16 },
    });
    const text = findText(shapes);
    expect(text!.x).toBe(16);
  });

  it('style.paddingLeft="20px" 문자열 → 20 파싱', () => {
    const shapes = renderShapes({
      children: "Test",
      style: { paddingLeft: "20px" },
    });
    const text = findText(shapes);
    expect(text!.x).toBe(20);
  });
});
