import { useMemo, useDeferredValue } from "react";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { createSelectionSlice, SelectionState } from "./selection";
import { createElementsSlice, ElementsState, type Element } from "./elements";
import { createSaveModeSlice, SaveModeState } from "./saveMode";
import { createSettingsSlice, SettingsState } from "./settings";
import { createPanelLayoutSlice, PanelLayoutSlice } from "./panelLayout";
import { createElementLoaderSlice, ElementLoaderSlice } from "./elementLoader";
import {
  createInspectorActionsSlice,
  InspectorActionsState,
} from "./inspectorActions";
import { getPageElements } from "./utils/elementIndexer";
import type { SelectedElement } from "../inspector/types";

// ✅ ThemeState removed - now using unified theme store (themeStore.unified.ts)

// 통합 스토어 타입
interface Store
  extends ElementsState,
    SelectionState,
    SaveModeState,
    SettingsState,
    PanelLayoutSlice,
    ElementLoaderSlice,
    InspectorActionsState {}

type UseStoreType = UseBoundStore<StoreApi<Store>>;

// HMR로 인한 store 재생성 방지: window 객체에 고정
declare global {
  interface Window {
    __XSTUDIO_STORE__?: UseStoreType;
    __XSTUDIO_STORE_ID__?: string;
  }
}

// HMR 대응: 기존 인스턴스가 있으면 재사용, 없으면 새로 생성
let useStore: UseStoreType;

const hasExistingStore =
  typeof window !== "undefined" && window.__XSTUDIO_STORE__;

if (hasExistingStore) {
  // 기존 인스턴스 재사용
  useStore = window.__XSTUDIO_STORE__!;
} else {
  // 새로운 인스턴스 생성
  useStore = create<Store>((...args) => ({
    ...createElementsSlice(...args),
    ...createSelectionSlice(...args),
    ...createSaveModeSlice(...args),
    ...createSettingsSlice(...args),
    ...createPanelLayoutSlice(...args),
    ...createElementLoaderSlice(...args),
    ...createInspectorActionsSlice(...args),
  }));

  if (typeof window !== "undefined") {
    window.__XSTUDIO_STORE__ = useStore;
    window.__XSTUDIO_STORE_ID__ = Math.random().toString(36).substring(7);
  }
}

export { useStore };

// getState API export (SaveService 등 non-React 환경에서 사용)
export const getStoreState = () => {
  // iframe 내부인 경우, parent window의 store 사용
  if (
    typeof window !== "undefined" &&
    window !== window.top &&
    window.parent &&
    (window.parent as typeof window).__XSTUDIO_STORE__
  ) {
    return (window.parent as typeof window).__XSTUDIO_STORE__!.getState();
  }

  // 일반적인 경우
  if (typeof window !== "undefined" && window.__XSTUDIO_STORE__) {
    return window.__XSTUDIO_STORE__.getState();
  }
  return useStore.getState();
};

export const subscribeStore = useStore.subscribe;

// Zundo 패턴은 기존 히스토리 시스템에 통합됨
// useStore가 개선된 히스토리 시스템을 포함함

// 간단한 선택기들 (Zustand의 내장 최적화 활용)
export const useElements = () => useStore((state) => state.elements);
export const useSelectedElementId = () =>
  useStore((state) => state.selectedElementId);
// 호환성 alias
export const useSelectedElement = useSelectedElementId;
export const useSelectedElementProps = () =>
  useStore((state) => state.selectedElementProps);
export const useCurrentPageId = () => useStore((state) => state.currentPageId);
export const usePages = () => useStore((state) => state.pages);

// ============================================
// 🚀 Single Source of Truth: Selected Element
// ============================================

/**
 * 선택된 요소를 SelectedElement 형태로 반환
 * Inspector Store 제거 후 Builder Store에서 직접 사용
 *
 * 🚀 Performance Optimization:
 * - elementsMap 전체 구독 제거 (O(n) 리렌더링 방지)
 * - selectedElementProps 직접 구독 (선택된 요소만 추적)
 * - 다른 요소 변경 시 리렌더링 방지
 *
 * @returns SelectedElement | null
 */
