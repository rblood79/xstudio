// @vitest-environment node
import { describe, expect, it } from "vitest";
import { withFrameElementMirrorId } from "@/adapters/canonical/frameMirror";
import type { SkiaRendererInput } from "../renderers";
import type { Element } from "../../../../types/core/store.types";
import { collectVisibleFrameRoots } from "./visibleFrameRoots";

type ElementFixtureOptions = Partial<Element> & {
  frameId?: string | null;
};

const makeElement = ({
  frameId = null,
  ...overrides
}: ElementFixtureOptions): Element =>
  withFrameElementMirrorId(
    {
      id: "el-1",
      type: "div",
      parent_id: null,
      page_id: null,
      order_num: 0,
      props: {},
      ...overrides,
    } as Element,
    frameId,
  );

const makeInput = (partial: Partial<SkiaRendererInput>): SkiaRendererInput => {
  const elements = partial.elements ?? [];
  const elementsMap =
    partial.elementsMap ?? new Map(elements.map((el) => [el.id, el]));
  return {
    childrenMap: new Map(),
    elements,
    elementsMap,
    dirtyElementIds: new Set(),
    editMode: "layout",
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
  it("page mode 에서는 selectedReusableFrameId/frameAreas 가 남아 있어도 frame roots 를 렌더하지 않는다", () => {
    const bodyEl = makeElement({
      id: "frame-body-1",
      type: "body",
      frameId: "frame-A",
    });

    const result = collectVisibleFrameRoots(
      makeInput({
        editMode: "page",
        elements: [bodyEl],
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

    expect(result.rootElementIds).toEqual([]);
    expect(result.bodyPagePositions).toEqual({});
  });

  it("frameAreas 비어 있으면 빈 결과 반환", () => {
    const result = collectVisibleFrameRoots(makeInput({ frameAreas: [] }));
    expect(result.rootElementIds).toEqual([]);
    expect(result.bodyPagePositions).toEqual({});
  });

  it("type='body' + layout_id 매칭 frame body 가 root + frameAreas 좌표 반영", () => {
    const bodyEl = makeElement({
      id: "frame-body-1",
      type: "body",
      frameId: "frame-A",
    });

    const result = collectVisibleFrameRoots(
      makeInput({
        elements: [bodyEl],
        framePositions: {
          "frame-A": { x: 999, y: 888, width: 320, height: 200 },
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

  it("page-bound body 가 같은 layout_id 를 가져도 frame mode root 로 등록하지 않는다", () => {
    const pageBody = makeElement({
      id: "page-body",
      type: "body",
      page_id: "page-1",
      frameId: "frame-A",
    });
    const frameBody = makeElement({
      id: "frame-body",
      type: "body",
      page_id: null,
      frameId: "frame-A",
    });

    const result = collectVisibleFrameRoots(
      makeInput({
        elements: [pageBody, frameBody],
        frameAreas: [
          {
            frameId: "frame-A",
            frameName: "Frame A",
            x: 0,
            y: 0,
            width: 320,
            height: 200,
          },
        ],
      }),
    );

    expect(result.rootElementIds).toEqual(["frame-body"]);
  });

  it("stale framePositions 가 있어도 정규화된 frameAreas.x/y 를 사용한다", () => {
    const bodyEl = makeElement({
      id: "frame-body-1",
      type: "body",
      frameId: "frame-A",
    });

    const result = collectVisibleFrameRoots(
      makeInput({
        elements: [bodyEl],
        framePositions: {
          "frame-A": { x: 900, y: 900, width: 320, height: 200 },
        },
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
    const body1 = makeElement({
      id: "fb-1",
      type: "body",
      frameId: "frame-A",
    });
    const body2 = makeElement({
      id: "fb-2",
      type: "body",
      frameId: "frame-B",
    });

    const result = collectVisibleFrameRoots(
      makeInput({
        elements: [body1, body2],
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

  it("Slot 등 type !== 'body' 가 layout_id 매칭 첫 element 여도 frame body 로 등록 안 됨 (P3-δ fix #1)", () => {
    // 실 회귀 시나리오 (Chrome MCP 2026-04-28): elements 배열 순서가
    // [Slot, Slot, body] 처럼 Slot 이 먼저 와도 frame body 가 정확히 등록되어야 함.
    // composition-pre-1.0 legacy 의 layout_id propagation 로 자식 Slot 도 layout_id 동일.
    const slot1 = makeElement({
      id: "slot-1",
      type: "Slot",
      parent_id: "frame-body-1",
      frameId: "frame-A",
    });
    const slot2 = makeElement({
      id: "slot-2",
      type: "Slot",
      parent_id: "frame-body-1",
      frameId: "frame-A",
    });
    const frameBody = makeElement({
      id: "frame-body-1",
      type: "body",
      frameId: "frame-A",
    });

    const result = collectVisibleFrameRoots(
      makeInput({
        elements: [slot1, slot2, frameBody], // Slot 먼저, body 마지막
        framePositions: {
          "frame-A": { x: 100, y: 50, width: 320, height: 200 },
        },
        frameAreas: [
          {
            frameId: "frame-A",
            frameName: "A",
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
    expect(result.bodyPagePositions["slot-1"]).toBeUndefined();
    expect(result.bodyPagePositions["slot-2"]).toBeUndefined();
  });

  it("같은 layout_id 의 type='body' element 가 여러 개여도 첫 매칭만 등록 (중복 방어)", () => {
    const body1 = makeElement({
      id: "frame-body-A",
      type: "body",
      frameId: "frame-X",
    });
    const body1Dup = makeElement({
      id: "frame-body-A-dup",
      type: "body",
      frameId: "frame-X",
    });

    const result = collectVisibleFrameRoots(
      makeInput({
        elements: [body1, body1Dup],
        framePositions: {
          "frame-X": { x: 0, y: 0, width: 100, height: 100 },
        },
        frameAreas: [
          {
            frameId: "frame-X",
            frameName: "X",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
          },
        ],
      }),
    );

    expect(result.rootElementIds).toEqual(["frame-body-A"]);
  });

  it("deleted frame body 는 live root 로 등록하지 않는다", () => {
    const deletedBody = makeElement({
      id: "deleted-body",
      type: "body",
      frameId: "frame-X",
      deleted: true,
    });

    const result = collectVisibleFrameRoots(
      makeInput({
        elements: [deletedBody],
        frameAreas: [
          {
            frameId: "frame-X",
            frameName: "X",
            x: 0,
            y: 0,
            width: 100,
            height: 100,
          },
        ],
      }),
    );

    expect(result.rootElementIds).toEqual([]);
    expect(result.bodyPagePositions).toEqual({});
  });
});
