import { useMemo } from "react";
import { create } from "zustand";
import { produce } from "immer";
import { StateCreator } from "zustand";
import { Element, ComponentElementProps } from "../../types/core/store.types";
import { historyManager } from "./history";
import { reorderElements } from "./utils/elementReorder";
import {
  createCompleteProps,
  findElementById,
} from "./utils/elementHelpers";
import { createUndoAction, createRedoAction } from "./history/historyActions";
import { createRemoveElementAction } from "./utils/elementRemoval";
import {
  createAddElementAction,
  createAddComplexElementAction,
} from "./utils/elementCreation";
import {
  createUpdateElementPropsAction,
  createUpdateElementAction,
  createBatchUpdateElementPropsAction,
  createBatchUpdateElementsAction,
  type BatchElementUpdate,
  type BatchPropsUpdate,
} from "./utils/elementUpdate";
import { ElementUtils } from "../../utils/element/elementUtils";
import { elementsApi } from "../../services/api";
import {
  type PageElementIndex,
  createEmptyPageIndex,
  rebuildPageIndex,
  getPageElements as getPageElementsFromIndex,
} from "./utils/elementIndexer";

interface Page {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  order_num?: number;
  project_id?: string;
  layout_id?: string | null;
}

export interface ElementsState {
  elements: Element[];
  // 성능 최적화: O(1) 조회를 위한 Map 인덱스
  elementsMap: Map<string, Element>;
  childrenMap: Map<string, Element[]>;
  // 🆕 Phase 2: 페이지별 인덱스 (O(1) 페이지 요소 조회)
  pageIndex: PageElementIndex;
  selectedElementId: string | null;
  selectedElementProps: ComponentElementProps;
  selectedTab: { parentId: string; tabIndex: number } | null;
  pages: Page[];
  currentPageId: string | null;
  historyOperationInProgress: boolean;
  // ⭐ Multi-select state
  selectedElementIds: string[];
  multiSelectMode: boolean;

  // 내부 헬퍼: 인덱스 재구축
  _rebuildIndexes: () => void;

  // 🆕 Phase 2: O(1) 페이지 요소 조회
  getPageElements: (pageId: string) => Element[];

  setElements: (elements: Element[]) => void;
  loadPageElements: (elements: Element[], pageId: string) => void;
  addElement: (element: Element) => Promise<void>;
  updateElementProps: (
    elementId: string,
    props: ComponentElementProps
  ) => Promise<void>;
  updateElement: (
    elementId: string,
    updates: Partial<Element>
  ) => Promise<void>;
  setSelectedElement: (
    elementId: string | null,
    props?: ComponentElementProps,
    style?: React.CSSProperties,
    computedStyle?: Partial<React.CSSProperties>
  ) => void;
  selectTabElement: (
    elementId: string,
    props: ComponentElementProps,
    tabIndex: number
  ) => void;
  setPages: (pages: Page[]) => void;
  setCurrentPageId: (pageId: string) => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  removeElement: (elementId: string) => Promise<void>;
  removeTabPair: (elementId: string) => void;
  addComplexElement: (
    parentElement: Element,
    childElements: Element[]
  ) => Promise<void>;
  updateElementOrder: (elementId: string, orderNum: number) => void;

  // 다중 선택 관련 액션
  toggleElementInSelection: (elementId: string) => void;
  setSelectedElements: (elementIds: string[]) => void;

  // 🚀 배치 업데이트 (100+ 요소 최적화)
  batchUpdateElementProps: (updates: BatchPropsUpdate[]) => Promise<void>;
  batchUpdateElements: (updates: BatchElementUpdate[]) => Promise<void>;
}

