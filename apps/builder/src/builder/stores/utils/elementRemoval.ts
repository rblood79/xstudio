// 🚀 Phase 1: Immer 제거 - 함수형 업데이트로 전환
// import { produce } from "immer"; // REMOVED
import type { StateCreator } from "zustand";
import { Element } from "../../../types/core/store.types";
import { historyManager } from "../history";
import { getDB } from "../../../lib/db";
import { getElementById } from "./elementHelpers";
import { reorderElements } from "./elementReorder";
import type { ElementsState } from "../elements";
import {
  rebuildPageIndex,
  rebuildComponentIndex,
  rebuildVariableUsageIndex,
} from "./elementIndexer";
// 🚀 Phase 11: Feature Flags for WebGL-only mode
import { isWebGLCanvas, isCanvasCompareMode } from "../../../utils/featureFlags";
// 🚀 Skia 레지스트리 동기화 — React useEffect cleanup 지연 문제 해결
import { unregisterSkiaNode } from "../../workspace/canvas/skia/useSkiaNode";

type SetState = Parameters<StateCreator<ElementsState>>[0];
type GetState = Parameters<StateCreator<ElementsState>>[1];

const COLLECTION_ITEM_TAGS = new Set([
  "Tab", "Panel", "ListBoxItem", "GridListItem",
  "MenuItem", "ComboBoxItem", "SelectItem", "TreeItem", "ToggleButton",
]);

/**
 * 단일 요소에 대해 삭제해야 할 모든 연관 요소를 수집하는 헬퍼
 * (자식, Table Column/Cell, Tab/Panel 연결 등)
 *
 * @returns 중복 제거된 삭제 대상 요소 배열 (루트 요소 포함)
 *          또는 삭제 불가(Body, 미존재)인 경우 null
 */
