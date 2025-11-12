import { produce } from "immer";
import type { StateCreator } from "zustand";
import { Element, ComponentElementProps } from "../../../types/core/store.types";
import { historyManager } from "../history";
import { supabase } from "../../../env/supabase.client";
import { sanitizeElement } from "../utils/elementSanitizer";
import {
  findElementById,
  createCompleteProps,
} from "../utils/elementHelpers";
import { reorderElements } from "../utils/elementReorder";
import type { ElementsState } from "../elements";

/**
 * Undo/Redo 액션 로직
 *
 * Zustand store의 set/get 함수를 받아 undo/redo 함수를 생성하는 팩토리 함수들입니다.
 * 히스토리 매니저를 통해 작업 내역을 관리하고, 메모리/iframe/데이터베이스를 동기화합니다.
 */

type SetState = Parameters<StateCreator<ElementsState>>[0];
type GetState = Parameters<StateCreator<ElementsState>>[1];

/**
 * Undo 액션 생성 팩토리
 *
 * @param set - Zustand store의 set 함수
 * @param get - Zustand store의 get 함수
 * @returns undo 함수 구현체
 */
export const createUndoAction =
  (set: SetState, get: GetState) => async () => {
    try {
      console.log("🎯 Undo 함수 시작");
      const state = get();
      const { currentPageId } = state;
      console.log("🎯 currentPageId:", currentPageId);
      if (!currentPageId) {
        console.log("🚫 currentPageId 없음, return");
        return;
      }

      // 히스토리 작업 시작 표시
      set({ historyOperationInProgress: true });

      console.log("🔄 Undo 시작");

      // historyManager에서 항목 가져오기
      const entry = historyManager.undo();
      if (!entry) {
        console.log("⚠️ Undo 불가능: 히스토리 항목 없음");
        set({ historyOperationInProgress: false });
        return;
      }

      console.log("🔍 Undo 항목 확인:", {
        type: entry.type,
        elementId: entry.elementId,
        hasData: !!entry.data,
        dataKeys: entry.data ? Object.keys(entry.data) : [],
      });

      // 1. 메모리 상태 업데이트 (우선) - 안전한 데이터 복사
      let elementIdsToRemove: string[] = [];
      const elementsToRestore: Element[] = [];
      let prevProps: ComponentElementProps | null = null;
      let prevElement: Element | null = null;

      // produce 밖에서 안전하게 데이터 준비
      try {
        switch (entry.type) {
          case "add": {
            elementIdsToRemove = [entry.elementId];
            if (
              entry.data.childElements &&
              entry.data.childElements.length > 0
            ) {
              elementIdsToRemove.push(
                ...entry.data.childElements.map((child: Element) => child.id)
              );
            }
            break;
          }

          case "update": {
            console.log("🔍 Update 케이스 데이터 준비:", {
              hasPrevProps: !!entry.data.prevProps,
              hasPrevElement: !!entry.data.prevElement,
              prevProps: entry.data.prevProps,
              prevElement: entry.data.prevElement,
            });

            if (entry.data.prevProps) {
              try {
                prevProps = JSON.parse(JSON.stringify(entry.data.prevProps));
                console.log("✅ prevProps 준비 완료:", prevProps);
              } catch (proxyError) {
                console.warn("⚠️ prevProps proxy 오류, 원본 사용:", proxyError);
                prevProps = entry.data.prevProps;
              }
            }
            if (entry.data.prevElement) {
              try {
                prevElement = JSON.parse(
                  JSON.stringify(entry.data.prevElement)
                );
                console.log("✅ prevElement 준비 완료:", prevElement);
              } catch (proxyError) {
                console.warn(
                  "⚠️ prevElement proxy 오류, 원본 사용:",
                  proxyError
                );
                prevElement = entry.data.prevElement;
              }
            }
            break;
          }

          case "remove": {
            if (entry.data.element) {
              try {
                elementsToRestore.push(
                  JSON.parse(JSON.stringify(entry.data.element))
                );
              } catch (proxyError) {
                console.warn("⚠️ element proxy 오류, 원본 사용:", proxyError);
                elementsToRestore.push(entry.data.element);
              }
            }
            if (
              entry.data.childElements &&
              entry.data.childElements.length > 0
            ) {
              try {
                elementsToRestore.push(
                  ...entry.data.childElements.map((child: Element) =>
                    JSON.parse(JSON.stringify(child))
                  )
                );
                console.log(
                  `🔄 Undo: 자식 요소 ${entry.data.childElements.length}개 복원`,
                  {
                    parent: entry.data.element?.tag,
                    children: entry.data.childElements.map(
                      (child: Element) => ({ id: child.id, tag: child.tag })
                    ),
                  }
                );
              } catch (proxyError) {
                console.warn(
                  "⚠️ childElements proxy 오류, 원본 사용:",
                  proxyError
                );
                elementsToRestore.push(...entry.data.childElements);
                console.log(
                  `🔄 Undo: 자식 요소 ${entry.data.childElements.length}개 복원 (원본)`,
                  {
                    parent: entry.data.element?.tag,
                    children: entry.data.childElements.map(
                      (child: Element) => ({ id: child.id, tag: child.tag })
                    ),
                  }
                );
              }
            }
            break;
          }
        }

        console.log("✅ 히스토리 데이터 준비 완료, try 블록 끝");
      } catch (error: unknown) {
        console.error("⚠️ 히스토리 데이터 준비 중 오류:", error);
        console.error("⚠️ 오류 상세:", {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          entryType: entry.type,
          elementId: entry.elementId,
        });
        set({ historyOperationInProgress: false });
        return;
      }

      console.log("🚀 produce 함수 호출 직전, entry.type:", entry.type);

      set(
        produce((state: ElementsState) => {
          console.log("🔧 Undo Produce 함수 실행됨, entry.type:", entry.type);
          switch (entry.type) {
            case "add": {
              // 추가된 요소 제거 (역작업)
              state.elements = state.elements.filter(
                (el) => !elementIdsToRemove.includes(el.id)
              );
              if (elementIdsToRemove.includes(state.selectedElementId || "")) {
                state.selectedElementId = null;
                state.selectedElementProps = {};
              }
              break;
            }

            case "update": {
              console.log("📥 Update 케이스 실행됨:", {
                elementId: entry.elementId,
                hasPrevProps: !!prevProps,
                hasPrevElement: !!prevElement,
              });

              // 이전 상태로 복원
              const element = findElementById(state.elements, entry.elementId);
              if (element && prevProps) {
                console.log("🔄 Undo: Props 복원", {
                  elementId: entry.elementId,
                  elementTag: element.tag,
                  currentProps: { ...element.props },
                  restoringTo: prevProps,
                });
                element.props = prevProps;

                // 선택된 요소가 업데이트된 경우 selectedElementProps도 업데이트
                if (state.selectedElementId === entry.elementId) {
                  console.log("🔄 Undo: 선택된 요소 props도 업데이트");
                  state.selectedElementProps = createCompleteProps(
                    element,
                    prevProps
                  );
                }
              } else if (element && prevElement) {
                console.log("🔄 Undo: 전체 요소 복원", {
                  elementId: entry.elementId,
                  prevElement,
                });
                // 전체 요소가 저장된 경우
                Object.assign(element, prevElement);
              } else {
                console.warn(
                  "⚠️ Undo 실패: 요소 또는 이전 데이터를 찾을 수 없음",
                  {
                    elementId: entry.elementId,
                    elementFound: !!element,
                    prevPropsFound: !!prevProps,
                    prevElementFound: !!prevElement,
                  }
                );
              }
              break;
            }

            case "remove": {
              // 삭제된 요소와 자식 요소들 복원
              console.log("🔄 Undo: 요소 복원 중:", {
                restoringCount: elementsToRestore.length,
              });

              elementsToRestore.forEach((el, index) => {
                console.log(`📥 복원 요소 ${index + 1}:`, {
                  id: el.id,
                  tag: el.tag,
                  tabId: (el.props as { tabId?: string }).tabId,
                  title: (el.props as { title?: string }).title,
                  order_num: el.order_num,
                });
              });

              state.elements.push(...elementsToRestore);
              break;
            }
          }
        })
      );

      // 2. iframe 업데이트
      if (typeof window !== "undefined" && window.parent) {
        try {
          const currentElements = get().elements;
          window.parent.postMessage(
            {
              type: "ELEMENTS_UPDATED",
              payload: { elements: currentElements.map(sanitizeElement) },
            },
            "*"
          );
        } catch (error) {
          console.warn("postMessage 직렬화 실패:", error);
        }
      }

      // 3. 데이터베이스 업데이트 (비동기, 실패해도 메모리는 유지)
      try {
        switch (entry.type) {
          case "add": {
            // 부모 요소와 자식 요소들을 모두 데이터베이스에서 삭제
            const elementIdsToDelete = [entry.elementId];
            if (
              entry.data.childElements &&
              entry.data.childElements.length > 0
            ) {
              elementIdsToDelete.push(
                ...entry.data.childElements.map((child) => child.id)
              );
            }

            await supabase
              .from("elements")
              .delete()
              .in("id", elementIdsToDelete);
            console.log(
              `✅ Undo: 데이터베이스에서 요소 삭제 완료 (부모 1개 + 자식 ${
                entry.data.childElements?.length || 0
              }개)`
            );
            break;
          }

          case "update": {
            // bulk_update는 가짜 ID이므로 데이터베이스 업데이트 건너뛰기
            if (entry.elementId === "bulk_update") {
              console.log(
                "⏭️ bulk_update는 가짜 ID이므로 데이터베이스 업데이트 건너뛰기"
              );
              break;
            }

            if (entry.data.prevElement) {
              await supabase
                .from("elements")
                .update({
                  props: entry.data.prevProps || entry.data.prevElement.props,
                  parent_id: entry.data.prevElement.parent_id,
                  order_num: entry.data.prevElement.order_num,
                })
                .eq("id", entry.elementId);
              console.log("✅ Undo: 데이터베이스에서 요소 복원 완료");
            }
            break;
          }

          case "remove": {
            if (entry.data.element) {
              // 부모 요소와 자식 요소들을 모두 데이터베이스에 복원
              const elementsToRestore = [entry.data.element];
              if (
                entry.data.childElements &&
                entry.data.childElements.length > 0
              ) {
                elementsToRestore.push(...entry.data.childElements);
              }

              await supabase
                .from("elements")
                .insert(elementsToRestore.map((el) => sanitizeElement(el)));
              console.log(
                `✅ Undo: 데이터베이스에서 요소 복원 완료 (부모 1개 + 자식 ${
                  entry.data.childElements?.length || 0
                }개)`
              );
            }
            break;
          }
        }
      } catch (dbError) {
        console.warn("⚠️ 데이터베이스 업데이트 실패 (메모리는 정상):", dbError);
      }

      console.log("✅ Undo 완료");

      // Undo 완료 후 order_num 재정렬 (충돌 해결)
      const { elements, updateElementOrder } = get();
      if (currentPageId) {
        setTimeout(() => {
          reorderElements(elements, currentPageId, updateElementOrder);
          console.log("📊 Undo 후 order_num 재정렬 완료");
        }, 100); // 다른 업데이트 완료 후 실행
      }
    } catch (error) {
      console.error("Undo 시 오류:", error);
    } finally {
      // 히스토리 작업 종료 표시
      set({ historyOperationInProgress: false });
    }
  };

