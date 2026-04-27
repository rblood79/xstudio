// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { SkiaRendererInput } from "../renderers";
import type { Element } from "../../../../types/core/store.types";
import { collectVisibleFrameRoots } from "./visibleFrameRoots";

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

const makeInput = (partial: Partial<SkiaRendererInput>): SkiaRendererInput => {
  const elements = partial.elements ?? [];
  const elementsMap =
    partial.elementsMap ?? new Map(elements.map((el) => [el.id, el]));
  return {
    childrenMap: new Map(),
    elements,
    elementsMap,
    dirtyElementIds: new Set(),
    pageIndex: { elementsByPage: new Map() } as never,
    pagePositionsVersion: 0,
    pagePositions: {},
    pageSnapshots: new Map(),
    pages: [],
    sceneSnapshot: { document: { visiblePageIds: new Set() } } as never,
    framePositions: {},
    framePositionsVersion: 0,
    frameAreas: [],
    ...partial,
  };
};

describe("ADR-911 P3-δ collectVisibleFrameRoots", () => {
  it("frameAreas 비어 있으면 빈 결과 반환", () => {
    const result = collectVisibleFrameRoots(makeInput({ frameAreas: [] }));
    expect(result.rootElementIds).toEqual([]);
    expect(result.bodyPagePositions).toEqual({});
  });

  it("layout_id 매칭 frame body 가 root + framePositions 좌표 반영", () => {
    const bodyEl = makeElement({
      id: "frame-body-1",
      type: "div",
      layout_id: "frame-A",
      parent_id: "root-body",
    });
    const rootBody = makeElement({ id: "root-body", type: "body" });

    const result = collectVisibleFrameRoots(
      makeInput({
        elements: [rootBody, bodyEl],
        framePositions: {
          "frame-A": { x: 100, y: 50, width: 320, height: 200 },
        },
        frameAreas: [
          {
            frameId: "frame-A",
            frameName: "Frame A",
            x: 100,
            y: 50,
            width: 320,
            height: 200,
          },
        ],
      }),
    );

    expect(result.rootElementIds).toEqual(["frame-body-1"]);
    expect(result.bodyPagePositions["frame-body-1"]).toEqual({ x: 100, y: 50 });
  });

  it("framePositions miss 시 frameAreas.x/y 로 fallback", () => {
    const bodyEl = makeElement({
      id: "frame-body-1",
      layout_id: "frame-A",
      parent_id: "root-body",
    });
    const rootBody = makeElement({ id: "root-body", type: "body" });

    const result = collectVisibleFrameRoots(
      makeInput({
        elements: [rootBody, bodyEl],
        framePositions: {},
        frameAreas: [
          {
            frameId: "frame-A",
            frameName: "Frame A",
            x: 50,
            y: 25,
            width: 0,
            height: 0,
          },
        ],
      }),
    );

    expect(result.bodyPagePositions["frame-body-1"]).toEqual({ x: 50, y: 25 });
  });

  it("frame body element 부재 시 root list 에서 제외 (silent skip)", () => {
    const result = collectVisibleFrameRoots(
      makeInput({
        elements: [],
        frameAreas: [
          {
            frameId: "frame-orphan",
            frameName: "Orphan",
            x: 0,
            y: 0,
            width: 0,
            height: 0,
          },
        ],
      }),
    );

    expect(result.rootElementIds).toEqual([]);
    expect(result.bodyPagePositions).toEqual({});
  });

  it("다중 frame: body 매칭 + 좌표 매핑 보존", () => {
    const rootBody = makeElement({ id: "root-body", type: "body" });
    const body1 = makeElement({
      id: "fb-1",
      layout_id: "frame-A",
      parent_id: "root-body",
    });
    const body2 = makeElement({
      id: "fb-2",
      layout_id: "frame-B",
      parent_id: "root-body",
    });

    const result = collectVisibleFrameRoots(
      makeInput({
        elements: [rootBody, body1, body2],
        framePositions: {
          "frame-A": { x: 0, y: 0, width: 320, height: 200 },
          "frame-B": { x: 400, y: 0, width: 480, height: 300 },
        },
        frameAreas: [
          {
            frameId: "frame-A",
            frameName: "A",
            x: 0,
            y: 0,
            width: 320,
            height: 200,
          },
          {
            frameId: "frame-B",
            frameName: "B",
            x: 400,
            y: 0,
            width: 480,
            height: 300,
          },
        ],
      }),
    );

    expect(result.rootElementIds).toEqual(["fb-1", "fb-2"]);
    expect(result.bodyPagePositions["fb-1"]).toEqual({ x: 0, y: 0 });
    expect(result.bodyPagePositions["fb-2"]).toEqual({ x: 400, y: 0 });
  });

  it("body 가 아닌 parent 의 element 는 frame body 후보 제외", () => {
    const rootBody = makeElement({ id: "root-body", type: "body" });
    const container = makeElement({
      id: "container-1",
      type: "div",
      parent_id: "root-body",
    });
    const slotInsideContainer = makeElement({
      id: "slot-1",
      type: "div",
      layout_id: "frame-A",
      parent_id: "container-1", // body 가 아님
    });

    const result = collectVisibleFrameRoots(
      makeInput({
        elements: [rootBody, container, slotInsideContainer],
        framePositions: {
          "frame-A": { x: 0, y: 0, width: 100, height: 100 },
        },
        frameAreas: [
          {
            frameId: "frame-A",
            frameName: "A",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
          },
        ],
      }),
    );

    expect(result.rootElementIds).toEqual([]);
  });
});