function collectElementsToRemove(
  elementId: string,
  elements: Element[],
  elementsMap: Map<string, Element>,
): { rootElement: Element; allElements: Element[] } | null {
  const element = getElementById(elementsMap, elementId);
  if (!element) return null;
  if (element.tag.toLowerCase() === 'body') return null;

  // 자식 요소들 찾기 (재귀적으로)
  const findChildren = (parentId: string): Element[] => {
    const children = elements.filter((el) => el.parent_id === parentId);
    const allChildren: Element[] = [...children];
    children.forEach((child) => {
      allChildren.push(...findChildren(child.id));
    });
    return allChildren;
  };

  let childElements = findChildren(elementId);

  // Table Column 삭제 시 특별 처리: 연관된 Cell들도 함께 삭제
  if (element.tag === "Column") {
    const tableElement = elements.find((el) => {
      const tableHeader = elements.find(
        (header) => header.id === element.parent_id
      );
      return (
        tableHeader && el.id === tableHeader.parent_id && el.tag === "Table"
      );
    });

    if (tableElement) {
      const tableBody = elements.find(
        (el) => el.parent_id === tableElement.id && el.tag === "TableBody"
      );
      if (tableBody) {
        const rows = elements.filter(
          (el) => el.parent_id === tableBody.id && el.tag === "Row"
        );
        const cellsToRemove = rows.flatMap((row) =>
          elements.filter(
            (cell) =>
              cell.parent_id === row.id &&
              cell.tag === "Cell" &&
              cell.order_num === element.order_num
          )
        );
        childElements = [...childElements, ...cellsToRemove];
      }
    }
  }

  // Table Cell 삭제 시 특별 처리: 대응하는 Column도 함께 삭제
  if (element.tag === "Cell") {
    const row = elements.find((el) => el.id === element.parent_id);
    if (row && row.tag === "Row") {
      const tableBody = elements.find((el) => el.id === row.parent_id);
      if (tableBody && tableBody.tag === "TableBody") {
        const tableElement = elements.find(
          (el) => el.id === tableBody.parent_id && el.tag === "Table"
        );
        if (tableElement) {
          const tableHeader = elements.find(
            (el) =>
              el.parent_id === tableElement.id && el.tag === "TableHeader"
          );
          if (tableHeader) {
            const columnToRemove = elements.find(
              (col) =>
                col.parent_id === tableHeader.id &&
                col.tag === "Column" &&
                col.order_num === element.order_num
            );
            if (columnToRemove) {
              const allRows = elements.filter(
                (el) => el.parent_id === tableBody.id && el.tag === "Row"
              );
              const otherCellsToRemove = allRows.flatMap((r) =>
                elements.filter(
                  (cell) =>
                    cell.parent_id === r.id &&
                    cell.tag === "Cell" &&
                    cell.order_num === element.order_num &&
                    cell.id !== element.id
                )
              );
              childElements = [
                ...childElements,
                columnToRemove,
                ...otherCellsToRemove,
              ];
            }
          }
        }
      }
    }
  }

  // Tab 또는 Panel 삭제 시 특별 처리: 연결된 Panel 또는 Tab도 함께 삭제
  if (element.tag === "Tab" || element.tag === "Panel") {
    const tabId = (element.props as { tabId?: string }).tabId;
    const parentElement = elements.find((el) => el.id === element.parent_id);

    if (parentElement && parentElement.tag === "Tabs") {
      let relatedElement: Element | undefined;

      if (tabId) {
        relatedElement = elements.find(
          (el) =>
            el.parent_id === parentElement.id &&
            el.tag !== element.tag &&
            (el.props as { tabId?: string }).tabId === tabId
        );
      }

      // fallback: order_num 기반
      if (!relatedElement) {
        relatedElement = elements.find(
          (el) =>
            el.parent_id === parentElement.id &&
            el.tag !== element.tag &&
            Math.abs((el.order_num || 0) - (element.order_num || 0)) === 1
        );
      }

      if (relatedElement) {
        childElements = [...childElements, relatedElement];
      }
    }
  }

  const allElementsToRemove = [element, ...childElements];

  // 중복 제거
  const seen = new Set<string>();
  const uniqueElements = allElementsToRemove.filter((el) => {
    if (seen.has(el.id)) return false;
    seen.add(el.id);
    return true;
  });

  return { rootElement: element, allElements: uniqueElements };
}

/**
 * 공통 삭제 실행 로직: DB 삭제 + 히스토리 기록 + Skia 정리 + 원자적 set() + postMessage + 재정렬
 */
