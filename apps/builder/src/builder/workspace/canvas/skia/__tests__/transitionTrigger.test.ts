/**
 * Transition Trigger 통합 테스트
 *
 * 테스트 대상:
 * - parseTransitionShorthand() — CSS transition 속성 파싱
 * - StoreRenderBridge.triggerTransitions() — 스타일 변경 감지 → TransitionManager.start() 호출
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { parseTransitionShorthand } from "../StoreRenderBridge";
import { StoreRenderBridge } from "../StoreRenderBridge";
import type { Element } from "../../../../../types/core/store.types";

// ---------------------------------------------------------------------------
// Shared Mocks
// ---------------------------------------------------------------------------

vi.mock("../fontManager", () => ({
  skiaFontManager: {
    resolveFamily: (f: string) => f,
  },
}));

vi.mock("@xstudio/specs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@xstudio/specs")>();
  return {
    ...actual,
    hexStringToNumber: (hex: string) => parseInt(hex.replace("#", ""), 16),
    lightColors: { neutral: "#1a1a1a" },
    darkColors: { neutral: "#e5e5e5" },
  };
});

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

vi.mock("../buildSpecNodeData", () => ({
  buildSpecNodeData: () => null,
}));

vi.mock("../imageCache", () => ({
  getSkImage: () => null,
  loadSkImage: () => Promise.resolve(null),
  releaseSkImage: () => {},
}));

vi.mock("../useSkiaNode", () => ({
  registerSkiaNode: () => {},
  unregisterSkiaNode: () => {},
  getRegistryVersion: () => 0,
}));

vi.mock("../layout", () => ({
  onLayoutPublished: () => () => {},
}));

// ---------------------------------------------------------------------------
// 헬퍼
// ---------------------------------------------------------------------------

function makeElement(id: string, style: Record<string, unknown> = {}): Element {
  return {
    id,
    tag: "div",
    props: { style },
  } as Element;
}

// ---------------------------------------------------------------------------
// parseTransitionShorthand 단위 테스트
// ---------------------------------------------------------------------------

describe("parseTransitionShorthand", () => {
  test("단일 속성: 'opacity 300ms ease' → property/duration/easing 파싱", () => {
    // Arrange
    const input = "opacity 300ms ease";

    // Act
    const result = parseTransitionShorthand(input);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      property: "opacity",
      duration: 300,
      easing: "ease",
    });
  });

  test("다중 속성: 'opacity 300ms ease, width 500ms linear' → 2개 TransitionDef 반환", () => {
    // Arrange
    const input = "opacity 300ms ease, width 500ms linear";

    // Act
    const result = parseTransitionShorthand(input);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      property: "opacity",
      duration: 300,
      easing: "ease",
    });
    expect(result[1]).toEqual({
      property: "width",
      duration: 500,
      easing: "linear",
    });
  });

  test("'all 200ms' → property: all, duration: 200, easing: ease(기본값)", () => {
    // Arrange
    const input = "all 200ms";

    // Act
    const result = parseTransitionShorthand(input);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      property: "all",
      duration: 200,
      easing: "ease",
    });
  });

  test("초 단위: 'opacity 0.3s' → duration 300ms로 변환", () => {
    // Arrange
    const input = "opacity 0.3s ease-in-out";

    // Act
    const result = parseTransitionShorthand(input);

    // Assert
    expect(result).toHaveLength(1);
    expect(result[0].duration).toBeCloseTo(300);
    expect(result[0].property).toBe("opacity");
    expect(result[0].easing).toBe("ease-in-out");
  });

  test("ms 단위는 그대로 유지: '0.5s' → 500ms", () => {
    // Arrange
    const input = "width 0.5s linear";

    // Act
    const result = parseTransitionShorthand(input);

    // Assert
    expect(result[0].duration).toBeCloseTo(500);
  });

  test("'none' → 빈 배열 반환", () => {
    // Act & Assert
    expect(parseTransitionShorthand("none")).toHaveLength(0);
  });

  test("빈 문자열 → 빈 배열 반환", () => {
    // Act & Assert
    expect(parseTransitionShorthand("")).toHaveLength(0);
  });

  test("easing 생략 시 기본값 'ease' 사용", () => {
    // Arrange
    const input = "opacity 400ms";

    // Act
    const result = parseTransitionShorthand(input);

    // Assert
    expect(result[0].easing).toBe("ease");
  });

  test("공백 앞뒤 trim 처리: 다중 속성 앞뒤 공백", () => {
    // Arrange
    const input = "  opacity 300ms ease  ,  width 500ms linear  ";

    // Act
    const result = parseTransitionShorthand(input);

    // Assert
    expect(result).toHaveLength(2);
    expect(result[0].property).toBe("opacity");
    expect(result[1].property).toBe("width");
  });
});

// ---------------------------------------------------------------------------
// triggerTransitions 통합 테스트 (TransitionManager.start() 호출 검증)
// ---------------------------------------------------------------------------

describe("StoreRenderBridge triggerTransitions 통합", () => {
  let bridge: StoreRenderBridge;

  /** TransitionManager mock: start() 호출 기록 */
  const mockTM = {
    start: vi.fn(),
    remove: vi.fn(),
    tick: vi.fn(() => new Set<string>()),
    getCurrentValue: vi.fn(() => undefined),
    hasActive: vi.fn(() => false),
    dispose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    bridge = new StoreRenderBridge();
    bridge.transitionManager =
      mockTM as unknown as import("../transitionManager").TransitionManager;
  });

  test("transition 없는 요소 변경 → TransitionManager.start() 미호출", () => {
    // Arrange: transition 스타일 없음
    const prev = makeElement("e1", { opacity: 1, backgroundColor: "#fff" });
    const next = makeElement("e1", { opacity: 0.5, backgroundColor: "#000" });
    const prevMap = new Map([["e1", prev]]);
    const nextMap = new Map([["e1", next]]);

    // Act: 첫 sync로 prevMap 등록
    bridge.sync(prevMap, null, "light");
    // 두 번째 sync: 증분 갱신 (참조 변경 감지)
    bridge.sync(nextMap, null, "light");

    // Assert
    expect(mockTM.start).not.toHaveBeenCalled();
  });

  test("opacity transition → 값 변경 시 TransitionManager.start() 호출", () => {
    // Arrange
    const prev = makeElement("e1", {
      opacity: 1,
      transition: "opacity 300ms ease",
    });
    const next = makeElement("e1", {
      opacity: 0,
      transition: "opacity 300ms ease",
    });
    const prevMap = new Map([["e1", prev]]);
    const nextMap = new Map([["e1", next]]);

    // Act
    bridge.sync(prevMap, null, "light");
    bridge.sync(nextMap, null, "light");

    // Assert
    expect(mockTM.start).toHaveBeenCalledWith(
      "e1",
      "opacity",
      1,
      0,
      300,
      "ease",
    );
  });

  test("width transition → 값 변경 시 TransitionManager.start() 호출", () => {
    // Arrange
    const prev = makeElement("e1", {
      width: 100,
      transition: "width 500ms linear",
    });
    const next = makeElement("e1", {
      width: 200,
      transition: "width 500ms linear",
    });
    const prevMap = new Map([["e1", prev]]);
    const nextMap = new Map([["e1", next]]);

    // Act
    bridge.sync(prevMap, null, "light");
    bridge.sync(nextMap, null, "light");

    // Assert
    expect(mockTM.start).toHaveBeenCalledWith(
      "e1",
      "width",
      100,
      200,
      500,
      "linear",
    );
  });

  test("다중 transition 속성 → 각 속성별 start() 호출", () => {
    // Arrange
    const prev = makeElement("e1", {
      opacity: 1,
      width: 100,
      transition: "opacity 300ms ease, width 500ms linear",
    });
    const next = makeElement("e1", {
      opacity: 0,
      width: 200,
      transition: "opacity 300ms ease, width 500ms linear",
    });
    const prevMap = new Map([["e1", prev]]);
    const nextMap = new Map([["e1", next]]);

    // Act
    bridge.sync(prevMap, null, "light");
    bridge.sync(nextMap, null, "light");

    // Assert: opacity + width 각각 호출
    expect(mockTM.start).toHaveBeenCalledWith(
      "e1",
      "opacity",
      1,
      0,
      300,
      "ease",
    );
    expect(mockTM.start).toHaveBeenCalledWith(
      "e1",
      "width",
      100,
      200,
      500,
      "linear",
    );
    expect(mockTM.start).toHaveBeenCalledTimes(2);
  });

  test("'all' transition → 변경된 numeric 속성 전체에 start() 호출", () => {
    // Arrange
    const prev = makeElement("e1", {
      opacity: 1,
      width: 100,
      transition: "all 300ms ease",
    });
    const next = makeElement("e1", {
      opacity: 0.5,
      width: 200,
      transition: "all 300ms ease",
    });
    const prevMap = new Map([["e1", prev]]);
    const nextMap = new Map([["e1", next]]);

    // Act
    bridge.sync(prevMap, null, "light");
    bridge.sync(nextMap, null, "light");

    // Assert: 변경된 opacity, width 양쪽 호출
    expect(mockTM.start).toHaveBeenCalledWith(
      "e1",
      "opacity",
      1,
      0.5,
      300,
      "ease",
    );
    expect(mockTM.start).toHaveBeenCalledWith(
      "e1",
      "width",
      100,
      200,
      300,
      "ease",
    );
  });

  test("값 동일 → transition 대상 속성이지만 변경 없음 → start() 미호출", () => {
    // Arrange: opacity가 같음
    const prev = makeElement("e1", {
      opacity: 0.5,
      transition: "opacity 300ms ease",
    });
    const next = makeElement("e1", {
      opacity: 0.5, // 동일
      transition: "opacity 300ms ease",
    });
    const prevMap = new Map([["e1", prev]]);
    const nextMap = new Map([["e1", next]]);

    // Act
    bridge.sync(prevMap, null, "light");
    bridge.sync(nextMap, null, "light");

    // Assert
    expect(mockTM.start).not.toHaveBeenCalled();
  });

  test("duration=0 → start() 미호출 (transition 비활성화)", () => {
    // Arrange: 0ms transition
    const prev = makeElement("e1", {
      opacity: 1,
      transition: "opacity 0ms ease",
    });
    const next = makeElement("e1", {
      opacity: 0,
      transition: "opacity 0ms ease",
    });
    const prevMap = new Map([["e1", prev]]);
    const nextMap = new Map([["e1", next]]);

    // Act
    bridge.sync(prevMap, null, "light");
    bridge.sync(nextMap, null, "light");

    // Assert
    expect(mockTM.start).not.toHaveBeenCalled();
  });

  test("transition: 'none' → start() 미호출", () => {
    // Arrange
    const prev = makeElement("e1", { opacity: 1, transition: "none" });
    const next = makeElement("e1", { opacity: 0, transition: "none" });
    const prevMap = new Map([["e1", prev]]);
    const nextMap = new Map([["e1", next]]);

    // Act
    bridge.sync(prevMap, null, "light");
    bridge.sync(nextMap, null, "light");

    // Assert
    expect(mockTM.start).not.toHaveBeenCalled();
  });

  test("style 없는 요소 변경 → start() 미호출 (안전 처리)", () => {
    // Arrange: props.style 없음
    const prev = { id: "e1", tag: "div", props: {} } as Element;
    const next = {
      id: "e1",
      tag: "div",
      props: { children: "hello" },
    } as Element;
    const prevMap = new Map([["e1", prev]]);
    const nextMap = new Map([["e1", next]]);

    // Act (에러 없이 처리되어야 함)
    expect(() => {
      bridge.sync(prevMap, null, "light");
      bridge.sync(nextMap, null, "light");
    }).not.toThrow();

    // Assert
    expect(mockTM.start).not.toHaveBeenCalled();
  });

  test("TransitionManager 미연결 → sync 정상 동작 (null 안전 처리)", () => {
    // Arrange: transitionManager 없음
    bridge.transitionManager = null;
    const prev = makeElement("e1", {
      opacity: 1,
      transition: "opacity 300ms ease",
    });
    const next = makeElement("e1", {
      opacity: 0,
      transition: "opacity 300ms ease",
    });

    // Act (에러 없이 처리)
    expect(() => {
      bridge.sync(new Map([["e1", prev]]), null, "light");
      bridge.sync(new Map([["e1", next]]), null, "light");
    }).not.toThrow();
  });

  test("요소 삭제 시 TransitionManager.remove() 호출", () => {
    // Arrange
    const el = makeElement("e1", { opacity: 1 });
    const prevMap = new Map([["e1", el]]);
    const nextMap = new Map<string, Element>(); // e1 삭제

    // Act
    bridge.sync(prevMap, null, "light");
    bridge.sync(nextMap, null, "light");

    // Assert
    expect(mockTM.remove).toHaveBeenCalledWith("e1");
  });

  test("문자열 스타일 값 파싱: '100px' → 100으로 변환 후 transition", () => {
    // Arrange: width가 px 문자열로 저장된 경우
    const prev = makeElement("e1", {
      width: "100px",
      transition: "width 400ms ease",
    });
    const next = makeElement("e1", {
      width: "200px",
      transition: "width 400ms ease",
    });
    const prevMap = new Map([["e1", prev]]);
    const nextMap = new Map([["e1", next]]);

    // Act
    bridge.sync(prevMap, null, "light");
    bridge.sync(nextMap, null, "light");

    // Assert: parseFloat("100px") = 100
    expect(mockTM.start).toHaveBeenCalledWith(
      "e1",
      "width",
      100,
      200,
      400,
      "ease",
    );
  });
});
