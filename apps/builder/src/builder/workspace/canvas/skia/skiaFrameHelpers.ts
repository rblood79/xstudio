import type { BoundingBox } from "../selection/types";
import type { SkiaNodeData } from "./nodeRenderers";
import type { ElementBounds, PageFrame } from "./workflowRenderer";

export function buildTreeBoundsMap(
  tree: SkiaNodeData,
): Map<string, BoundingBox> {
  const boundsMap = new Map<string, BoundingBox>();

  function traverse(
    node: SkiaNodeData,
    parentX: number,
    parentY: number,
  ): void {
    const absX = parentX + node.x;
    const absY = parentY + node.y;

    if (node.elementId) {
      boundsMap.set(node.elementId, {
        x: absX,
        y: absY,
        width: node.width,
        height: node.height,
      });
    }

    if (node.children) {
      for (const child of node.children) {
        traverse(child, absX, absY);
      }
    }
  }

  traverse(tree, 0, 0);
  return boundsMap;
}

export function buildPageFrameMap(
  pageFrames: PageFrame[],
): Map<string, PageFrame> {
  const pageFrameMap = new Map<string, PageFrame>();
  for (const frame of pageFrames) {
    pageFrameMap.set(frame.id, frame);
  }
  return pageFrameMap;
}

export function buildElementBoundsMapFromTreeBounds(
  treeBoundsMap: Map<string, BoundingBox>,
): Map<string, ElementBounds> {
  const elementBoundsMap = new Map<string, ElementBounds>();
  for (const [id, bbox] of treeBoundsMap) {
    elementBoundsMap.set(id, {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height,
    });
  }
  return elementBoundsMap;
}