export const createElementsSlice: StateCreator<ElementsState> = (set, get) => {
  // undo/redo 함수 생성
  const undo = createUndoAction(set, get);
  const redo = createRedoAction(set, get);

  // removeElement 함수 생성
  const removeElement = createRemoveElementAction(set, get);

  // addElement/addComplexElement 함수 생성
  const addElement = createAddElementAction(set, get);
  const addComplexElement = createAddComplexElementAction(set, get);

  // updateElementProps/updateElement 함수 생성
  const updateElementProps = createUpdateElementPropsAction(set, get);
  const updateElement = createUpdateElementAction(set, get);

  // 🚀 배치 업데이트 함수 생성 (100+ 요소 최적화)
  const batchUpdateElementProps = createBatchUpdateElementPropsAction(set, get);
  const batchUpdateElements = createBatchUpdateElementsAction(set, get);

  // 인덱스 재구축 함수 (Phase 2: 페이지 인덱스 포함)
  const _rebuildIndexes = () => {
    const { elements } = get();
    const elementsMap = new Map<string, Element>();
    const childrenMap = new Map<string, Element[]>();

    elements.forEach((el) => {
      // elementsMap: id -> Element
      elementsMap.set(el.id, el);

      // childrenMap: parent_id -> Element[]
      const parentId = el.parent_id || 'root';
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(el);
    });

    // 🆕 Phase 2: 페이지 인덱스 재구축
    const pageIndex = rebuildPageIndex(elements, elementsMap);

    set({ elementsMap, childrenMap, pageIndex });
  };

  // 🆕 Phase 2: O(1) 페이지 요소 조회 함수
  const getPageElements = (pageId: string): Element[] => {
    const { pageIndex, elementsMap } = get();
    return getPageElementsFromIndex(pageIndex, pageId, elementsMap);
  };

  return {
    elements: [],
    elementsMap: new Map(),
    childrenMap: new Map(),
    // 🆕 Phase 2: 페이지 인덱스 초기값
    pageIndex: createEmptyPageIndex(),
    selectedElementId: null,
    selectedElementProps: {},
    selectedTab: null,
    pages: [],
    currentPageId: null,
    historyOperationInProgress: false,
    // ⭐ Multi-select state
    selectedElementIds: [],
    multiSelectMode: false,

    _rebuildIndexes,
    getPageElements,

  setElements: (elements) => {
    set(
      produce((state: ElementsState) => {
        state.elements = elements;

        // setElements는 내부 상태 관리용이므로 히스토리 기록하지 않음
        // 실제 요소 변경은 addElement, updateElementProps, removeElement에서 처리
      })
    );
    // 인덱스 자동 재구축
    get()._rebuildIndexes();
  },

  loadPageElements: (elements, pageId) => {
    // orphan 요소들을 body로 마이그레이션
    const { elements: migratedElements, updatedElements } =
      ElementUtils.migrateOrphanElementsToBody(elements, pageId);

    set(
      produce((state: ElementsState) => {
        state.elements = migratedElements;
        state.currentPageId = pageId;

        // 페이지 변경 시 히스토리 초기화
        historyManager.setCurrentPage(pageId);
      })
    );

    // 인덱스 자동 재구축
    get()._rebuildIndexes();

    // 마이그레이션된 요소가 있으면 DB에도 저장 (백그라운드)
    if (updatedElements.length > 0) {
      Promise.all(
        updatedElements.map((el) => elementsApi.updateElement(el.id, el))
      )
        .then(() => {
          console.log(
            `✅ ${updatedElements.length}개 orphan 요소 DB 업데이트 완료`
          );
        })
        .catch((error) => {
          console.warn("⚠️ Orphan 요소 DB 업데이트 실패:", error);
        });
    }

    // 페이지 로드 직후 즉시 order_num 재정렬 (검증보다 먼저 실행)
    setTimeout(() => {
      const { updateElementOrder } = get();
      reorderElements(migratedElements, pageId, updateElementOrder);
    }, 50); // 검증(300ms)보다 빠르게 실행
  },

  // Factory 함수로 생성된 addElement 사용
  addElement,

  // Factory 함수로 생성된 updateElementProps 사용
  updateElementProps,

  // Factory 함수로 생성된 updateElement 사용
  updateElement,

  setSelectedElement: (elementId, props, style, computedStyle) =>
    set(
      produce((state: ElementsState & { selectedElementIds: string[]; multiSelectMode: boolean }) => {
        state.selectedElementId = elementId;

        if (elementId && props) {
          state.selectedElementProps = {
            ...props,
            ...(style ? { style } : {}),
            ...(computedStyle ? { computedStyle } : {}),
          };
        } else if (elementId) {
          // produce 내부에서는 배열 순회 사용 (elementsMap은 produce 외부에서만 사용 가능)
          const element = findElementById(state.elements, elementId);
          if (element) {
            state.selectedElementProps = {
              ...createCompleteProps(element),
              ...(style ? { style } : {}),
              ...(computedStyle ? { computedStyle } : {}),
            };
          }
        } else {
          state.selectedElementProps = {};
        }

        // ⭐ SelectionState와 동기화
        if (elementId) {
          state.selectedElementIds = [elementId];
          state.multiSelectMode = false;
        } else {
          state.selectedElementIds = [];
          state.multiSelectMode = false;
        }
      })
    ),

  selectTabElement: (elementId, props, tabIndex) =>
    set(
      produce((state: ElementsState) => {
        state.selectedElementId = elementId;
        state.selectedElementProps = props;
        state.selectedTab = { parentId: elementId, tabIndex };
      })
    ),

  setPages: (pages) =>
    set(
      produce((state: ElementsState) => {
        state.pages = pages;
      })
    ),

  setCurrentPageId: (pageId) =>
    set(
      produce((state: ElementsState) => {
        state.currentPageId = pageId;
        historyManager.setCurrentPage(pageId);
      })
    ),

  undo,

  redo,

  removeElement,

  removeTabPair: (elementId) =>
    set(
      produce((state: ElementsState) => {
        // Tab과 Panel 쌍 제거
        state.elements = state.elements.filter(
          (el) => el.parent_id !== elementId && el.id !== elementId
        );

        if (state.selectedElementId === elementId) {
          state.selectedElementId = null;
          state.selectedElementProps = {};
        }
      })
    ),

  // Factory 함수로 생성된 addComplexElement 사용
  addComplexElement,

  updateElementOrder: (elementId, orderNum) =>
    set(
      produce((state: ElementsState) => {
        // Immer는 Map을 직접 수정할 수 없으므로 elements 배열에서 찾기
        const element = state.elements.find(el => el.id === elementId);
        if (element) {
          element.order_num = orderNum;
        }
      })
    ),

  // ⭐ 다중 선택: 요소를 선택 목록에서 추가/제거 (토글)
  toggleElementInSelection: (elementId: string) =>
    set(
      produce((state: ElementsState & { selectedElementIds: string[]; multiSelectMode: boolean }) => {
        const isAlreadySelected = state.selectedElementIds.includes(elementId);

        if (isAlreadySelected) {
          // 이미 선택됨 → 제거
          state.selectedElementIds = state.selectedElementIds.filter(id => id !== elementId);

          // 선택이 비어있으면 다중 선택 모드 해제
          if (state.selectedElementIds.length === 0) {
            state.multiSelectMode = false;
            state.selectedElementId = null;
            state.selectedElementProps = {};
          } else {
            // 첫 번째 요소를 primary selection으로 유지
            state.selectedElementId = state.selectedElementIds[0];
            const element = findElementById(state.elements, state.selectedElementIds[0]);
            if (element) {
              state.selectedElementProps = createCompleteProps(element);
            }
          }
        } else {
          // 선택 안 됨 → 추가
          state.selectedElementIds.push(elementId);
          state.multiSelectMode = true;

          // 첫 번째로 추가되는 경우 primary selection 설정
          if (state.selectedElementIds.length === 1) {
            state.selectedElementId = elementId;
            const element = findElementById(state.elements, elementId);
            if (element) {
              state.selectedElementProps = createCompleteProps(element);
            }
          }
        }
      })
    ),

  // ⭐ 다중 선택: 여러 요소를 한 번에 선택 (드래그 선택용)
  setSelectedElements: (elementIds: string[]) =>
    set(
      produce((state: ElementsState & { selectedElementIds: string[]; multiSelectMode: boolean }) => {
        state.selectedElementIds = elementIds;
        state.multiSelectMode = elementIds.length > 1;

        if (elementIds.length > 0) {
          // 첫 번째 요소를 primary selection으로 설정
          state.selectedElementId = elementIds[0];
          const element = findElementById(state.elements, elementIds[0]);
          if (element) {
            state.selectedElementProps = createCompleteProps(element);
          }
        } else {
          // 선택 없음
          state.selectedElementId = null;
          state.selectedElementProps = {};
        }
      })
    ),

  // 🚀 배치 업데이트 (Factory 함수로 생성)
  batchUpdateElementProps,
  batchUpdateElements,
  };
};

