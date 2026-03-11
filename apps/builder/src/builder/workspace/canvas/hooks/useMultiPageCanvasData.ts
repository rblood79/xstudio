import { useEffect, useMemo, useRef } from "react";
import type { Element } from "../../../../types/core/store.types";
import { getPageElements } from "../../../stores/utils/elementIndexer";
import {
  viewportToScreenPoint,
  viewportToScreenSize,
} from "../viewport/viewportTransforms";

export interface CanvasPageSummary {
  id: string;
  title: string;
}

export interface CanvasPageFrame {
  elementCount: number;
  height: number;
  id: string;
  title: string;
  width: number;
  x: number;
  y: number;
}

export interface CanvasPageData {
  bodyElement: Element | null;
  pageElements: Element[];
}

interface UseMultiPageCanvasDataOptions {
  containerSize?: { height: number; width: number };
  elementsMap: Map<string, Element>;
  initializePagePositions: (
    pages: CanvasPageSummary[],
    pageWidth: number,
    pageHeight: number,
    pageGap: number,
    direction: string,
  ) => void;
  pageHeight: number;
  pageIndex: {
    elementsByPage: Map<string, Set<string>>;
  };
  pageLayoutDirection: string;
  pagePositions: Record<string, { x: number; y: number } | undefined>;
  pageWidth: number;
  pages: CanvasPageSummary[];
  pageStackGap: number;
  panOffset: { x: number; y: number };
  zoom: number;
}

export interface UseMultiPageCanvasDataResult {
  allPageData: Map<string, CanvasPageData>;
  pageFrames: CanvasPageFrame[];
  visiblePageIds: Set<string>;
}

export function useMultiPageCanvasData({
  containerSize,
  elementsMap,
  initializePagePositions,
  pageHeight,
  pageIndex,
  pageLayoutDirection,
  pagePositions,
  pageWidth,
  pages,
  pageStackGap,
  panOffset,
  zoom,
}: UseMultiPageCanvasDataOptions): UseMultiPageCanvasDataResult {
  const previousLayoutKeyRef = useRef(
    `${pageWidth}:${pageHeight}:${pageLayoutDirection}`,
  );

  useEffect(() => {
    const layoutKey = `${pageWidth}:${pageHeight}:${pageLayoutDirection}`;
    if (previousLayoutKeyRef.current === layoutKey || pages.length === 0) {
      return;
    }

    previousLayoutKeyRef.current = layoutKey;
    initializePagePositions(
      pages,
      pageWidth,
      pageHeight,
      pageStackGap,
      pageLayoutDirection,
    );
  }, [
    initializePagePositions,
    pageHeight,
    pageLayoutDirection,
    pageStackGap,
    pageWidth,
    pages,
  ]);

  const allPageData = useMemo(() => {
    const pageDataMap = new Map<string, CanvasPageData>();

    for (const page of pages) {
      const pageElements = getPageElements(pageIndex, page.id, elementsMap);
      let bodyElement: Element | null = null;
      const nonBodyElements: Element[] = [];

      for (const element of pageElements) {
        if (element.tag.toLowerCase() === "body") {
          bodyElement = element;
        } else {
          nonBodyElements.push(element);
        }
      }

      pageDataMap.set(page.id, {
        bodyElement,
        pageElements: nonBodyElements,
      });
    }

    return pageDataMap;
  }, [elementsMap, pageIndex, pages]);

  const pageFrames = useMemo(() => {
    return pages.map((page) => {
      const pageElementIds = pageIndex.elementsByPage.get(page.id);
      let elementCount = 0;

      if (pageElementIds) {
        for (const id of pageElementIds) {
          const element = elementsMap.get(id);
          if (element && !element.deleted) {
            elementCount++;
          }
        }
      }

      return {
        elementCount,
        height: pageHeight,
        id: page.id,
        title: page.title,
        width: pageWidth,
        x: pagePositions[page.id]?.x ?? 0,
        y: pagePositions[page.id]?.y ?? 0,
      };
    });
  }, [elementsMap, pageHeight, pageIndex, pagePositions, pageWidth, pages]);

  const visiblePageIds = useMemo(() => {
    const margin = 200;
    const screenWidth = containerSize?.width ?? window.innerWidth;
    const screenHeight = containerSize?.height ?? window.innerHeight;
    const visible = new Set<string>();

    for (const page of pages) {
      const position = pagePositions[page.id];
      if (!position) {
        continue;
      }

      const screenPosition = viewportToScreenPoint(position, zoom, panOffset);
      const screenSize = viewportToScreenSize(
        { width: pageWidth, height: pageHeight },
        zoom,
      );
      const isInViewport = !(
        screenPosition.x + screenSize.width < -margin ||
        screenPosition.x > screenWidth + margin ||
        screenPosition.y + screenSize.height < -margin ||
        screenPosition.y > screenHeight + margin
      );

      if (isInViewport) {
        visible.add(page.id);
      }
    }

    return visible;
  }, [
    containerSize,
    pageHeight,
    pagePositions,
    pageWidth,
    pages,
    panOffset,
    zoom,
  ]);

  return {
    allPageData,
    pageFrames,
    visiblePageIds,
  };
}