export const useSelectedElementData = (): SelectedElement | null => {
  // 🚀 selectedElementId만 구독 (primitive 값)
  const selectedElementId = useStore((state) => state.selectedElementId);

  // 🚀 selectedElementProps만 구독 (선택된 요소의 props만)
  // elementsMap 전체 구독 대신 이미 계산된 props 사용
  const selectedElementProps = useStore((state) => state.selectedElementProps);

  // 🚀 추가 정보를 위해 elementsMap에서 한 번만 읽기 (구독 아님)
  // tag, customId, dataBinding은 자주 변경되지 않음
  return useMemo(() => {
    if (!selectedElementId) return null;

    // getState()로 동기적 읽기 (구독 없음)
    const element = useStore.getState().elementsMap.get(selectedElementId);
    if (!element) return null;

    // selectedElementProps가 비어있으면 element에서 직접 추출
    const props = selectedElementProps && Object.keys(selectedElementProps).length > 0
      ? selectedElementProps
      : element.props;

    const { style, computedStyle, events, ...otherProps } = props as Record<string, unknown>;

    return {
      id: element.id,
      customId: element.customId,
      type: element.tag,
      properties: otherProps,
      style: (style as React.CSSProperties) || {},
      computedStyle: computedStyle as Partial<React.CSSProperties> | undefined,
      semanticClasses: [],
      cssVariables: {},
      dataBinding: element.dataBinding as SelectedElement["dataBinding"],
      events: (events as SelectedElement["events"]) || [],
    };
  }, [selectedElementId, selectedElementProps]);
};

/**
 * 🚀 Phase 19/Phase 3: 디바운스된 선택 요소 데이터
 *
 * 🔄 Test B: useDeferredValue 기반 구현
 * React 18 Concurrent Features를 활용하여 선택 변경을 낮은 우선순위로 처리
 * - setTimeout 대신 React의 내장 스케줄링 사용
 * - 브라우저의 네이티브 우선순위 시스템 활용
 * - 캔버스 인터랙션에 방해 없이 인스펙터 업데이트
 *
 * @returns SelectedElement | null (지연됨)
 */
export const useDebouncedSelectedElementData = (): SelectedElement | null => {
  const currentData = useSelectedElementData();
  return useDeferredValue(currentData);
};

/**
 * 🚀 Phase 4.5: useDeferredValue 기반 선택 요소 ID
 *
 * React 18 Concurrent Features를 활용하여 선택 변경을 낮은 우선순위로 처리
 * - 캔버스 클릭은 즉시 반응
 * - 트리 하이라이트 등 부가 UI는 지연 업데이트
 *
 * @returns 지연된 selectedElementId
 */
export const useDeferredSelectedElementId = (): string | null => {
  const selectedElementId = useStore((state) => state.selectedElementId);
  return useDeferredValue(selectedElementId);
};

/**
 * 🚀 Phase 4.5: useDeferredValue 기반 선택 요소 데이터
 *
 * useDebouncedSelectedElementData + useDeferredValue 조합
 * - 디바운스: 빠른 선택 전환 필터링
 * - Defer: React concurrent 우선순위 활용
 *
 * @returns 지연된 SelectedElement | null
 */
export const useDeferredSelectedElementDataConcurrent = (): SelectedElement | null => {
  const currentData = useDebouncedSelectedElementData();
  return useDeferredValue(currentData);
};

/**
 * Inspector 액션 훅 (스타일, 속성, 이벤트 업데이트)
 * 기존 useInspectorState의 액션들을 대체
 * 🚀 개별 selector로 분리하여 무한 루프 방지
 */
export const useUpdateStyle = () => useStore((state) => state.updateSelectedStyle);
export const useUpdateStyles = () => useStore((state) => state.updateSelectedStyles);
export const useUpdateProperty = () => useStore((state) => state.updateSelectedProperty);
export const useUpdateProperties = () => useStore((state) => state.updateSelectedProperties);
export const useUpdateCustomId = () => useStore((state) => state.updateSelectedCustomId);
export const useUpdateDataBinding = () => useStore((state) => state.updateSelectedDataBinding);
export const useUpdateEvents = () => useStore((state) => state.updateSelectedEvents);
export const useAddEvent = () => useStore((state) => state.addSelectedEvent);
export const useUpdateEvent = () => useStore((state) => state.updateSelectedEvent);
export const useRemoveEvent = () => useStore((state) => state.removeSelectedEvent);

/**
 * 🔧 레거시 호환: useInspectorActions (개별 hook 조합)
 * 새 코드에서는 개별 hook 사용 권장
 */
export const useInspectorActions = () => ({
  updateStyle: useUpdateStyle(),
  updateStyles: useUpdateStyles(),
  updateProperty: useUpdateProperty(),
  updateProperties: useUpdateProperties(),
  updateCustomId: useUpdateCustomId(),
  updateDataBinding: useUpdateDataBinding(),
  updateEvents: useUpdateEvents(),
  addEvent: useAddEvent(),
  updateEvent: useUpdateEvent(),
  removeEvent: useRemoveEvent(),
});

