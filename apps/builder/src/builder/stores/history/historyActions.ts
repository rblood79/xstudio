// 🚀 Phase 1: Immer 제거 - 함수형 업데이트로 전환
// import { produce } from "immer"; // REMOVED
import type { StateCreator } from "zustand";
import { Element, ComponentElementProps } from "../../../types/core/store.types";
import { historyManager } from "../history";
import { supabase } from "../../../env/supabase.client";
import { sanitizeElement, sanitizeElementForSupabase } from "../utils/elementSanitizer";
import {
  getElementById,
  createCompleteProps,
} from "../utils/elementHelpers";
import { reorderElements } from "../utils/elementReorder";
import type { ElementsState } from "../elements";
import { getDB } from "../../../lib/db";
// 🚀 Phase 11: Feature Flags for WebGL-only mode
import { isWebGLCanvas, isCanvasCompareMode } from "../../../utils/featureFlags";

/**
 * Undo/Redo 액션 로직
 *
 * Zustand store의 set/get 함수를 받아 undo/redo 함수를 생성하는 팩토리 함수들입니다.
 * 히스토리 매니저를 통해 작업 내역을 관리하고, 메모리/iframe/데이터베이스를 동기화합니다.
 */

type SetState = Parameters<StateCreator<ElementsState>>[0];
type GetState = Parameters<StateCreator<ElementsState>>[1];

/**
 * 🚀 Phase 2: structuredClone 우선 사용 헬퍼
 * JSON.parse/stringify보다 2-5배 빠름
 */
