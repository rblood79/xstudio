import { describe, expect, it } from "vitest";
import type { Element } from "../../../../../types/core/store.types";
import {
  buildChildrenIdMap,
  buildPageChildrenMap,
  createPageElementsSignature,
  createPageLayoutSignature,
  getCachedPageLayout,
} from "../layoutCache";
import { buildPageDirtyState } from "../subtreeInvalidation";

function createElement(overrides: Partial<Element>): Element {
  return {
    id: overrides.id ?? "el-1",
    props: overrides.props ?? {},
    tag: overrides.tag ?? "Div",
    ...overrides,
  };
}

describe("layoutCache", () => {
  it("dirtyElementIds는 현재 페이지 요소만 반영한다", () => {
    const bodyA = createElement({ id: "body-a", page_id: "page-a", tag: "Body" });
    const childA = createElement({
      id: "child-a",
      page_id: "page-a",
      parent_id: "body-a",
      tag: "Card",
    });
    const childB = createElement({
      id: "child-b",
      page_id: "page-b",
      parent_id: "body-b",
      tag: "Card",
    });

    const dirtyState = buildPageDirtyState({
      bodyElement: bodyA,
      dirtyElementIds: new Set(["child-a", "child-b"]),
      elementsMap: new Map([
        [bodyA.id, bodyA],
        [childA.id, childA],
        [childB.id, childB],
      ]),
      pageChildrenMap: new Map([
        [bodyA.id, [childA]],
        [childA.id, []],
      ]),
    });

    expect([...dirtyState.dirtyIds]).toEqual(["child-a"]);
    expect(dirtyState.hasDirty).toBe(true);
    expect(dirtyState.affectedLayoutNodeIds.has(bodyA.id)).toBe(true);
    expect(dirtyState.affectedLayoutNodeIds.has(childA.id)).toBe(true);
  });

  it("dirty가 없으면 동일 페이지 레이아웃 결과를 캐시 재사용한다", () => {
    const body = createElement({
      id: "body-a",
      page_id: "page-a",
      props: { style: { width: 800, height: 600 } },
      tag: "Body",
    });
    const child = createElement({
      id: "child-a",
      page_id: "page-a",
      parent_id: "body-a",
      props: { style: { width: 100, height: 40 } },
      tag: "Card",
    });
    const elementById = new Map([
      [body.id, body],
      [child.id, child],
    ]);
    const pageElements = [child];
    const pageChildrenMap = buildPageChildrenMap({
      bodyElement: body,
      elementById,
      pageElements,
    });
    const childrenIdMap = buildChildrenIdMap(pageChildrenMap);
    const pageElementsSignature = createPageElementsSignature(pageElements);
    const pageLayoutSignature = createPageLayoutSignature(body, pageElements);
    const pageDirtyState = buildPageDirtyState({
      bodyElement: body,
      dirtyElementIds: new Set(),
      elementsMap: elementById,
    });

    const first = getCachedPageLayout({
      bodyElement: body,
      childrenIdMap,
      elementById,
      pageChildrenMap,
      pageDirtyState,
      pageElementsSignature,
      pageLayoutSignature,
      pageHeight: 600,
      pageWidth: 800,
      wasmLayoutReady: true,
    });
    const second = getCachedPageLayout({
      bodyElement: body,
      childrenIdMap,
      elementById,
      pageChildrenMap,
      pageDirtyState,
      pageElementsSignature,
      pageLayoutSignature,
      pageHeight: 600,
      pageWidth: 800,
      wasmLayoutReady: true,
    });

    expect(first).toBe(second);
  });

  it("dirty가 있어도 layout signature가 같으면 캐시를 재사용한다", () => {
    const body = createElement({
      id: "body-a",
      page_id: "page-a",
      props: { style: { width: 800, height: 600 } },
      tag: "Body",
    });
    const originalChild = createElement({
      id: "child-a",
      page_id: "page-a",
      parent_id: "body-a",
      props: { style: { width: 100, height: 40, background: "red" } },
      tag: "Card",
    });
    const updatedChild = createElement({
      ...originalChild,
      props: { style: { width: 100, height: 40, background: "blue" } },
    });

    const originalMap = new Map([
      [body.id, body],
      [originalChild.id, originalChild],
    ]);
    const updatedMap = new Map([
      [body.id, body],
      [updatedChild.id, updatedChild],
    ]);

    const pageElements = [originalChild];
    const originalChildrenMap = buildPageChildrenMap({
      bodyElement: body,
      elementById: originalMap,
      pageElements,
    });
    const updatedChildrenMap = buildPageChildrenMap({
      bodyElement: body,
      elementById: updatedMap,
      pageElements: [updatedChild],
    });

    const pageElementsSignature = createPageElementsSignature(pageElements);
    const first = getCachedPageLayout({
      bodyElement: body,
      childrenIdMap: buildChildrenIdMap(originalChildrenMap),
      elementById: originalMap,
      pageChildrenMap: originalChildrenMap,
      pageDirtyState: buildPageDirtyState({
        bodyElement: body,
        dirtyElementIds: new Set(),
        elementsMap: originalMap,
      }),
      pageElementsSignature,
      pageLayoutSignature: createPageLayoutSignature(body, pageElements),
      pageHeight: 600,
      pageWidth: 800,
      wasmLayoutReady: true,
    });

    const second = getCachedPageLayout({
      bodyElement: body,
      childrenIdMap: buildChildrenIdMap(updatedChildrenMap),
      elementById: updatedMap,
      pageChildrenMap: updatedChildrenMap,
      pageDirtyState: buildPageDirtyState({
        bodyElement: body,
        dirtyElementIds: new Set(["child-a"]),
        elementsMap: updatedMap,
      }),
      pageElementsSignature,
      pageLayoutSignature: createPageLayoutSignature(body, [updatedChild]),
      pageHeight: 600,
      pageWidth: 800,
      wasmLayoutReady: true,
    });

    expect(first).toBe(second);
  });

  it("layout signature가 바뀌면 dirty 상태에서 캐시를 재사용하지 않는다", () => {
    const body = createElement({
      id: "body-a",
      page_id: "page-a",
      props: { style: { width: 800, height: 600 } },
      tag: "Body",
    });
    const originalChild = createElement({
      id: "child-a",
      page_id: "page-a",
      parent_id: "body-a",
      props: { style: { width: 100, height: 40 } },
      tag: "Card",
    });
    const resizedChild = createElement({
      ...originalChild,
      props: { style: { width: 140, height: 40 } },
    });

    const originalMap = new Map([
      [body.id, body],
      [originalChild.id, originalChild],
    ]);
    const resizedMap = new Map([
      [body.id, body],
      [resizedChild.id, resizedChild],
    ]);

    const originalLayoutSignature = createPageLayoutSignature(body, [originalChild]);
    const first = getCachedPageLayout({
      bodyElement: body,
      childrenIdMap: buildChildrenIdMap(
        buildPageChildrenMap({
          bodyElement: body,
          elementById: originalMap,
          pageElements: [originalChild],
        }),
      ),
      elementById: originalMap,
      pageChildrenMap: buildPageChildrenMap({
        bodyElement: body,
        elementById: originalMap,
        pageElements: [originalChild],
      }),
      pageDirtyState: buildPageDirtyState({
        bodyElement: body,
        dirtyElementIds: new Set(),
        elementsMap: originalMap,
      }),
      pageElementsSignature: createPageElementsSignature([originalChild]),
      pageLayoutSignature: originalLayoutSignature,
      pageHeight: 600,
      pageWidth: 800,
      wasmLayoutReady: true,
    });

    const resizedChildrenMap = buildPageChildrenMap({
      bodyElement: body,
      elementById: resizedMap,
      pageElements: [resizedChild],
    });
    const resizedLayoutSignature = createPageLayoutSignature(body, [resizedChild]);
    const second = getCachedPageLayout({
      bodyElement: body,
      childrenIdMap: buildChildrenIdMap(resizedChildrenMap),
      elementById: resizedMap,
      pageChildrenMap: resizedChildrenMap,
      pageDirtyState: buildPageDirtyState({
        bodyElement: body,
        dirtyElementIds: new Set(["child-a"]),
        elementsMap: resizedMap,
      }),
      pageElementsSignature: createPageElementsSignature([resizedChild]),
      pageLayoutSignature: resizedLayoutSignature,
      pageHeight: 600,
      pageWidth: 800,
      wasmLayoutReady: true,
    });

    expect(resizedLayoutSignature).not.toBe(originalLayoutSignature);
    if (first && second) {
      expect(second).not.toBe(first);
    }
  });
});
