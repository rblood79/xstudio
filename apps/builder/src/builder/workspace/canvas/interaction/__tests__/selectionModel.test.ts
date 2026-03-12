import { describe, expect, it } from "vitest";
import type { Element } from "../../../../../types/core/store.types";
import {
  computeSelectionBounds,
  resolveSelectedElementsForPage,
  resolveSelectionHit,
} from "../selectionModel";

function createElement(overrides: Partial<Element>): Element {
  return {
    id: overrides.id ?? "el-1",
    props: overrides.props ?? {},
    tag: overrides.tag ?? "Div",
    ...overrides,
  };
}

describe("selectionModel", () => {
  it("현재 페이지에 속한 선택 요소만 반환한다", () => {
    const selected = resolveSelectedElementsForPage({
      currentPageId: "page-a",
      elementsMap: new Map([
        ["body-a", createElement({ id: "body-a", page_id: "page-a", tag: "Body" })],
        ["card-a", createElement({ id: "card-a", page_id: "page-a", tag: "Card" })],
        ["card-b", createElement({ id: "card-b", page_id: "page-b", tag: "Card" })],
      ]),
      selectedElementIds: ["body-a", "card-b", "card-a"],
    });

    expect(selected.map((element) => element.id)).toEqual(["body-a", "card-a"]);
  });

  it("body와 일반 요소를 합쳐 selection bounds를 계산한다", () => {
    const bounds = computeSelectionBounds({
      getBounds: (id) => {
        if (id === "card-a") {
          return { x: 210, y: 130, width: 80, height: 40 };
        }
        return null;
      },
      getContainer: () => null,
      getCurrentZoom: () => 2,
      pageHeight: 600,
      pagePositions: { "page-a": { x: 100, y: 50 } },
      pageWidth: 1000,
      panOffset: { x: 10, y: 30 },
      selectedElements: [
        createElement({ id: "body-a", page_id: "page-a", tag: "Body" }),
        createElement({ id: "card-a", page_id: "page-a", tag: "Card" }),
      ],
      zoom: 1,
    });

    expect(bounds).toEqual({
      x: 100,
      y: 50,
      width: 1000,
      height: 600,
    });
  });

  it("selection bounds와 handle hit를 함께 판정한다", () => {
    const hit = resolveSelectionHit(
      { x: 100, y: 100 },
      { x: 100, y: 100, width: 200, height: 120 },
      1,
    );

    expect(hit.inSelectionBounds).toBe(true);
    expect(hit.hitHandle?.position).toBe("top-left");
  });
});
