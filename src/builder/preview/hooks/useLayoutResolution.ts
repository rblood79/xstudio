/**
 * useLayoutResolution Hook
 *
 * Preview에서 Layout + Page 합성을 관리하는 Hook.
 * Page에 Layout이 적용되어 있으면 Layout 구조 내에서
 * Page elements를 Slot 위치에 삽입한 트리를 반환.
 */

import { useMemo } from "react";
import { resolveLayoutForPage } from "../utils/layoutResolver";
import type { Element, Page } from "../../../types/builder/unified.types";
import type {
  Layout,
  LayoutResolutionResult,
} from "../../../types/builder/layout.types";

interface UseLayoutResolutionParams {
  /** 현재 Page ID */
  pageId: string | null;
  /** 모든 Elements */
  elements: Element[];
  /** 모든 Pages */
  pages: Page[];
  /** 모든 Layouts */
  layouts: Layout[];
}

/**
 * Layout + Page 합성 결과를 반환하는 Hook
 *
 * @example
 * ```tsx
 * const { resolvedTree, hasLayout, validationErrors } = useLayoutResolution({
 *   pageId: currentPageId,
 *   elements,
 *   pages,
 *   layouts,
 * });
 *
 * // resolvedTree를 사용하여 렌더링
 * resolvedTree.map(node => renderResolvedElement(node));
 * ```
 */
export function useLayoutResolution({
  pageId,
  elements,
  pages,
  layouts,
}: UseLayoutResolutionParams): LayoutResolutionResult {
  return useMemo(() => {
    // Page ID가 없으면 빈 결과 반환
    if (!pageId) {
      return {
        resolvedTree: [],
        slotContents: new Map(),
        validationErrors: [],
        hasLayout: false,
      };
    }

    // Page 찾기
    const page = pages.find((p) => p.id === pageId);
    if (!page) {
      return {
        resolvedTree: [],
        slotContents: new Map(),
        validationErrors: [],
        hasLayout: false,
      };
    }

    // Layout 찾기 (Page에 layout_id가 있으면)
    const layout = page.layout_id
      ? layouts.find((l) => l.id === page.layout_id) || null
      : null;

    // Layout + Page 합성
    return resolveLayoutForPage(page, layout, elements);
  }, [pageId, elements, pages, layouts]);
}

/**
 * Layout Resolution 결과에서 Slot 유효성 에러가 있는지 확인
 */
export function hasSlotErrors(result: LayoutResolutionResult): boolean {
  return result.validationErrors.length > 0;
}

/**
 * Required Slot 에러만 필터링
 */
export function getRequiredSlotErrors(
  result: LayoutResolutionResult
): string[] {
  return result.validationErrors
    .filter((err) => err.errorType === "REQUIRED_SLOT_EMPTY")
    .map((err) => err.slotName);
}

export default useLayoutResolution;
