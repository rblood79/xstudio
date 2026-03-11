import type { Element } from "../../../../types/core/store.types";
import { getElementBoundsSimple } from "../elementRegistry";

export interface CanvasPoint {
  x: number;
  y: number;
}

export interface PagePositionMap {
  [pageId: string]: { x: number; y: number } | undefined;
}

export interface PageLike {
  id: string;
}

export interface BodySelectionResult {
  bodyElementId: string | null;
  pageId: string | null;
}

export function pickTopmostHitElementId(
  hitCandidates: string[],
  elementsMap: Map<string, Element>,
): string | null {
  let hitElementId: string | null = null;
  let bestArea = Infinity;

  for (const candidateId of hitCandidates) {
    const candidate = elementsMap.get(candidateId);
    if (!candidate || candidate.tag.toLowerCase() === "body") {
      continue;
    }

    const bounds = getElementBoundsSimple(candidateId);
    const area = bounds ? bounds.width * bounds.height : Infinity;
    if (area < bestArea) {
      bestArea = area;
      hitElementId = candidateId;
    }
  }

  return hitElementId;
}

export function findBodySelectionAtCanvasPoint({
  canvasPoint,
  currentPageId,
  elementsMap,
  pageHeight,
  pageIndexElementsByPage,
  pagePositions,
  pageWidth,
  pages,
}: {
  canvasPoint: CanvasPoint;
  currentPageId: string | null;
  elementsMap: Map<string, Element>;
  pageHeight: number;
  pageIndexElementsByPage: Map<string, Set<string>>;
  pagePositions: PagePositionMap;
  pageWidth: number;
  pages: PageLike[];
}): BodySelectionResult {
  let pageId: string | null = null;

  for (const page of pages) {
    const position = pagePositions[page.id];
    if (!position) {
      continue;
    }

    if (
      canvasPoint.x >= position.x &&
      canvasPoint.x <= position.x + pageWidth &&
      canvasPoint.y >= position.y &&
      canvasPoint.y <= position.y + pageHeight
    ) {
      pageId = page.id;
      break;
    }
  }

  if (!pageId) {
    return { bodyElementId: null, pageId: null };
  }

  const pageElementIds = pageIndexElementsByPage.get(pageId);
  if (!pageElementIds) {
    return { bodyElementId: null, pageId };
  }

  for (const elementId of pageElementIds) {
    const element = elementsMap.get(elementId);
    if (element?.tag === "body") {
      return {
        bodyElementId: element.id,
        pageId,
      };
    }
  }

  return {
    bodyElementId: null,
    pageId: pageId === currentPageId ? currentPageId : pageId,
  };
}
