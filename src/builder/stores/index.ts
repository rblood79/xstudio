import { create, type StoreApi, type UseBoundStore } from "zustand";
import { createSelectionSlice, SelectionState } from "./selection";
import { createThemeSlice, ThemeState } from "./theme";
import { createElementsSlice, ElementsState } from "./elements";
import { createSaveModeSlice, SaveModeState } from "./saveMode";

// 통합 스토어 타입
interface Store
  extends ElementsState,
    SelectionState,
    ThemeState,
    SaveModeState {}

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
    ...createThemeSlice(...args),
    ...createSaveModeSlice(...args),
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

// 액션 선택기들
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

export const useThemeActions = () =>
  useStore((state) => ({
    loadTheme: state.loadTheme,
    updateTokenValue: state.updateTokenValue,
  }));

// 개발 환경 디버깅
export const useStoreDebug = () => {
  if (!import.meta.env.DEV) return {};

  return {
    getState: () => useStore.getState(),
    subscribe: (callback: (state: Store) => void) =>
      useStore.subscribe(callback),
  };
};
