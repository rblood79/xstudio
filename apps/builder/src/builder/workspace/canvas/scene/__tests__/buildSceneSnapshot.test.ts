import { describe, expect, it } from "vitest";
import type { Element, Page } from "../../../../../types/core/store.types";
import { rebuildPageIndex } from "../../../../stores/utils/elementIndexer";
import { buildSceneSnapshot } from "../buildSceneSnapshot";

function createPage(overrides: Partial<Page>): Page {
  return {
    id: overrides.id ?? "page-1",
    project_id: overrides.project_id ?? "project-1",
    slug: overrides.slug ?? "page-1",
    title: overrides.title ?? "Page 1",
    ...overrides,
  };
}

function createElement(overrides: Partial<Element>): Element {
  return {
    id: overrides.id ?? "el-1",
    props: overrides.props ?? {},
    tag: overrides.tag ?? "Div",
    ...overrides,
  };
}

describe("buildSceneSnapshot", () => {
  it("페이지별 body와 non-body 요소를 분리하고 visible page를 계산한다", () => {
    const pages = [
      createPage({ id: "page-a", slug: "a", title: "A" }),
      createPage({ id: "page-b", slug: "b", title: "B" }),
    ];
    const elements = [
      createElement({ id: "body-a", page_id: "page-a", tag: "Body" }),
      createElement({
        id: "text-a",
        order_num: 1,
        page_id: "page-a",
        parent_id: "body-a",
        tag: "Text",
      }),
      createElement({ id: "body-b", page_id: "page-b", tag: "Body" }),
      createElement({
        id: "card-b",
        order_num: 1,
        page_id: "page-b",
        parent_id: "body-b",
        tag: "Card",
      }),
    ];
    const elementsMap = new Map(elements.map((element) => [element.id, element]));
    const pageIndex = rebuildPageIndex(elements, elementsMap);

    const snapshot = buildSceneSnapshot({
      containerSize: { width: 1200, height: 800 },
      currentPageId: "page-a",
      elements,
      elementsMap,
      layoutVersion: 7,
      pageHeight: 600,
      pageIndex,
      pagePositions: {
        "page-a": { x: 0, y: 0 },
        "page-b": { x: 2000, y: 0 },
      },
      pagePositionsVersion: 3,
      pageWidth: 1000,
      pages,
      panOffset: { x: 0, y: 0 },
      selectedElementIds: ["text-a", "card-b"],
      zoom: 1,
    });

    expect(snapshot.document.currentPageSnapshot?.bodyElement?.id).toBe("body-a");
    expect(
      snapshot.document.currentPageSnapshot?.pageElements.map(
        (element) => element.id,
      ),
    ).toEqual(["text-a"]);
    expect(snapshot.document.allPageFrames).toHaveLength(2);
    expect(snapshot.document.allPageFrames[0]?.elementCount).toBe(2);
    expect(snapshot.document.visiblePageIds.has("page-a")).toBe(true);
    expect(snapshot.document.visiblePageIds.has("page-b")).toBe(false);
    expect(snapshot.pageSnapshots.get("page-a")?.isVisible).toBe(true);
    expect(snapshot.pageSnapshots.get("page-b")?.isVisible).toBe(false);
    expect(snapshot.document.visiblePageFrames.map((frame) => frame.id)).toEqual([
      "page-a",
    ]);
    expect(snapshot.selection.selectedIds).toEqual(["text-a"]);
  });

  it("display: contents 부모는 depth 증가 없이 계산한다", () => {
    const pages = [createPage({ id: "page-a", slug: "a", title: "A" })];
    const elements = [
      createElement({ id: "body-a", page_id: "page-a", tag: "Body" }),
      createElement({
        id: "contents-parent",
        page_id: "page-a",
        parent_id: "body-a",
        props: { style: { display: "contents" } },
        tag: "Div",
      }),
      createElement({
        id: "child",
        page_id: "page-a",
        parent_id: "contents-parent",
        tag: "Text",
      }),
    ];
    const elementsMap = new Map(elements.map((element) => [element.id, element]));
    const pageIndex = rebuildPageIndex(elements, elementsMap);

    const snapshot = buildSceneSnapshot({
      currentPageId: "page-a",
      elements,
      elementsMap,
      layoutVersion: 1,
      pageHeight: 600,
      pageIndex,
      pagePositions: { "page-a": { x: 0, y: 0 } },
      pagePositionsVersion: 1,
      pageWidth: 1000,
      pages,
      panOffset: { x: 0, y: 0 },
      selectedElementIds: [],
      zoom: 1,
    });

    expect(snapshot.depthMap.get("contents-parent")).toBe(0);
    expect(snapshot.depthMap.get("child")).toBe(1);
  });
});
