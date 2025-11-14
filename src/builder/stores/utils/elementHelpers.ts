import { Element, ComponentElementProps } from "../../../types/core/store.types";

/**
 * Element 조회 및 속성 관리 헬퍼 함수들
 */

/**
 * ID로 요소를 찾는 헬퍼 함수 (배열 기반 - O(n))
 * @deprecated 성능 최적화를 위해 elementsMap 사용을 권장합니다
 *
 * @param elements - 검색할 요소 배열
 * @param id - 찾을 요소의 ID
 * @returns 찾은 요소 또는 null
 */
export const findElementById = (
  elements: Element[],
  id: string
): Element | null => {
  for (const element of elements) {
    if (element.id === id) return element;
  }
  return null;
};

/**
 * ID로 요소를 찾는 헬퍼 함수 (Map 기반 - O(1))
 * @param elementsMap - 요소 Map (id -> Element)
 * @param id - 찾을 요소의 ID
 * @returns 찾은 요소 또는 null
 */
export const getElementById = (
  elementsMap: Map<string, Element>,
  id: string
): Element | null => {
  return elementsMap.get(id) || null;
};

/**
 * 부모 ID로 자식 요소들을 찾는 헬퍼 함수 (Map 기반 - O(1))
 * @param childrenMap - 자식 Map (parent_id -> Element[])
 * @param parentId - 부모 요소의 ID
 * @returns 자식 요소 배열
 */
export const getChildElements = (
  childrenMap: Map<string, Element[]>,
  parentId: string
): Element[] => {
  return childrenMap.get(parentId) || [];
};

/**
 * 요소의 완전한 props 객체를 생성하는 헬퍼 함수
 *
 * 요소의 기존 props에 새로운 props를 병합하고 tag 정보를 추가합니다.
 *
 * @param element - 대상 Element 객체
 * @param props - 병합할 추가 props (선택적)
 * @returns 병합된 props 객체 (tag 포함)
 */
export const createCompleteProps = (
  element: Element,
  props?: ComponentElementProps
) => ({
  ...element.props,
  ...props,
  tag: element.tag,
});