function cloneForHistory<T>(value: T): T {
  try {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }
  } catch {
    // structuredClone 실패 시 JSON fallback
  }
  try {
    const json = JSON.stringify(value);
    if (json === undefined) return value;
    return JSON.parse(json) as T;
  } catch {
    return value;
  }
}

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

            // 🚀 Phase 2: structuredClone 사용
            if (entry.data.prevProps) {
              prevProps = cloneForHistory(entry.data.prevProps);
              console.log("✅ prevProps 준비 완료:", prevProps);
            }
            if (entry.data.prevElement) {
              prevElement = cloneForHistory(entry.data.prevElement);
              console.log("✅ prevElement 준비 완료:", prevElement);
            }
            break;
          }

          case "remove": {
            // 🚀 Phase 2: structuredClone 사용
            if (entry.data.element) {
              elementsToRestore.push(cloneForHistory(entry.data.element));
            }
            if (
              entry.data.childElements &&
              entry.data.childElements.length > 0
            ) {
              elementsToRestore.push(
                ...entry.data.childElements.map((child: Element) =>
                  cloneForHistory(child)
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
            }
            break;
          }

          case "batch": {
            // Batch update - 각 요소의 이전 props 저장
            console.log("🔄 Undo: Batch update 데이터 준비");
            break;
          }

          case "group": {
            // Group 생성 - 그룹 삭제 + 자식들 원래 부모로 이동 준비
            console.log("🔄 Undo: Group 생성 데이터 준비");
            elementIdsToRemove = [entry.elementId]; // 그룹 요소 삭제
            break;
          }

          case "ungroup": {
            // Ungroup - 그룹 재생성 + 자식들 그룹 안으로 이동 준비
            console.log("🔄 Undo: Ungroup 데이터 준비");
            if (entry.data.element) {
              // 🚀 Phase 2: structuredClone 사용
              elementsToRestore.push(cloneForHistory(entry.data.element));
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

      console.log("🚀 함수형 업데이트 호출 직전, entry.type:", entry.type);

      // 🚀 Phase 1: Immer → 함수형 업데이트
      const currentState = get();
      console.log("🔧 Undo 함수형 업데이트 실행됨, entry.type:", entry.type);

      let updatedElements = currentState.elements;
      let updatedSelectedElementId = currentState.selectedElementId;
      let updatedSelectedElementProps = currentState.selectedElementProps;

      switch (entry.type) {
        case "add": {
          // 추가된 요소 제거 (역작업)
          updatedElements = currentState.elements.filter(
            (el) => !elementIdsToRemove.includes(el.id)
          );
          if (elementIdsToRemove.includes(currentState.selectedElementId || "")) {
            updatedSelectedElementId = null;
            updatedSelectedElementProps = {};
          }
          break;
        }

        case "update": {
          console.log("📥 Update 케이스 실행됨:", {
            elementId: entry.elementId,
            hasPrevProps: !!prevProps,
            hasPrevElement: !!prevElement,
          });

          // 이전 상태로 복원 (불변 업데이트)
          const elementIndex = currentState.elements.findIndex((el) => el.id === entry.elementId);
          if (elementIndex >= 0 && prevProps) {
            const element = currentState.elements[elementIndex];
            console.log("🔄 Undo: Props 복원", {
              elementId: entry.elementId,
              elementTag: element.tag,
              currentProps: { ...element.props },
              restoringTo: prevProps,
            });

            updatedElements = currentState.elements.map((el, i) =>
              i === elementIndex ? { ...el, props: prevProps } : el
            );

            // 선택된 요소가 업데이트된 경우 selectedElementProps도 업데이트
            if (currentState.selectedElementId === entry.elementId) {
              console.log("🔄 Undo: 선택된 요소 props도 업데이트");
              const restoredElement = { ...element, props: prevProps };
              updatedSelectedElementProps = createCompleteProps(restoredElement, prevProps);
            }
          } else if (elementIndex >= 0 && prevElement) {
            console.log("🔄 Undo: 전체 요소 복원", {
              elementId: entry.elementId,
              prevElement,
            });
            // 전체 요소가 저장된 경우
            updatedElements = currentState.elements.map((el, i) =>
              i === elementIndex ? { ...el, ...prevElement } : el
            );
          } else {
            console.warn(
              "⚠️ Undo 실패: 요소 또는 이전 데이터를 찾을 수 없음",
              {
                elementId: entry.elementId,
                elementFound: elementIndex >= 0,
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

          updatedElements = [...currentState.elements, ...elementsToRestore];
          break;
        }

        case "batch": {
          // Batch update Undo - 각 요소의 이전 props 복원
          if (entry.data.batchUpdates) {
            console.log("🔄 Undo: Batch update 복원 중:", {
              updateCount: entry.data.batchUpdates.length,
            });

            // 업데이트 맵 생성
            const updateMap = new Map<string, ComponentElementProps>();
            entry.data.batchUpdates.forEach((update: {
              elementId: string;
              prevProps: ComponentElementProps;
            }) => {
              updateMap.set(update.elementId, update.prevProps);
            });

            updatedElements = currentState.elements.map((el) => {
              const prevPropsForEl = updateMap.get(el.id);
              if (prevPropsForEl) {
                console.log(`📥 복원 요소 props:`, {
                  elementId: el.id,
                  tag: el.tag,
                });
                return { ...el, props: prevPropsForEl };
              }
              return el;
            });

            // 선택된 요소가 업데이트된 경우
            const selectedPrevProps = updateMap.get(currentState.selectedElementId || "");
            if (selectedPrevProps) {
              const selectedEl = updatedElements.find((el) => el.id === currentState.selectedElementId);
              if (selectedEl) {
                updatedSelectedElementProps = createCompleteProps(selectedEl, selectedPrevProps);
              }
            }
          }
          break;
        }

        case "group": {
          // Group 생성 Undo - 그룹 삭제 + 자식들 원래 parent로 이동
          console.log("🔄 Undo: Group 생성 취소 중");

          // 1. 그룹 요소 삭제
          let filteredElements = currentState.elements.filter(
            (el) => !elementIdsToRemove.includes(el.id)
          );

          // 2. 자식 요소들을 원래 parent로 이동
          if (entry.data.elements) {
            const childUpdates = new Map<string, { parent_id: string | null; order_num: number }>();
            entry.data.elements.forEach((prevChild: Element) => {
              childUpdates.set(prevChild.id, {
                parent_id: prevChild.parent_id ?? null,
                order_num: prevChild.order_num || 0,
              });
            });

            filteredElements = filteredElements.map((el) => {
              const update = childUpdates.get(el.id);
              if (update) {
                console.log(`📥 자식 요소 원래 parent로 이동:`, {
                  childId: el.id,
                  newParentId: update.parent_id,
                });
                return { ...el, parent_id: update.parent_id, order_num: update.order_num };
              }
              return el;
            });
          }

          updatedElements = filteredElements;

          // 3. 선택 상태 업데이트
          if (elementIdsToRemove.includes(currentState.selectedElementId || "")) {
            updatedSelectedElementId = null;
            updatedSelectedElementProps = {};
          }
          break;
        }

        case "ungroup": {
          // Ungroup Undo - 그룹 재생성 + 자식들 그룹 안으로 이동
          console.log("🔄 Undo: Ungroup 취소 중");

          // 1. 그룹 요소 복원
          let restoredElements = [...currentState.elements, ...elementsToRestore];
          console.log(`📥 그룹 요소 복원:`, {
            groupId: elementsToRestore[0]?.id,
            tag: elementsToRestore[0]?.tag,
          });

          // 2. 자식 요소들을 그룹 안으로 이동
          if (entry.data.elements) {
            const childUpdates = new Map<string, { order_num: number }>();
            entry.data.elements.forEach((prevChild: Element) => {
              childUpdates.set(prevChild.id, { order_num: prevChild.order_num || 0 });
            });

            restoredElements = restoredElements.map((el) => {
              const update = childUpdates.get(el.id);
              if (update) {
                console.log(`📥 자식 요소 그룹 안으로 이동:`, {
                  childId: el.id,
                  groupId: entry.elementId,
                });
                return { ...el, parent_id: entry.elementId, order_num: update.order_num };
              }
              return el;
            });
          }

          updatedElements = restoredElements;
          break;
        }
      }

      set({
        elements: updatedElements,
        selectedElementId: updatedSelectedElementId,
        selectedElementProps: updatedSelectedElementProps,
      });

      // 🔧 CRITICAL: elementsMap 재구축 (Undo 후 인덱스 동기화)
      get()._rebuildIndexes();

      // 2. iframe 업데이트
      // 🚀 Phase 11: WebGL-only 모드에서는 iframe 통신 스킵
      const isWebGLOnly = isWebGLCanvas() && !isCanvasCompareMode();
      if (!isWebGLOnly && typeof window !== "undefined" && window.parent) {
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

            // IndexedDB에서 삭제
            try {
              const db = await getDB();
              await db.elements.deleteMany(elementIdsToDelete);
              console.log(`✅ Undo: IndexedDB에서 요소 삭제 완료 (${elementIdsToDelete.length}개)`);
            } catch (idbError) {
              console.warn("⚠️ Undo: IndexedDB 삭제 실패:", idbError);
            }

            await supabase
              .from("elements")
              .delete()
              .in("id", elementIdsToDelete);
            console.log(
              `✅ Undo: Supabase에서 요소 삭제 완료 (부모 1개 + 자식 ${
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
              const updatedElement = {
                ...entry.data.prevElement,
                props: entry.data.prevProps || entry.data.prevElement.props,
              };

              // IndexedDB에 업데이트
              try {
                const db = await getDB();
                await db.elements.put(sanitizeElement(updatedElement));
                console.log("✅ Undo: IndexedDB에서 요소 업데이트 완료");
              } catch (idbError) {
                console.warn("⚠️ Undo: IndexedDB 업데이트 실패:", idbError);
              }

              await supabase
                .from("elements")
                .update({
                  props: entry.data.prevProps || entry.data.prevElement.props,
                  parent_id: entry.data.prevElement.parent_id,
                  order_num: entry.data.prevElement.order_num,
                })
                .eq("id", entry.elementId);
              console.log("✅ Undo: Supabase에서 요소 복원 완료");
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

              // IndexedDB에 복원
              try {
                const db = await getDB();
                await db.elements.insertMany(elementsToRestore.map((el) => sanitizeElement(el)));
                console.log(`✅ Undo: IndexedDB에서 요소 복원 완료 (${elementsToRestore.length}개)`);
              } catch (idbError) {
                console.warn("⚠️ Undo: IndexedDB 복원 실패:", idbError);
              }

              // Supabase에 복원 전 page_id 유효성 확인
              const pageId = elementsToRestore[0]?.page_id;
              if (pageId) {
                const { data: pageExists } = await supabase
                  .from("pages")
                  .select("id")
                  .eq("id", pageId)
                  .single();

                if (!pageExists) {
                  console.log(`⏭️ Undo: 페이지가 클라우드에 없음 (로컬 전용), Supabase 저장 skip`);
                } else {
                  const sanitizedElements = elementsToRestore.map((el) => sanitizeElementForSupabase(el));

                  const { error: upsertError } = await supabase
                    .from("elements")
                    .upsert(sanitizedElements, { onConflict: 'id' });

                  if (upsertError) {
                    // Foreign Key 에러는 로컬 전용 프로젝트를 의미
                    if (upsertError.code === '23503') {
                      console.log(`⏭️ Undo: 로컬 전용 프로젝트, Supabase 저장 skip`);
                    } else {
                      console.error("❌ Undo: Supabase upsert 오류:", upsertError);
                    }
                  } else {
                    console.log(
                      `✅ Undo: Supabase에서 요소 복원 완료 (부모 1개 + 자식 ${
                        entry.data.childElements?.length || 0
                      }개)`
                    );
                  }
                }
              }
            }
            break;
          }

          case "batch": {
            // Batch update - 각 요소의 prevProps를 데이터베이스에 업데이트
            if (entry.data.batchUpdates) {
              console.log(
                `🔄 Undo: Batch update DB 동기화 시작 (${entry.data.batchUpdates.length}개)`
              );

              // IndexedDB에 업데이트
              try {
                const db = await getDB();
                for (const update of entry.data.batchUpdates) {
                  const element = getElementById(get().elementsMap, update.elementId);
                  if (element) {
                    await db.elements.put(sanitizeElement({
                      ...element,
                      props: update.prevProps,
                    }));
                  }
                }
                console.log(`✅ Undo: Batch IndexedDB 동기화 완료 (${entry.data.batchUpdates.length}개)`);
              } catch (idbError) {
                console.warn("⚠️ Undo: Batch IndexedDB 동기화 실패:", idbError);
              }

              for (const update of entry.data.batchUpdates) {
                await supabase
                  .from("elements")
                  .update({ props: update.prevProps })
                  .eq("id", update.elementId);
              }

              console.log(
                `✅ Undo: Batch Supabase 동기화 완료 (${entry.data.batchUpdates.length}개)`
              );
            }
            break;
          }

          case "group": {
            // Group 생성 Undo - 그룹 삭제 + 자식들 원래 parent로 업데이트
            console.log("🔄 Undo: Group 생성 취소 DB 동기화");

            // IndexedDB 동기화
            try {
              const db = await getDB();
              // 1. 그룹 요소 삭제
              await db.elements.delete(entry.elementId);
              // 2. 자식 요소들의 parent_id 업데이트
              if (entry.data.elements) {
                for (const prevChild of entry.data.elements) {
                  const element = getElementById(get().elementsMap, prevChild.id);
                  if (element) {
                    await db.elements.put(sanitizeElement({
                      ...element,
                      parent_id: prevChild.parent_id,
                      order_num: prevChild.order_num,
                    }));
                  }
                }
              }
              console.log("✅ Undo: Group IndexedDB 동기화 완료");
            } catch (idbError) {
              console.warn("⚠️ Undo: Group IndexedDB 동기화 실패:", idbError);
            }

            // 1. 그룹 요소 삭제
            await supabase
              .from("elements")
              .delete()
              .eq("id", entry.elementId);

            // 2. 자식 요소들의 parent_id 업데이트
            if (entry.data.elements) {
              for (const prevChild of entry.data.elements) {
                await supabase
                  .from("elements")
                  .update({
                    parent_id: prevChild.parent_id,
                    order_num: prevChild.order_num,
                  })
                  .eq("id", prevChild.id);
              }
              console.log(
                `✅ Undo: Group Supabase 동기화 완료 (자식 ${entry.data.elements.length}개)`
              );
            }
            break;
          }

          case "ungroup": {
            // Ungroup Undo - 그룹 복원 + 자식들 그룹 안으로 이동
            console.log("🔄 Undo: Ungroup 취소 DB 동기화");

            // IndexedDB 동기화
            try {
              const db = await getDB();
              // 1. 그룹 요소 복원
              if (entry.data.element) {
                await db.elements.put(sanitizeElement(entry.data.element));
              }
              // 2. 자식 요소들 업데이트
              if (entry.data.elements) {
                for (const prevChild of entry.data.elements) {
                  const element = getElementById(get().elementsMap, prevChild.id);
                  if (element) {
                    await db.elements.put(sanitizeElement({
                      ...element,
                      parent_id: entry.elementId,
                      order_num: prevChild.order_num,
                    }));
                  }
                }
              }
              console.log("✅ Undo: Ungroup IndexedDB 동기화 완료");
            } catch (idbError) {
              console.warn("⚠️ Undo: Ungroup IndexedDB 동기화 실패:", idbError);
            }

            // Supabase에 복원 전 page_id 유효성 확인
            const ungroupPageId = entry.data.element?.page_id;
            if (ungroupPageId) {
              const { data: pageExists } = await supabase
                .from("pages")
                .select("id")
                .eq("id", ungroupPageId)
                .single();

              if (!pageExists) {
                console.log(`⏭️ Undo: 페이지가 클라우드에 없음 (로컬 전용), Supabase 저장 skip`);
              } else {
                // 1. 그룹 요소 복원 (Supabase)
                if (entry.data.element) {
                  await supabase
                    .from("elements")
                    .upsert(sanitizeElementForSupabase(entry.data.element), { onConflict: 'id' });
                }

                // 2. 자식 요소들의 parent_id를 그룹 ID로 업데이트
                if (entry.data.elements) {
                  for (const prevChild of entry.data.elements) {
                    await supabase
                      .from("elements")
                      .update({
                        parent_id: entry.elementId, // 그룹 ID
                        order_num: prevChild.order_num,
                      })
                      .eq("id", prevChild.id);
                  }
                  console.log(
                    `✅ Undo: Ungroup 취소 Supabase 동기화 완료 (자식 ${entry.data.elements.length}개)`
                  );
                }
              }
            }
            break;
          }
        }
      } catch (dbError) {
        console.warn("⚠️ 데이터베이스 업데이트 실패 (메모리는 정상):", dbError);
      }

      console.log("✅ Undo 완료");

      // Undo 완료 후 order_num 재정렬 (충돌 해결)
      if (currentPageId) {
        setTimeout(() => {
          const { elements: latestElements, batchUpdateElementOrders } = get();
          reorderElements(latestElements, currentPageId, batchUpdateElementOrders);
          console.log("📊 Undo 후 order_num 재정렬 완료");
        }, 100);
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
            // 🚀 Phase 2: structuredClone 사용
            if (entry.data.element) {
              elementsToAdd.push(cloneForHistory(entry.data.element));
            }
            if (
              entry.data.childElements &&
              entry.data.childElements.length > 0
            ) {
              elementsToAdd.push(
                ...entry.data.childElements.map((child: Element) =>
                  cloneForHistory(child)
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
            // 🚀 Phase 2: structuredClone 사용
            if (entry.data.props) {
              propsToUpdate = cloneForHistory(entry.data.props);
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

          case "batch": {
            // Batch update Redo - newProps 데이터 준비
            console.log("🔄 Redo: Batch update 데이터 준비");
            break;
          }

          case "group": {
            // Group 생성 Redo - 그룹 요소 추가 준비
            console.log("🔄 Redo: Group 생성 데이터 준비");
            // 🚀 Phase 2: structuredClone 사용
            if (entry.data.element) {
              elementsToAdd.push(cloneForHistory(entry.data.element));
            }
            break;
          }

          case "ungroup": {
            // Ungroup Redo - 그룹 요소 삭제 준비
            console.log("🔄 Redo: Ungroup 데이터 준비");
            elementIdsToRemove = [entry.elementId];
            break;
          }
        }
      } catch (error) {
        console.warn("⚠️ 히스토리 데이터 준비 중 오류:", error);
        set({ historyOperationInProgress: false });
        return;
      }

      // 🚀 Phase 1: Immer → 함수형 업데이트
      const currentState = get();
      let updatedElements = currentState.elements;
      let updatedSelectedElementId = currentState.selectedElementId;
      let updatedSelectedElementProps = currentState.selectedElementProps;

      switch (entry.type) {
        case "add": {
          // 요소와 자식 요소들 추가
          updatedElements = [...currentState.elements, ...elementsToAdd];
          break;
        }

        case "update": {
          // 업데이트 적용 (불변 업데이트)
          const elementIndex = currentState.elements.findIndex((el) => el.id === entry.elementId);
          if (elementIndex >= 0 && propsToUpdate) {
            updatedElements = currentState.elements.map((el, i) =>
              i === elementIndex ? { ...el, props: { ...el.props, ...propsToUpdate } } : el
            );
          }
          break;
        }

        case "remove": {
          // 요소와 자식 요소들 제거
          updatedElements = currentState.elements.filter(
            (el) => !elementIdsToRemove.includes(el.id)
          );
          if (elementIdsToRemove.includes(currentState.selectedElementId || "")) {
            updatedSelectedElementId = null;
            updatedSelectedElementProps = {};
          }
          break;
        }

        case "batch": {
          // Batch update Redo - 각 요소의 newProps 적용
          if (entry.data.batchUpdates) {
            console.log("🔄 Redo: Batch update 적용 중:", {
              updateCount: entry.data.batchUpdates.length,
            });

            // 업데이트 맵 생성
            const updateMap = new Map<string, ComponentElementProps>();
            entry.data.batchUpdates.forEach((update: {
              elementId: string;
              newProps: ComponentElementProps;
            }) => {
              updateMap.set(update.elementId, update.newProps);
            });

            updatedElements = currentState.elements.map((el) => {
              const newPropsForEl = updateMap.get(el.id);
              if (newPropsForEl) {
                console.log(`📥 적용 요소 props:`, {
                  elementId: el.id,
                  tag: el.tag,
                });
                return { ...el, props: { ...el.props, ...newPropsForEl } };
              }
              return el;
            });

            // 선택된 요소가 업데이트된 경우
            const selectedNewProps = updateMap.get(currentState.selectedElementId || "");
            if (selectedNewProps) {
              const selectedEl = updatedElements.find((el) => el.id === currentState.selectedElementId);
              if (selectedEl) {
                updatedSelectedElementProps = createCompleteProps(
                  selectedEl,
                  { ...selectedEl.props, ...selectedNewProps }
                );
              }
            }
          }
          break;
        }

        case "group": {
          // Group 생성 Redo - 그룹 추가 + 자식들 그룹 안으로 이동
          console.log("🔄 Redo: Group 생성 중");

          // 1. 그룹 요소 추가
          let newElements = [...currentState.elements, ...elementsToAdd];
          console.log(`📥 그룹 요소 추가:`, {
            groupId: elementsToAdd[0]?.id,
            tag: elementsToAdd[0]?.tag,
          });

          // 2. 자식 요소들을 그룹 안으로 이동
          if (entry.data.elements) {
            const childUpdates = new Map<string, { order_num: number }>();
            entry.data.elements.forEach((prevChild: Element) => {
              childUpdates.set(prevChild.id, { order_num: prevChild.order_num || 0 });
            });

            newElements = newElements.map((el) => {
              const update = childUpdates.get(el.id);
              if (update) {
                console.log(`📥 자식 요소 그룹 안으로 이동:`, {
                  childId: el.id,
                  groupId: entry.elementId,
                });
                return { ...el, parent_id: entry.elementId, order_num: update.order_num };
              }
              return el;
            });
          }

          updatedElements = newElements;
          break;
        }

        case "ungroup": {
          // Ungroup Redo - 그룹 삭제 + 자식들 원래 parent로 이동
          console.log("🔄 Redo: Ungroup 실행 중");

          // 1. 그룹 요소 삭제
          let filteredElements = currentState.elements.filter(
            (el) => !elementIdsToRemove.includes(el.id)
          );

          // 2. 자식 요소들을 원래 parent로 이동
          if (entry.data.elements) {
            const childUpdates = new Map<string, { parent_id: string | null; order_num: number }>();
            entry.data.elements.forEach((prevChild: Element) => {
              childUpdates.set(prevChild.id, {
                parent_id: prevChild.parent_id ?? null,
                order_num: prevChild.order_num || 0,
              });
            });

            filteredElements = filteredElements.map((el) => {
              const update = childUpdates.get(el.id);
              if (update) {
                console.log(`📥 자식 요소 원래 parent로 이동:`, {
                  childId: el.id,
                  newParentId: update.parent_id,
                });
                return { ...el, parent_id: update.parent_id, order_num: update.order_num };
              }
              return el;
            });
          }

          updatedElements = filteredElements;

          // 3. 선택 상태 업데이트
          if (elementIdsToRemove.includes(currentState.selectedElementId || "")) {
            updatedSelectedElementId = null;
            updatedSelectedElementProps = {};
          }
          break;
        }
      }

      set({
        elements: updatedElements,
        selectedElementId: updatedSelectedElementId,
        selectedElementProps: updatedSelectedElementProps,
      });

      // 🔧 CRITICAL: elementsMap 재구축 (Redo 후 인덱스 동기화)
      get()._rebuildIndexes();

      // 2. iframe 업데이트
      // 🚀 Phase 11: WebGL-only 모드에서는 iframe 통신 스킵
      const isWebGLOnly = isWebGLCanvas() && !isCanvasCompareMode();
      if (!isWebGLOnly && typeof window !== "undefined" && window.parent) {
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

              // IndexedDB에 추가
              try {
                const db = await getDB();
                await db.elements.insertMany(elementsToAdd.map((el) => sanitizeElement(el)));
                console.log(`✅ Redo: IndexedDB에서 요소 추가 완료 (${elementsToAdd.length}개)`);
              } catch (idbError) {
                console.warn("⚠️ Redo: IndexedDB 추가 실패:", idbError);
              }

              // Supabase에 추가 전 page_id 유효성 확인
              const pageId = elementsToAdd[0]?.page_id;
              if (pageId) {
                const { data: pageExists } = await supabase
                  .from("pages")
                  .select("id")
                  .eq("id", pageId)
                  .single();

                if (!pageExists) {
                  console.log(`⏭️ Redo: 페이지가 클라우드에 없음 (로컬 전용), Supabase 저장 skip`);
                } else {
                  const { error: upsertError } = await supabase
                    .from("elements")
                    .upsert(
                      elementsToAdd.map((el) => sanitizeElementForSupabase(el)),
                      { onConflict: 'id' }
                    );

                  if (upsertError) {
                    if (upsertError.code === '23503') {
                      console.log(`⏭️ Redo: 로컬 전용 프로젝트, Supabase 저장 skip`);
                    } else {
                      console.error("❌ Redo: Supabase upsert 오류:", upsertError);
                    }
                  } else {
                    console.log(
                      `✅ Redo: Supabase에서 요소 추가 완료 (부모 1개 + 자식 ${
                        entry.data.childElements?.length || 0
                      }개)`
                    );
                  }
                }
              }
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
              const element = getElementById(get().elementsMap, entry.elementId);
              if (element) {
                const updatedElement = {
                  ...element,
                  props: { ...element.props, ...entry.data.props },
                };

                // IndexedDB에 업데이트
                try {
                  const db = await getDB();
                  await db.elements.put(sanitizeElement(updatedElement));
                  console.log("✅ Redo: IndexedDB에서 요소 업데이트 완료");
                } catch (idbError) {
                  console.warn("⚠️ Redo: IndexedDB 업데이트 실패:", idbError);
                }

                await supabase
                  .from("elements")
                  .update({ props: { ...element.props, ...entry.data.props } })
                  .eq("id", entry.elementId);
                console.log("✅ Redo: Supabase에서 요소 업데이트 완료");
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

            // IndexedDB에서 삭제
            try {
              const db = await getDB();
              await db.elements.deleteMany(elementIdsToDelete);
              console.log(`✅ Redo: IndexedDB에서 요소 삭제 완료 (${elementIdsToDelete.length}개)`);
            } catch (idbError) {
              console.warn("⚠️ Redo: IndexedDB 삭제 실패:", idbError);
            }

            await supabase
              .from("elements")
              .delete()
              .in("id", elementIdsToDelete);
            console.log(
              `✅ Redo: Supabase에서 요소 삭제 완료 (부모 1개 + 자식 ${
                entry.data.childElements?.length || 0
              }개)`
            );
            break;
          }

          case "batch": {
            // Batch update Redo - 각 요소의 newProps를 데이터베이스에 업데이트
            if (entry.data.batchUpdates) {
              console.log(
                `🔄 Redo: Batch update DB 동기화 시작 (${entry.data.batchUpdates.length}개)`
              );

              // IndexedDB 동기화
              try {
                const db = await getDB();
                for (const update of entry.data.batchUpdates) {
                  const element = getElementById(get().elementsMap, update.elementId);
                  if (element) {
                    await db.elements.put(sanitizeElement({
                      ...element,
                      props: { ...element.props, ...update.newProps },
                    }));
                  }
                }
                console.log(`✅ Redo: Batch IndexedDB 동기화 완료 (${entry.data.batchUpdates.length}개)`);
              } catch (idbError) {
                console.warn("⚠️ Redo: Batch IndexedDB 동기화 실패:", idbError);
              }

              // Supabase 동기화
              for (const update of entry.data.batchUpdates) {
                const element = getElementById(get().elementsMap, update.elementId);
                if (element) {
                  await supabase
                    .from("elements")
                    .update({ props: { ...element.props, ...update.newProps } })
                    .eq("id", update.elementId);
                }
              }

              console.log(
                `✅ Redo: Batch update Supabase 동기화 완료 (${entry.data.batchUpdates.length}개)`
              );
            }
            break;
          }

          case "group": {
            // Group 생성 Redo - 그룹 추가 + 자식들 parent_id 업데이트
            console.log("🔄 Redo: Group 생성 DB 동기화");

            // IndexedDB 동기화
            try {
              const db = await getDB();
              // 1. 그룹 요소 추가
              if (entry.data.element) {
                await db.elements.put(sanitizeElement(entry.data.element));
              }
              // 2. 자식 요소들 업데이트
              if (entry.data.elements) {
                for (const prevChild of entry.data.elements) {
                  const element = getElementById(get().elementsMap, prevChild.id);
                  if (element) {
                    await db.elements.put(sanitizeElement({
                      ...element,
                      parent_id: entry.elementId,
                      order_num: prevChild.order_num,
                    }));
                  }
                }
              }
              console.log("✅ Redo: Group IndexedDB 동기화 완료");
            } catch (idbError) {
              console.warn("⚠️ Redo: Group IndexedDB 동기화 실패:", idbError);
            }

            // Supabase에 추가 전 page_id 유효성 확인
            const groupPageId = entry.data.element?.page_id;
            if (groupPageId) {
              const { data: pageExists } = await supabase
                .from("pages")
                .select("id")
                .eq("id", groupPageId)
                .single();

              if (!pageExists) {
                console.log(`⏭️ Redo: 페이지가 클라우드에 없음 (로컬 전용), Supabase 저장 skip`);
              } else {
                // 1. 그룹 요소 추가 (Supabase)
                if (entry.data.element) {
                  await supabase
                    .from("elements")
                    .upsert(sanitizeElementForSupabase(entry.data.element), { onConflict: 'id' });
                }

                // 2. 자식 요소들의 parent_id를 그룹 ID로 업데이트
                if (entry.data.elements) {
                  for (const prevChild of entry.data.elements) {
                    await supabase
                      .from("elements")
                      .update({
                        parent_id: entry.elementId, // 그룹 ID
                        order_num: prevChild.order_num,
                      })
                      .eq("id", prevChild.id);
                  }
                  console.log(
                    `✅ Redo: Group 생성 Supabase 동기화 완료 (자식 ${entry.data.elements.length}개)`
                  );
                }
              }
            }
            break;
          }

          case "ungroup": {
            // Ungroup Redo - 그룹 삭제 + 자식들 원래 parent로 업데이트
            console.log("🔄 Redo: Ungroup DB 동기화");

            // IndexedDB 동기화
            try {
              const db = await getDB();
              // 1. 그룹 요소 삭제
              await db.elements.delete(entry.elementId);
              // 2. 자식 요소들 업데이트
              if (entry.data.elements) {
                for (const prevChild of entry.data.elements) {
                  const element = getElementById(get().elementsMap, prevChild.id);
                  if (element) {
                    await db.elements.put(sanitizeElement({
                      ...element,
                      parent_id: prevChild.parent_id,
                      order_num: prevChild.order_num,
                    }));
                  }
                }
              }
              console.log("✅ Redo: Ungroup IndexedDB 동기화 완료");
            } catch (idbError) {
              console.warn("⚠️ Redo: Ungroup IndexedDB 동기화 실패:", idbError);
            }

            // 1. 그룹 요소 삭제 (Supabase)
            await supabase
              .from("elements")
              .delete()
              .eq("id", entry.elementId);

            // 2. 자식 요소들의 parent_id를 원래 parent로 업데이트
            if (entry.data.elements) {
              for (const prevChild of entry.data.elements) {
                await supabase
                  .from("elements")
                  .update({
                    parent_id: prevChild.parent_id,
                    order_num: prevChild.order_num,
                  })
                  .eq("id", prevChild.id);
              }
              console.log(
                `✅ Redo: Ungroup Supabase 동기화 완료 (자식 ${entry.data.elements.length}개)`
              );
            }
            break;
          }
        }
      } catch (dbError) {
        console.warn("⚠️ 데이터베이스 업데이트 실패 (메모리는 정상):", dbError);
      }

      console.log("✅ Redo 완료");

      // Redo 완료 후 order_num 재정렬 (충돌 해결)
      const pageId = state.currentPageId;
      if (pageId) {
        setTimeout(() => {
          const { elements: latestElements, batchUpdateElementOrders } = get();
          reorderElements(latestElements, pageId, batchUpdateElementOrders);
          console.log("📊 Redo 후 order_num 재정렬 완료");
        }, 100);
      }
    } catch (error) {
      console.error("Redo 시 오류:", error);
    } finally {
      // 히스토리 작업 종료 표시
      set({ historyOperationInProgress: false });
    }
  };

/**
 * 특정 히스토리 인덱스로 직접 이동 (중간 렌더링 없이)
 *
 * historyManager.goToIndex로 모든 엔트리를 가져온 후
 * 한 번에 상태를 업데이트하여 중간 과정이 화면에 표시되지 않도록 합니다.
 *
 * @param set - Zustand store의 set 함수
 * @param get - Zustand store의 get 함수
 * @returns goToHistoryIndex 함수 구현체
 */
export const createGoToHistoryIndexAction =
  (set: SetState, get: GetState) => async (targetIndex: number) => {
    try {
      const state = get();
      const { currentPageId } = state;
      if (!currentPageId) return;

      // 히스토리 작업 시작 표시
      set({ historyOperationInProgress: true });

      console.log("🎯 GoToHistoryIndex 시작:", { targetIndex });

      // historyManager에서 모든 엔트리를 한 번에 가져옴
      const result = historyManager.goToIndex(targetIndex);
      if (!result) {
        console.log("⚠️ GoToHistoryIndex: 이동할 엔트리 없음");
        set({ historyOperationInProgress: false });
        return;
      }

      const { entries, direction } = result;
      console.log(`🔄 GoToHistoryIndex: ${entries.length}개 엔트리 ${direction}`);

      // 현재 상태를 가져와서 누적 업데이트
      let updatedElements = state.elements;
      let updatedSelectedElementId = state.selectedElementId;
      let updatedSelectedElementProps = state.selectedElementProps;

      // 모든 엔트리를 순차적으로 메모리에 적용 (렌더링 없이)
      for (const entry of entries) {
        const applyResult = applyHistoryEntry(
          entry,
          direction,
          updatedElements,
          updatedSelectedElementId,
          updatedSelectedElementProps
        );
        updatedElements = applyResult.elements;
        updatedSelectedElementId = applyResult.selectedElementId;
        updatedSelectedElementProps = applyResult.selectedElementProps;
      }

      // 최종 상태 한 번에 업데이트 (렌더링은 여기서만 발생)
      set({
        elements: updatedElements,
        selectedElementId: updatedSelectedElementId,
        selectedElementProps: updatedSelectedElementProps,
      });

      // elementsMap 재구축
      get()._rebuildIndexes();

      // iframe 업데이트
      const isWebGLOnly = isWebGLCanvas() && !isCanvasCompareMode();
      if (!isWebGLOnly && typeof window !== "undefined" && window.parent) {
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

      // 데이터베이스 동기화 (마지막 상태만)
      await syncDatabaseForEntries(entries, direction, get);

      console.log("✅ GoToHistoryIndex 완료");

      // order_num 재정렬
      if (currentPageId) {
        setTimeout(() => {
          const { elements: latestElements, batchUpdateElementOrders } = get();
          reorderElements(latestElements, currentPageId, batchUpdateElementOrders);
        }, 100);
      }
    } catch (error) {
      console.error("GoToHistoryIndex 시 오류:", error);
    } finally {
      set({ historyOperationInProgress: false });
    }
  };

/**
 * 히스토리 엔트리를 메모리 상태에 적용 (렌더링 없이)
 */
function applyHistoryEntry(
  entry: ReturnType<typeof historyManager.undo>,
  direction: 'undo' | 'redo',
  elements: Element[],
  selectedElementId: string | null,
  selectedElementProps: ComponentElementProps
): {
  elements: Element[];
  selectedElementId: string | null;
  selectedElementProps: ComponentElementProps;
} {
  if (!entry) {
    return { elements, selectedElementId, selectedElementProps };
  }

  let updatedElements = elements;
  let updatedSelectedElementId = selectedElementId;
  let updatedSelectedElementProps = selectedElementProps;

  if (direction === 'undo') {
    switch (entry.type) {
      case "add": {
        // 추가된 요소 제거
        const elementIdsToRemove = [entry.elementId];
        if (entry.data.childElements?.length) {
          elementIdsToRemove.push(...entry.data.childElements.map((child: Element) => child.id));
        }
        updatedElements = elements.filter((el) => !elementIdsToRemove.includes(el.id));
        if (elementIdsToRemove.includes(selectedElementId || "")) {
          updatedSelectedElementId = null;
          updatedSelectedElementProps = {};
        }
        break;
      }

      case "update": {
        const prevProps = entry.data.prevProps ? cloneForHistory(entry.data.prevProps) : null;
        const prevElement = entry.data.prevElement ? cloneForHistory(entry.data.prevElement) : null;
        const elementIndex = elements.findIndex((el) => el.id === entry.elementId);
        if (elementIndex >= 0 && prevProps) {
          updatedElements = elements.map((el, i) =>
            i === elementIndex ? { ...el, props: prevProps } : el
          );
          if (selectedElementId === entry.elementId) {
            const restoredElement = { ...elements[elementIndex], props: prevProps };
            updatedSelectedElementProps = createCompleteProps(restoredElement, prevProps);
          }
        } else if (elementIndex >= 0 && prevElement) {
          updatedElements = elements.map((el, i) =>
            i === elementIndex ? { ...el, ...prevElement } : el
          );
        }
        break;
      }

      case "remove": {
        // 삭제된 요소 복원 (중복 방지)
        const elementsToRestore: Element[] = [];
        const existingIds = new Set(elements.map(el => el.id));
        if (entry.data.element && !existingIds.has(entry.data.element.id)) {
          elementsToRestore.push(cloneForHistory(entry.data.element));
          existingIds.add(entry.data.element.id);
        }
        if (entry.data.childElements?.length) {
          for (const child of entry.data.childElements) {
            if (!existingIds.has(child.id)) {
              elementsToRestore.push(cloneForHistory(child));
              existingIds.add(child.id);
            }
          }
        }
        updatedElements = [...elements, ...elementsToRestore];
        break;
      }

      case "batch": {
        if (entry.data.batchUpdates) {
          const updateMap = new Map<string, ComponentElementProps>();
          entry.data.batchUpdates.forEach((update: { elementId: string; prevProps: ComponentElementProps }) => {
            updateMap.set(update.elementId, update.prevProps);
          });
          updatedElements = elements.map((el) => {
            const prevPropsForEl = updateMap.get(el.id);
            return prevPropsForEl ? { ...el, props: prevPropsForEl } : el;
          });
          const selectedPrevProps = updateMap.get(selectedElementId || "");
          if (selectedPrevProps) {
            const selectedEl = updatedElements.find((el) => el.id === selectedElementId);
            if (selectedEl) {
              updatedSelectedElementProps = createCompleteProps(selectedEl, selectedPrevProps);
            }
          }
        }
        break;
      }

      case "group": {
        // 그룹 삭제 + 자식들 원래 parent로
        let filteredElements = elements.filter((el) => el.id !== entry.elementId);
        if (entry.data.elements) {
          const childUpdates = new Map<string, { parent_id: string | null; order_num: number }>();
          entry.data.elements.forEach((prevChild: Element) => {
            childUpdates.set(prevChild.id, {
              parent_id: prevChild.parent_id ?? null,
              order_num: prevChild.order_num || 0,
            });
          });
          filteredElements = filteredElements.map((el) => {
            const update = childUpdates.get(el.id);
            return update ? { ...el, parent_id: update.parent_id, order_num: update.order_num } : el;
          });
        }
        updatedElements = filteredElements;
        if (selectedElementId === entry.elementId) {
          updatedSelectedElementId = null;
          updatedSelectedElementProps = {};
        }
        break;
      }

      case "ungroup": {
        // 그룹 복원 + 자식들 그룹 안으로 (중복 방지)
        const elementsToRestore: Element[] = [];
        const existingIdsForUngroup = new Set(elements.map(el => el.id));
        if (entry.data.element && !existingIdsForUngroup.has(entry.data.element.id)) {
          elementsToRestore.push(cloneForHistory(entry.data.element));
        }
        let restoredElements = [...elements, ...elementsToRestore];
        if (entry.data.elements) {
          const childUpdates = new Map<string, { order_num: number }>();
          entry.data.elements.forEach((prevChild: Element) => {
            childUpdates.set(prevChild.id, { order_num: prevChild.order_num || 0 });
          });
          restoredElements = restoredElements.map((el) => {
            const update = childUpdates.get(el.id);
            return update ? { ...el, parent_id: entry.elementId, order_num: update.order_num } : el;
          });
        }
        updatedElements = restoredElements;
        break;
      }
    }
  } else {
    // Redo 방향
    switch (entry.type) {
      case "add": {
        // 요소 추가 (중복 방지)
        const existingIdsForAdd = new Set(elements.map(el => el.id));
        const elementsToAdd: Element[] = [];
        if (entry.data.element && !existingIdsForAdd.has(entry.data.element.id)) {
          elementsToAdd.push(cloneForHistory(entry.data.element));
          existingIdsForAdd.add(entry.data.element.id);
        }
        if (entry.data.childElements?.length) {
          for (const child of entry.data.childElements) {
            if (!existingIdsForAdd.has(child.id)) {
              elementsToAdd.push(cloneForHistory(child));
              existingIdsForAdd.add(child.id);
            }
          }
        }
        updatedElements = [...elements, ...elementsToAdd];
        break;
      }

      case "update": {
        const propsToUpdate = entry.data.props ? cloneForHistory(entry.data.props) : null;
        const elementIndex = elements.findIndex((el) => el.id === entry.elementId);
        if (elementIndex >= 0 && propsToUpdate) {
          updatedElements = elements.map((el, i) =>
            i === elementIndex ? { ...el, props: { ...el.props, ...propsToUpdate } } : el
          );
        }
        break;
      }

      case "remove": {
        const elementIdsToRemove = [entry.elementId];
        if (entry.data.childElements?.length) {
          elementIdsToRemove.push(...entry.data.childElements.map((child: Element) => child.id));
        }
        updatedElements = elements.filter((el) => !elementIdsToRemove.includes(el.id));
        if (elementIdsToRemove.includes(selectedElementId || "")) {
          updatedSelectedElementId = null;
          updatedSelectedElementProps = {};
        }
        break;
      }

      case "batch": {
        if (entry.data.batchUpdates) {
          const updateMap = new Map<string, ComponentElementProps>();
          entry.data.batchUpdates.forEach((update: { elementId: string; newProps: ComponentElementProps }) => {
            updateMap.set(update.elementId, update.newProps);
          });
          updatedElements = elements.map((el) => {
            const newPropsForEl = updateMap.get(el.id);
            return newPropsForEl ? { ...el, props: { ...el.props, ...newPropsForEl } } : el;
          });
          const selectedNewProps = updateMap.get(selectedElementId || "");
          if (selectedNewProps) {
            const selectedEl = updatedElements.find((el) => el.id === selectedElementId);
            if (selectedEl) {
              updatedSelectedElementProps = createCompleteProps(
                selectedEl,
                { ...selectedEl.props, ...selectedNewProps }
              );
            }
          }
        }
        break;
      }

      case "group": {
        // 그룹 요소 추가 (중복 방지)
        const existingIdsForGroup = new Set(elements.map(el => el.id));
        const elementsToAdd: Element[] = [];
        if (entry.data.element && !existingIdsForGroup.has(entry.data.element.id)) {
          elementsToAdd.push(cloneForHistory(entry.data.element));
        }
        let newElements = [...elements, ...elementsToAdd];
        if (entry.data.elements) {
          const childUpdates = new Map<string, { order_num: number }>();
          entry.data.elements.forEach((prevChild: Element) => {
            childUpdates.set(prevChild.id, { order_num: prevChild.order_num || 0 });
          });
          newElements = newElements.map((el) => {
            const update = childUpdates.get(el.id);
            return update ? { ...el, parent_id: entry.elementId, order_num: update.order_num } : el;
          });
        }
        updatedElements = newElements;
        break;
      }

      case "ungroup": {
        let filteredElements = elements.filter((el) => el.id !== entry.elementId);
        if (entry.data.elements) {
          const childUpdates = new Map<string, { parent_id: string | null; order_num: number }>();
          entry.data.elements.forEach((prevChild: Element) => {
            childUpdates.set(prevChild.id, {
              parent_id: prevChild.parent_id ?? null,
              order_num: prevChild.order_num || 0,
            });
          });
          filteredElements = filteredElements.map((el) => {
            const update = childUpdates.get(el.id);
            return update ? { ...el, parent_id: update.parent_id, order_num: update.order_num } : el;
          });
        }
        updatedElements = filteredElements;
        if (selectedElementId === entry.elementId) {
          updatedSelectedElementId = null;
          updatedSelectedElementProps = {};
        }
        break;
      }
    }
  }

  return {
    elements: updatedElements,
    selectedElementId: updatedSelectedElementId,
    selectedElementProps: updatedSelectedElementProps,
  };
}

/**
 * 마지막 상태를 기준으로 데이터베이스 동기화 (배치)
 */
async function syncDatabaseForEntries(
  entries: ReturnType<typeof historyManager.undo>[],
  direction: 'undo' | 'redo',
  get: GetState
): Promise<void> {
  // 마지막 엔트리의 최종 상태만 DB에 동기화
  // 모든 중간 엔트리를 개별적으로 동기화하는 대신
  // 최종 elements 상태가 이미 메모리에 적용되어 있으므로
  // 변경된 요소들만 DB에 업데이트

  const db = await getDB();
  const elementsMap = get().elementsMap;

  // 영향받은 요소 ID 수집
  const affectedElementIds = new Set<string>();
  const removedElementIds = new Set<string>();

  for (const entry of entries) {
    if (!entry) continue;

    if (direction === 'undo') {
      switch (entry.type) {
        case "add":
          removedElementIds.add(entry.elementId);
          entry.data.childElements?.forEach((child: Element) => removedElementIds.add(child.id));
          break;
        case "update":
        case "batch":
          affectedElementIds.add(entry.elementId);
          entry.elementIds?.forEach(id => affectedElementIds.add(id));
          entry.data.batchUpdates?.forEach((u: { elementId: string }) => affectedElementIds.add(u.elementId));
          break;
        case "remove":
          affectedElementIds.add(entry.elementId);
          entry.data.childElements?.forEach((child: Element) => affectedElementIds.add(child.id));
          break;
        case "group":
          removedElementIds.add(entry.elementId);
          entry.data.elements?.forEach((el: Element) => affectedElementIds.add(el.id));
          break;
        case "ungroup":
          affectedElementIds.add(entry.elementId);
          entry.data.elements?.forEach((el: Element) => affectedElementIds.add(el.id));
          break;
      }
    } else {
      switch (entry.type) {
        case "add":
          affectedElementIds.add(entry.elementId);
          entry.data.childElements?.forEach((child: Element) => affectedElementIds.add(child.id));
          break;
        case "update":
        case "batch":
          affectedElementIds.add(entry.elementId);
          entry.elementIds?.forEach(id => affectedElementIds.add(id));
          entry.data.batchUpdates?.forEach((u: { elementId: string }) => affectedElementIds.add(u.elementId));
          break;
        case "remove":
          removedElementIds.add(entry.elementId);
          entry.data.childElements?.forEach((child: Element) => removedElementIds.add(child.id));
          break;
        case "group":
          affectedElementIds.add(entry.elementId);
          entry.data.elements?.forEach((el: Element) => affectedElementIds.add(el.id));
          break;
        case "ungroup":
          removedElementIds.add(entry.elementId);
          entry.data.elements?.forEach((el: Element) => affectedElementIds.add(el.id));
          break;
      }
    }
  }

  try {
    // 삭제된 요소 처리
    if (removedElementIds.size > 0) {
      await db.elements.deleteMany([...removedElementIds]);
      try {
        await supabase.from("elements").delete().in("id", [...removedElementIds]);
      } catch {
        // 로컬 전용 프로젝트 - Supabase 동기화 건너뜀
      }
    }

    // 업데이트/추가된 요소 처리
    const elementsToUpsert: Element[] = [];
    for (const id of affectedElementIds) {
      if (removedElementIds.has(id)) continue;
      const element = getElementById(elementsMap, id);
      if (element) {
        elementsToUpsert.push(element);
      }
    }

    if (elementsToUpsert.length > 0) {
      // IndexedDB 업데이트
      for (const el of elementsToUpsert) {
        await db.elements.put(sanitizeElement(el));
      }

      // Supabase 업데이트 (로컬 전용 프로젝트에서는 skip)
      const pageId = elementsToUpsert[0]?.page_id;
      if (pageId) {
        try {
          const { data: pageExists, error: pageError } = await supabase
            .from("pages")
            .select("id")
            .eq("id", pageId)
            .single();

          if (!pageError && pageExists) {
            const sanitizedElements = elementsToUpsert.map((el) => sanitizeElementForSupabase(el));
            await supabase.from("elements").upsert(sanitizedElements, { onConflict: 'id' });
          }
        } catch {
          // 로컬 전용 프로젝트 - Supabase 동기화 건너뜀
        }
      }
    }

    console.log(`✅ GoToHistoryIndex DB 동기화 완료: ${removedElementIds.size}개 삭제, ${elementsToUpsert.length}개 업데이트`);
  } catch (error) {
    console.warn("⚠️ GoToHistoryIndex DB 동기화 실패:", error);
  }
}
