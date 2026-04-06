/**
 * useLayoutPublisher — PixiJS 독립 레이아웃 발행 (ADR-100 Phase 6.4)
 *
 * ElementsLayer 내부의 레이아웃 계산 + publishLayoutMap을 BuilderCanvas
 * 레벨로 추출. UNIFIED_ENGINE=true 시 PixiJS Application 없이도
 * sharedLayoutMap을 채운다.
 *
 * 원리: getCachedPageLayout은 순수 함수 — store 데이터만 필요.
 * publishLayoutMap으로 모듈 레벨 변수에 발행하면 Command Stream이 읽음.
 */

import { useEffect, useRef } from "react";
import type { PixiPageRendererInput } from "../renderers";
import { publishLayoutMap } from "../layout";
import {
  getCachedPageLayout,
  createPageElementsSignature,
  createPageLayoutSignature,
  buildPageChildrenMap,
  buildChildrenIdMap,
} from "../scene/layoutCache";
import { buildPageDirtyState } from "../scene/subtreeInvalidation";

interface PageLayoutInput {
  pageId: string;
  input: PixiPageRendererInput;
}

/**
 * 모든 visible page의 레이아웃을 계산하고 publishLayoutMap으로 발행.
 * 단일 useEffect로 페이지 수에 무관하게 hooks 규칙 준수.
 */
export function useLayoutPublisher(
  pages: PageLayoutInput[],
  layoutVersion: number,
): void {
  const pagesRef = useRef(pages);
  pagesRef.current = pages;

  useEffect(() => {
    const currentPages = pagesRef.current;

    for (const { input } of currentPages) {
      const {
        bodyElement,
        elementById,
        pageElements,
        dirtyElementIds,
        pageWidth,
        pageHeight,
        wasmLayoutReady,
      } = input;

      if (!bodyElement || !wasmLayoutReady) continue;

      const pageChildrenMap = buildPageChildrenMap({
        bodyElement,
        elementById,
        pageElements,
      });
      const pageDirtyState = buildPageDirtyState({
        bodyElement,
        dirtyElementIds,
        elementsMap: elementById,
        pageChildrenMap,
      });
      const pageElementsSignature = createPageElementsSignature(pageElements);
      const freshElements = pageElements.map(
        (el) => elementById.get(el.id) ?? el,
      );
      const pageLayoutSignature = createPageLayoutSignature(
        bodyElement,
        freshElements,
      );
      const childrenIdMap = buildChildrenIdMap(pageChildrenMap);

      const layoutMap = getCachedPageLayout({
        bodyElement,
        childrenIdMap,
        elementById,
        pageChildrenMap,
        pageDirtyState,
        pageElementsSignature,
        pageLayoutSignature,
        pageHeight,
        pageWidth,
        wasmLayoutReady,
      });

      publishLayoutMap(layoutMap, bodyElement.page_id ?? undefined);
    }
  }, [layoutVersion]); // layoutVersion 변경 시 재계산
}
