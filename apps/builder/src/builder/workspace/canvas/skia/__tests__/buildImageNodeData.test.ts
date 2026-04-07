/**
 * buildImageNodeData 테스트 (ADR-100 Phase 6)
 *
 * ImageSprite skiaNodeData useMemo → 순수 함수 정밀 이식 검증.
 */

import { describe, test, expect } from "vitest";
import { buildImageNodeData } from "../buildImageNodeData";
import type { Element } from "../../../../../types/core/store.types";
import type { Image as SkImage } from "canvaskit-wasm";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeImageElement(
  overrides: Partial<Element & { props: Record<string, unknown> }> = {},
): Element {
  return {
    id: "img-1",
    tag: "Image",
    props: {
      src: "https://example.com/photo.jpg",
      objectFit: "cover",
      alt: "Test image",
      style: {
        width: "300px",
        height: "200px",
        backgroundColor: "#e5e7eb",
      },
      ...(overrides.props ?? {}),
    },
    ...overrides,
  } as Element;
}

function makeLayout(
  x = 0,
  y = 0,
  width = 300,
  height = 200,
): { x: number; y: number; width: number; height: number } {
  return { x, y, width, height };
}

/** Mock SkImage (width/height만 필요) */
function mockSkImage(w: number, h: number): SkImage {
  return { width: () => w, height: () => h } as unknown as SkImage;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildImageNodeData", () => {
  test("basic image → type:image with placeholder box", () => {
    const node = buildImageNodeData({
      element: makeImageElement(),
      layout: makeLayout(10, 20),
      skImage: null,
    });

    expect(node).not.toBeNull();
    expect(node!.type).toBe("image");
    expect(node!.x).toBe(10);
    expect(node!.y).toBe(20);
    expect(node!.width).toBe(300);
    expect(node!.height).toBe(200);
    expect(node!.visible).toBe(true);

    // placeholder box
    expect(node!.box!.fillColor).toBeInstanceOf(Float32Array);
    expect(node!.box!.fillColor[0]).toBeCloseTo(0.898, 2); // gray-200

    // image data (no skImage)
    expect(node!.image!.skImage).toBeNull();
    expect(node!.image!.altText).toBe("Test image");
  });

  test("with skImage: object-fit cover", () => {
    const skImage = mockSkImage(800, 400); // 2:1 aspect
    const node = buildImageNodeData({
      element: makeImageElement({
        props: {
          objectFit: "cover",
          style: { width: "300px", height: "200px" },
        },
      }),
      layout: makeLayout(0, 0, 300, 200),
      skImage,
    });

    // cover: 컨테이너를 완전히 채움 (Math.max(scaleX, scaleY))
    // scaleX = 300/800 = 0.375, scaleY = 200/400 = 0.5 → scale = 0.5
    // w = 800*0.5 = 400, h = 400*0.5 = 200
    expect(node!.image!.contentWidth).toBe(400);
    expect(node!.image!.contentHeight).toBe(200);
    expect(node!.image!.skImage).toBe(skImage);
  });

  test("with skImage: object-fit contain", () => {
    const skImage = mockSkImage(800, 400);
    const node = buildImageNodeData({
      element: makeImageElement({
        props: {
          objectFit: "contain",
          style: { width: "300px", height: "200px" },
        },
      }),
      layout: makeLayout(0, 0, 300, 200),
      skImage,
    });

    // contain: 이미지 전체가 보임 (Math.min(scaleX, scaleY))
    // scaleX = 300/800 = 0.375, scaleY = 200/400 = 0.5 → scale = 0.375
    // w = 800*0.375 = 300, h = 400*0.375 = 150
    expect(node!.image!.contentWidth).toBe(300);
    expect(node!.image!.contentHeight).toBe(150);
  });

  test("with skImage: object-fit fill", () => {
    const skImage = mockSkImage(800, 400);
    const node = buildImageNodeData({
      element: makeImageElement({
        props: {
          objectFit: "fill",
          style: { width: "300px", height: "200px" },
        },
      }),
      layout: makeLayout(0, 0, 300, 200),
      skImage,
    });

    // fill: 콘텐츠 영역에 맞게 늘리기
    expect(node!.image!.contentWidth).toBe(300);
    expect(node!.image!.contentHeight).toBe(200);
  });

  test("with skImage: object-fit none", () => {
    const skImage = mockSkImage(100, 80);
    const node = buildImageNodeData({
      element: makeImageElement({
        props: {
          objectFit: "none",
          style: { width: "300px", height: "200px" },
        },
      }),
      layout: makeLayout(0, 0, 300, 200),
      skImage,
    });

    // none: 원본 크기, 중앙 정렬
    expect(node!.image!.contentWidth).toBe(100);
    expect(node!.image!.contentHeight).toBe(80);
    expect(node!.image!.contentX).toBe(100); // (300-100)/2
    expect(node!.image!.contentY).toBe(60); // (200-80)/2
  });

  test("no skImage → altText included", () => {
    const node = buildImageNodeData({
      element: makeImageElement(),
      layout: makeLayout(),
      skImage: null,
    });

    expect(node!.image!.altText).toBe("Test image");
  });

  test("with skImage → no altText", () => {
    const node = buildImageNodeData({
      element: makeImageElement(),
      layout: makeLayout(),
      skImage: mockSkImage(100, 100),
    });

    expect(node!.image!.altText).toBeUndefined();
  });

  test("no style → still renders with defaults", () => {
    const el = { id: "x", tag: "Image", props: { src: "a.jpg" } } as Element;
    const node = buildImageNodeData({
      element: el,
      layout: undefined,
      skImage: null,
    });
    expect(node).not.toBeNull();
  });

  test("display:none → visible:false", () => {
    const node = buildImageNodeData({
      element: makeImageElement({
        props: {
          src: "a.jpg",
          style: { display: "none", width: "100px", height: "100px" },
        },
      }),
      layout: makeLayout(),
      skImage: null,
    });

    expect(node).not.toBeNull();
    expect(node!.visible).toBe(false);
  });

  test("padding affects content bounds", () => {
    const skImage = mockSkImage(200, 200);
    const node = buildImageNodeData({
      element: makeImageElement({
        props: {
          objectFit: "fill",
          style: {
            padding: "10px 20px",
            width: "300px",
            height: "200px",
          },
        },
      }),
      layout: makeLayout(0, 0, 300, 200),
      skImage,
    });

    // contentBounds: x=20, y=10, w=260, h=180
    expect(node!.image!.contentX).toBe(20);
    expect(node!.image!.contentY).toBe(10);
    expect(node!.image!.contentWidth).toBe(260);
    expect(node!.image!.contentHeight).toBe(180);
  });

  test("default objectFit is cover", () => {
    const skImage = mockSkImage(800, 400);
    const node = buildImageNodeData({
      element: makeImageElement({
        props: {
          src: "a.jpg",
          // objectFit 미지정
          style: { width: "300px", height: "200px" },
        },
      }),
      layout: makeLayout(0, 0, 300, 200),
      skImage,
    });

    // cover 동작 확인
    expect(node!.image!.contentWidth).toBe(400);
    expect(node!.image!.contentHeight).toBe(200);
  });
});