/**
 * Redo 액션 생성 팩토리
 *
 * @param set - Zustand store의 set 함수
 * @param get - Zustand store의 get 함수
 * @returns redo 함수 구현체
 */
export const createRedoAction =
  (set: SetState, get: GetState) => async () => {
    try {
      const state = get();
      if (!state.currentPageId) return;

      // 히스토리 작업 시작 표시
      set({ historyOperationInProgress: true });

      console.log("🔄 Redo 시작");

      const entry = historyManager.redo();
      if (!entry) {
        console.log("⚠️ Redo 불가능: 히스토리 항목 없음");
        set({ historyOperationInProgress: false });
        return;
      }

      // 1. 메모리 상태 업데이트 (우선) - 안전한 데이터 복사
      const elementsToAdd: Element[] = [];
      let elementIdsToRemove: string[] = [];
      let propsToUpdate: ComponentElementProps | null = null;

      // produce 밖에서 안전하게 데이터 준비
      try {
        switch (entry.type) {
          case "add": {
            if (entry.data.element) {
              elementsToAdd.push(
                JSON.parse(JSON.stringify(entry.data.element))
              );
            }
            if (
              entry.data.childElements &&
              entry.data.childElements.length > 0
            ) {
              elementsToAdd.push(
                ...entry.data.childElements.map((child: Element) =>
                  JSON.parse(JSON.stringify(child))
                )
              );
              console.log(
                `🔄 Redo: 자식 요소 ${entry.data.childElements.length}개 추가`,
                {
                  parent: entry.data.element?.tag,
                  children: entry.data.childElements.map((child: Element) => ({
                    id: child.id,
                    tag: child.tag,
                  })),
                }
              );
            }
            break;
          }

          case "update": {
            if (entry.data.props) {
              propsToUpdate = JSON.parse(JSON.stringify(entry.data.props));
            }
            break;
          }

          case "remove": {
            elementIdsToRemove = [entry.elementId];
            if (
              entry.data.childElements &&
              entry.data.childElements.length > 0
            ) {
              elementIdsToRemove.push(
                ...entry.data.childElements.map((child: Element) => child.id)
              );
            }
            break;
          }
        }
      } catch (error) {
        console.warn("⚠️ 히스토리 데이터 준비 중 오류:", error);
        set({ historyOperationInProgress: false });
        return;
      }

      set(
        produce((state: ElementsState) => {
          switch (entry.type) {
            case "add": {
              // 요소와 자식 요소들 추가
              state.elements.push(...elementsToAdd);
              break;
            }

            case "update": {
              // 업데이트 적용
              const element = findElementById(state.elements, entry.elementId);
              if (element && propsToUpdate) {
                element.props = { ...element.props, ...propsToUpdate };
              }
              break;
            }

            case "remove": {
              // 요소와 자식 요소들 제거
              state.elements = state.elements.filter(
                (el) => !elementIdsToRemove.includes(el.id)
              );
              if (elementIdsToRemove.includes(state.selectedElementId || "")) {
                state.selectedElementId = null;
                state.selectedElementProps = {};
              }
              break;
            }
          }
        })
      );

      // 2. iframe 업데이트
      if (typeof window !== "undefined" && window.parent) {
        try {
          const currentElements = get().elements;
          window.parent.postMessage(
            {
              type: "ELEMENTS_UPDATED",
              payload: { elements: currentElements.map(sanitizeElement) },
            },
            "*"
          );
        } catch (error) {
          console.warn("postMessage 직렬화 실패:", error);
        }
      }

      // 3. 데이터베이스 업데이트 (비동기, 실패해도 메모리는 유지)
      try {
        switch (entry.type) {
          case "add": {
            if (entry.data.element) {
              // 부모 요소와 자식 요소들을 모두 데이터베이스에 추가
              const elementsToAdd = [entry.data.element];
              if (
                entry.data.childElements &&
                entry.data.childElements.length > 0
              ) {
                elementsToAdd.push(...entry.data.childElements);
              }

              await supabase
                .from("elements")
                .insert(elementsToAdd.map((el) => sanitizeElement(el)));
              console.log(
                `✅ Redo: 데이터베이스에서 요소 추가 완료 (부모 1개 + 자식 ${
                  entry.data.childElements?.length || 0
                }개)`
              );
            }
            break;
          }

          case "update": {
            // bulk_update는 가짜 ID이므로 데이터베이스 업데이트 건너뛰기
            if (entry.elementId === "bulk_update") {
              console.log(
                "⏭️ bulk_update는 가짜 ID이므로 데이터베이스 업데이트 건너뛰기"
              );
              break;
            }

            if (entry.data.props) {
              const element = findElementById(get().elements, entry.elementId);
              if (element) {
                await supabase
                  .from("elements")
                  .update({ props: { ...element.props, ...entry.data.props } })
                  .eq("id", entry.elementId);
                console.log("✅ Redo: 데이터베이스에서 요소 업데이트 완료");
              }
            }
            break;
          }

          case "remove": {
            // 부모 요소와 자식 요소들을 모두 데이터베이스에서 삭제
            const elementIdsToDelete = [entry.elementId];
            if (
              entry.data.childElements &&
              entry.data.childElements.length > 0
            ) {
              elementIdsToDelete.push(
                ...entry.data.childElements.map((child) => child.id)
              );
            }

            await supabase
              .from("elements")
              .delete()
              .in("id", elementIdsToDelete);
            console.log(
              `✅ Redo: 데이터베이스에서 요소 삭제 완료 (부모 1개 + 자식 ${
                entry.data.childElements?.length || 0
              }개)`
            );
            break;
          }
        }
      } catch (dbError) {
        console.warn("⚠️ 데이터베이스 업데이트 실패 (메모리는 정상):", dbError);
      }

      console.log("✅ Redo 완료");

      // Redo 완료 후 order_num 재정렬 (충돌 해결)
      const { elements, updateElementOrder } = get();
      const pageId = state.currentPageId;
      if (pageId) {
        setTimeout(() => {
          reorderElements(elements, pageId, updateElementOrder);
          console.log("📊 Redo 후 order_num 재정렬 완료");
        }, 100); // 다른 업데이트 완료 후 실행
      }
    } catch (error) {
      console.error("Redo 시 오류:", error);
    } finally {
      // 히스토리 작업 종료 표시
      set({ historyOperationInProgress: false });
    }
  };
