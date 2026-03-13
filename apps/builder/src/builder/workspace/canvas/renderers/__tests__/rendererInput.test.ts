import { describe, expect, it } from "vitest";
import type { Element, Page } from "../../../../../types/core/store.types";
import { rebuildPageIndex } from "../../../../stores/utils/elementIndexer";
import { buildSceneSnapshot } from "../../scene/buildSceneSnapshot";
import {
  buildPixiPageRendererInput,
  createRendererInvalidationPacket,
  createSkiaRendererInput,
} from "../index";

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

describe("renderer input builders", () => {
  it("scene snapshot에서 Pixi page renderer input을 조립한다", () => {
    const pages = [createPage({ id: "page-a", title: "A" })];
    const elements = [
      createElement({ id: "body-a", page_id: "page-a", tag: "Body" }),
      createElement({
        id: "text-a",
        page_id: "page-a",
        parent_id: "body-a",
        order_num: 1,
        tag: "Text",
      }),
    ];
    const elementsMap = new Map(elements.map((element) => [element.id, element]));
    const pageIndex = rebuildPageIndex(elements, elementsMap);
    const sceneSnapshot = buildSceneSnapshot({
      currentPageId: "page-a",
      elements,
      elementsMap,
      layoutVersion: 2,
      pageHeight: 600,
      pageIndex,
      pagePositions: { "page-a": { x: 20, y: 40 } },
      pagePositionsVersion: 3,
      pageWidth: 800,
      pages,
      panOffset: { x: 0, y: 0 },
      selectedElementIds: ["text-a"],
      zoom: 1,
    });

    const input = buildPixiPageRendererInput({
      elementById: elementsMap,
      dirtyElementIds: new Set(["text-a"]),
      pageHeight: 600,
      pageId: "page-a",
      pagePositionVersion: 3,
      pageWidth: 800,
      panOffset: { x: 10, y: 20 },
      sceneSnapshot,
      wasmLayoutReady: true,
      zoom: 1.5,
    });

    expect(input?.bodyElement?.id).toBe("body-a");
    expect(input?.pageElements.map((element) => element.id)).toEqual(["text-a"]);
    expect(input?.pageSnapshot.pageId).toBe("page-a");
    expect(input?.layoutVersion).toBe(2);
  });

  it("Skia renderer input과 invalidation packet을 생성한다", () => {
    const pages = [createPage({ id: "page-a", title: "A" })];
    const elements = [createElement({ id: "body-a", page_id: "page-a", tag: "Body" })];
    const elementsMap = new Map(elements.map((element) => [element.id, element]));
    const pageIndex = rebuildPageIndex(elements, elementsMap);
    const sceneSnapshot = buildSceneSnapshot({
      currentPageId: "page-a",
      elements,
      elementsMap,
      layoutVersion: 1,
      pageHeight: 600,
      pageIndex,
      pagePositions: { "page-a": { x: 0, y: 0 } },
      pagePositionsVersion: 4,
      pageWidth: 800,
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
      pagePositions: { "page-a": { x: 0, y: 0 } },
      pagePositionsVersion: 4,
      pages,
      sceneSnapshot,
    });
    const packet = createRendererInvalidationPacket({
      ai: {
        cleanupExpiredFlashes: () => {},
        flashAnimations: new Map(),
        generatingNodes: new Map(),
      },
      dragActive: false,
      grid: {
        gridSize: 8,
        showGrid: true,
      },
      selection: {
        currentPageId: "page-a",
        editingContextId: null,
        selectedElementId: null,
        selectedElementIds: [],
      },
      workflow: {
        dataSourceEdges: [],
        focusedPageId: null,
        layoutGroups: [],
        layouts: [],
        showDataSources: false,
        showEvents: false,
        showLayoutGroups: false,
        showNavigation: true,
        showOverlay: false,
        straightEdges: false,
        workflowEdges: [],
      },
    });

    expect(rendererInput.pagePositionsVersion).toBe(4);
    expect(rendererInput.pageSnapshots.get("page-a")?.bodyElement?.id).toBe(
      "body-a",
    );
    expect(rendererInput.sceneSnapshot.sceneVersion).toBe(sceneSnapshot.sceneVersion);
    expect(packet.grid.showGrid).toBe(true);
    expect(packet.selection.currentPageId).toBe("page-a");
  });
});
