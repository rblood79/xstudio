/**
 * buildSkiaNodeData 테스트 (ADR-100 Phase 6)
 *
 * Element → SkiaNodeData 순수 변환 검증.
 * PixiJS 의존성 없이 store 데이터만으로 렌더 데이터 구축.
 */

import { describe, test, expect } from "vitest";
import {
  buildSkiaNodeData,
  buildTextSkiaNodeData,
  type BuildContext,
} from "../buildSkiaNodeData";
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

  test("no style → null", () => {
    const el = { id: "x", tag: "div", props: {} } as Element;
    const node = buildSkiaNodeData(el, makeCtx());
    expect(node).toBeNull();
  });
});

describe("buildTextSkiaNodeData", () => {
  test("text element with content", () => {
    const el = makeElement({
      tag: "Heading",
      props: {
        children: "Hello World",
        style: {
          fontSize: "24px",
          fontWeight: "bold",
          color: "#000000",
          backgroundColor: "transparent",
          width: "200px",
          height: "32px",
        },
      },
    } as Partial<Element>);
    const ctx = makeCtx({ "test-1": { x: 0, y: 0, width: 200, height: 32 } });
    const node = buildTextSkiaNodeData(el, ctx);

    expect(node).not.toBeNull();
    expect(node!.type).toBe("text");
    expect(node!.text?.content).toBe("Hello World");
    expect(node!.text?.fontSize).toBe(24);
    expect(node!.text?.fontWeight).toBe(700);
  });

  test("text without content → box fallback", () => {
    const el = makeElement({
      props: {
        style: { backgroundColor: "#fff", width: "100px", height: "50px" },
      },
    } as Partial<Element>);
    const node = buildTextSkiaNodeData(el, makeCtx());
    expect(node?.type).toBe("box"); // no text content → stays as box
  });

  test("label prop as content source", () => {
    const el = makeElement({
      props: {
        label: "Click me",
        style: {
          fontSize: "14px",
          backgroundColor: "#fff",
          width: "80px",
          height: "32px",
        },
      },
    } as Partial<Element>);
    const node = buildTextSkiaNodeData(el, makeCtx());
    expect(node?.text?.content).toBe("Click me");
  });
});
