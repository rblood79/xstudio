import { describe, expect, it } from "vitest";
import { createRendererInvalidationPacket } from "../invalidationPacket";

describe("invalidationPacket", () => {
  it("동일한 selection/workflow 내용이면 새 참조여도 같은 signature를 유지한다", () => {
    const first = createRendererInvalidationPacket({
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
        editingContextId: "ctx-a",
        selectedElementId: "el-a",
        selectedElementIds: ["el-a", "el-b"],
      },
      workflow: {
        dataSourceEdges: [
          {
            id: "ds-a",
            sourceType: "api",
            name: "Products",
            boundElements: [
              {
                elementId: "el-a",
                elementTag: "List",
                pageId: "page-a",
              },
            ],
          },
        ],
        focusedPageId: "page-a",
        layoutGroups: [
          {
            layoutId: "layout-a",
            layoutName: "Main",
            pageIds: ["page-a"],
          },
        ],
        layouts: [
          {
            id: "layout-a",
            name: "Main",
            project_id: "project-a",
            slug: "/main",
          },
        ],
        showDataSources: true,
        showEvents: false,
        showLayoutGroups: true,
        showNavigation: true,
        showOverlay: true,
        straightEdges: false,
        workflowEdges: [
          {
            id: "wf-a",
            label: "Link",
            sourceElementId: "el-a",
            sourcePageId: "page-a",
            targetPageId: "page-b",
            type: "navigation",
          },
        ],
      },
    });

    const second = createRendererInvalidationPacket({
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
        editingContextId: "ctx-a",
        selectedElementId: "el-a",
        selectedElementIds: ["el-a", "el-b"],
      },
      workflow: {
        dataSourceEdges: [
          {
            id: "ds-a",
            sourceType: "api",
            name: "Products",
            boundElements: [
              {
                elementId: "el-a",
                elementTag: "List",
                pageId: "page-a",
              },
            ],
          },
        ],
        focusedPageId: "page-a",
        layoutGroups: [
          {
            layoutId: "layout-a",
            layoutName: "Main",
            pageIds: ["page-a"],
          },
        ],
        layouts: [
          {
            id: "layout-a",
            name: "Main",
            project_id: "project-a",
            slug: "/main",
          },
        ],
        showDataSources: true,
        showEvents: false,
        showLayoutGroups: true,
        showNavigation: true,
        showOverlay: true,
        straightEdges: false,
        workflowEdges: [
          {
            id: "wf-a",
            label: "Link",
            sourceElementId: "el-a",
            sourcePageId: "page-a",
            targetPageId: "page-b",
            type: "navigation",
          },
        ],
      },
    });

    expect(second.selection.selectionSignature).toBe(
      first.selection.selectionSignature,
    );
    expect(second.selection.editingSignature).toBe(
      first.selection.editingSignature,
    );
    expect(second.grid.signature).toBe(first.grid.signature);
    expect(second.workflow.overlaySignature).toBe(
      first.workflow.overlaySignature,
    );
    expect(second.workflow.subToggleSignature).toBe(
      first.workflow.subToggleSignature,
    );
    expect(second.workflow.graphSignature).toBe(
      first.workflow.graphSignature,
    );
  });

  it("workflow 그래프 내용이 바뀌면 graphSignature가 달라진다", () => {
    const base = createRendererInvalidationPacket({
      ai: {
        cleanupExpiredFlashes: () => {},
        flashAnimations: new Map(),
        generatingNodes: new Map(),
      },
      dragActive: false,
      grid: {
        gridSize: 8,
        showGrid: false,
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
        showOverlay: true,
        straightEdges: false,
        workflowEdges: [
          {
            id: "wf-a",
            sourcePageId: "page-a",
            targetPageId: "page-b",
            type: "navigation",
          },
        ],
      },
    });

    const changed = createRendererInvalidationPacket({
      ai: {
        cleanupExpiredFlashes: () => {},
        flashAnimations: new Map(),
        generatingNodes: new Map(),
      },
      dragActive: false,
      grid: {
        gridSize: 8,
        showGrid: false,
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
        showOverlay: true,
        straightEdges: false,
        workflowEdges: [
          {
            id: "wf-a",
            sourcePageId: "page-a",
            targetPageId: "page-c",
            type: "navigation",
          },
        ],
      },
    });

    expect(changed.workflow.graphSignature).not.toBe(
      base.workflow.graphSignature,
    );
  });
});
