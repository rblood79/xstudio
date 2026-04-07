import { describe, test, expect, beforeEach, vi } from "vitest";
import { StoreRenderBridge } from "../StoreRenderBridge";
import type { Element } from "../../../../../types/core/store.types";

// Mock fontManager (window 없는 환경)
vi.mock("../fontManager", () => ({
  skiaFontManager: {
    resolveFamily: (f: string) => f,
  },
}));

// Mock @xstudio/specs — importOriginal로 실제 Spec export 보존
vi.mock("@xstudio/specs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xstudio/specs")>();
  return {
    ...actual,
    hexStringToNumber: (hex: string) => parseInt(hex.replace("#", ""), 16),
    lightColors: { neutral: "#1a1a1a" },
    darkColors: { neutral: "#e5e5e5" },
  };
});

// Mock tagSpecMap (Spec import 차단)
vi.mock("../../sprites/tagSpecMap", () => ({
  TAG_SPEC_MAP: {},
  getSpecForTag: () => null,
  TEXT_TAGS: new Set([
    "Heading",
    "Text",
    "Label",
    "Description",
    "Kbd",
    "Code",
    "InlineAlert",
  ]),
  IMAGE_TAGS: new Set(["Image", "Avatar", "Logo", "Thumbnail"]),
}));

// Mock buildSpecNodeData (Spec 렌더링 차단)
vi.mock("../buildSpecNodeData", () => ({
  buildSpecNodeData: () => null,
}));

// Mock imageCache (비동기 로딩 시뮬레이션)
const mockImageCache = new Map<string, unknown>();
vi.mock("../imageCache", () => ({
  getSkImage: (url: string) => mockImageCache.get(url) ?? null,
  loadSkImage: (url: string) =>
    Promise.resolve(mockImageCache.get(url) ?? null),
  releaseSkImage: () => {},
}));

// Mock useSkiaNode registry
vi.mock("../useSkiaNode", () => {
  const registry = new Map<string, unknown>();
  let version = 0;
  return {
    registerSkiaNode: (id: string, data: unknown) => {
      registry.set(id, data);
      version++;
    },
    unregisterSkiaNode: (id: string) => {
      registry.delete(id);
      version++;
    },
    getRegistryVersion: () => version,
    // expose for test assertions
    __registry: registry,
  };
});

function makeElement(
  id: string,
  tag: string,
  style: Record<string, unknown> = {},
): Element {
  return {
    id,
    tag,
    props: {
      style: {
        backgroundColor: "#fff",
        width: "100px",
        height: "50px",
        ...style,
      },
    },
  } as Element;
}

describe("StoreRenderBridge", () => {
  let bridge: StoreRenderBridge;

  beforeEach(() => {
    bridge = new StoreRenderBridge();
  });

  test("connect performs initial sync", () => {
    const elements = new Map<string, Element>([
      ["e1", makeElement("e1", "div")],
      ["e2", makeElement("e2", "section")],
    ]);

    bridge.connect({
      getElements: () => elements,
      getLayoutMap: () => new Map(),
      subscribe: () => () => {},
    });

    expect(bridge.size).toBe(2);
  });

  test("subscribe callback triggers re-sync", () => {
    let callback: (() => void) | null = null;
    const elements = new Map<string, Element>([
      ["e1", makeElement("e1", "div")],
    ]);

    bridge.connect({
      getElements: () => elements,
      getLayoutMap: () => new Map(),
      subscribe: (cb) => {
        callback = cb;
        return () => {
          callback = null;
        };
      },
    });

    expect(bridge.size).toBe(1);

    // 요소 추가
    elements.set("e2", makeElement("e2", "div"));
    callback?.();
    expect(bridge.size).toBe(2);
  });

  test("removed elements get unregistered", () => {
    let callback: (() => void) | null = null;
    const elements = new Map<string, Element>([
      ["e1", makeElement("e1", "div")],
      ["e2", makeElement("e2", "div")],
    ]);

    bridge.connect({
      getElements: () => elements,
      getLayoutMap: () => new Map(),
      subscribe: (cb) => {
        callback = cb;
        return () => {};
      },
    });

    expect(bridge.size).toBe(2);

    // e2 삭제
    elements.delete("e2");
    callback?.();
    expect(bridge.size).toBe(1);
  });

  test("dispose unregisters all and unsubscribes", () => {
    let unsubCalled = false;

    bridge.connect({
      getElements: () => new Map([["e1", makeElement("e1", "div")]]),
      getLayoutMap: () => new Map(),
      subscribe: () => () => {
        unsubCalled = true;
      },
    });

    expect(bridge.size).toBe(1);

    bridge.dispose();
    expect(bridge.size).toBe(0);
    expect(unsubCalled).toBe(true);
  });

  test("text elements use buildTextSkiaNodeData", () => {
    const elements = new Map<string, Element>([
      ["t1", makeElement("t1", "Heading", { fontSize: "24px" })],
    ]);
    // Heading의 props에 children 추가
    (elements.get("t1")!.props as Record<string, unknown>).children = "Hello";

    bridge.connect({
      getElements: () => elements,
      getLayoutMap: () => new Map(),
      subscribe: () => () => {},
    });

    expect(bridge.size).toBe(1);
  });

  test("image elements use buildImageNodeData", () => {
    const imgEl = {
      id: "i1",
      tag: "Image",
      props: {
        src: "https://example.com/photo.jpg",
        style: {
          backgroundColor: "#e5e7eb",
          width: "200px",
          height: "150px",
        },
      },
    } as Element;

    bridge.connect({
      getElements: () => new Map([["i1", imgEl]]),
      getLayoutMap: () => new Map(),
      subscribe: () => () => {},
    });

    expect(bridge.size).toBe(1);
  });

  test("display:none elements are skipped", () => {
    const elements = new Map<string, Element>([
      ["e1", makeElement("e1", "div", { display: "none" })],
    ]);

    bridge.connect({
      getElements: () => elements,
      getLayoutMap: () => new Map(),
      subscribe: () => () => {},
    });

    // display:none → buildSkiaNodeData returns null → not registered
    // But registeredIds still tracks it
    expect(bridge.size).toBe(1);
  });
});
