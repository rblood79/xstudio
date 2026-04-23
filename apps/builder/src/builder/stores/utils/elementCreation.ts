// 🚀 Phase 1: Immer 제거 - 함수형 업데이트로 전환
// import { produce } from "immer"; // REMOVED
import type { StateCreator } from "zustand";
import { Element } from "../../../types/core/store.types";
import { normalizeExternalFillIngress } from "../../panels/styles/utils/fillExternalIngress";
import { historyManager } from "../history";
import { getDB } from "../../../lib/db";
import { sanitizeElement } from "./elementSanitizer";
import { reorderElements } from "./elementReorder";
import type { ElementsState } from "../elements";
import { normalizeElementTagInElement } from "./elementTagNormalizer";
import { applyFactoryPropagation } from "../../utils/propagationEngine";

type SetState = Parameters<StateCreator<ElementsState>>[0];
type GetState = Parameters<StateCreator<ElementsState>>[1];

/**
 * AddElement 액션 생성 팩토리
 *
 * 단일 요소를 추가하는 로직을 처리합니다.
 *
 * 처리 순서:
 * 1. 메모리 상태 업데이트 (즉시 UI 반영)
 * 2. iframe에 postMessage 전송 (프리뷰 동기화)
 * 3. Supabase에 저장 (비동기, 실패해도 메모리는 유지)
 * 4. order_num 재정렬
 *
 * @param set - Zustand setState 함수
 * @param get - Zustand getState 함수
 * @returns addElement 액션 함수
 */
export const createAddElementAction =
  (set: SetState, get: GetState) => async (element: Element) => {
    const state = get();

    // 🔧 order_num 중복 방지: set() 내부에서 atomic하게 할당
    // 외부 get() 기반 계산은 race condition으로 중복 가능 → prevState 기반 계산으로 전환
    const normalizedElement = normalizeExternalFillIngress(
      normalizeElementTagInElement(element),
    );

    // 2. 메모리 상태 업데이트 (불변 - 새로운 배열 참조 생성)
    // ADR-006 P3-1: 구조 변경 → layoutVersion 무조건 증가
    let elementToAdd = normalizedElement;
    set((prevState) => {
      // ADR-040 Phase 3: childrenMap O(1) 조회 (elements.filter 배열 순회 제거)
      const siblings =
        prevState.childrenMap.get(normalizedElement.parent_id || "root") ?? [];
      const hasConflict = siblings.some(
        (sibling) => sibling.order_num === normalizedElement.order_num,
      );
      if (
        hasConflict ||
        normalizedElement.order_num === undefined ||
        normalizedElement.order_num === null
      ) {
        const maxOrder =
          siblings.length > 0
            ? Math.max(...siblings.map((el) => el.order_num || 0))
            : -1;
        elementToAdd = { ...normalizedElement, order_num: maxOrder + 1 };
      }
      return {
        elements: [...prevState.elements, elementToAdd],
        layoutVersion: prevState.layoutVersion + 1,
      };
    });

    // 🚀 Phase 1: Immer → 함수형 업데이트
    // 1. 히스토리 추가 (Page 모드 또는 Layout 모드 모두)
    if (state.currentPageId || elementToAdd.layout_id) {
      historyManager.addEntry({
        type: "add",
        elementId: elementToAdd.id,
        data: { element: { ...elementToAdd } },
      });
    }

    // 🔧 CRITICAL: elementsMap 재구축 (요소 추가 후 캐시 업데이트)
    get()._rebuildIndexes();

    // 3. iframe 업데이트는 useIframeMessenger의 useEffect에서 자동 처리
    // (elements 변경 감지 → sendElementsToIframe 자동 호출)

    // 4. IndexedDB에 저장 (빠름! 1-5ms)
    try {
      const db = await getDB();
      const sanitized = sanitizeElement(elementToAdd);
      await db.elements.insert(sanitized);
    } catch (error) {
      console.warn("⚠️ [IndexedDB] 저장 중 오류 (메모리는 정상):", error);
    }

    // 🔧 order_num 중복 방지로 인해 재정렬 필요성 감소
    // 하지만 기존 데이터 호환성을 위해 재정렬 로직 유지 (단, 지연 시간 단축)
    const currentPageId = get().currentPageId;
    // Page 요소인 경우
    if (currentPageId && elementToAdd.page_id === currentPageId) {
      queueMicrotask(() => {
        const { elements, batchUpdateElementOrders } = get();
        reorderElements(elements, currentPageId, batchUpdateElementOrders);
      });
    }
    // Layout 요소인 경우 - layout_id로 재정렬
    else if (elementToAdd.layout_id) {
      queueMicrotask(() => {
        const { elements, elementsMap, batchUpdateElementOrders } = get();
        // ADR-040 Phase 3: elementsMap.forEach로 layout_id 필터 (전용 인덱스 없음)
        let hasLayoutElements = false;
        elementsMap.forEach((el) => {
          if (el.layout_id === elementToAdd.layout_id) {
            hasLayoutElements = true;
          }
        });
        if (hasLayoutElements) {
          reorderElements(
            elements,
            elementToAdd.layout_id!,
            batchUpdateElementOrders,
          );
        }
      });
    }
  };

