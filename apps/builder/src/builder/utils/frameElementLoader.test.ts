import { describe, expect, it, vi } from "vitest";
import type { Element } from "../../types/core/store.types";
import {
  loadFrameElements,
  type FrameElementLoaderDb,
} from "./frameElementLoader";

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

describe("loadFrameElements", () => {
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

  it("falls back to layout_id elements when parent_id descendants are empty", async () => {
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
});
