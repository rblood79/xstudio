import { Element } from "../../../types/core/store.types";

/**
 * Supabase 저장용 Element 타입 (snake_case 컬럼명)
 */
export interface SupabaseElement {
  id: string;
  custom_id?: string;
  tag: string;
  props: Record<string, unknown>;
  parent_id: string | null;
  page_id: string;
  layout_id?: string | null;
  order_num: number;
  data_binding?: unknown;
}

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
export const sanitizeElement = (element: Element): Element => {
  try {
    // structuredClone 우선 사용 (최신 브라우저)
    if (typeof structuredClone !== "undefined") {
      return {
        id: element.id,
        customId: element.customId,
        tag: element.tag,
        props: structuredClone(element.props || {}),
        parent_id: element.parent_id,
        page_id: element.page_id,
        layout_id: element.layout_id, // ⭐ Layout/Slot System: layout_id 포함
        order_num: element.order_num,
        dataBinding: element.dataBinding,
      };
    }

    // fallback: JSON 방식
    return {
      id: element.id,
      customId: element.customId,
      tag: element.tag,
      props: JSON.parse(JSON.stringify(element.props || {})),
      parent_id: element.parent_id,
      page_id: element.page_id,
      layout_id: element.layout_id, // ⭐ Layout/Slot System: layout_id 포함
      order_num: element.order_num,
      dataBinding: element.dataBinding,
    };
  } catch (error) {
    console.error("Element sanitization error:", error);
    // 기본 값으로 대체
    return {
      id: element.id || "",
      customId: element.customId,
      tag: element.tag || "",
      props: {},
      parent_id: element.parent_id,
      page_id: element.page_id || "",
      layout_id: element.layout_id || null, // ⭐ Layout/Slot System: layout_id 포함
      order_num: element.order_num || 0,
      dataBinding: element.dataBinding,
    };
  }
};

/**
 * Supabase 저장용 Element 직렬화 함수
 *
 * camelCase 필드를 snake_case로 변환하여 Supabase 컬럼명과 일치시킵니다.
 * - customId → custom_id
 * - dataBinding → data_binding
 *
 * @param element - 직렬화할 Element 객체
 * @returns Supabase 저장용 Element 객체 (snake_case)
 */
export const sanitizeElementForSupabase = (element: Element): SupabaseElement => {
  try {
    const props = typeof structuredClone !== "undefined"
      ? structuredClone(element.props || {})
      : JSON.parse(JSON.stringify(element.props || {}));

    return {
      id: element.id,
      custom_id: element.customId,
      tag: element.tag,
      props,
      parent_id: element.parent_id ?? null,
      page_id: element.page_id ?? "",
      layout_id: element.layout_id ?? null,
      order_num: element.order_num ?? 0,
      data_binding: element.dataBinding,
    };
  } catch (error) {
    console.error("Element sanitization for Supabase error:", error);
    return {
      id: element.id || "",
      custom_id: element.customId,
      tag: element.tag || "",
      props: {},
      parent_id: element.parent_id ?? null,
      page_id: element.page_id ?? "",
      layout_id: element.layout_id ?? null,
      order_num: element.order_num ?? 0,
      data_binding: element.dataBinding,
    };
  }
};
