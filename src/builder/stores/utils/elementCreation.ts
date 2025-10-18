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
      // 먼저 기존 요소가 있는지 확인
      const { data: existingElement } = await supabase
        .from("elements")
        .select("id")
        .eq("id", element.id)
        .single();

      if (existingElement) {
        console.log("🔄 요소가 이미 존재함, 업데이트 시도:", element.id);
        // 기존 요소가 있으면 업데이트
        const { error: updateError } = await supabase
          .from("elements")
          .update(sanitizeElement(element))
          .eq("id", element.id);

        if (updateError) {
          console.warn("⚠️ 요소 업데이트 실패 (메모리는 정상):", updateError);
        } else {
          console.log("✅ 데이터베이스에 요소 업데이트 완료:", element.id);
        }
      } else {
        // 새 요소 삽입
        const { error } = await supabase
          .from("elements")
          .insert(sanitizeElement(element));

        if (error) {
          if (error.code === "23503") {
            console.warn(
              "⚠️ 외래키 제약조건으로 인한 저장 실패 (메모리는 정상):",
              error.message
            );
          } else if (error.code === "23505") {
            console.warn(
              "⚠️ 중복 키 오류 - 요소가 이미 존재함 (메모리는 정상):",
              error.message
            );
          } else {
            console.warn("⚠️ 데이터베이스 저장 실패 (메모리는 정상):", error);
          }
        } else {
          console.log("✅ 데이터베이스에 요소 저장 완료:", element.id);
        }
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
      const { error } = await supabase
        .from("elements")
        .insert(allElements.map((el) => sanitizeElement(el)));

      if (error) {
        if (error.code === "23503") {
          console.warn(
            "⚠️ 외래키 제약조건으로 인한 저장 실패 (메모리는 정상):",
            error.message
          );
        } else {
          console.warn("⚠️ 데이터베이스 저장 실패 (메모리는 정상):", error);
        }
      } else {
        console.log(
          `✅ 복합 컴포넌트 데이터베이스 저장 완료: ${parentElement.tag} + 자식 ${childElements.length}개`
        );
      }
    } catch (error) {
      console.warn("⚠️ 데이터베이스 저장 중 오류 (메모리는 정상):", error);
    }
  };
