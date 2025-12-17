// 🚀 Phase 1: Immer 제거 - 함수형 업데이트로 전환
// import { produce } from "immer"; // REMOVED
import type { StateCreator } from "zustand";
import { Element } from "../../../types/core/store.types";
import { historyManager } from "../history";
import { getDB } from "../../../lib/db";
import { getElementById } from "./elementHelpers";
import { reorderElements } from "./elementReorder";
import type { ElementsState } from "../elements";

type SetState = Parameters<StateCreator<ElementsState>>[0];
type GetState = Parameters<StateCreator<ElementsState>>[1];

/**
 * RemoveElement 액션 생성 팩토리
 *
 * Zustand의 set/get 함수를 받아서 removeElement 액션 함수를 생성합니다.
 *
 * 특별 처리 사항:
 * - 자식 요소들을 재귀적으로 삭제
 * - Table Column 삭제 시: 연관된 모든 Cell들도 함께 삭제
 * - Table Cell 삭제 시: 해당 Column과 같은 순서의 다른 Cell들도 함께 삭제
 * - Tab/Panel 삭제 시: tabId로 연결된 쌍을 함께 삭제
 * - 컬렉션 아이템 삭제 후 order_num 재정렬 (단, Undo 후에만)
 *
 * @param set - Zustand의 setState 함수
 * @param get - Zustand의 getState 함수
 * @returns removeElement 액션 함수
 */
