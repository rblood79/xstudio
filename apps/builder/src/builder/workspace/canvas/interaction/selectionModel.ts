import type { Container } from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import {
  calculateCombinedBounds,
  hitTestHandle,
  hitTestSelectionBounds,
  type BoundingBox,
  type HandleConfig,
} from "../selection/types";
import {
  findBodySelectionAtCanvasPoint,
  pickTopmostHitElementId,
  type BodySelectionResult,
  type CanvasPoint,
} from "../selection/selectionHitTest";
import { getViewportController } from "../viewport/ViewportController";

interface ResolveSelectedElementsForPageInput {
  currentPageId: string | null;
  elementsMap: Map<string, Element>;
  selectedElementIds: string[];
}

interface ComputeSelectionBoundsOptions {
  getBounds?: (elementId: string) => BoundingBox | null | undefined;
  getContainer?: (elementId: string) => Container | undefined;
  getCurrentZoom?: () => number | undefined;
  pageHeight: number;
  pagePositions?: Record<string, { x: number; y: number } | undefined>;
  pageWidth: number;
  panOffset?: { x: number; y: number };
  selectedElements: Element[];
  zoom?: number;
}

interface ResolveSelectionHitResult {
  hitHandle: HandleConfig | null;
  inSelectionBounds: boolean;
}

function getCameraLocalPosition(
  container: Container,
): { x: number; y: number } | null {
  let x = 0;
  let y = 0;
  let node: Container | null = container;

  while (node) {
    if (node.label === "Camera") {
      return { x, y };
    }
    x += node.position.x;
    y += node.position.y;
    node = node.parent as Container | null;
  }

  return null;
}

function resolveCurrentZoom({
  getCurrentZoom,
  zoom,
}: Pick<ComputeSelectionBoundsOptions, "getCurrentZoom" | "zoom">): number {
  const viewportZoom =
    getCurrentZoom?.() ?? getViewportController().getState().scale;

  if (typeof viewportZoom === "number" && viewportZoom > 0) {
    return viewportZoom;
  }

  if (typeof zoom === "number" && zoom > 0) {
    return zoom;
  }

  return 1;
}

export function resolveSelectedElementsForPage({
  currentPageId,
  elementsMap,
  selectedElementIds,
}: ResolveSelectedElementsForPageInput): Element[] {
  if (!currentPageId || selectedElementIds.length === 0) {
    return [];
  }

  const resolved: Element[] = [];
  for (const id of selectedElementIds) {
    const element = elementsMap.get(id);
    if (element && element.page_id === currentPageId) {
      resolved.push(element);
    }
  }

  return resolved;
}

export function computeSelectionBounds({
  getBounds,
  getContainer,
  getCurrentZoom,
  pageHeight,
  pagePositions,
  pageWidth,
  panOffset = { x: 0, y: 0 },
  selectedElements,
  zoom = 1,
}: ComputeSelectionBoundsOptions): BoundingBox | null {
  if (selectedElements.length === 0) {
    return null;
  }

  const currentZoom = resolveCurrentZoom({ getCurrentZoom, zoom });
  const boxes: BoundingBox[] = [];

  for (const element of selectedElements) {
    if (element.tag.toLowerCase() === "body") {
      const position = element.page_id ? pagePositions?.[element.page_id] : undefined;
      boxes.push({
        x: position?.x ?? 0,
        y: position?.y ?? 0,
        width: pageWidth,
        height: pageHeight,
      });
      continue;
    }

    const container = getContainer(element.id);
    if (container) {
      const localPosition = getCameraLocalPosition(container);
      if (localPosition) {
        const bounds = getBounds(element.id);
        boxes.push({
          x: localPosition.x,
          y: localPosition.y,
          width: (bounds?.width ?? 100) / currentZoom,
          height: (bounds?.height ?? 40) / currentZoom,
        });
        continue;
      }
    }

    const bounds = getBounds(element.id);
    if (bounds) {
      boxes.push({
        x: (bounds.x - panOffset.x) / currentZoom,
        y: (bounds.y - panOffset.y) / currentZoom,
        width: bounds.width / currentZoom,
        height: bounds.height / currentZoom,
      });
      continue;
    }

    boxes.push({ x: 0, y: 0, width: 100, height: 40 });
  }

  return calculateCombinedBounds(boxes);
}

export function resolveSelectionHit(
  canvasPoint: CanvasPoint,
  selectionBounds: BoundingBox | null,
  zoom: number,
): ResolveSelectionHitResult {
  const hitHandle = hitTestHandle(canvasPoint, selectionBounds, zoom);

  return {
    hitHandle,
    inSelectionBounds: hitTestSelectionBounds(canvasPoint, selectionBounds),
  };
}

export function resolveTopmostHitElementId(
  hitCandidates: string[],
  elementsMap: Map<string, Element>,
): string | null {
  return pickTopmostHitElementId(hitCandidates, elementsMap);
}

export function resolveBodySelection(
  options: Parameters<typeof findBodySelectionAtCanvasPoint>[0],
): BodySelectionResult {
  return findBodySelectionAtCanvasPoint(options);
}
