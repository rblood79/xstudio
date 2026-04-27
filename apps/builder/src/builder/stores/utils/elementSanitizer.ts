import { Element } from "../../../types/core/store.types";

/**
 * Supabase 저장용 Element 타입 (snake_case 컬럼명)
 *
 * **ADR-903 P3-A Hidden bug D2**: `page_id` 는 layout element 에서 `null` 이 될 수 있다.
 * layout element 는 `layout_id` 를 가지며 `page_id` 가 `null` 이지만, 기존 `string`
 * (required) 타입 정의로 인해 런타임에 빈 문자열(`""`)로 강제되는 버그가 있었다.
 * `string | null` 로 완화하여 layout element 저장/로드 round-trip 정확성 보장.
 */
export interface SupabaseElement {
  id: string;
  custom_id?: string;
  type: string;
  props: Record<string, unknown>;
  parent_id: string | null;
  /** layout element 의 경우 null. page element 의 경우 page UUID. */
  page_id: string | null;
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
 * **ADR-903 P3-B 안전망 #2**: page_id/layout_id 미설정 element 감지용 dev-only 경고
 * P3-D에서 canonical parent 기반으로 전환 후 이 경고가 빈번하면 adapter 누락을 의미.
 *
 * @param element - 직렬화할 Element 객체
 * @returns 직렬화된 Element 객체
 */
export const sanitizeElement = (element: Element): Element => {
  // ADR-903 P3-B 안전망 #2: page_id/layout_id 미설정 element dev-only 경고
  // P3-D canonical parent 전환 후 이 경고 발생 시 adapter 누락 점검 필요
  if (import.meta.env.DEV && !element.page_id && !element.layout_id) {
    console.warn(
      "[ADR-903] sanitizeElement: page_id/layout_id 없음 — canonical parent 의존 element?",
      element.id,
      element.type,
    );
  }

  try {
    // structuredClone 우선 사용 (최신 브라우저)
    if (typeof structuredClone !== "undefined") {
      return {
        id: element.id,
        customId: element.customId,
        type: element.type,
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
      type: element.type,
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
      type: element.type || "",
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
export const sanitizeElementForSupabase = (
  element: Element,
): SupabaseElement => {
  try {
    const props =
      typeof structuredClone !== "undefined"
        ? structuredClone(element.props || {})
        : JSON.parse(JSON.stringify(element.props || {}));

    return {
      id: element.id,
      custom_id: element.customId,
      type: element.type,
      props,
      parent_id: element.parent_id ?? null,
      page_id: element.page_id ?? null,
      layout_id: element.layout_id ?? null,
      order_num: element.order_num ?? 0,
      data_binding: element.dataBinding,
    };
  } catch (error) {
    console.error("Element sanitization for Supabase error:", error);
    return {
      id: element.id || "",
      custom_id: element.customId,
      type: element.type || "",
      props: {},
      parent_id: element.parent_id ?? null,
      page_id: element.page_id ?? null,
      layout_id: element.layout_id ?? null,
      order_num: element.order_num ?? 0,
      data_binding: element.dataBinding,
    };
  }
};
