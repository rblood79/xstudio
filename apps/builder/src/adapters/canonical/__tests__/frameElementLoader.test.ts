import { describe, expect, it, vi } from "vitest";
import type { Element } from "@/types/core/store.types";
import {
  collectHydratedFrameElements,
  hasHydratedFrameElements,
  isFrameElementForFrame,
  isLegacyFrameElementForFrame,
  loadFrameElements,
  type FrameElementLoaderDb,
} from "../frameElementLoader";
import type { CanonicalFrameElementScope } from "../frameElementScope";

function makeElement(id: string, overrides: Partial<Element> = {}): Element {
  return {
    id,
    type: "Slot",
    page_id: null,
    parent_id: "frame-body",
    layout_id: "frame-1",
    order_num: 1,
    props: {},
    ...overrides,
  } as Element;
}

function makeScope(
  frameId: string,
  elementIds: string[],
): CanonicalFrameElementScope {
  return {
    bodyElementId: null,
    elementIds: new Set(elementIds),
    frameId,
  };
}

function makeDb(
  descendants: Element[],
  allElements: Element[],
): FrameElementLoaderDb {
  return {
    elements: {
      getAll: vi.fn(async () => allElements),
      getDescendants: vi.fn(async () => descendants),
    },
  };
}

describe("frameElementLoader canonical adapter", () => {
  it("uses canonical descendants when they include the frame body", async () => {
    const body = makeElement("body-1", {
      parent_id: "frame-1",
      type: "body",
    });
    const slot = makeElement("slot-1");
    const db = makeDb([body, slot], []);

    await expect(loadFrameElements(db, "frame-1")).resolves.toEqual([
      body,
      slot,
    ]);
    expect(db.elements.getAll).not.toHaveBeenCalled();
  });

  it("falls back to layout_id mirror elements when parent_id descendants are empty", async () => {
    const body = makeElement("body-1", {
      parent_id: null,
      type: "body",
    });
    const slot = makeElement("slot-1");
    const otherFrameSlot = makeElement("slot-2", {
      layout_id: "frame-2",
    });
    const pageElement = makeElement("page-button", {
      layout_id: null,
      page_id: "page-1",
      type: "Button",
    });
    const db = makeDb([], [body, slot, otherFrameSlot, pageElement]);

    await expect(loadFrameElements(db, "frame-1")).resolves.toEqual([
      body,
      slot,
    ]);
    expect(db.elements.getAll).toHaveBeenCalledTimes(1);
  });

  it("never returns deleted frame elements from either path", async () => {
    const body = makeElement("body-1", {
      deleted: true,
      parent_id: null,
      type: "body",
    });
    const slot = makeElement("slot-1");
    const db = makeDb([body], [body, slot]);

    await expect(loadFrameElements(db, "frame-1")).resolves.toEqual([slot]);
  });

  it("reports hydrated frame elements from canonical frame scope", () => {
    const elementsMap = new Map<string, Element>([
      ["page-button", makeElement("page-button", { page_id: "page-1" })],
      ["deleted", makeElement("deleted", { deleted: true })],
      ["frame-slot", makeElement("frame-slot")],
    ]);
    const scope = makeScope("frame-1", ["frame-slot"]);

    expect(hasHydratedFrameElements(elementsMap, scope)).toBe(true);
    expect(
      hasHydratedFrameElements(elementsMap, makeScope("frame-2", ["missing"])),
    ).toBe(false);
    expect(collectHydratedFrameElements(elementsMap, scope)).toEqual([
      expect.objectContaining({ id: "frame-slot" }),
    ]);
    expect(
      isFrameElementForFrame(
        makeElement("deleted", { deleted: true }),
        makeScope("frame-1", ["deleted"]),
      ),
    ).toBe(false);
    expect(isFrameElementForFrame(makeElement("frame-slot"), scope)).toBe(true);
  });

  it("keeps legacy layout_id matching behind explicit fallback naming", () => {
    expect(
      isLegacyFrameElementForFrame(makeElement("frame-slot"), "frame-1"),
    ).toBe(true);
    expect(
      isLegacyFrameElementForFrame(
        makeElement("page-button", { layout_id: null, page_id: "page-1" }),
        "frame-1",
      ),
    ).toBe(false);
  });
});
