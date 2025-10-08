import { StateCreator } from "zustand";

/**
 * SaveMode 상태 인터페이스
 * 실시간 저장 모드와 수동 저장 모드 관리
 */
export interface SaveModeState {
  /** 실시간 저장 모드 활성화 여부 (기본값: true) */
  isRealtimeMode: boolean;

  /** 보류 중인 변경사항 (key: 'table:id', value: 변경 데이터) */
  pendingChanges: Map<string, Record<string, unknown>>;

  /** 실시간 모드 토글 */
  setRealtimeMode: (enabled: boolean) => void;

  /** 보류 중인 변경사항 추가 */
  addPendingChange: (key: string, value: Record<string, unknown>) => void;

  /** 모든 보류 중인 변경사항 제거 */
  clearPendingChanges: () => void;

  /** 보류 중인 변경사항 조회 */
  getPendingChanges: () => Map<string, Record<string, unknown>>;
}

/**
 * SaveMode Slice 생성
 */
export const createSaveModeSlice: StateCreator<SaveModeState> = (set, get) => ({
  isRealtimeMode: true,
  pendingChanges: new Map(),

  /**
   * 실시간 저장 모드 토글
   */
  setRealtimeMode: (enabled: boolean) => {
    set({ isRealtimeMode: enabled });
  },

  addPendingChange: (key: string, value: Record<string, unknown>): void => {
    const currentChanges = get().pendingChanges;
    const newChanges = new Map(currentChanges);

    // 기존 변경사항과 병합
    const existingData = newChanges.get(key) || {};
    newChanges.set(key, { ...existingData, ...value });

    set({ pendingChanges: newChanges });
  },

  clearPendingChanges: (): void => {
    set({ pendingChanges: new Map() });
  },

  getPendingChanges: (): Map<string, Record<string, unknown>> => {
    return get().pendingChanges;
  },
});
