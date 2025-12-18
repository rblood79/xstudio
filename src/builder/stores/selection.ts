import { StateCreator } from 'zustand';
// 🚀 Phase 1: Immer 제거 - 함수형 업데이트로 전환
// import { produce } from 'immer'; // REMOVED

export interface SelectionState {
    // 선택 관련 상태
    multiSelectMode: boolean;
    selectedElementIds: string[];
    // 🚀 O(1) 검색용 Set (selectedElementIds와 동기화)
    selectedElementIdsSet: Set<string>;
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
    // 🚀 O(1) 검색용 Set 초기화
    selectedElementIdsSet: new Set<string>(),
    selectionBounds: null,

    // 🚀 Phase 1: Immer → 함수형 업데이트
    setMultiSelectMode: (enabled) => {
        const { selectedElementIds } = get();
        const newIds = enabled ? selectedElementIds : selectedElementIds.slice(0, 1);
        set({
            multiSelectMode: enabled,
            // 단일 선택 모드로 전환 시 선택된 요소가 1개만 남도록
            selectedElementIds: newIds,
            selectedElementIdsSet: new Set(newIds),
        });
    },

    // 🚀 Phase 1: Immer → 함수형 업데이트
    // 🚀 O(n) → O(1) 최적화: Set 사용
    addToSelection: (elementId) => {
        const { multiSelectMode, selectedElementIdsSet } = get();
        if (!multiSelectMode) {
            // 단일 선택 모드인 경우 기존 선택을 모두 제거
            set({
                selectedElementIds: [elementId],
                selectedElementIdsSet: new Set([elementId]),
            });
        } else {
            // 다중 선택 모드인 경우 추가 (중복 방지) - Set으로 O(1) 검사
            if (!selectedElementIdsSet.has(elementId)) {
                const newSet = new Set(selectedElementIdsSet);
                newSet.add(elementId);
                set({
                    selectedElementIds: Array.from(newSet),
                    selectedElementIdsSet: newSet,
                });
            }
        }
    },

    // 🚀 Phase 1: Immer → 함수형 업데이트
    removeFromSelection: (elementId: string) => {
        const { selectedElementIdsSet } = get();
        const newSet = new Set(selectedElementIdsSet);
        newSet.delete(elementId);
        set({
            selectedElementIds: Array.from(newSet),
            selectedElementIdsSet: newSet,
        });
    },

    // 🚀 Phase 1: Immer → 함수형 업데이트
    clearSelection: () => set({
        selectedElementIds: [],
        selectedElementIdsSet: new Set<string>(),
        selectionBounds: null,
    }),

    // 🚀 Phase 1: Immer → 함수형 업데이트
    setSelectionBounds: (bounds) => set({ selectionBounds: bounds }),

    // 🚀 Phase 1: Immer → 함수형 업데이트
    selectAll: (elements) => {
        const ids = elements.map((el) => el.id);
        set({
            selectedElementIds: ids,
            selectedElementIdsSet: new Set(ids),
        });
    },

    // 🚀 Phase 1: Immer → 함수형 업데이트
    selectByParent: (parentId, elements) => {
        const childElements = elements.filter((el) => el.parent_id === parentId);
        const ids = childElements.map((el) => el.id);
        set({
            selectedElementIds: ids,
            selectedElementIdsSet: new Set(ids),
        });
    },
});
