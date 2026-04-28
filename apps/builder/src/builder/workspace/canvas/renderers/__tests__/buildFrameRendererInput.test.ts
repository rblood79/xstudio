// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Element } from "../../../../../types/core/store.types";
import type { SceneStructureSnapshot } from "../../scene";
import { buildFrameRendererInput } from "../rendererInput";

const makeElement = (overrides: Partial<Element>): Element =>
  ({
    id: "el-1",
    type: "div",
    parent_id: null,
    page_id: null,
    layout_id: null,
    order_num: 0,
    props: {},
    ...overrides,
  }) as Element;

const makeSceneSnapshot = (
  overrides: Partial<SceneStructureSnapshot> = {},
): SceneStructureSnapshot => ({
  depthMap: new Map(),
  document: {
    allPageFrames: [],
    allPageFrameVersion: 0,
    currentPageId: null,
    currentPageSnapshot: null,
    pageCount: 0,
    visibleContentVersion: 0,
    visiblePageFrames: [],
    visiblePageIds: new Set(),
    visiblePagePositionVersion: 0,
  },
  layoutVersion: 0,
  pageSnapshots: new Map(),
  sceneVersion: 0,
  viewportVersion: 0,
  ...overrides,
});

const baseOptions = {
  dirtyElementIds: new Set<string>(),
  pagePositionVersion: 0,
  panOffset: { x: 0, y: 0 },
  wasmLayoutReady: true,
  zoom: 1,
};

describe("ADR-911 P3-δ fix #3 — buildFrameRendererInput", () => {
  it("frame body element 부재 시 null 반환", () => {
    const elementById = new Map<string, Element>();
    const result = buildFrameRendererInput({
      ...baseOptions,
      elementById,
      frameHeight: 200,
      frameId: "frame-A",
      frameWidth: 320,
      frameX: 0,
      frameY: 0,
      sceneSnapshot: makeSceneSnapshot(),
    });
    expect(result).toBeNull();
  });

  it("type='body' + layout_id 매칭 frame body 식별 + pageElements 에 subtree 포함", () => {
    const body = makeElement({
      id: "frame-body-A",
      type: "body",
      layout_id: "frame-A",
    });
    const slot1 = makeElement({
      id: "slot-1",
      type: "Slot",
      parent_id: "frame-body-A",
      layout_id: "frame-A",
    });
    const slot2 = makeElement({
      id: "slot-2",
      type: "Slot",
      parent_id: "frame-body-A",
      layout_id: "frame-A",
    });
    const otherFrameBody = makeElement({
      id: "other-body",
      type: "body",
      layout_id: "frame-B",
    });

    const elementById = new Map<string, Element>([
      [body.id, body],
      [slot1.id, slot1],
      [slot2.id, slot2],
      [otherFrameBody.id, otherFrameBody],
    ]);

    const result = buildFrameRendererInput({
      ...baseOptions,
      elementById,
      frameHeight: 844,
      frameId: "frame-A",
      frameWidth: 390,
      frameX: 470,
      frameY: 0,
      sceneSnapshot: makeSceneSnapshot(),
    });

    expect(result).not.toBeNull();
    expect(result!.bodyElement).toBe(body);
    // pageElements 는 body 제외 (page 경로 nonBodyElements 와 동일 정책 — fix #3 회귀 방지)
    expect(result!.pageElements).toHaveLength(2);
    expect(result!.pageElements.map((el) => el.id).sort()).toEqual([
      "slot-1",
      "slot-2",
    ]);
    // body 자체와 다른 frame 의 body 는 모두 pageElements 에서 제외
    expect(
      result!.pageElements.find((el) => el.id === "frame-body-A"),
    ).toBeUndefined();
    expect(
      result!.pageElements.find((el) => el.id === "other-body"),
    ).toBeUndefined();
  });

  it("pageWidth/pageHeight = frameWidth/frameHeight 매핑", () => {
    const body = makeElement({
      id: "frame-body",
      type: "body",
      layout_id: "frame-A",
    });
    const elementById = new Map([[body.id, body]]);

    const result = buildFrameRendererInput({
      ...baseOptions,
      elementById,
      frameHeight: 600,
      frameId: "frame-A",
      frameWidth: 400,
      frameX: 100,
      frameY: 50,
      sceneSnapshot: makeSceneSnapshot(),
    });

    expect(result!.pageWidth).toBe(400);
    expect(result!.pageHeight).toBe(600);
    expect(result!.pageId).toBe("frame-A");
    expect(result!.pageSnapshot.frame).toEqual(
      expect.objectContaining({
        x: 100,
        y: 50,
        width: 400,
        height: 600,
      }),
    );
  });

  it("Slot 만 layout_id 매칭 (body 부재) 시 null — fix #1 동일 원칙", () => {
    // composition-pre-1.0 legacy layout_id propagation: Slot 이 layout_id 보유
    // 하지만 frame body 가 아직 미생성 상태 → null 반환 (정상 graceful skip)
    const slot = makeElement({
      id: "slot-orphan",
      type: "Slot",
      layout_id: "frame-A",
    });
    const elementById = new Map([[slot.id, slot]]);

    const result = buildFrameRendererInput({
      ...baseOptions,
      elementById,
      frameHeight: 200,
      frameId: "frame-A",
      frameWidth: 320,
      frameX: 0,
      frameY: 0,
      sceneSnapshot: makeSceneSnapshot(),
    });

    expect(result).toBeNull();
  });

  it("동일 frameId 의 type='body' element 중복 시 첫 매칭만 등록 + body 들은 pageElements 에서 모두 제외", () => {
    const body1 = makeElement({
      id: "body-1",
      type: "body",
      layout_id: "frame-A",
    });
    const body2 = makeElement({
      id: "body-2",
      type: "body",
      layout_id: "frame-A",
    });
    const elementById = new Map([
      [body1.id, body1],
      [body2.id, body2],
    ]);

    const result = buildFrameRendererInput({
      ...baseOptions,
      elementById,
      frameHeight: 200,
      frameId: "frame-A",
      frameWidth: 320,
      frameX: 0,
      frameY: 0,
      sceneSnapshot: makeSceneSnapshot(),
    });

    expect(result!.bodyElement).toBe(body1); // 첫 매칭
    // body type 은 모두 pageElements 에서 제외 (self-child 회귀 방지)
    expect(result!.pageElements).toHaveLength(0);
  });

  it("sceneSnapshot 의 depthMap / layoutVersion 전파", () => {
    const body = makeElement({
      id: "frame-body",
      type: "body",
      layout_id: "frame-A",
    });
    const elementById = new Map([[body.id, body]]);

    const depthMap = new Map([[body.id, 1]]);
    const sceneSnapshot = makeSceneSnapshot({
      depthMap,
      layoutVersion: 42,
    });

    const result = buildFrameRendererInput({
      ...baseOptions,
      elementById,
      frameHeight: 200,
      frameId: "frame-A",
      frameWidth: 320,
      frameX: 0,
      frameY: 0,
      sceneSnapshot,
    });

    expect(result!.depthMap).toBe(depthMap);
    expect(result!.layoutVersion).toBe(42);
  });
});
