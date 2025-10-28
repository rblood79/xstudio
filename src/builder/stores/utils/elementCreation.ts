import { produce } from "immer";
import type { StateCreator } from "zustand";
import { Element } from "../../../types/store";
import { historyManager } from "../history";
import { supabase } from "../../../env/supabase.client";
import { sanitizeElement } from "./elementSanitizer";
import { reorderElements } from "./elementReorder";
import type { ElementsState } from "../elements";

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
    // 1. 메모리 상태 업데이트 (우선)
    set(
      produce((state: ElementsState) => {
        // 히스토리 추가
        if (state.currentPageId) {
          historyManager.addEntry({
            type: "add",
            elementId: element.id,
            data: { element: { ...element } },
          });
        }

        // 새로운 배열 참조 생성 (리렌더링 보장)
        state.elements = [...state.elements, element];
      })
    );

    // 2. iframe 업데이트
    if (typeof window !== "undefined" && window.parent) {
      try {
        window.parent.postMessage(
          {
            type: "ELEMENT_ADDED",
            payload: { element: sanitizeElement(element) },
          },
          "*"
        );
      } catch (error) {
        console.warn("postMessage 직렬화 실패:", error);
      }
    }

    // 3. 데이터베이스 저장 (비동기, 실패해도 메모리는 유지)
    try {
      // UPSERT로 최적화 (SELECT + UPDATE/INSERT → 단일 쿼리)
      const { error } = await supabase
        .from("elements")
        .upsert(sanitizeElement(element), {
          onConflict: "id", // ID 중복 시 업데이트
        });

      if (error) {
        if (error.code === "23503") {
          console.warn(
            "⚠️ 외래키 제약조건으로 인한 저장 실패 (메모리는 정상):",
            error.message
          );
        } else {
          console.warn("⚠️ 데이터베이스 저장 실패 (메모리는 정상):", error);
        }
      } else if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true") {
        console.log("✅ 데이터베이스에 요소 저장 완료:", element.id);
      }
    } catch (error) {
      console.warn("⚠️ 데이터베이스 저장 중 오류 (메모리는 정상):", error);
    }

    // order_num 재정렬 (추가 후)
    const currentPageId = get().currentPageId;
    if (currentPageId && element.page_id === currentPageId) {
      setTimeout(() => {
        const { elements, updateElementOrder } = get();
        reorderElements(elements, currentPageId, updateElementOrder);
      }, 100); // 상태 업데이트 후 재정렬
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
 * @param _get - Zustand getState 함수 (현재 미사용, 향후 확장 대비)
 * @returns addComplexElement 액션 함수
 */
export const createAddComplexElementAction =
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- _get은 factory pattern 시그니처 통일을 위해 유지
  (set: SetState, _get: GetState) =>
  async (parentElement: Element, childElements: Element[]) => {
    const allElements = [parentElement, ...childElements];

    // 1. 메모리 상태 업데이트 (우선)
    set(
      produce((state: ElementsState) => {
        // 복합 컴포넌트 생성 히스토리 추가
        if (state.currentPageId) {
          historyManager.addEntry({
            type: "add",
            elementId: parentElement.id,
            data: {
              element: { ...parentElement },
              childElements: childElements.map((child) => ({ ...child })),
            },
          });
        }

        // 모든 요소 추가
        state.elements.push(...allElements);
      })
    );

    // 2. iframe 업데이트
    if (typeof window !== "undefined" && window.parent) {
      try {
        window.parent.postMessage(
          {
            type: "COMPLEX_ELEMENT_ADDED",
            payload: {
              parentElement: sanitizeElement(parentElement),
              childElements: childElements.map((child) =>
                sanitizeElement(child)
              ),
            },
          },
          "*"
        );
      } catch (error) {
        console.warn("postMessage 직렬화 실패:", error);
      }
    }

    // 3. 데이터베이스 저장 (비동기, 실패해도 메모리는 유지)
    try {
      // UPSERT로 변경 (중복 방지)
      const { error } = await supabase
        .from("elements")
        .upsert(allElements.map((el) => sanitizeElement(el)), {
          onConflict: "id",
        });

      if (error) {
        if (error.code === "23503") {
          console.warn(
            "⚠️ 외래키 제약조건으로 인한 저장 실패 (메모리는 정상):",
            error.message
          );
        } else {
          console.warn("⚠️ 데이터베이스 저장 실패 (메모리는 정상):", error);
        }
      } else if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEBUG_LOGS === "true") {
        console.log(
          `✅ 복합 컴포넌트 데이터베이스 저장 완료: ${parentElement.tag} + 자식 ${childElements.length}개`
        );
      }
    } catch (error) {
      console.warn("⚠️ 데이터베이스 저장 중 오류 (메모리는 정상):", error);
    }
  };
