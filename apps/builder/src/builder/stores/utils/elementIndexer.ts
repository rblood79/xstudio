/**
 * Element Indexer Utility
 *
 * 🎯 목적: O(1) 요소 조회를 위한 인덱스 관리
 *
 * 인덱스 구조:
 * - elementsByPage: pageId → Set<elementId> (페이지별 요소)
 * - rootsByPage: pageId → elementId[] (페이지별 루트 요소, 순서 유지)
 *
 * 성능 비교:
 * - Before: elements.filter(el => el.page_id === pageId) → O(n)
 * - After: elementsByPage.get(pageId) → O(1)
 *
 * @since 2025-12-10 Phase 2 Store 인덱스 시스템
 */

import type { Element } from "../../../types/core/store.types";

/**
 * 페이지별 요소 인덱스
 *
 * ⚠️ 주의: 이 인덱스는 Zustand 상태에 저장되므로 Immer에 의해 frozen됩니다.
 * 런타임 캐싱은 React useMemo 또는 호출자 측에서 처리해야 합니다.
 */
export interface PageElementIndex {
  /** pageId → Set<elementId> */
  elementsByPage: Map<string, Set<string>>;
  /** pageId → rootElementIds[] (parent_id가 null이거나 body인 요소) */
  rootsByPage: Map<string, string[]>;
}

/**
 * 빈 인덱스 생성
 */
export function createEmptyPageIndex(): PageElementIndex {
  return {
    elementsByPage: new Map(),
    rootsByPage: new Map(),
  };
}

/**
 * 전체 요소에서 페이지 인덱스 재구축
 *
 * @param elements 전체 요소 배열
 * @param elementsMap id → Element 맵 (빠른 조회용)
 * @returns PageElementIndex
 */
export function rebuildPageIndex(
  elements: Element[],
  elementsMap: Map<string, Element>
): PageElementIndex {
  const index = createEmptyPageIndex();

  for (const element of elements) {
    indexElement(index, element, elementsMap);
  }

  return index;
}

/**
 * 단일 요소를 인덱스에 추가
 *
 * @param index 현재 인덱스
 * @param element 추가할 요소
 * @param elementsMap id → Element 맵 (부모 확인용)
 */
export function indexElement(
  index: PageElementIndex,
  element: Element,
  elementsMap: Map<string, Element>
): void {
  const { page_id, id, parent_id } = element;

  // page_id가 null/undefined이면 스킵 (Layout 요소 등)
  if (!page_id) return;

  // 1. elementsByPage에 추가
  if (!index.elementsByPage.has(page_id)) {
    index.elementsByPage.set(page_id, new Set());
  }
  index.elementsByPage.get(page_id)!.add(id);

  // 2. 루트 요소 확인 (parent_id가 없거나 body인 경우)
  const isRoot = !parent_id || isBodyElement(parent_id, elementsMap);
  if (isRoot) {
    if (!index.rootsByPage.has(page_id)) {
      index.rootsByPage.set(page_id, []);
    }
    const roots = index.rootsByPage.get(page_id)!;
    // 중복 방지
    if (!roots.includes(id)) {
      roots.push(id);
    }
  }
}

/**
 * 단일 요소를 인덱스에서 제거
 *
 * @param index 현재 인덱스
 * @param element 제거할 요소
 */
export function unindexElement(
  index: PageElementIndex,
  element: Element
): void {
  const { page_id, id } = element;

  // page_id가 null/undefined이면 스킵 (Layout 요소 등)
  if (!page_id) return;

  // 1. elementsByPage에서 제거
  const pageSet = index.elementsByPage.get(page_id);
  if (pageSet) {
    pageSet.delete(id);
    // 빈 Set 정리
    if (pageSet.size === 0) {
      index.elementsByPage.delete(page_id);
    }
  }

  // 2. rootsByPage에서 제거
  const roots = index.rootsByPage.get(page_id);
  if (roots) {
    const idx = roots.indexOf(id);
    if (idx !== -1) {
      roots.splice(idx, 1);
    }
    // 빈 배열 정리
    if (roots.length === 0) {
      index.rootsByPage.delete(page_id);
    }
  }
}

/**
 * 페이지의 모든 요소 조회 (O(1) 인덱스 기반)
 *
 * ⚠️ 주의: pageIndex가 Zustand/Immer에 의해 frozen될 수 있으므로
 * 이 함수는 순수 함수로 동작하며 index를 변경하지 않습니다.
 * 캐싱은 호출자 측에서 useMemo 등을 통해 처리해야 합니다.
 *
 * @param index 페이지 인덱스
 * @param pageId 페이지 ID
 * @param elementsMap id → Element 맵
 * @returns 페이지의 모든 요소 (order_num 정렬)
 */
export function getPageElements(
  index: PageElementIndex,
  pageId: string,
  elementsMap: Map<string, Element>
): Element[] {
  // 인덱스에서 조회
  const elementIds = index.elementsByPage.get(pageId);
  if (!elementIds || elementIds.size === 0) {
    return [];
  }

  // Element 배열 생성 및 정렬
  const elements: Element[] = [];
  for (const id of elementIds) {
    const element = elementsMap.get(id);
    if (element) {
      elements.push(element);
    }
  }

  // order_num 기준 정렬
  elements.sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));

  return elements;
}

/**
 * 페이지의 루트 요소만 조회
 *
 * @param index 페이지 인덱스
 * @param pageId 페이지 ID
 * @param elementsMap id → Element 맵
 * @returns 루트 요소 배열
 */
export function getRootElements(
  index: PageElementIndex,
  pageId: string,
  elementsMap: Map<string, Element>
): Element[] {
  const rootIds = index.rootsByPage.get(pageId);
  if (!rootIds || rootIds.length === 0) {
    return [];
  }

  const roots: Element[] = [];
  for (const id of rootIds) {
    const element = elementsMap.get(id);
    if (element) {
      roots.push(element);
    }
  }

  return roots.sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));
}

/**
 * Body 요소인지 확인
 */
function isBodyElement(
  elementId: string,
  elementsMap: Map<string, Element>
): boolean {
  const element = elementsMap.get(elementId);
  return element?.tag === "Body";
}

/**
 * 요소의 parent_id 변경 시 인덱스 업데이트
 *
 * @param index 페이지 인덱스
 * @param element 업데이트된 요소
 * @param oldParentId 이전 parent_id
 * @param elementsMap id → Element 맵
 */
export function updateElementParent(
  index: PageElementIndex,
  element: Element,
  oldParentId: string | null,
  elementsMap: Map<string, Element>
): void {
  const { page_id, id, parent_id: newParentId } = element;

  // page_id가 null/undefined이면 스킵 (Layout 요소 등)
  if (!page_id) return;

  // 이전에 루트였는지 확인
  const wasRoot = !oldParentId || isBodyElement(oldParentId, elementsMap);
  // 현재 루트인지 확인
  const isRoot = !newParentId || isBodyElement(newParentId, elementsMap);

  const roots = index.rootsByPage.get(page_id) ?? [];

  if (wasRoot && !isRoot) {
    // 루트 → 비루트: rootsByPage에서 제거
    const idx = roots.indexOf(id);
    if (idx !== -1) {
      roots.splice(idx, 1);
    }
  } else if (!wasRoot && isRoot) {
    // 비루트 → 루트: rootsByPage에 추가
    if (!roots.includes(id)) {
      roots.push(id);
    }
  }

  if (roots.length > 0) {
    index.rootsByPage.set(page_id, roots);
  } else {
    index.rootsByPage.delete(page_id);
  }
}