async function executeRemoval(
  set: SetState,
  get: GetState,
  rootElements: Element[],
  allUniqueElements: Element[],
) {
  const elementIdsToRemove = allUniqueElements.map((el) => el.id);

  console.log(`🗑️ 배치 삭제: ${rootElements.length}개 루트, 총 ${allUniqueElements.length}개 요소`);

  // IndexedDB 삭제
  try {
    const db = await getDB();
    await db.elements.deleteMany(elementIdsToRemove);
  } catch (error) {
    console.error("❌ [IndexedDB] 요소 삭제 중 오류:", error);
  }

  const currentState = get();

  // 히스토리: 첫 번째 루트를 대표 elementId로, 나머지 모두를 childElements로 기록
  if (currentState.currentPageId) {
    historyManager.addEntry({
      type: "remove",
      elementId: rootElements[0].id,
      data: {
        element: { ...rootElements[0] },
        childElements: allUniqueElements
          .filter((el) => el.id !== rootElements[0].id)
          .map((child) => ({ ...child })),
      },
    });
  }

  // 요소 필터링
  const removeSet = new Set(elementIdsToRemove);
  const filteredElements = currentState.elements.filter(
    (el) => !removeSet.has(el.id)
  );

  // 선택 상태 정리
  const isSelectedRemoved = removeSet.has(currentState.selectedElementId || "");
  const filteredSelectedIds = currentState.selectedElementIds.filter(
    (id: string) => !removeSet.has(id)
  );
  const hasSelectedIdsChanged = filteredSelectedIds.length !== currentState.selectedElementIds.length;
  const isEditingContextRemoved = currentState.editingContextId != null &&
    removeSet.has(currentState.editingContextId);

  // Skia 레지스트리 즉시 정리
  for (const id of elementIdsToRemove) {
    unregisterSkiaNode(id);
  }

  // 원자적 상태 업데이트: elements + 모든 인덱스를 단일 set()으로
  const newElementsMap = new Map<string, Element>();
  const newChildrenMap = new Map<string, Element[]>();
  filteredElements.forEach((el) => {
    newElementsMap.set(el.id, el);
    const parentId = el.parent_id || 'root';
    if (!newChildrenMap.has(parentId)) {
      newChildrenMap.set(parentId, []);
    }
    newChildrenMap.get(parentId)!.push(el);
  });

  set({
    elements: filteredElements,
    elementsMap: newElementsMap,
    childrenMap: newChildrenMap,
    pageIndex: rebuildPageIndex(filteredElements, newElementsMap),
    componentIndex: rebuildComponentIndex(filteredElements),
    variableUsageIndex: rebuildVariableUsageIndex(filteredElements),
    ...(isSelectedRemoved && {
      selectedElementId: null,
      selectedElementProps: {},
    }),
    ...(hasSelectedIdsChanged && {
      selectedElementIds: filteredSelectedIds,
      selectedElementIdsSet: new Set(filteredSelectedIds),
    }),
    ...(isEditingContextRemoved && {
      editingContextId: null,
    }),
  });

  // postMessage
  const isWebGLOnly = isWebGLCanvas() && !isCanvasCompareMode();
  if (!isWebGLOnly && typeof window !== "undefined" && window.parent) {
    window.parent.postMessage(
      { type: "ELEMENT_REMOVED", payload: { elementId: elementIdsToRemove } },
      "*"
    );
  }

  // order_num 재정렬
  const currentPageId = get().currentPageId;
  if (currentPageId) {
    const hasCollectionItem = rootElements.some((el) => COLLECTION_ITEM_TAGS.has(el.tag));
    if (!hasCollectionItem) {
      setTimeout(() => {
        const { elements, batchUpdateElementOrders } = get();
        reorderElements(elements, currentPageId, batchUpdateElementOrders);
      }, 100);
    }
  }
}

/**
 * RemoveElement 액션 생성 팩토리 (단일 요소 삭제)
 */
export const createRemoveElementAction =
  (set: SetState, get: GetState) => async (elementId: string) => {
    const state = get();
    const result = collectElementsToRemove(elementId, state.elements, state.elementsMap);
    if (!result) {
      if (import.meta.env.DEV) {
        console.debug("⚠️ removeElement: 삭제 불가 (미존재 또는 Body)", { elementId });
      }
      return;
    }
    await executeRemoval(set, get, [result.rootElement], result.allElements);
  };

/**
 * RemoveElements 배치 삭제 액션 생성 팩토리 (다중 요소 동시 삭제)
 * 모든 요소를 단일 set()으로 제거하여 화면에서 동시에 사라짐
 */
export const createRemoveElementsAction =
  (set: SetState, get: GetState) => async (elementIds: string[]) => {
    if (elementIds.length === 0) return;

    // 단일 요소면 기존 경로 사용
    if (elementIds.length === 1) {
      const removeElement = createRemoveElementAction(set, get);
      return removeElement(elementIds[0]);
    }

    const state = get();
    const rootElements: Element[] = [];
    const allElementsMap = new Map<string, Element>();

    // 각 요소에 대해 삭제 대상 수집
    for (const id of elementIds) {
      const result = collectElementsToRemove(id, state.elements, state.elementsMap);
      if (!result) continue;

      rootElements.push(result.rootElement);
      for (const el of result.allElements) {
        allElementsMap.set(el.id, el);
      }
    }

    if (rootElements.length === 0) return;

    const allUniqueElements = Array.from(allElementsMap.values());
    await executeRemoval(set, get, rootElements, allUniqueElements);
  };
