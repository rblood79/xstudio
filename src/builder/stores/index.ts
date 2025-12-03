import { useMemo } from "react";
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { createSelectionSlice, SelectionState } from "./selection";
import { createElementsSlice, ElementsState } from "./elements";
import { createSaveModeSlice, SaveModeState } from "./saveMode";
import { createSettingsSlice, SettingsState } from "./settings";
import { createPanelLayoutSlice, PanelLayoutSlice } from "./panelLayout";

// ✅ ThemeState removed - now using unified theme store (themeStore.unified.ts)

// 통합 스토어 타입
interface Store
  extends ElementsState,
    SelectionState,
    SaveModeState,
    SettingsState,
    PanelLayoutSlice {}

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

/**
 * 현재 페이지의 요소만 반환하는 선택적 selector
 *
 * 🎯 최적화 효과:
 * - 다른 페이지의 요소 변경에 재렌더되지 않음
 * - Sidebar에서 전체 elements 대신 사용
 *
 * ⚠️ 중요: useMemo를 사용하여 필터링 결과를 캐시합니다.
 * .filter()는 항상 새 배열을 반환하므로, useMemo 없이는 무한 루프가 발생합니다.
 */
export const useCurrentPageElements = () => {
  const elements = useStore((state) => state.elements);
  const currentPageId = useStore((state) => state.currentPageId);

  return useMemo(() => {
    if (!currentPageId) return [];
    return elements.filter((el) => el.page_id === currentPageId);
  }, [elements, currentPageId]);
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
export const useChildElements = (parentId: string | null) =>
  useStore((state) => {
    const key = parentId || "root";
    return state.childrenMap.get(key) || [];
  });

/**
 * 현재 페이지의 요소 개수만 반환 (가벼운 조회용)
 *
 * ⚠️ 참고: 이 selector는 primitive 값(number)을 반환하므로 useMemo가 필요 없습니다.
 * Zustand는 primitive 값의 변경만 감지하여 재렌더합니다.
 */
export const useCurrentPageElementCount = () => {
  const elements = useStore((state) => state.elements);
  const currentPageId = useStore((state) => state.currentPageId);

  return useMemo(() => {
    if (!currentPageId) return 0;
    return elements.filter((el) => el.page_id === currentPageId).length;
  }, [elements, currentPageId]);
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
