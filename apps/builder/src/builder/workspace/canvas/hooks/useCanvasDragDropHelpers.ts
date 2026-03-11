import { useCallback } from "react";
import type { Element } from "../../../../types/core/store.types";
import { getElementBoundsSimple, getElementContainer } from "../elementRegistry";
import { findElementsInLasso, type BoundingBox } from "../selection";
import {
  viewportToScreenPoint,
  viewportToScreenSize,
} from "../viewport/viewportTransforms";
import { useStore } from "../../../stores";

interface UseCanvasDragDropHelpersParams {
  depthMap: Map<string, number>;
  elementById: Map<string, Element>;
  elements: Element[];
  pageElements: Element[];
  pageHeight: number;
  pageWidth: number;
  panOffset: { x: number; y: number };
  zoom: number;
}

export function useCanvasDragDropHelpers({
  depthMap,
  elementById,
  elements,
  pageElements,
  pageHeight,
  pageWidth,
  panOffset,
  zoom,
}: UseCanvasDragDropHelpersParams) {
  const findElementsInLassoArea = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      const startGlobal = viewportToScreenPoint(start, zoom, panOffset);
      const endGlobal = viewportToScreenPoint(end, zoom, panOffset);

      return findElementsInLasso(
        pageElements.map((element) => {
          const container = getElementContainer(element.id);
          let bounds: {
            height: number;
            width: number;
            x: number;
            y: number;
          } | null = null;

          if (container) {
            try {
              const containerBounds = container.getBounds();
              bounds = {
                x: containerBounds.x,
                y: containerBounds.y,
                width: containerBounds.width,
                height: containerBounds.height,
              };
            } catch {
              bounds = null;
            }
          }

          if (!bounds) {
            bounds = getElementBoundsSimple(element.id);
          }

          if (bounds) {
            return {
              id: element.id,
              props: {
                style: {
                  left: bounds.x,
                  top: bounds.y,
                  width: bounds.width,
                  height: bounds.height,
                },
              },
            };
          }

          const style = element.props?.style as Record<string, unknown> | undefined;
          const localLeft = Number(style?.left ?? 0);
          const localTop = Number(style?.top ?? 0);
          const localWidth = Number(style?.width ?? 0);
          const localHeight = Number(style?.height ?? 0);
          const fallbackPosition = viewportToScreenPoint(
            { x: localLeft, y: localTop },
            zoom,
            panOffset,
          );
          const fallbackSize = viewportToScreenSize(
            { width: localWidth, height: localHeight },
            zoom,
          );

          return {
            id: element.id,
            props: {
              style: {
                left: Number.isFinite(localLeft) ? fallbackPosition.x : 0,
                top: Number.isFinite(localTop) ? fallbackPosition.y : 0,
                width: Number.isFinite(localWidth) ? fallbackSize.width : 0,
                height: Number.isFinite(localHeight) ? fallbackSize.height : 0,
              },
            },
          };
        }),
        startGlobal,
        endGlobal,
      );
    },
    [pageElements, panOffset, zoom],
  );

  const getElementBounds = useCallback(
    (element: Element): BoundingBox | null => {
      if (element.tag.toLowerCase() === "body") {
        return { x: 0, y: 0, width: pageWidth, height: pageHeight };
      }

      const bounds = getElementBoundsSimple(element.id);
      if (bounds) {
        return bounds;
      }

      const style = element.props?.style as Record<string, unknown> | undefined;
      const width = Number(style?.width);
      const height = Number(style?.height);
      if (!Number.isFinite(width) || !Number.isFinite(height)) {
        return null;
      }

      return {
        x: Number(style?.left) || 0,
        y: Number(style?.top) || 0,
        width,
        height,
      };
    },
    [pageHeight, pageWidth],
  );

  const getDescendantIds = useCallback((rootId: string) => {
    const childrenMap = useStore.getState().childrenMap;
    const result = new Set<string>();
    const stack = [rootId];

    while (stack.length > 0) {
      const currentId = stack.pop();
      if (!currentId) {
        continue;
      }
      const children = childrenMap.get(currentId) ?? [];
      for (const child of children) {
        if (result.has(child.id)) {
          continue;
        }
        result.add(child.id);
        stack.push(child.id);
      }
    }

    return result;
  }, []);

  const findDropTarget = useCallback(
    (point: { x: number; y: number }, draggedId: string) => {
      const draggedElement = elementById.get(draggedId);
      if (!draggedElement) {
        return null;
      }

      const excludedIds = getDescendantIds(draggedId);
      excludedIds.add(draggedId);

      const candidates: Array<{
        bounds: BoundingBox;
        depth: number;
        element: Element;
      }> = [];

      for (const element of elements) {
        if (element.deleted) continue;
        if (element.page_id !== draggedElement.page_id) continue;
        if (element.layout_id !== draggedElement.layout_id) continue;
        if (excludedIds.has(element.id)) continue;

        const bounds = getElementBounds(element);
        if (!bounds) continue;

        const isInside =
          point.x >= bounds.x &&
          point.x <= bounds.x + bounds.width &&
          point.y >= bounds.y &&
          point.y <= bounds.y + bounds.height;
        if (!isInside) continue;

        candidates.push({
          element,
          bounds,
          depth: depthMap.get(element.id) ?? 0,
        });
      }

      if (candidates.length === 0) {
        return null;
      }

      candidates.sort((a, b) => {
        if (a.depth !== b.depth) {
          return b.depth - a.depth;
        }
        return (b.element.order_num || 0) - (a.element.order_num || 0);
      });

      const target = candidates[0];
      const parent =
        target.element.parent_id != null
          ? elementById.get(target.element.parent_id)
          : null;
      const parentStyle = parent?.props?.style as
        | Record<string, unknown>
        | undefined;
      const flexDirection = parentStyle?.flexDirection;
      const isHorizontal =
        flexDirection === "row" || flexDirection === "row-reverse";

      let dropPosition: "before" | "after" | "on" = "on";
      const size = isHorizontal ? target.bounds.width : target.bounds.height;

      if (size > 0 && target.element.parent_id) {
        const offset = isHorizontal
          ? point.x - target.bounds.x
          : point.y - target.bounds.y;
        const ratio = offset / size;
        if (ratio <= 0.25) dropPosition = "before";
        else if (ratio >= 0.75) dropPosition = "after";
      }

      if (target.element.tag.toLowerCase() === "body") {
        dropPosition = "on";
      }

      return {
        dropPosition,
        targetId: target.element.id,
      };
    },
    [depthMap, elementById, elements, getDescendantIds, getElementBounds],
  );

  const buildReorderUpdates = useCallback(
    (
      movedId: string,
      targetId: string,
      dropPosition: "before" | "after" | "on",
    ) => {
      const movedElement = elementById.get(movedId);
      const targetElement = elementById.get(targetId);
      if (!movedElement || !targetElement) {
        return [];
      }

      if (
        movedElement.page_id !== targetElement.page_id ||
        movedElement.layout_id !== targetElement.layout_id
      ) {
        return [];
      }

      const oldParentId = movedElement.parent_id ?? null;
      const newParentId =
        dropPosition === "on"
          ? targetElement.id
          : (targetElement.parent_id ?? null);

      if (oldParentId === null && newParentId === null && dropPosition !== "on") {
        return [];
      }

      const getSiblings = (parentId: string | null, includeMoved = false) =>
        elements
          .filter((element) => {
            if (element.deleted) return false;
            if (element.page_id !== movedElement.page_id) return false;
            if (element.layout_id !== movedElement.layout_id) return false;
            if ((element.parent_id ?? null) !== parentId) return false;
            if (!includeMoved && element.id === movedId) return false;
            return true;
          })
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

      const targetSiblings = getSiblings(newParentId);
      const siblingIds = targetSiblings.map((element) => element.id);
      let insertIndex = siblingIds.length;

      if (dropPosition !== "on") {
        const targetIndex = siblingIds.indexOf(targetElement.id);
        if (targetIndex >= 0) {
          insertIndex = dropPosition === "before" ? targetIndex : targetIndex + 1;
        }
      }

      const nextIds = siblingIds.slice();
      nextIds.splice(insertIndex, 0, movedId);

      if (oldParentId === newParentId) {
        const currentIds = getSiblings(oldParentId, true).map(
          (element) => element.id,
        );
        if (
          currentIds.length === nextIds.length &&
          currentIds.every((id, index) => id === nextIds[index])
        ) {
          return [];
        }
      }

      const updates = nextIds.map((id, index) => ({
        elementId: id,
        updates: {
          order_num: index,
          ...(id === movedId && { parent_id: newParentId }),
        },
      }));

      if (oldParentId !== newParentId) {
        const oldSiblings = getSiblings(oldParentId);
        oldSiblings.forEach((element, index) => {
          updates.push({
            elementId: element.id,
            updates: { order_num: index },
          });
        });
      }

      return updates;
    },
    [elementById, elements],
  );

  return {
    buildReorderUpdates,
    findDropTarget,
    findElementsInLassoArea,
    getElementBounds,
  };
}
