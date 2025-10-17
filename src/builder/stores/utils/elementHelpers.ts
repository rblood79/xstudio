import { Element, ComponentElementProps } from "../../../types/store";

/**
 * Element 조회 및 속성 관리 헬퍼 함수들
 */

/**
 * ID로 요소를 찾는 헬퍼 함수
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
