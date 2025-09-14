import { StateCreator } from 'zustand';
import { produce, Patch } from 'immer';
import { Element } from '../../types/store'; // Page 타입도 추가

// interface Element { ... } // 제거 - 중복 정의

interface HistoryEntry {
    id: string;
    timestamp: number;
    patches: Patch[];
    inversePatches: Patch[];
    snapshot?: { prev: Element[]; current: Element[] };
    description?: string;
}

export interface HistoryState {
    history: HistoryEntry[];
    historyIndex: number;
    pageHistories: Record<string, { history: HistoryEntry[]; historyIndex: number }>;
    maxHistorySize: number;

    addToHistory: (prevState: Element[], currentState: Element[], description?: string) => void;
    undo: () => void;
    redo: () => void;
    clearHistory: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
}

export const createHistorySlice: StateCreator<HistoryState> = (set, get) => ({
    history: [],
    historyIndex: -1,
    pageHistories: {},
    maxHistorySize: 50, // 히스토리 크기 제한

    addToHistory: (prevState: Element[], currentState: Element[], description?: string) => {
        set(produce((state: HistoryState) => {
            const newEntry: HistoryEntry = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                patches: [],
                inversePatches: [],
                snapshot: { prev: [...prevState], current: [...currentState] },
                description
            };

            // 현재 인덱스 이후의 히스토리 제거
            state.history = state.history.slice(0, state.historyIndex + 1);

            // 새 엔트리 추가
            state.history.push(newEntry);
            state.historyIndex = state.history.length - 1;

            // 히스토리 크기 제한
            if (state.history.length > state.maxHistorySize) {
                const removed = state.history.shift();
                state.historyIndex = Math.max(0, state.historyIndex - 1);

                // 메모리 정리
                if (removed?.snapshot) {
                    removed.snapshot = undefined;
                }
            }

            // 페이지별 히스토리도 업데이트
            const currentPageId = (get() as unknown as { currentPageId: string | null }).currentPageId;
            if (currentPageId) {
                if (!state.pageHistories[currentPageId]) {
                    state.pageHistories[currentPageId] = { history: [], historyIndex: -1 };
                }
                state.pageHistories[currentPageId].history.push(newEntry);
                state.pageHistories[currentPageId].historyIndex = state.pageHistories[currentPageId].history.length - 1;

                // 페이지별 히스토리도 크기 제한
                if (state.pageHistories[currentPageId].history.length > state.maxHistorySize) {
                    state.pageHistories[currentPageId].history.shift();
                    state.pageHistories[currentPageId].historyIndex = Math.max(0, state.pageHistories[currentPageId].historyIndex - 1);
                }
            }
        }));
    },

    undo: () => {
        const state = get();
        if (!state.canUndo()) return;

        set(produce((draft: HistoryState) => {
            const currentEntry = draft.history[draft.historyIndex];
            if (currentEntry?.snapshot) {
                // 이전 상태로 복원
                const prevElements = currentEntry.snapshot.prev;
                (get() as unknown as { setElements: (elements: Element[]) => void }).setElements(prevElements);
                draft.historyIndex = Math.max(0, draft.historyIndex - 1);
            }
        }));
    },

    redo: () => {
        const state = get();
        if (!state.canRedo()) return;

        set(produce((draft: HistoryState) => {
            const nextIndex = draft.historyIndex + 1;
            const nextEntry = draft.history[nextIndex];
            if (nextEntry?.snapshot) {
                // 다음 상태로 복원
                const nextElements = nextEntry.snapshot.current;
                (get() as unknown as { setElements: (elements: Element[]) => void }).setElements(nextElements);
                draft.historyIndex = nextIndex;
            }
        }));
    },

    clearHistory: () => {
        set(produce((state: HistoryState) => {
            // 메모리 정리
            state.history.forEach(entry => {
                if (entry.snapshot) {
                    entry.snapshot = undefined;
                }
            });

            state.history = [];
            state.historyIndex = -1;
            state.pageHistories = {};
        }));
    },

    canUndo: () => {
        const state = get();
        return state.historyIndex > 0;
    },

    canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
    }
});