export const createRemoveElementAction =
  (set: SetState, get: GetState) => async (elementId: string) => {
    console.log("🗑️ removeElement 시작:", { elementId });
    const state = get();
    // produce 외부에서는 elementsMap 사용 가능
    const element = getElementById(state.elementsMap, elementId);
    if (!element) {
      console.log("❌ removeElement: 요소를 찾을 수 없음", { elementId });
      return;
    }
    console.log("🔍 삭제할 요소:", {
      id: element.id,
      tag: element.tag,
      props: element.props,
    });

    // 자식 요소들 찾기 (재귀적으로)
    const findChildren = (parentId: string): Element[] => {
      const children = state.elements.filter((el) => el.parent_id === parentId);
      const allChildren: Element[] = [...children];

      // 각 자식의 자식들도 재귀적으로 찾기
      children.forEach((child) => {
        allChildren.push(...findChildren(child.id));
      });

      return allChildren;
    };

    let childElements = findChildren(elementId);

    // Table Column 삭제 시 특별 처리: 연관된 Cell들도 함께 삭제
    if (element.tag === "Column") {
      const tableElement = state.elements.find((el) => {
        const tableHeader = state.elements.find(
          (header) => header.id === element.parent_id
        );
        return (
          tableHeader && el.id === tableHeader.parent_id && el.tag === "Table"
        );
      });

      if (tableElement) {
        // 같은 Table의 TableBody에서 해당 순서의 Cell들 찾기
        const tableBody = state.elements.find(
          (el) => el.parent_id === tableElement.id && el.tag === "TableBody"
        );
        if (tableBody) {
          const rows = state.elements.filter(
            (el) => el.parent_id === tableBody.id && el.tag === "Row"
          );
          const cellsToRemove = rows.flatMap((row) =>
            state.elements.filter(
              (cell) =>
                cell.parent_id === row.id &&
                cell.tag === "Cell" &&
                cell.order_num === element.order_num
            )
          );

          childElements = [...childElements, ...cellsToRemove];
          console.log(
            `🔗 Column 삭제로 인한 연관 Cell 삭제: ${cellsToRemove.length}개`,
            {
              columnOrder: element.order_num,
              cellIds: cellsToRemove.map((c) => c.id),
            }
          );
        }
      }
    }

    // Table Cell 삭제 시 특별 처리: 대응하는 Column도 함께 삭제
    if (element.tag === "Cell") {
      const row = state.elements.find((el) => el.id === element.parent_id);
      if (row && row.tag === "Row") {
        const tableBody = state.elements.find((el) => el.id === row.parent_id);
        if (tableBody && tableBody.tag === "TableBody") {
          const tableElement = state.elements.find(
            (el) => el.id === tableBody.parent_id && el.tag === "Table"
          );
          if (tableElement) {
            // 같은 Table의 TableHeader에서 해당 순서의 Column 찾기
            const tableHeader = state.elements.find(
              (el) =>
                el.parent_id === tableElement.id && el.tag === "TableHeader"
            );
            if (tableHeader) {
              const columnToRemove = state.elements.find(
                (col) =>
                  col.parent_id === tableHeader.id &&
                  col.tag === "Column" &&
                  col.order_num === element.order_num
              );

              if (columnToRemove) {
                // 같은 order_num을 가진 다른 Row들의 Cell들도 함께 삭제
                const allRows = state.elements.filter(
                  (el) => el.parent_id === tableBody.id && el.tag === "Row"
                );
                const otherCellsToRemove = allRows.flatMap((r) =>
                  state.elements.filter(
                    (cell) =>
                      cell.parent_id === r.id &&
                      cell.tag === "Cell" &&
                      cell.order_num === element.order_num &&
                      cell.id !== element.id // 현재 삭제되는 Cell 제외
                  )
                );

                childElements = [
                  ...childElements,
                  columnToRemove,
                  ...otherCellsToRemove,
                ];
                console.log(
                  `🔗 Cell 삭제로 인한 연관 Column 및 다른 Cell 삭제: Column 1개, Cell ${otherCellsToRemove.length}개`,
                  {
                    cellOrder: element.order_num,
                    columnId: columnToRemove.id,
                    otherCellIds: otherCellsToRemove.map((c) => c.id),
                  }
                );
              }
            }
          }
        }
      }
    }

    // Tab 또는 Panel 삭제 시 특별 처리: 연결된 Panel 또는 Tab도 함께 삭제
    if (element.tag === "Tab" || element.tag === "Panel") {
      const tabId = (element.props as { tabId?: string }).tabId;

      console.log(
        `🔍 ${element.tag} 삭제 중 - tabId:`,
        tabId,
        "element.props:",
        element.props
      );

      if (tabId) {
        // Tab을 삭제할 때는 연결된 Panel을 찾아서 삭제
        // Panel을 삭제할 때는 연결된 Tab을 찾아서 삭제
        const parentElement = state.elements.find(
          (el) => el.id === element.parent_id
        );

        console.log(`🔍 부모 요소:`, parentElement?.tag, parentElement?.id);

        if (parentElement && parentElement.tag === "Tabs") {
          // 같은 부모 아래의 모든 Tab/Panel 요소들 확인
          const siblingElements = state.elements.filter(
            (el) => el.parent_id === parentElement.id
          );
          console.log(
            `🔍 형제 요소들:`,
            siblingElements.map((el) => ({
              id: el.id,
              tag: el.tag,
              tabId: (el.props as { tabId?: string }).tabId,
            }))
          );

          const relatedElement = state.elements.find(
            (el) =>
              el.parent_id === parentElement.id &&
              el.tag !== element.tag && // 다른 타입(Tab <-> Panel)
              (el.props as { tabId?: string }).tabId === tabId // 같은 tabId를 가진 요소
          );

          console.log(
            `🔍 연관 요소 찾기 결과:`,
            relatedElement
              ? {
                  id: relatedElement.id,
                  tag: relatedElement.tag,
                  tabId: (relatedElement.props as { tabId?: string }).tabId,
                }
              : "null"
          );

          if (relatedElement) {
            childElements = [...childElements, relatedElement];
            console.log(
              `🔗 ${element.tag} 삭제로 인한 연관 ${relatedElement.tag} 삭제:`,
              {
                tabId,
                deletedElementId: element.id,
                relatedElementId: relatedElement.id,
              }
            );
          } else {
            // tabId가 없는 경우 order_num을 기반으로 연관 요소 찾기 (fallback)
            console.log(
              `⚠️ tabId 기반 연관 요소를 찾을 수 없음. order_num 기반으로 fallback 시도`
            );

            const fallbackRelatedElement = state.elements.find(
              (el) =>
                el.parent_id === parentElement.id &&
                el.tag !== element.tag && // 다른 타입(Tab <-> Panel)
                Math.abs((el.order_num || 0) - (element.order_num || 0)) === 1 // 인접한 order_num
            );

            if (fallbackRelatedElement) {
              childElements = [...childElements, fallbackRelatedElement];
              console.log(
                `🔗 ${element.tag} 삭제로 인한 연관 ${fallbackRelatedElement.tag} 삭제 (order_num 기반):`,
                {
                  deletedElementOrder: element.order_num,
                  relatedElementOrder: fallbackRelatedElement.order_num,
                  deletedElementId: element.id,
                  relatedElementId: fallbackRelatedElement.id,
                }
              );
            }
          }
        }
      } else {
        // tabId가 없는 경우 order_num을 기반으로 연관 요소 찾기
        console.log(
          `⚠️ ${element.tag}에 tabId가 없음. order_num 기반으로 연관 요소 찾기 시도`
        );

        const parentElement = state.elements.find(
          (el) => el.id === element.parent_id
        );

        if (parentElement && parentElement.tag === "Tabs") {
          const relatedElement = state.elements.find(
            (el) =>
              el.parent_id === parentElement.id &&
              el.tag !== element.tag && // 다른 타입(Tab <-> Panel)
              Math.abs((el.order_num || 0) - (element.order_num || 0)) === 1 // 인접한 order_num
          );

          if (relatedElement) {
            childElements = [...childElements, relatedElement];
            console.log(
              `🔗 ${element.tag} 삭제로 인한 연관 ${relatedElement.tag} 삭제 (order_num 기반, tabId 없음):`,
              {
                deletedElementOrder: element.order_num,
                relatedElementOrder: relatedElement.order_num,
                deletedElementId: element.id,
                relatedElementId: relatedElement.id,
              }
            );
          }
        }
      }
    }

    const allElementsToRemove = [element, ...childElements];

    // 중복 제거 (같은 요소가 여러 번 포함될 수 있음)
    const uniqueElementsToRemove = allElementsToRemove.filter(
      (item, index, arr) => arr.findIndex((el) => el.id === item.id) === index
    );
    const elementIdsToRemove = uniqueElementsToRemove.map((el) => el.id);

    console.log(
      `🗑️ 요소 삭제: ${elementId}와 연관 요소 ${
        uniqueElementsToRemove.length - 1
      }개`,
      {
        parent: element.tag,
        relatedElements: uniqueElementsToRemove
          .slice(1)
          .map((child) => ({ id: child.id, tag: child.tag })),
      }
    );

    try {
      // IndexedDB에서 모든 요소 삭제 (빠름! 1-5ms × N)
      const db = await getDB();
      await db.elements.deleteMany(elementIdsToRemove);
      console.log("✅ [IndexedDB] 요소 삭제 완료:", elementIdsToRemove);
    } catch (error) {
      console.error("❌ [IndexedDB] 요소 삭제 중 오류:", error);
      // IndexedDB 삭제 실패해도 메모리에서는 삭제 진행
    }

    // 🚀 Phase 1: Immer → 함수형 업데이트
    const currentState = get();

    // 히스토리 추가 (부모 요소와 모든 자식 요소들 정보 저장)
    if (currentState.currentPageId) {
      historyManager.addEntry({
        type: "remove",
        elementId: elementId,
        data: {
          element: { ...element },
          childElements: uniqueElementsToRemove
            .slice(1)
            .map((child) => ({ ...child })), // 첫 번째는 부모 요소이므로 제외
        },
      });
    }

    // 삭제 전 요소 개수 확인
    const beforeCount = currentState.elements.length;
    console.log("🔢 삭제 전 요소 개수:", beforeCount);
    console.log("🗑️ 삭제할 요소 ID들:", elementIdsToRemove);

    // Tab/Panel 삭제 시 추가 디버깅 정보
    elementIdsToRemove.forEach((id) => {
      const el = currentState.elements.find((e) => e.id === id);
      if (el && (el.tag === "Tab" || el.tag === "Panel")) {
        console.log(`🏷️ 삭제될 ${el.tag}:`, {
          id: el.id,
          tag: el.tag,
          tabId: (el.props as { tabId?: string }).tabId,
          title: (el.props as { title?: string }).title,
          order_num: el.order_num,
        });
      }
    });

    // 모든 요소 제거 (불변 업데이트)
    const filteredElements = currentState.elements.filter(
      (el) => !elementIdsToRemove.includes(el.id)
    );

    // 삭제 후 요소 개수 확인
    const afterCount = filteredElements.length;
    console.log(
      "🔢 삭제 후 요소 개수:",
      afterCount,
      "(삭제된 개수:",
      beforeCount - afterCount,
      ")"
    );

    // 선택된 요소가 제거된 경우 선택 해제
    const isSelectedRemoved = elementIdsToRemove.includes(currentState.selectedElementId || "");

    set({
      elements: filteredElements,
      ...(isSelectedRemoved && {
        selectedElementId: null,
        selectedElementProps: {},
      }),
    });

    // postMessage로 iframe에 전달
    if (typeof window !== "undefined" && window.parent) {
      window.parent.postMessage(
        {
          type: "ELEMENT_REMOVED",
          payload: { elementId: elementIdsToRemove },
        },
        "*"
      );
    }

    // 🔧 CRITICAL: elementsMap 재구축 (요소 삭제 후 캐시 업데이트)
    get()._rebuildIndexes();

    // order_num 재정렬 (삭제 후) - 컬렉션 아이템 삭제의 경우 Undo 후에만 재정렬
    const currentPageId = get().currentPageId;
    if (currentPageId) {
      // 컬렉션 컴포넌트의 아이템들 확인
      const isCollectionItem =
        element.tag === "Tab" ||
        element.tag === "Panel" ||
        element.tag === "ListBoxItem" ||
        element.tag === "GridListItem" ||
        element.tag === "MenuItem" ||
        element.tag === "ComboBoxItem" ||
        element.tag === "SelectItem" ||
        element.tag === "TreeItem" ||
        element.tag === "ToggleButton";

      if (isCollectionItem) {
        console.log(`⏸️ ${element.tag} 삭제 - Undo 후까지 재정렬 지연`);
        // 컬렉션 아이템 삭제 시에는 즉시 재정렬하지 않음 (Undo 후에만 재정렬)
        // 이렇게 하면 삭제 → Undo 과정에서 순서 변경이 한 번만 보임
      } else {
        setTimeout(() => {
          const { elements, updateElementOrder } = get();
          reorderElements(elements, currentPageId, updateElementOrder);
        }, 100); // 일반 요소는 기존처럼 재정렬
      }
    }
  };
