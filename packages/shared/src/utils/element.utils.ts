/**
 * Element Utilities
 *
 * 🚀 Phase 10 B2.2: 공유 Element 유틸리티 함수
 *
 * @since 2025-12-11 Phase 10 B2.2
 */

import type { Element } from "../types/element.types";

const FRAME_ELEMENT_MIRROR_FIELD = "layout_id" as const;
const SLOT_NAME_MIRROR_FIELD = "slot_name" as const;

type ElementMirrorFields = {
  [FRAME_ELEMENT_MIRROR_FIELD]?: unknown;
  [SLOT_NAME_MIRROR_FIELD]?: unknown;
};

function getFrameElementMirrorId(element: Element): string | null {
  const value = (element as Element & ElementMirrorFields)[
    FRAME_ELEMENT_MIRROR_FIELD
  ];
  return typeof value === "string" ? value : null;
}

function getSlotMirrorName(element: Element): string | null {
  const value = (element as Element & ElementMirrorFields)[
    SLOT_NAME_MIRROR_FIELD
  ];
  return typeof value === "string" ? value : null;
}

// ============================================
// ID Generation
// ============================================

/**
 * 고유 ID 생성
 */
export function generateId(): string {
  return crypto.randomUUID();
}

// ============================================
// Element Tree Utilities
// ============================================

/**
 * ID로 요소 찾기
 */
export function findElementById(
  elements: Element[],
  id: string,
): Element | undefined {
  return elements.find((el) => el.id === id);
}

/**
 * 부모 ID로 자식 요소들 찾기
 */
export function findChildElements(
  elements: Element[],
  parentId: string | null,
): Element[] {
  return elements.filter((el) => el.parent_id === parentId);
}

/**
 * 요소의 자손들 찾기 (재귀)
 */
export function findDescendants(
  elements: Element[],
  parentId: string,
): Element[] {
  const children = findChildElements(elements, parentId);
  let nestedChildren = [...children];

  for (const child of children) {
    nestedChildren = [
      ...nestedChildren,
      ...findDescendants(elements, child.id),
    ];
  }

  return nestedChildren;
}

/**
 * 요소의 조상들 찾기
 */
export function findAncestors(
  elements: Element[],
  elementId: string,
): Element[] {
  const ancestors: Element[] = [];
  let current = findElementById(elements, elementId);

  while (current?.parent_id) {
    const parent = findElementById(elements, current.parent_id);
    if (parent) {
      ancestors.push(parent);
      current = parent;
    } else {
      break;
    }
  }

  return ancestors;
}

/**
 * 요소 트리 구축 (order_num 기준 정렬)
 */
export function buildElementTree(
  elements: Element[],
  parentId: string | null = null,
): Element[] {
  return elements
    .filter((el) => el.parent_id === parentId && !el.deleted)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
}

// ============================================
// Element Rendering Utilities
// ============================================

/**
 * 렌더링할 수 있는 요소인지 확인
 */
export function isRenderableElement(element: Element): boolean {
  // 삭제된 요소 제외
  if (element.deleted) return false;

  // 특정 태그 제외 (필요 시 확장)
  const nonRenderableTags = ["Body", "Head", "Script"];
  if (nonRenderableTags.includes(element.type)) return false;

  return true;
}

/**
 * 요소의 style props에서 CSS 스타일 추출
 */
export function extractStyle(element: Element): React.CSSProperties {
  const props = element.props as Record<string, unknown>;
  return (props?.style as React.CSSProperties) || {};
}

/**
 * 요소의 텍스트 콘텐츠 추출
 */
export function extractTextContent(element: Element): string {
  const props = element.props as Record<string, unknown>;
  return String(props?.children || props?.text || props?.label || "");
}

// ============================================
// Page Utilities
// ============================================

/**
 * 페이지의 요소들 필터링
 */
export function getPageElements(
  elements: Element[],
  pageId: string,
): Element[] {
  return elements.filter((el) => el.page_id === pageId && !el.deleted);
}

/**
 * 레이아웃의 요소들 필터링
 */
export function getLayoutElements(
  elements: Element[],
  layoutId: string,
): Element[] {
  return elements.filter(
    (el) => getFrameElementMirrorId(el) === layoutId && !el.deleted,
  );
}

/**
 * 슬롯별 요소들 그룹핑
 */
export function getElementsBySlot(
  elements: Element[],
  pageId: string,
): Map<string, Element[]> {
  const slotMap = new Map<string, Element[]>();

  for (const element of elements) {
    const slotName = getSlotMirrorName(element);
    if (element.page_id === pageId && slotName) {
      const slotElements = slotMap.get(slotName) || [];
      slotElements.push(element);
      slotMap.set(slotName, slotElements);
    }
  }

  return slotMap;
}
