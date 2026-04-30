import { describe, expect, it } from "vitest";
import type { Element } from "../../../../types/core/store.types";
import type { BoundingBox } from "../selection/types";
import { resolveFrameBodyHoverTarget } from "./useElementHoverInteraction";

function makeBody(overrides: Partial<Element>): Element {
  return {
    id: "frame-body",
    type: "body",
    page_id: null,
    layout_id: "frame-1",
    parent_id: null,
    order_num: 0,
    props: {},
    ...overrides,
  } as Element;
}

function makeBounds(overrides: Partial<BoundingBox> = {}): BoundingBox {
  return {
    x: 0,
    y: 0,
    width: 320,
    height: 200,
    ...overrides,
  };
}

describe("resolveFrameBodyHoverTarget", () => {
  it("returns the frame body when the pointer is inside a rendered frame area", () => {
    const result = resolveFrameBodyHoverTarget({
      boundsMap: new Map([["frame-body", makeBounds()]]),
      elementsMap: new Map([["frame-body", makeBody({})]]),
      frameAreas: [{ frameId: "frame-1", x: 0, y: 0, width: 320, height: 200 }],
      sceneX: 40,
      sceneY: 40,
    });

    expect(result).toBe("frame-body");
  });

  it("uses the topmost matching frame area when areas overlap", () => {
    const result = resolveFrameBodyHoverTarget({
      boundsMap: new Map([
        ["frame-body-1", makeBounds()],
        ["frame-body-2", makeBounds({ x: 20, y: 20 })],
      ]),
      elementsMap: new Map([
        [
          "frame-body-1",
          makeBody({ id: "frame-body-1", layout_id: "frame-1" }),
        ],
        [
          "frame-body-2",
          makeBody({ id: "frame-body-2", layout_id: "frame-2" }),
        ],
      ]),
      frameAreas: [
        { frameId: "frame-1", x: 0, y: 0, width: 320, height: 200 },
        { frameId: "frame-2", x: 20, y: 20, width: 320, height: 200 },
      ],
      sceneX: 40,
      sceneY: 40,
    });

    expect(result).toBe("frame-body-2");
  });

  it("ignores page bodies, deleted bodies, and non-rendered bodies", () => {
    const result = resolveFrameBodyHoverTarget({
      boundsMap: new Map([["deleted-body", makeBounds()]]),
      elementsMap: new Map([
        [
          "page-body",
          makeBody({ id: "page-body", page_id: "page-1", layout_id: null }),
        ],
        ["deleted-body", makeBody({ id: "deleted-body", deleted: true })],
        ["unrendered-body", makeBody({ id: "unrendered-body" })],
      ]),
      frameAreas: [{ frameId: "frame-1", x: 0, y: 0, width: 320, height: 200 }],
      sceneX: 40,
      sceneY: 40,
    });

    expect(result).toBeNull();
  });

  it("returns null outside every frame area", () => {
    const result = resolveFrameBodyHoverTarget({
      boundsMap: new Map([["frame-body", makeBounds()]]),
      elementsMap: new Map([["frame-body", makeBody({})]]),
      frameAreas: [{ frameId: "frame-1", x: 0, y: 0, width: 320, height: 200 }],
      sceneX: 400,
      sceneY: 40,
    });

    expect(result).toBeNull();
  });
});
