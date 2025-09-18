import { StateCreator } from 'zustand';
import { produce } from 'immer';
import { Element } from '../../types/store';

interface HistorySnapshot {
    id: string;
    timestamp: number;
    elements: Element[];
    description: string;
}

export interface HistoryState {
    snapshots: HistorySnapshot[];
    currentIndex: number;
    maxSnapshots: number;

    // 히스토리 관리
    saveSnapshot: (elements: Element[], description: string) => void;
    undo: () => Element[] | null;
    redo: () => Element[] | null;
    canUndo: () => boolean;
    canRedo: () => boolean;
    clearHistory: () => void;
}

export const createHistorySlice: StateCreator<HistoryState> = (set, get) => ({
    snapshots: [],
    currentIndex: -1,
    maxSnapshots: 50,

    saveSnapshot: (elements: Element[], description: string) => {
        console.group('📸 히스토리 스냅샷 저장');
        console.log('저장할 요소:', {
            count: elements.length,
            description,
            elementIds: elements.map(el => el.id)
        });
        console.log('현재 히스토리 상태:', {
            currentSnapshots: get().snapshots.length,
            currentIndex: get().currentIndex
        });

        set(produce((state: HistoryState) => {
            // 현재 인덱스 이후의 스냅샷들 제거 (새로운 액션으로 인해 미래 히스토리 삭제)
            // 첫 번째 스냅샷이 아닌 경우에만 기존 히스토리 제거
            if (state.snapshots.length > 0 && state.currentIndex >= 0 && state.currentIndex < state.snapshots.length - 1) {
                state.snapshots = state.snapshots.slice(0, state.currentIndex + 1);
            }

            // 새로운 스냅샷 생성
            const newSnapshot: HistorySnapshot = {
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                elements: elements.map(el => ({
                    ...el,
                    props: { ...el.props }
                })),
                description
            };

            // 스냅샷 추가
            state.snapshots.push(newSnapshot);
            state.currentIndex = state.snapshots.length - 1;

            // 최대 스냅샷 수 제한
            if (state.snapshots.length > state.maxSnapshots) {
                state.snapshots.shift();
                state.currentIndex = Math.max(0, state.currentIndex - 1);
            }

            console.log('✅ 스냅샷 저장 완료:', {
                totalSnapshots: state.snapshots.length,
                currentIndex: state.currentIndex,
                description
            });
        }));

        console.groupEnd();
    },

    undo: () => {
        console.group('⏪ Undo 실행');

        const state = get();
        console.log('현재 상태:', {
            currentIndex: state.currentIndex,
            totalSnapshots: state.snapshots.length,
            canUndo: state.currentIndex >= 0
        });

        // currentIndex가 -1일 때는 빈 상태로 돌아감
        if (state.currentIndex < 0) {
            console.log('🚫 Undo 불가: 이미 초기 상태');
            console.groupEnd();
            return null;
        }

        // currentIndex가 0일 때는 첫 번째 스냅샷을 사용
        const prevIndex = state.currentIndex === 0 ? 0 : state.currentIndex - 1;
        const prevSnapshot = state.snapshots[prevIndex];

        if (!prevSnapshot) {
            console.log('🚫 이전 스냅샷 없음');
            console.groupEnd();
            return null;
        }

        // 인덱스 업데이트 (currentIndex가 0일 때는 -1로 설정)
        const newIndex = state.currentIndex === 0 ? -1 : prevIndex;
        set({ currentIndex: newIndex });

        console.log('✅ Undo 성공:', {
            newIndex: newIndex,
            elementsRestored: prevSnapshot.elements.length,
            description: prevSnapshot.description
        });

        console.groupEnd();
        return prevSnapshot.elements;
    },

    redo: () => {
        console.group('⏩ Redo 실행');

        const state = get();
        console.log('현재 상태:', {
            currentIndex: state.currentIndex,
            totalSnapshots: state.snapshots.length,
            canRedo: state.currentIndex < state.snapshots.length - 1
        });

        if (state.currentIndex >= state.snapshots.length - 1) {
            console.log('🚫 Redo 불가: 히스토리 끝점');
            console.groupEnd();
            return null;
        }

        const nextIndex = state.currentIndex + 1;
        const nextSnapshot = state.snapshots[nextIndex];

        if (!nextSnapshot) {
            console.log('🚫 다음 스냅샷 없음');
            console.groupEnd();
            return null;
        }

        // 인덱스 업데이트
        set({ currentIndex: nextIndex });

        console.log('✅ Redo 성공:', {
            newIndex: nextIndex,
            elementsRestored: nextSnapshot.elements.length,
            description: nextSnapshot.description
        });

        console.groupEnd();
        return nextSnapshot.elements;
    },

    canUndo: () => {
        const state = get();
        return state.snapshots.length > 0 && state.currentIndex >= 0;
    },

    canRedo: () => {
        const state = get();
        return state.currentIndex < state.snapshots.length - 1;
    },

    clearHistory: () => {
        console.log('🗑️ 히스토리 초기화');
        set({
            snapshots: [],
            currentIndex: -1
        });
    }
});