/**
 * AddComplexElement 액션 생성 팩토리
 *
 * 부모 요소와 자식 요소들을 함께 추가하는 로직을 처리합니다.
 * 복합 컴포넌트(Tabs, Table 등)를 추가할 때 사용됩니다.
 *
 * 예: Tabs 컴포넌트 추가 시 Tab + Panel 쌍을 함께 생성
 *
 * @param set - Zustand setState 함수
 * @param get - Zustand getState 함수
 * @returns addComplexElement 액션 함수
 */
export const createAddComplexElementAction =
  (set: SetState, get: GetState) =>
  async (parentElement: Element, childElements: Element[]) => {
    const state = get();
    const normalizedParent = normalizeExternalFillIngress(
      normalizeElementTagInElement(parentElement),
    );
    // ADR-048: 부모 props를 자식에 미리 전파 (Store 추가 전)
    const normalizedChildren = applyFactoryPropagation(
      normalizedParent,
      childElements.map((child) =>
        normalizeExternalFillIngress(normalizeElementTagInElement(child)),
      ),
    ).map((child) => normalizeExternalFillIngress(child));

    // 🔧 부모 요소의 order_num 중복 방지: set() 내부에서 atomic하게 할당
    let parentToAdd = normalizedParent;

    // 2. 메모리 상태 업데이트 (불변 - 새로운 배열 참조 생성)
    // ADR-006 P3-1: 구조 변경 → layoutVersion 무조건 증가
    set((prevState) => {
      // ADR-040 Phase 3: childrenMap O(1) 조회 (elements.filter 배열 순회 제거)
      const siblings =
        prevState.childrenMap.get(normalizedParent.parent_id || "root") ?? [];
      const hasConflict = siblings.some(
        (sibling) => sibling.order_num === normalizedParent.order_num,
      );
      if (
        hasConflict ||
        normalizedParent.order_num === undefined ||
        normalizedParent.order_num === null
      ) {
        const maxOrder =
          siblings.length > 0
            ? Math.max(...siblings.map((el) => el.order_num || 0))
            : -1;
        parentToAdd = { ...normalizedParent, order_num: maxOrder + 1 };
      }
      return {
        elements: [...prevState.elements, parentToAdd, ...normalizedChildren],
        layoutVersion: prevState.layoutVersion + 1,
      };
    });

    const allElements = [parentToAdd, ...normalizedChildren];

    // 🚀 Phase 1: Immer → 함수형 업데이트
    // 1. 히스토리 추가 (Page 모드 또는 Layout 모드 모두)
    if (state.currentPageId || parentToAdd.layout_id) {
      historyManager.addEntry({
        type: "add",
        elementId: parentToAdd.id,
        data: {
          element: { ...parentToAdd },
          childElements: normalizedChildren.map((child) => ({ ...child })),
        },
      });
    }

    // 🔧 CRITICAL: elementsMap 재구축 (복합 요소 추가 후 캐시 업데이트)
    get()._rebuildIndexes();

    // 3. iframe 업데이트는 useIframeMessenger의 useEffect에서 자동 처리
    // (elements 변경 감지 → sendElementsToIframe 자동 호출)

    // 4. IndexedDB에 배치 저장 (빠름! 1-5ms × N)
    try {
      const db = await getDB();
      await db.elements.insertMany(
        allElements.map((el) => sanitizeElement(el)),
      );
      console.log(
        `✅ [IndexedDB] 복합 컴포넌트 저장 완료: ${parentToAdd.tag} + 자식 ${normalizedChildren.length}개`,
      );
    } catch (error) {
      console.warn("⚠️ [IndexedDB] 저장 중 오류 (메모리는 정상):", error);
    }
  };