// 기존 호환성을 위한 useStore export
export const useStore = create<ElementsState>(createElementsSlice);

// ============================================
// 🚀 Performance Optimized Selectors
// ============================================

// 안정적인 빈 배열 참조 (새 배열 생성 방지)
const EMPTY_ELEMENTS: Element[] = [];

/**
 * 현재 페이지의 요소만 반환하는 선택적 selector
 *
 * 🎯 Phase 2 최적화:
 * - 안정적인 참조: elements 배열이 변경될 때만 재계산
 * - 개별 구독: currentPageId와 elements 분리 구독
 * - 무한 루프 방지: getSnapshot 결과 캐싱
 *
 * @example
 * ```tsx
 * const currentPageElements = useCurrentPageElements();
 * ```
 */
export const useCurrentPageElements = (): Element[] => {
  // 개별 구독으로 무한 루프 방지
  const currentPageId = useStore((state) => state.currentPageId);
  const elements = useStore((state) => state.elements);

  // useMemo로 안정적인 참조 유지 (elements/currentPageId가 변경될 때만 재계산)
  return useMemo(() => {
    if (!currentPageId) return EMPTY_ELEMENTS;
    return elements.filter(el => el.page_id === currentPageId);
  }, [elements, currentPageId]);
};

/**
 * elementsMap을 활용한 O(1) 요소 조회 selector
 *
 * @param elementId - 조회할 요소 ID
 * @returns 요소 또는 undefined
 */
export const useElementById = (elementId: string | null): Element | undefined => {
  return useStore((state) => {
    if (!elementId) return undefined;
    return state.elementsMap.get(elementId);
  });
};

/**
 * childrenMap을 활용한 O(1) 자식 요소 조회 selector
 *
 * @param parentId - 부모 요소 ID (null이면 루트 요소들)
 * @returns 자식 요소 배열
 */
export const useChildElements = (parentId: string | null): Element[] => {
  return useStore((state) => {
    const key = parentId || 'root';
    // 안정적인 빈 배열 참조 반환 (새 배열 생성 방지)
    return state.childrenMap.get(key) ?? EMPTY_ELEMENTS;
  });
};

/**
 * 현재 페이지의 요소 개수만 반환 (가벼운 조회용)
 * 트리 노드 개수 표시 등에 사용
 *
 * 🆕 Phase 2: O(1) 인덱스 기반 카운트
 */
export const useCurrentPageElementCount = (): number => {
  return useStore((state) => {
    const { pageIndex, currentPageId } = state;
    if (!currentPageId) return 0;
    // O(1) 인덱스 기반 카운트
    return pageIndex.elementsByPage.get(currentPageId)?.size ?? 0;
  });
};
