import { StateCreator } from 'zustand';
import { produce } from 'immer';

export interface SelectionState {
    // 선택 관련 상태
    multiSelectMode: boolean;
    selectedElementIds: string[];
    selectionBounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null;

    // 액션들
    setMultiSelectMode: (enabled: boolean) => void;
    addToSelection: (elementId: string) => void;
    removeFromSelection: (elementId: string) => void;
    clearSelection: () => void;
    setSelectionBounds: (bounds: { x: number; y: number; width: number; height: number } | null) => void;
    selectAll: (elements: Array<{ id: string }>) => void;
    selectByParent: (parentId: string, elements: Array<{ id: string; parent_id?: string | null }>) => void;
}

export const createSelectionSlice: StateCreator<SelectionState> = (set) => ({
    multiSelectMode: false,
    selectedElementIds: [],
    selectionBounds: null,

    setMultiSelectMode: (enabled) =>
        set(
            produce((state) => {
                state.multiSelectMode = enabled;
                if (!enabled) {
                    // 단일 선택 모드로 전환 시 선택된 요소가 1개만 남도록
                    state.selectedElementIds = state.selectedElementIds.slice(0, 1);
                }
            })
        ),

    addToSelection: (elementId) =>
        set(
            produce((state) => {
                if (!state.multiSelectMode) {
                    // 단일 선택 모드인 경우 기존 선택을 모두 제거
                    state.selectedElementIds = [elementId];
                } else {
                    // 다중 선택 모드인 경우 추가
                    if (!state.selectedElementIds.includes(elementId)) {
                        state.selectedElementIds.push(elementId);
                    }
                }
            })
        ),

    removeFromSelection: (elementId: string) =>
        set(
            produce((state) => {
                state.selectedElementIds = state.selectedElementIds.filter((id: string) => id !== elementId);
            })
        ),

    clearSelection: () =>
        set(
            produce((state) => {
                state.selectedElementIds = [];
                state.selectionBounds = null;
            })
        ),

    setSelectionBounds: (bounds) =>
        set(
            produce((state) => {
                state.selectionBounds = bounds;
            })
        ),

    selectAll: (elements) =>
        set(
            produce((state) => {
                // 현재 페이지의 모든 요소 선택
                state.selectedElementIds = elements.map((el) => el.id);
            })
        ),

    selectByParent: (parentId, elements) =>
        set(
            produce((state) => {
                // 특정 부모의 모든 자식 요소 선택
                const childElements = elements.filter((el) => el.parent_id === parentId);
                state.selectedElementIds = childElements.map((el) => el.id);
            })
        ),
});
