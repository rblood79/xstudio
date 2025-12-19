import { useMemo } from "react";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { createSelectionSlice, SelectionState } from "./selection";
import { createElementsSlice, ElementsState, type Element } from "./elements";
import { createSaveModeSlice, SaveModeState } from "./saveMode";
import { createSettingsSlice, SettingsState } from "./settings";
import { createPanelLayoutSlice, PanelLayoutSlice } from "./panelLayout";
import { createElementLoaderSlice, ElementLoaderSlice } from "./elementLoader";
import { getPageElements } from "./utils/elementIndexer";

// ✅ ThemeState removed - now using unified theme store (themeStore.unified.ts)

// 통합 스토어 타입
interface Store
  extends ElementsState,
    SelectionState,
    SaveModeState,
    SettingsState,
    PanelLayoutSlice,
    ElementLoaderSlice {}

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
export const useSelectedElement = () =>
  useStore((state) => state.selectedElementId);
export const useSelectedElementProps = () =>
  useStore((state) => state.selectedElementProps);
export const useCurrentPageId = () => useStore((state) => state.currentPageId);
export const usePages = () => useStore((state) => state.pages);

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
