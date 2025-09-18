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
    isTracking: boolean;

    // 히스토리 관리
    saveSnapshot: (elements: Element[], description: string) => void;
    undo: () => Element[] | null;
    redo: () => Element[] | null;
    canUndo: () => boolean;
    canRedo: () => boolean;
    clearHistory: () => void;
    pause: () => void;
    resume: () => void;
}

export const createHistorySlice: StateCreator<HistoryState> = (set, get) => ({
    snapshots: [],
    currentIndex: -1, // 초기 상태: -1 (스냅샷 없음)
    maxSnapshots: 50,
    isTracking: true,

    saveSnapshot: (elements: Element[], description: string) => {
        const state = get();

        // Zundo 패턴: isTracking이 false면 히스토리 저장 안함
        if (!state.isTracking) {
            console.log('🚫 히스토리 추적 일시정지됨 - 스냅샷 저장 생략');
            return;
        }

        console.group('📸 히스토리 스냅샷 저장');
        console.log('저장할 요소:', {
            count: elements.length,
            description,
            elementIds: elements.map(el => el.id)
        });
        console.log('현재 히스토리 상태:', {
            currentSnapshots: state.snapshots.length,
            currentIndex: state.currentIndex,
            isTracking: state.isTracking
        });

        set(produce((state: HistoryState) => {
            // Zundo 패턴: 현재 인덱스 이후의 미래 상태들 제거
            if (state.currentIndex >= 0 && state.currentIndex < state.snapshots.length - 1) {
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

            // Zundo 패턴: 최대 스냅샷 수 제한
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

        // Zundo 패턴: Undo 불가능한 경우
        if (state.currentIndex < 0) {
            console.log('🚫 Undo 불가: 이미 초기 상태');
            console.groupEnd();
            return null;
        }

        // Zundo 패턴: 현재 인덱스에서 이전 상태로 이동
        const newIndex = state.currentIndex - 1;

        if (newIndex < 0) {
            // 초기 상태로 돌아감 (빈 배열)
            set({ currentIndex: -1 });
            console.log('✅ Undo 성공: 초기 상태로 복원');
            console.groupEnd();
            return [];
        }

        const targetSnapshot = state.snapshots[newIndex];
        if (!targetSnapshot) {
            console.log('🚫 대상 스냅샷 없음');
            set({ currentIndex: -1 });
            console.groupEnd();
            return [];
        }

        set({ currentIndex: newIndex });

        console.log('✅ Undo 성공:', {
            previousIndex: state.currentIndex,
            newIndex: newIndex,
            elementsRestored: targetSnapshot.elements.length,
            description: targetSnapshot.description
        });
        console.groupEnd();
        return targetSnapshot.elements;
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
    },

    // Zundo 패턴: 히스토리 추적 일시정지
    pause: () => {
        console.log('⏸️ 히스토리 추적 일시정지');
        set({ isTracking: false });
    },

    // Zundo 패턴: 히스토리 추적 재개
    resume: () => {
        console.log('▶️ 히스토리 추적 재개');
        set({ isTracking: true });
    }
});