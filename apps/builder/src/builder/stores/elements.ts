import { useMemo } from "react";
import { create } from "zustand";
// 🚀 Phase 1: Immer 제거 - 함수형 업데이트로 전환
// import { produce } from "immer"; // REMOVED
import { StateCreator } from "zustand";
import { Element, ComponentElementProps, ComputedLayout } from "../../types/core/store.types";
import { Page } from "../../types/builder/unified.types";
import { historyManager } from "./history";
import { reorderElements } from "./utils/elementReorder";
import {
  createCompleteProps,
  findElementById,
  computeCanvasElementStyle,
} from "./utils/elementHelpers";
import { createUndoAction, createRedoAction, createGoToHistoryIndexAction } from "./history/historyActions";
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
import { createInstance as createInstanceAction } from "./utils/instanceActions";
import { elementsApi } from "../../services/api";
import { longTaskMonitor } from "../../utils/longTaskMonitor";
import { scheduleCancelableBackgroundTask } from "../utils/scheduleTask";
import {
  type PageElementIndex,
  type ComponentIndex,
  type VariableUsageIndex,
  createEmptyPageIndex,
  createEmptyComponentIndex,
  createEmptyVariableUsageIndex,
  rebuildPageIndex,
  rebuildComponentIndex,
  rebuildVariableUsageIndex,
  getPageElements as getPageElementsFromIndex,
} from "./utils/elementIndexer";

export interface ElementsState {
  elements: Element[];
  // 성능 최적화: O(1) 조회를 위한 Map 인덱스
  elementsMap: Map<string, Element>;
  childrenMap: Map<string, Element[]>;
  // 🆕 Phase 2: 페이지별 인덱스 (O(1) 페이지 요소 조회)
  pageIndex: PageElementIndex;
  // G.1: Component-Instance 인덱스
  componentIndex: ComponentIndex;
  // G.2: Variable Usage 인덱스
  variableUsageIndex: VariableUsageIndex;
  selectedElementId: string | null;
  selectedElementProps: ComponentElementProps;
  selectedTab: { parentId: string; tabIndex: number } | null;
  pages: Page[];
  currentPageId: string | null;
  historyOperationInProgress: boolean;
  // ⭐ Multi-select state
  selectedElementIds: string[];
  // 🚀 O(1) 검색용 Set (selectedElementIds와 동기화)
  selectedElementIdsSet: Set<string>;
  multiSelectMode: boolean;

  // 🆕 Multi-page: 페이지별 캔버스 위치
  pagePositions: Record<string, { x: number; y: number }>;
  pagePositionsVersion: number;

  // 내부 헬퍼: 인덱스 재구축
  _rebuildIndexes: () => void;
  // 내부 헬퍼: 진행 중인 selectedElementProps hydration 취소
  _cancelHydrateSelectedProps: () => void;

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
  goToHistoryIndex: (targetIndex: number) => Promise<void>;
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

  // 🆕 Multi-page: 페이지 위치 관리
  initializePagePositions: (pages: Page[], pageWidth: number, gap: number) => void;
  updatePagePosition: (pageId: string, x: number, y: number) => void;

  // 🚀 WebGL computed layout 동기화
  updateSelectedElementLayout: (elementId: string, layout: ComputedLayout) => void;

  // G.1: Instance 생성 액션
  createInstance: (masterId: string, parentId: string, pageId: string) => Element | null;
}

