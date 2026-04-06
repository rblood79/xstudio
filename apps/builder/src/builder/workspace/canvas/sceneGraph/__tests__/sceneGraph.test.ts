import { describe, test, expect } from "vitest";
import { DirtyFlags, type SceneNode } from "../types";

describe("SceneGraph types", () => {
  test("DirtyFlags bitwise operations", () => {
    let flags: number = DirtyFlags.NONE;
    flags |= DirtyFlags.LAYOUT;
    flags |= DirtyFlags.VISUAL;

    expect(flags & DirtyFlags.LAYOUT).toBeTruthy();
    expect(flags & DirtyFlags.VISUAL).toBeTruthy();
    expect(flags & DirtyFlags.CHILDREN).toBeFalsy();
  });

  test("SceneNode structure", () => {
    const node: SceneNode = {
      id: "test-1",
      tag: "Box",
      parentId: null,
      children: [],
      style: { display: "flex" },
      layout: { x: 0, y: 0, width: 100, height: 50 },
      dirty: DirtyFlags.NONE,
      visible: true,
      interactive: true,
      cursor: "default",
      stackingOrder: 0,
    };

    expect(node.id).toBe("test-1");
    expect(node.dirty).toBe(DirtyFlags.NONE);
  });
});
