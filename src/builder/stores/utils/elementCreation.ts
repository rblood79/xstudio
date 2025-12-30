// 🚀 Phase 1: Immer 제거 - 함수형 업데이트로 전환
// import { produce } from "immer"; // REMOVED
import type { StateCreator } from "zustand";
import { Element } from "../../../types/core/store.types";
import { historyManager } from "../history";
import { getDB } from "../../../lib/db";
import { sanitizeElement } from "./elementSanitizer";
import { reorderElements } from "./elementReorder";
import type { ElementsState } from "../elements";
import { HierarchyManager } from "../../utils/HierarchyManager";

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

    // 🔧 order_num 중복 방지: 기존 형제 요소와 중복되면 새로운 값 할당
    let elementToAdd = element;
    const siblings = state.elements.filter(el => el.parent_id === element.parent_id);
    const hasConflict = siblings.some(sibling => sibling.order_num === element.order_num);

    if (hasConflict || element.order_num === undefined || element.order_num === null) {
      const nextOrderNum = HierarchyManager.calculateNextOrderNum(element.parent_id, state.elements);
      elementToAdd = { ...element, order_num: nextOrderNum };
    }

    // 🚀 Phase 1: Immer → 함수형 업데이트
    // 1. 히스토리 추가 (Page 모드 또는 Layout 모드 모두)
    if (state.currentPageId || elementToAdd.layout_id) {
      historyManager.addEntry({
        type: "add",
        elementId: elementToAdd.id,
        data: { element: { ...elementToAdd } },
      });
    }

    // 2. 메모리 상태 업데이트 (불변 - 새로운 배열 참조 생성)
    set({ elements: [...state.elements, elementToAdd] });

    // 🔧 CRITICAL: elementsMap 재구축 (요소 추가 후 캐시 업데이트)
    get()._rebuildIndexes();

    // 3. iframe 업데이트는 useIframeMessenger의 useEffect에서 자동 처리
    // (elements 변경 감지 → sendElementsToIframe 자동 호출)

    // 4. IndexedDB에 저장 (빠름! 1-5ms)
    try {
      const db = await getDB();
      const sanitized = sanitizeElement(elementToAdd);
      console.log(`💾 [IndexedDB] 저장 전: ${elementToAdd.tag} layout_id=${elementToAdd.layout_id} page_id=${elementToAdd.page_id}`);
      console.log(`💾 [IndexedDB] sanitized: layout_id=${sanitized.layout_id} page_id=${sanitized.page_id}`);
      await db.elements.insert(sanitized);
      console.log("✅ [IndexedDB] 요소 저장 완료:", elementToAdd.id);
    } catch (error) {
      console.warn("⚠️ [IndexedDB] 저장 중 오류 (메모리는 정상):", error);
    }

    // 🔧 order_num 중복 방지로 인해 재정렬 필요성 감소
    // 하지만 기존 데이터 호환성을 위해 재정렬 로직 유지 (단, 지연 시간 단축)
    const currentPageId = get().currentPageId;
    // Page 요소인 경우
    if (currentPageId && elementToAdd.page_id === currentPageId) {
      setTimeout(() => {
        const { elements, updateElementOrder } = get();
        reorderElements(elements, currentPageId, updateElementOrder);
      }, 50); // 상태 업데이트 후 재정렬 (지연 시간 단축)
    }
    // Layout 요소인 경우 - layout_id로 재정렬
    else if (elementToAdd.layout_id) {
      setTimeout(() => {
        const { elements, updateElementOrder } = get();
        // Layout 요소들만 필터링하여 재정렬
        const layoutElements = elements.filter(el => el.layout_id === elementToAdd.layout_id);
        if (layoutElements.length > 0) {
          // reorderElements는 pageId를 사용하지만, layout_id로 대체하여 호출
          reorderElements(elements, elementToAdd.layout_id!, updateElementOrder);
        }
      }, 50);
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

    // 🔧 부모 요소의 order_num 중복 방지
    let parentToAdd = parentElement;
    const parentSiblings = state.elements.filter(el => el.parent_id === parentElement.parent_id);
    const parentHasConflict = parentSiblings.some(sibling => sibling.order_num === parentElement.order_num);

    if (parentHasConflict || parentElement.order_num === undefined || parentElement.order_num === null) {
      const nextOrderNum = HierarchyManager.calculateNextOrderNum(parentElement.parent_id, state.elements);
      parentToAdd = { ...parentElement, order_num: nextOrderNum };
    }

    const allElements = [parentToAdd, ...childElements];

    // 🚀 Phase 1: Immer → 함수형 업데이트
    // 1. 히스토리 추가 (Page 모드 또는 Layout 모드 모두)
    if (state.currentPageId || parentToAdd.layout_id) {
      historyManager.addEntry({
        type: "add",
        elementId: parentToAdd.id,
        data: {
          element: { ...parentToAdd },
          childElements: childElements.map((child) => ({ ...child })),
        },
      });
    }

    // 2. 메모리 상태 업데이트 (불변 - 새로운 배열 참조 생성)
    set({ elements: [...state.elements, ...allElements] });

    // 🔧 CRITICAL: elementsMap 재구축 (복합 요소 추가 후 캐시 업데이트)
    get()._rebuildIndexes();

    // 3. iframe 업데이트는 useIframeMessenger의 useEffect에서 자동 처리
    // (elements 변경 감지 → sendElementsToIframe 자동 호출)

    // 4. IndexedDB에 배치 저장 (빠름! 1-5ms × N)
    try {
      const db = await getDB();
      await db.elements.insertMany(
        allElements.map((el) => sanitizeElement(el))
      );
      console.log(
        `✅ [IndexedDB] 복합 컴포넌트 저장 완료: ${parentToAdd.tag} + 자식 ${childElements.length}개`
      );
    } catch (error) {
      console.warn("⚠️ [IndexedDB] 저장 중 오류 (메모리는 정상):", error);
    }
  };
