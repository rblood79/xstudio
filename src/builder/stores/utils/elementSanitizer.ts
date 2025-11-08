import { Element } from "../../../types/store";

/**
 * Element 직렬화 유틸리티 함수
 *
 * Element 객체를 안전하게 직렬화하여 postMessage나 데이터베이스 저장에 사용할 수 있도록 변환합니다.
 * - Immer proxy 객체를 일반 객체로 변환
 * - props의 깊은 복사 수행
 * - 순환 참조 제거
 *
 * @param element - 직렬화할 Element 객체
 * @returns 직렬화된 Element 객체
 */
export const sanitizeElement = (element: Element): Record<string, unknown> => {
  try {
    // structuredClone 우선 사용 (최신 브라우저)
    if (typeof structuredClone !== "undefined") {
      return {
        id: element.id,
        custom_id: element.customId, // camelCase → snake_case 변환
        tag: element.tag,
        props: structuredClone(element.props || {}),
        parent_id: element.parent_id,
        page_id: element.page_id,
        order_num: element.order_num,
        data_binding: element.dataBinding, // camelCase → snake_case 변환
      };
    }

    // fallback: JSON 방식
    return {
      id: element.id,
      custom_id: element.customId, // camelCase → snake_case 변환
      tag: element.tag,
      props: JSON.parse(JSON.stringify(element.props || {})),
      parent_id: element.parent_id,
      page_id: element.page_id,
      order_num: element.order_num,
      data_binding: element.dataBinding, // camelCase → snake_case 변환
    };
  } catch (error) {
    console.error("Element sanitization error:", error);
    // 기본 값으로 대체
    return {
      id: element.id || "",
      custom_id: element.customId, // camelCase → snake_case 변환
      tag: element.tag || "",
      props: {},
      parent_id: element.parent_id,
      page_id: element.page_id || "",
      order_num: element.order_num || 0,
      data_binding: element.dataBinding, // camelCase → snake_case 변환
    };
  }
};
