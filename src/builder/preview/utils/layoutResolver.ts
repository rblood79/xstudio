/**
 * Layout Resolver
 *
 * Layout + Page를 합성하여 최종 Element 트리 생성.
 * 재귀적 트리 탐색으로 중첩된 Slot 처리.
 */

import type { Element, Page } from "../../../types/builder/unified.types";
import type {
  Layout,
  ResolvedElement,
  ResolvedSlotContent,
  SlotValidationError,
  LayoutResolutionResult,
} from "../../../types/builder/layout.types";

// ============================================
// Main Resolver
// ============================================

/**
 * Page에 Layout을 적용하여 최종 Element 트리 생성
 *
 * @param page - 현재 Page
 * @param layout - Page에 적용된 Layout (없으면 null)
 * @param allElements - 모든 Elements (Page + Layout 모두)
 * @returns 합성된 Element 트리와 메타데이터
 */
export function resolveLayoutForPage(
  page: Page | null,
  layout: Layout | null,
  allElements: Element[]
): LayoutResolutionResult {
  // Layout 없으면 기존 방식 (Page elements만 렌더링)
  if (!layout || !page?.layout_id) {
    const pageElements = allElements.filter((el) => el.page_id === page?.id);
    return {
      resolvedTree: buildElementTree(pageElements, null),
      slotContents: new Map(),
      validationErrors: [],
      hasLayout: false,
    };
  }

  // Layout elements 필터링
  const layoutElements = allElements.filter((el) => el.layout_id === layout.id);

  // Page elements 필터링 (Layout에 속하지 않은 것)
  const pageElements = allElements.filter(
    (el) => el.page_id === page.id && !el.layout_id
  );

  // Slot 정보 추출
  const slots = layoutElements.filter((el) => el.tag === "Slot");

  // ⭐ Debug: Layout Resolution 데이터 로깅
  console.log("🔍 [resolveLayoutForPage] Resolution data:", {
    layoutId: layout.id.slice(0, 8),
    pageId: page.id.slice(0, 8),
    allElementsCount: allElements.length,
    layoutElementsCount: layoutElements.length,
    pageElementsCount: pageElements.length,
    slotsCount: slots.length,
    // 모든 요소의 page_id/layout_id 확인
    allElements: allElements.map(e => ({
      id: e.id.slice(0, 8),
      tag: e.tag,
      page_id: e.page_id?.slice(0, 8) || null,
      layout_id: e.layout_id?.slice(0, 8) || null,
    })),
    slots: slots.map(s => ({
      id: s.id.slice(0, 8),
      name: (s.props as { name?: string })?.name || "unnamed",
    })),
    pageElements: pageElements.map(p => ({
      id: p.id.slice(0, 8),
      tag: p.tag,
      parent_id: p.parent_id?.slice(0, 8) || null,
      slot_name: (p.props as { slot_name?: string })?.slot_name || p.slot_name || "content",
    })),
  });

  // Page elements를 slot_name별로 그룹화
  const slotContents = groupElementsBySlot(pageElements, slots);

  // 유효성 검사
  const validationErrors = validateSlots(slots, slotContents);

  // Layout 트리 구축 + Slot 교체
  const resolvedTree = buildResolvedTree(
    layoutElements,
    slotContents,
    pageElements
  );

  return {
    resolvedTree,
    slotContents,
    validationErrors,
    hasLayout: true,
  };
}

// ============================================
// Element Grouping
// ============================================

/**
 * Page elements를 Slot별로 그룹화
 */
function groupElementsBySlot(
  pageElements: Element[],
  slots: Element[]
): Map<string, ResolvedSlotContent> {
  const slotContents = new Map<string, ResolvedSlotContent>();

  // 각 Slot에 대해 초기화
  slots.forEach((slot) => {
    const slotName = (slot.props as { name?: string })?.name || "unnamed";
    slotContents.set(slotName, {
      slotName,
      slotElementId: slot.id,
      pageElements: [],
      isEmpty: true,
    });
  });

  // Root Page elements만 필터링 (parent_id가 null이거나 parent가 Page element가 아닌 것)
  const rootPageElements = pageElements.filter((el) => {
    if (!el.parent_id) return true;
    // parent가 Page element인지 확인
    return !pageElements.some((p) => p.id === el.parent_id);
  });

  // Page elements를 해당 Slot에 할당
  rootPageElements.forEach((element) => {
    // ⭐ FIX: slot_name은 props 내부에 저장됨 (Inspector에서 설정)
    const slotName = (element.props as { slot_name?: string })?.slot_name || element.slot_name || "content";

    const content = slotContents.get(slotName);
    if (content) {
      content.pageElements.push(element);
      content.isEmpty = false;
    } else {
      // ⭐ FIX: 유효하지 않은 slot_name → 첫 번째 사용 가능한 Slot에 추가
      // "content" → 첫 번째 Slot 순서로 폴백
      const defaultContent = slotContents.get("content") ||
        (slotContents.size > 0 ? slotContents.values().next().value : null);
      if (defaultContent) {
        console.log(`⚠️ [groupElementsBySlot] Fallback: element ${element.id.slice(0, 8)} → Slot "${defaultContent.slotName}" (requested: "${slotName}")`);
        defaultContent.pageElements.push(element);
        defaultContent.isEmpty = false;
      }
    }
  });

  // 각 Slot의 elements를 order_num으로 정렬
  slotContents.forEach((content) => {
    content.pageElements.sort(
      (a, b) => (a.order_num || 0) - (b.order_num || 0)
    );
  });

  return slotContents;
}

