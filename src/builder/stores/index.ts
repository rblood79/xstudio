import { create } from 'zustand';
import { createSelectionSlice, SelectionState } from './selection';
import { createThemeSlice, ThemeState } from './theme';
import { createElementsSlice, ElementsState } from './elements';

// 통합 스토어 타입
interface Store extends ElementsState, SelectionState, ThemeState { }

// 통합 스토어 생성
export const useStore = create<Store>((...args) => ({
    ...createElementsSlice(...args),
    ...createSelectionSlice(...args),
    ...createThemeSlice(...args),
}));

// Zundo 패턴은 기존 히스토리 시스템에 통합됨
// useStore가 개선된 히스토리 시스템을 포함함

// 간단한 선택기들 (Zustand의 내장 최적화 활용)
export const useElements = () => useStore(state => state.elements);
export const useSelectedElement = () => useStore(state => state.selectedElementId);
export const useSelectedElementProps = () => useStore(state => state.selectedElementProps);
export const useCurrentPageId = () => useStore(state => state.currentPageId);
export const usePages = () => useStore(state => state.pages);

// 액션 선택기들
export const useElementActions = () => useStore(state => ({
    addElement: state.addElement,
    updateElementProps: state.updateElementProps,
    removeElement: state.removeElement,
    setSelectedElement: state.setSelectedElement,
    loadPageElements: state.loadPageElements,
}));

export const useHistoryActions = () => useStore(state => ({
    undo: state.undo,
    redo: state.redo,
}));

export const useThemeActions = () => useStore(state => ({
    loadTheme: state.loadTheme,
    updateTokenValue: state.updateTokenValue,
}));

// 개발 환경 디버깅
export const useStoreDebug = () => {
    if (!import.meta.env.DEV) return {};

    return {
        getState: () => useStore.getState(),
        subscribe: (callback: (state: Store) => void) => useStore.subscribe(callback),
    };
};