// ============================================
// 🚀 Performance Optimized Selectors (Phase 1)
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
 * - 무한 루프 방지: useMemo로 getSnapshot 결과 캐싱
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
    return getPageElements(pageIndex, currentPageId, elementsMap);
  }, [pageIndex, elementsMap, currentPageId]);
};

/**
 * elementsMap을 활용한 O(1) 요소 조회 selector
 */
export const useElementById = (elementId: string | null) =>
  useStore((state) => {
    if (!elementId) return undefined;
    return state.elementsMap.get(elementId);
  });

/**
 * childrenMap을 활용한 O(1) 자식 요소 조회 selector
 */
export const useChildElements = (parentId: string | null): Element[] =>
  useStore((state) => {
    const key = parentId || "root";
    // 안정적인 빈 배열 참조 반환 (새 배열 생성 방지)
    return state.childrenMap.get(key) ?? EMPTY_ELEMENTS;
  });

/**
 * 현재 페이지의 요소 개수만 반환 (가벼운 조회용)
 *
 * 🆕 Phase 2: O(1) 인덱스 기반 카운트
 */
export const useCurrentPageElementCount = () => {
  return useStore((state) => {
    const { pageIndex, currentPageId } = state;
    if (!currentPageId) return 0;
    return pageIndex.elementsByPage.get(currentPageId)?.size ?? 0;
  });
};

// 액션 선택기들
// NOTE: These grouped selectors are intentional API exports for convenience.
// They should be used sparingly and only when necessary.
// For performance-critical components, use individual selectors instead.
/* eslint-disable local/no-zustand-grouped-selectors */
export const useElementActions = () =>
  useStore((state) => ({
    addElement: state.addElement,
    updateElementProps: state.updateElementProps,
    updateElement: state.updateElement,
    removeElement: state.removeElement,
    setSelectedElement: state.setSelectedElement,
    loadPageElements: state.loadPageElements,
  }));

export const useHistoryActions = () =>
  useStore((state) => ({
    undo: state.undo,
    redo: state.redo,
  }));

// Panel Layout 선택기들
export const usePanelLayoutState = () => useStore((state) => state.panelLayout);
export const usePanelLayoutActions = () =>
  useStore((state) => ({
    setPanelLayout: state.setPanelLayout,
    resetPanelLayout: state.resetPanelLayout,
    savePanelLayoutToStorage: state.savePanelLayoutToStorage,
    loadPanelLayoutFromStorage: state.loadPanelLayoutFromStorage,
  }));

// 🚀 Phase 5: Lazy Loading 선택기들
export const useLazyLoaderActions = () =>
  useStore((state) => ({
    lazyLoadPageElements: state.lazyLoadPageElements,
    unloadPage: state.unloadPage,
    isPageLoaded: state.isPageLoaded,
    isPageLoading: state.isPageLoading,
    preloadPage: state.preloadPage,
    getLRUStats: state.getLRUStats,
    setLazyLoadingEnabled: state.setLazyLoadingEnabled,
  }));

export const usePageLoadingStatus = (pageId: string | null) =>
  useStore((state) => {
    if (!pageId) return { isLoading: false, isLoaded: false };
    return {
      isLoading: state.loadingPages.has(pageId),
      isLoaded: state.loadedPages.has(pageId),
    };
  });
/* eslint-enable local/no-zustand-grouped-selectors */

// ✅ useThemeActions removed - use unified theme store instead
// import { useUnifiedThemeStore } from './themeStore.unified';

// 개발 환경 디버깅
export const useStoreDebug = () => {
  if (!import.meta.env.DEV) return {};

  return {
    getState: () => useStore.getState(),
    subscribe: (callback: (state: Store) => void) =>
      useStore.subscribe(callback),
  };
};

// ============================================
// Layout/Slot System Stores
// ============================================
export {
  useLayoutsStore,
  useCurrentLayout,
  useLayouts,
  useLayoutsLoading,
  useLayoutsError,
} from "./layouts";

export {
  useEditModeStore,
  useEditMode,
  useIsPageMode,
  useIsLayoutMode,
  useCurrentEditPageId,
  useCurrentEditLayoutId,
  useEditContext,
} from "./editMode";

// ============================================
// Phase G: 렌더링/레이아웃 상태 분리
// ============================================
export {
  useRenderState,
  selectIsRendering,
  selectContextLost,
  selectFps,
} from "./renderState";

export {
  useLayoutState,
  selectViewportSize,
  selectPanelWidths,
  selectWorkableArea,
} from "./layoutState";
