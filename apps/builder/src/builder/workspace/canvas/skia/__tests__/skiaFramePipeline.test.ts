import { describe, expect, it } from "vitest";
import type { Element, Page } from "../../../../../types/core/store.types";
import { rebuildPageIndex } from "../../../../stores/utils/elementIndexer";
import { createSkiaRendererInput } from "../../renderers";
import { buildSceneSnapshot } from "../../scene";
import { collectVisiblePageRoots } from "../visiblePageRoots";

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

describe("collectVisiblePageRoots", () => {
  it("visible page의 body만 Skia content root로 포함한다", () => {
    const pages = [
      createPage({ id: "page-a", title: "A" }),
      createPage({ id: "page-b", title: "B" }),
    ];
    const elements = [
      createElement({ id: "body-a", page_id: "page-a", tag: "Body" }),
      createElement({ id: "body-b", page_id: "page-b", tag: "Body" }),
    ];
    const elementsMap = new Map(elements.map((element) => [element.id, element]));
    const pageIndex = rebuildPageIndex(elements, elementsMap);
    const sceneSnapshot = buildSceneSnapshot({
      containerSize: { width: 1200, height: 800 },
      currentPageId: "page-a",
      elements,
      elementsMap,
      layoutVersion: 1,
      pageHeight: 700,
      pageIndex,
      pagePositions: {
        "page-a": { x: 0, y: 0 },
        "page-b": { x: 4000, y: 0 },
      },
      pagePositionsVersion: 1,
      pageWidth: 1000,
      pages,
      panOffset: { x: 0, y: 0 },
      selectedElementIds: [],
      zoom: 1,
    });
    const rendererInput = createSkiaRendererInput({
      childrenMap: new Map(),
      dirtyElementIds: new Set(),
      elements,
      elementsMap,
      pageIndex,
      pagePositions: {
        "page-a": { x: 0, y: 0 },
        "page-b": { x: 4000, y: 0 },
      },
      pagePositionsVersion: 1,
      pages,
      sceneSnapshot,
    });

    const result = collectVisiblePageRoots(rendererInput);

    expect(result.rootElementIds).toEqual(["body-a"]);
    expect(result.bodyPagePositions).toEqual({
      "body-a": { x: 0, y: 0 },
    });
  });
});
