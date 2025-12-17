import { StateCreator } from 'zustand';
// 🚀 Phase 1: Immer 제거 - 함수형 업데이트로 전환
// import { produce } from 'immer'; // REMOVED

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

export const createSelectionSlice: StateCreator<SelectionState> = (set, get) => ({
    multiSelectMode: false,
    selectedElementIds: [],
    selectionBounds: null,

    // 🚀 Phase 1: Immer → 함수형 업데이트
    setMultiSelectMode: (enabled) => {
        const { selectedElementIds } = get();
        set({
            multiSelectMode: enabled,
            // 단일 선택 모드로 전환 시 선택된 요소가 1개만 남도록
            selectedElementIds: enabled ? selectedElementIds : selectedElementIds.slice(0, 1),
        });
    },

    // 🚀 Phase 1: Immer → 함수형 업데이트
    addToSelection: (elementId) => {
        const { multiSelectMode, selectedElementIds } = get();
        if (!multiSelectMode) {
            // 단일 선택 모드인 경우 기존 선택을 모두 제거
            set({ selectedElementIds: [elementId] });
        } else {
            // 다중 선택 모드인 경우 추가 (중복 방지)
            if (!selectedElementIds.includes(elementId)) {
                set({ selectedElementIds: [...selectedElementIds, elementId] });
            }
        }
    },

    // 🚀 Phase 1: Immer → 함수형 업데이트
    removeFromSelection: (elementId: string) => {
        const { selectedElementIds } = get();
        set({ selectedElementIds: selectedElementIds.filter((id: string) => id !== elementId) });
    },

    // 🚀 Phase 1: Immer → 함수형 업데이트
    clearSelection: () => set({ selectedElementIds: [], selectionBounds: null }),

    // 🚀 Phase 1: Immer → 함수형 업데이트
    setSelectionBounds: (bounds) => set({ selectionBounds: bounds }),

    // 🚀 Phase 1: Immer → 함수형 업데이트
    selectAll: (elements) => set({ selectedElementIds: elements.map((el) => el.id) }),

    // 🚀 Phase 1: Immer → 함수형 업데이트
    selectByParent: (parentId, elements) => {
        const childElements = elements.filter((el) => el.parent_id === parentId);
        set({ selectedElementIds: childElements.map((el) => el.id) });
    },
});
