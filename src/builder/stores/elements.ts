import { create } from "zustand";
import { produce } from "immer";
import { StateCreator } from "zustand";
import { Element, ComponentElementProps } from "../../types/core/store.types";
import { historyManager } from "./history";
import { reorderElements } from "./utils/elementReorder";
import {
  findElementById,
  createCompleteProps,
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
} from "./utils/elementUpdate";
import { ElementUtils } from "../../utils/element/elementUtils";
import { elementsApi } from "../../services/api";

interface Page {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  order_num?: number;
}

export interface ElementsState {
  elements: Element[];
  // 성능 최적화: O(1) 조회를 위한 Map 인덱스
  elementsMap: Map<string, Element>;
  childrenMap: Map<string, Element[]>;
  selectedElementId: string | null;
  selectedElementProps: ComponentElementProps;
  selectedTab: { parentId: string; tabIndex: number } | null;
  pages: Page[];
  currentPageId: string | null;
  historyOperationInProgress: boolean;

  // 내부 헬퍼: 인덱스 재구축
  _rebuildIndexes: () => void;

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

  // 인덱스 재구축 함수
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

    set({ elementsMap, childrenMap });
  };

  return {
    elements: [],
    elementsMap: new Map(),
    childrenMap: new Map(),
    selectedElementId: null,
    selectedElementProps: {},
    selectedTab: null,
    pages: [],
    currentPageId: null,
    historyOperationInProgress: false,

    _rebuildIndexes,

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
      produce((state: ElementsState) => {
        state.selectedElementId = elementId;

        if (elementId && props) {
          state.selectedElementProps = {
            ...props,
            ...(style ? { style } : {}),
            ...(computedStyle ? { computedStyle } : {}),
          };
        } else if (elementId) {
          // 최적화: Map 사용 (O(1) 조회)
          const element = state.elementsMap.get(elementId);
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
  };
};

// 기존 호환성을 위한 useStore export
export const useStore = create<ElementsState>(createElementsSlice);