// ============================================
// Validation
// ============================================

/**
 * Slot 유효성 검사 (필수 Slot이 비어있는지 확인)
 */
function validateSlots(
  slots: Element[],
  slotContents: Map<string, ResolvedSlotContent>
): SlotValidationError[] {
  const errors: SlotValidationError[] = [];

  slots.forEach((slot) => {
    const slotName = (slot.props as { name?: string })?.name || "unnamed";
    const required = (slot.props as { required?: boolean })?.required;

    if (required) {
      const content = slotContents.get(slotName);
      if (!content || content.isEmpty) {
        errors.push({
          slotName,
          errorType: "REQUIRED_SLOT_EMPTY",
          message: `Required slot "${slotName}" is empty`,
        });
      }
    }
  });

  return errors;
}

// ============================================
// Tree Building (재귀)
// ============================================

/**
 * Layout elements를 트리 구조로 변환하고 Slot을 Page elements로 교체
 */
function buildResolvedTree(
  layoutElements: Element[],
  slotContents: Map<string, ResolvedSlotContent>,
  allPageElements: Element[]
): ResolvedElement[] {
  // Root elements (parent_id가 null)
  const roots = layoutElements.filter((el) => !el.parent_id);

  return roots
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
    .map((el) =>
      buildResolvedElement(el, layoutElements, slotContents, allPageElements)
    );
}

/**
 * 단일 Element를 ResolvedElement로 변환 (재귀)
 */
function buildResolvedElement(
  element: Element,
  allLayoutElements: Element[],
  slotContents: Map<string, ResolvedSlotContent>,
  allPageElements: Element[]
): ResolvedElement {
  // Slot인 경우: Page elements로 교체
  if (element.tag === "Slot") {
    const slotName = (element.props as { name?: string })?.name || "unnamed";
    const content = slotContents.get(slotName);

    if (content && !content.isEmpty) {
      // Slot을 Page elements로 교체
      // Root Page elements의 자식들도 포함
      const pageElementTree = buildPageElementTree(
        content.pageElements,
        allPageElements
      );

      return {
        element,
        children: pageElementTree,
        isSlotReplaced: true,
      };
    }

    // 비어있는 Slot
    return {
      element,
      children: [],
      isSlotReplaced: false,
    };
  }

  // 일반 Element: 자식 재귀 처리
  const children = allLayoutElements
    .filter((el) => el.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
    .map((child) =>
      buildResolvedElement(
        child,
        allLayoutElements,
        slotContents,
        allPageElements
      )
    );

  return {
    element,
    children,
    isSlotReplaced: false,
  };
}

/**
 * Page elements를 트리 구조로 변환
 * (Slot 내부의 Page elements 렌더링용)
 */
function buildPageElementTree(
  rootElements: Element[],
  allPageElements: Element[]
): ResolvedElement[] {
  return rootElements.map((el) => buildPageElement(el, allPageElements));
}

/**
 * Page element와 그 자식들을 ResolvedElement로 변환
 */
function buildPageElement(
  element: Element,
  allPageElements: Element[]
): ResolvedElement {
  const children = allPageElements
    .filter((el) => el.parent_id === element.id)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
    .map((child) => buildPageElement(child, allPageElements));

  return {
    element,
    children,
    isSlotReplaced: false,
  };
}

/**
 * 기본 Element 트리 구축 (Layout 없을 때)
 */
function buildElementTree(
  elements: Element[],
  parentId: string | null
): ResolvedElement[] {
  return elements
    .filter((el) => el.parent_id === parentId)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
    .map((el) => ({
      element: el,
      children: buildElementTree(elements, el.id),
      isSlotReplaced: false,
    }));
}

// ============================================
// Utility Functions
// ============================================

/**
 * Layout element 여부 확인
 */
export function isLayoutElement(element: Element): boolean {
  return !!element.layout_id && !element.page_id;
}

/**
 * Page element 여부 확인
 */
export function isPageElement(element: Element): boolean {
  return !!element.page_id && !element.layout_id;
}

/**
 * Slot element 여부 확인
 */
export function isSlotElement(element: Element): boolean {
  return element.tag === "Slot";
}

/**
 * Edit Mode에 따른 elements 필터링
 * - Page Mode: Page elements만
 * - Layout Mode: Layout elements만
 */
export function filterElementsByEditMode(
  elements: Element[],
  mode: "page" | "layout",
  targetId: string | null
): Element[] {
  if (!targetId) return [];

  if (mode === "page") {
    return elements.filter((el) => el.page_id === targetId);
  } else {
    return elements.filter((el) => el.layout_id === targetId);
  }
}
