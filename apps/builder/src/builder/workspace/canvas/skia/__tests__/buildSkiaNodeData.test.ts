/**
 * buildSkiaNodeData 테스트 (ADR-100 Phase 6)
 *
 * Element → SkiaNodeData 순수 변환 검증.
 * PixiJS 의존성 없이 store 데이터만으로 렌더 데이터 구축.
 */

import { describe, test, expect } from "vitest";
import { buildSkiaNodeData, type BuildContext } from "../buildSkiaNodeData";
import type { Element } from "../../../../../types/core/store.types";

function makeElement(overrides: Partial<Element> = {}): Element {
  return {
    id: "test-1",
    tag: "div",
    props: {
      style: {
        backgroundColor: "#ff0000",
        width: "200px",
        height: "100px",
        borderRadius: "8px",
      },
    },
    ...overrides,
  } as Element;
}

function makeCtx(
  layoutOverrides?: Record<
    string,
    { x: number; y: number; width: number; height: number }
  >,
): BuildContext {
  const layoutMap = new Map<
    string,
    { x: number; y: number; width: number; height: number }
  >();
  if (layoutOverrides) {
    for (const [id, layout] of Object.entries(layoutOverrides)) {
      layoutMap.set(id, layout);
    }
  }
  return { layoutMap, theme: "light" };
}

describe("buildSkiaNodeData", () => {
  test("basic box element", () => {
    const el = makeElement();
    const ctx = makeCtx({
      "test-1": { x: 10, y: 20, width: 200, height: 100 },
    });
    const node = buildSkiaNodeData(el, ctx);

    expect(node).not.toBeNull();
    expect(node!.type).toBe("box");
    expect(node!.x).toBe(10);
    expect(node!.y).toBe(20);
    expect(node!.width).toBe(200);
    expect(node!.height).toBe(100);
    expect(node!.visible).toBe(true);
  });

  test("display:none → null", () => {
    const el = makeElement({
      props: { style: { display: "none" } },
    } as Partial<Element>);
    const node = buildSkiaNodeData(el, makeCtx());
    expect(node).toBeNull();
  });

  test("visibility:hidden → null", () => {
    const el = makeElement({
      props: {
        style: { visibility: "hidden", width: "100px", height: "50px" },
      },
    } as Partial<Element>);
    const node = buildSkiaNodeData(el, makeCtx());
    expect(node).toBeNull();
  });

  test("overflow:hidden → clipChildren=true", () => {
    const el = makeElement({
      props: {
        style: {
          overflow: "hidden",
          width: "100px",
          height: "50px",
          backgroundColor: "#fff",
        },
      },
    } as Partial<Element>);
    const node = buildSkiaNodeData(el, makeCtx());
    expect(node?.clipChildren).toBe(true);
  });

  test("overflow:visible → clipChildren=false", () => {
    const el = makeElement();
    const node = buildSkiaNodeData(el, makeCtx());
    expect(node?.clipChildren).toBe(false);
  });

  test("elementId is set", () => {
    const el = makeElement({ id: "my-element" } as Partial<Element>);
    const node = buildSkiaNodeData(el, makeCtx());
    expect(node?.elementId).toBe("my-element");
  });

  test("no style → placeholder box (트리 순회 유지)", () => {
    const el = { id: "x", tag: "div", props: {} } as Element;
    const node = buildSkiaNodeData(el, makeCtx());
    expect(node).not.toBeNull();
    expect(node!.type).toBe("box");
    expect(node!.visible).toBe(true);
    // 투명 fill
    expect(node!.box!.fillColor[3]).toBe(0);
  });
});

// buildTextSkiaNodeData 테스트는 buildTextNodeData.test.ts��� 이동
