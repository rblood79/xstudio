import { StateCreator } from "zustand";

/**
 * Settings 상태 인터페이스
 * 빌더 환경 설정 관리
 */
export interface SettingsState {
  /** Selection Overlay 표시 여부 (기본값: true) */
  showOverlay: boolean;

  /** Selection Overlay 표시 토글 */
  setShowOverlay: (show: boolean) => void;
}

/**
 * Settings Slice 생성
 */
export const createSettingsSlice: StateCreator<SettingsState> = (set) => ({
  showOverlay: true,

  /**
   * Selection Overlay 표시 토글
   */
  setShowOverlay: (show: boolean) => {
    set({ showOverlay: show });
  },
});
