import { describe, expect, it } from "vitest";
import type { Element } from "../../../../types/core/store.types";
import { findBodySelectionAtCanvasPoint } from "./selectionHitTest";

function makeBody(overrides: Partial<Element>): Element {
  return {
    id: "body",
    type: "body",
    page_id: "page-1",
    parent_id: null,
    order_num: 0,
    props: {},
    ...overrides,
  } as Element;
}

describe("findBodySelectionAtCanvasPoint", () => {
  it("selects page body for empty clicks inside a page", () => {
    const result = findBodySelectionAtCanvasPoint({
      canvasPoint: { x: 40, y: 40 },
      currentPageId: "page-1",
      elementsMap: new Map([
        ["page-body", makeBody({ id: "page-body", page_id: "page-1" })],
      ]),
      pageHeight: 600,
      pageIndexElementsByPage: new Map([["page-1", new Set(["page-body"])]]),
      pagePositions: { "page-1": { x: 0, y: 0 } },
      pageWidth: 800,
      pages: [{ id: "page-1" }],
    });

    expect(result).toEqual({ bodyElementId: "page-body", pageId: "page-1" });
  });

  it("selects frame body before overlapping page body in frame authoring", () => {
    const result = findBodySelectionAtCanvasPoint({
      canvasPoint: { x: 40, y: 40 },
      currentPageId: "page-1",
      elementsMap: new Map([
        ["page-body", makeBody({ id: "page-body", page_id: "page-1" })],
        [
          "frame-body",
          makeBody({
            id: "frame-body",
            layout_id: "frame-1",
            page_id: null,
          }),
        ],
      ]),
      frameAreas: [
        { frameId: "frame-1", x: 0, y: 0, width: 800, height: 600 },
      ],
      pageHeight: 600,
      pageIndexElementsByPage: new Map([["page-1", new Set(["page-body"])]]),
      pagePositions: { "page-1": { x: 0, y: 0 } },
      pageWidth: 800,
      pages: [{ id: "page-1" }],
    });

    expect(result).toEqual({ bodyElementId: "frame-body", pageId: null });
  });

  it("does not fall through to page body when a frame area owns the click but has no body", () => {
    const result = findBodySelectionAtCanvasPoint({
      canvasPoint: { x: 40, y: 40 },
      currentPageId: "page-1",
      elementsMap: new Map([
        ["page-body", makeBody({ id: "page-body", page_id: "page-1" })],
      ]),
      frameAreas: [
        { frameId: "frame-1", x: 0, y: 0, width: 800, height: 600 },
      ],
      pageHeight: 600,
      pageIndexElementsByPage: new Map([["page-1", new Set(["page-body"])]]),
      pagePositions: { "page-1": { x: 0, y: 0 } },
      pageWidth: 800,
      pages: [{ id: "page-1" }],
    });

    expect(result).toEqual({ bodyElementId: null, pageId: null });
  });
});