export const createElementsSlice: StateCreator<ElementsState> = (set, get) => {
  // undo/redo/goToHistoryIndex 함수 생성
  const undo = createUndoAction(set, get);
  const redo = createRedoAction(set, get);
  const goToHistoryIndex = createGoToHistoryIndexAction(set, get);

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
    // G.1/G.2: Component + Variable 인덱스 재구축
    const componentIndex = rebuildComponentIndex(elements);
    const variableUsageIndex = rebuildVariableUsageIndex(elements);

    set({ elementsMap, childrenMap, pageIndex, componentIndex, variableUsageIndex });
  };

  // 🆕 Phase 2: O(1) 페이지 요소 조회 함수
  const getPageElements = (pageId: string): Element[] => {
    const { pageIndex, elementsMap } = get();
    return getPageElementsFromIndex(pageIndex, pageId, elementsMap);
  };

  // 🚀 Phase 4.3: 인스펙터 props hydration을 백그라운드 우선순위로 분리
  // WebGL Canvas의 pointerdown task를 짧게 유지하기 위해,
  // selectedElementProps(종종 큰 객체)는 브라우저 유휴 시간에 채웁니다.
  let cancelHydrateTask: (() => void) | null = null;

  const cancelHydrateSelectedProps = () => {
    if (cancelHydrateTask) {
      cancelHydrateTask();
      cancelHydrateTask = null;
    }
  };

  const scheduleHydrateSelectedProps = (elementId: string) => {
    if (typeof window === "undefined") {
      // SSR/특수 환경: 동기 처리
      const state = get();
      const element =
        state.elementsMap.get(elementId) ??
        findElementById(state.elements, elementId);
      if (!element) return;
      // 🚀 WebGL 요소의 computedStyle 포함 (borderRadius 등)
      const computedStyle = computeCanvasElementStyle(element);
      set({ selectedElementProps: { ...createCompleteProps(element), computedStyle } });
      return;
    }

    cancelHydrateSelectedProps();

    // 🚀 Phase 4.3: scheduler.postTask('background') 또는 requestIdleCallback 사용
    // - 캔버스 렌더링보다 낮은 우선순위
    // - 브라우저 유휴 시간에 실행되어 Long Task 분할
    cancelHydrateTask = scheduleCancelableBackgroundTask(() => {
      cancelHydrateTask = null;

      const state = get();
      if (state.selectedElementId !== elementId) return; // stale update 방지

      const element =
        state.elementsMap.get(elementId) ??
        findElementById(state.elements, elementId);
      if (!element) return;

      longTaskMonitor.measure("interaction.select:hydrate-selected-props", () => {
        // 🚀 WebGL 요소의 computedStyle만 추가 (borderRadius 등)
        // 기본 props는 setSelectedElement에서 이미 동기적으로 설정됨
        const computedStyle = computeCanvasElementStyle(element);
        const currentProps = state.selectedElementProps;
        const hasValidProps = currentProps && Object.keys(currentProps).length > 0;

        if (hasValidProps) {
          // props가 이미 있으면 computedStyle만 병합 (불필요한 리렌더 방지)
          set({ selectedElementProps: { ...currentProps, computedStyle } });
        } else {
          // fallback: 전체 props 재구성
          set({ selectedElementProps: { ...createCompleteProps(element), computedStyle } });
        }
      });
    }, { timeout: 50 }); // 50ms 내에 실행 보장
  };

  return {
    elements: [],
    elementsMap: new Map(),
    childrenMap: new Map(),
    // 🆕 Phase 2: 페이지 인덱스 초기값
    pageIndex: createEmptyPageIndex(),
    componentIndex: createEmptyComponentIndex(),
    variableUsageIndex: createEmptyVariableUsageIndex(),
    selectedElementId: null,
    selectedElementProps: {},
    selectedTab: null,
    pages: [],
    currentPageId: null,
    historyOperationInProgress: false,
    // ⭐ Multi-select state
    selectedElementIds: [],
    // 🚀 O(1) 검색용 Set
    selectedElementIdsSet: new Set<string>(),
    multiSelectMode: false,

    // 🆕 Multi-page: 페이지별 캔버스 위치
    pagePositions: {},
    pagePositionsVersion: 0,

    _rebuildIndexes,
    _cancelHydrateSelectedProps: cancelHydrateSelectedProps,
    getPageElements,

  // 🚀 Phase 1: Immer → 함수형 업데이트 (Low Risk)
  // setElements는 내부 상태 관리용이므로 히스토리 기록하지 않음
  // 실제 요소 변경은 addElement, updateElementProps, removeElement에서 처리
  setElements: (elements) => {
    set({ elements });
    // 인덱스 자동 재구축
    get()._rebuildIndexes();
  },

  // 🚀 Phase 1: Immer → 함수형 업데이트 (Low Risk)
  loadPageElements: (elements, pageId) => {
    // orphan 요소들을 body로 마이그레이션
    const { elements: migratedElements, updatedElements } =
      ElementUtils.migrateOrphanElementsToBody(elements, pageId);

    // 페이지 변경 시 히스토리 초기화
    historyManager.setCurrentPage(pageId);
    set({ elements: migratedElements, currentPageId: pageId });

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

  // 🚀 Phase 1: Immer → 함수형 업데이트 (Medium Risk)
  // 🚀 Phase 6.3: 참조 안정성 최적화 - 불필요한 상태 업데이트 방지
  setSelectedElement: (elementId, props, style, computedStyle) => {
    cancelHydrateSelectedProps();

    const currentState = get();

    // 🚀 Early Return: 동일한 요소 선택 시 (props/style/computedStyle 없는 경우)
    // - 같은 요소를 클릭해도 불필요한 리렌더 방지
    if (
      elementId === currentState.selectedElementId &&
      !props && !style && !computedStyle
    ) {
      return; // 변경 없음
    }

    const hasExternalProps = Boolean(props || style || computedStyle);

    // WebGL Canvas 기본 선택 경로: elementId만 전달됨
    // - createCompleteProps는 가벼운 연산 (object spread)이므로 동기 실행
    // - computeCanvasElementStyle만 백그라운드 hydration으로 분리
    // - 즉시 inline style을 포함하여 스타일 패널 플리커 방지
    if (elementId && !hasExternalProps) {
      let selectedElementIds: string[];
      let selectedElementIdsSet: Set<string>;

      if (
        elementId === currentState.selectedElementId &&
        currentState.selectedElementIds.length === 1
      ) {
        selectedElementIds = currentState.selectedElementIds;
        selectedElementIdsSet = currentState.selectedElementIdsSet;
      } else {
        selectedElementIds = [elementId];
        selectedElementIdsSet = new Set([elementId]);
      }

      // 즉시 element.props 기반 props 채우기 (플리커 방지)
      const element = currentState.elementsMap.get(elementId)
        ?? findElementById(currentState.elements, elementId);
      const initialProps = element
        ? createCompleteProps(element)
        : {};

      set({
        selectedElementId: elementId,
        selectedElementProps: initialProps,
        selectedElementIds,
        selectedElementIdsSet,
        multiSelectMode: false,
      });

      // computedStyle만 백그라운드 hydration으로 분리
      scheduleHydrateSelectedProps(elementId);
      return;
    }

    let resolvedProps = props;

    if (elementId && !resolvedProps) {
      const { elementsMap, elements } = currentState;
      const element = elementsMap.get(elementId) ?? findElementById(elements, elementId);
      if (element) {
        resolvedProps = createCompleteProps(element);
      }
    }

    // 🚀 Phase 6.3: 상태 업데이트 최소화
    // - style/computedStyle이 없으면 기존 객체 재사용 시도
    let selectedElementProps: ComponentElementProps;
    if (elementId && resolvedProps) {
      if (!style && !computedStyle) {
        // style/computedStyle 없으면 resolvedProps 그대로 사용 (새 객체 생성 X)
        selectedElementProps = resolvedProps;
      } else {
        selectedElementProps = {
          ...resolvedProps,
          ...(style ? { style } : {}),
          ...(computedStyle ? { computedStyle } : {}),
        };
      }
    } else {
      selectedElementProps = {};
    }

    // ⭐ SelectionState와 동기화
    // 🚀 Phase 6.3: 동일한 요소면 배열/Set 재생성 스킵
    let selectedElementIds: string[];
    let selectedElementIdsSet: Set<string>;

    if (elementId === currentState.selectedElementId && currentState.selectedElementIds.length === 1) {
      // 같은 요소 선택 - 기존 배열/Set 재사용
      selectedElementIds = currentState.selectedElementIds;
      selectedElementIdsSet = currentState.selectedElementIdsSet;
    } else {
      selectedElementIds = elementId ? [elementId] : [];
      selectedElementIdsSet = elementId ? new Set([elementId]) : new Set<string>();
    }

    set({
      selectedElementId: elementId,
      selectedElementProps,
      selectedElementIds,
      selectedElementIdsSet,
      multiSelectMode: false,
    });
  },

  // 🚀 Phase 1: Immer → 함수형 업데이트 (Medium Risk)
  selectTabElement: (elementId, props, tabIndex) =>
    set({
      selectedElementId: elementId,
      selectedElementProps: props,
      selectedTab: { parentId: elementId, tabIndex },
    }),

  // 🚀 Phase 1: Immer → 함수형 업데이트 (Low Risk)
  setPages: (pages) => set({ pages }),

  // 🚀 Phase 1: Immer → 함수형 업데이트 (Low Risk)
  setCurrentPageId: (pageId) => {
    historyManager.setCurrentPage(pageId);
    set({ currentPageId: pageId });
  },

  undo,

  redo,

  goToHistoryIndex,

  removeElement,

  // 🚀 Phase 1: Immer → 함수형 업데이트 (High Risk)
  removeTabPair: (elementId) => {
    const state = get();
    // Tab과 Panel 쌍 제거
    const elements = state.elements.filter(
      (el) => el.parent_id !== elementId && el.id !== elementId
    );

    // 선택 상태 업데이트
    const isSelected = state.selectedElementId === elementId;

    set({
      elements,
      ...(isSelected && {
        selectedElementId: null,
        selectedElementProps: {},
      }),
    });
  },

  // Factory 함수로 생성된 addComplexElement 사용
  addComplexElement,

  // 🚀 Phase 1: Immer → 함수형 업데이트 (High Risk)
  updateElementOrder: (elementId, orderNum) => {
    const { elements } = get();
    // 불변 업데이트: 새 배열 생성
    const updatedElements = elements.map((el) =>
      el.id === elementId ? { ...el, order_num: orderNum } : el
    );
    set({ elements: updatedElements });
  },

  // 🚀 Phase 1: Immer → 함수형 업데이트 (High Risk)
  // ⭐ 다중 선택: 요소를 선택 목록에서 추가/제거 (토글)
  toggleElementInSelection: (elementId: string) => {
    const state = get();
    const { elementsMap, elements, selectedElementIdsSet } = state;

    const resolveCompleteProps = (id: string) => {
      const element = elementsMap.get(id) ?? findElementById(elements, id);
      return element ? createCompleteProps(element) : null;
    };

    // 🚀 O(1) 검색용 Set 사용
    const isAlreadySelected = selectedElementIdsSet.has(elementId);

    if (isAlreadySelected) {
      // 이미 선택됨 → 제거
      const newSet = new Set(selectedElementIdsSet);
      newSet.delete(elementId);
      const newSelectedIds = Array.from(newSet);

      if (newSelectedIds.length === 0) {
        // 선택이 비어있으면 다중 선택 모드 해제
        set({
          selectedElementIds: [],
          selectedElementIdsSet: new Set<string>(),
          multiSelectMode: false,
          selectedElementId: null,
          selectedElementProps: {},
        });
      } else {
        // 첫 번째 요소를 primary selection으로 유지
        const nextProps = resolveCompleteProps(newSelectedIds[0]);
        set({
          selectedElementIds: newSelectedIds,
          selectedElementIdsSet: newSet,
          selectedElementId: newSelectedIds[0],
          selectedElementProps: nextProps || {},
        });
      }
    } else {
      // 선택 안 됨 → 추가
      const newSet = new Set(selectedElementIdsSet);
      newSet.add(elementId);
      const newSelectedIds = Array.from(newSet);

      if (newSelectedIds.length === 1) {
        // 첫 번째로 추가되는 경우 primary selection 설정
        const nextProps = resolveCompleteProps(elementId);
        set({
          selectedElementIds: newSelectedIds,
          selectedElementIdsSet: newSet,
          multiSelectMode: true,
          selectedElementId: elementId,
          selectedElementProps: nextProps || {},
        });
      } else {
        set({
          selectedElementIds: newSelectedIds,
          selectedElementIdsSet: newSet,
          multiSelectMode: true,
        });
      }
    }
  },

  // 🚀 Phase 1: Immer → 함수형 업데이트 (Medium Risk)
  // ⭐ 다중 선택: 여러 요소를 한 번에 선택 (드래그 선택용)
  setSelectedElements: (elementIds: string[]) => {
    const { elementsMap, elements } = get();

    const resolveCompleteProps = (id: string) => {
      const element = elementsMap.get(id) ?? findElementById(elements, id);
      return element ? createCompleteProps(element) : null;
    };

    if (elementIds.length > 0) {
      // 첫 번째 요소를 primary selection으로 설정
      const nextProps = resolveCompleteProps(elementIds[0]);
      set({
        selectedElementIds: elementIds,
        // 🚀 O(1) 검색용 Set 동기화
        selectedElementIdsSet: new Set(elementIds),
        multiSelectMode: elementIds.length > 1,
        selectedElementId: elementIds[0],
        selectedElementProps: nextProps || {},
      });
    } else {
      // 선택 없음
      set({
        selectedElementIds: [],
        selectedElementIdsSet: new Set<string>(),
        multiSelectMode: false,
        selectedElementId: null,
        selectedElementProps: {},
      });
    }
  },

  // 🚀 배치 업데이트 (Factory 함수로 생성)
  batchUpdateElementProps,
  batchUpdateElements,

  // 🚀 WebGL computed layout 동기화
  // Canvas에서 layout 계산 완료 시 호출하여 stylePanel과 동기화
  updateSelectedElementLayout: (elementId: string, layout: ComputedLayout) => {
    const state = get();

    // 현재 선택된 요소만 업데이트 (성능 최적화)
    if (state.selectedElementId !== elementId) return;

    // computedLayout이 변경되었는지 확인
    const currentLayout = state.selectedElementProps?.computedLayout;
    if (
      currentLayout?.width === layout.width &&
      currentLayout?.height === layout.height
    ) {
      return; // 변경 없음
    }

    // selectedElementProps에 computedLayout 추가/업데이트
    set({
      selectedElementProps: {
        ...state.selectedElementProps,
        computedLayout: layout,
      },
    });
  },

  // 🆕 Multi-page: 페이지 위치 초기화 (order_num 정렬 → 수평 스택)
  initializePagePositions: (pages: Page[], pageWidth: number, gap: number) => {
    const sorted = [...pages].sort((a, b) => (a.order_num ?? 0) - (b.order_num ?? 0));
    const positions: Record<string, { x: number; y: number }> = {};
    let currentX = 0;
    for (const page of sorted) {
      positions[page.id] = { x: currentX, y: 0 };
      currentX += pageWidth + gap;
    }
    set((state) => ({
      pagePositions: positions,
      pagePositionsVersion: state.pagePositionsVersion + 1,
    }));
  },

  // 🆕 Multi-page: 단일 페이지 위치 업데이트 (드래그용)
  updatePagePosition: (pageId: string, x: number, y: number) => {
    set((state) => ({
      pagePositions: { ...state.pagePositions, [pageId]: { x, y } },
      pagePositionsVersion: state.pagePositionsVersion + 1,
    }));
  },

  // G.1: Instance 생성 액션
  createInstance: (masterId: string, parentId: string, pageId: string) => {
    return createInstanceAction(get, set, masterId, parentId, pageId);
  },
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
 * - O(1) 조회: pageIndex 기반 인덱스 사용 (filter O(n) → getPageElements O(1))
 * - 안정적인 참조: pageIndex 캐시 활용
 * - 개별 구독: currentPageId, pageIndex, elementsMap 분리 구독
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
  const pageIndex = useStore((state) => state.pageIndex);
  const elementsMap = useStore((state) => state.elementsMap);

  // useMemo로 안정적인 참조 유지 (pageIndex/elementsMap/currentPageId가 변경될 때만 재계산)
  return useMemo(() => {
    if (!currentPageId) return EMPTY_ELEMENTS;
    // 🆕 O(1) 인덱스 기반 조회 (캐시 포함)
    return getPageElementsFromIndex(pageIndex, currentPageId, elementsMap);
  }, [pageIndex, elementsMap, currentPageId]);
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
