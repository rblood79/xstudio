import { StateCreator } from "zustand";

/**
 * Settings 상태 인터페이스
 * 빌더 환경 설정 관리
 */
export interface SettingsState {
  /** Selection Overlay 표시 여부 (기본값: true) */
  showOverlay: boolean;

  /** Grid 표시 여부 (기본값: false) */
  showGrid: boolean;

  /** Grid에 스냅 활성화 여부 (기본값: false) */
  snapToGrid: boolean;

  /** Grid 크기 (기본값: 8px) */
  gridSize: 8 | 16 | 24;

  /** Selection Overlay 표시 토글 */
  setShowOverlay: (show: boolean) => void;

  /** Grid 표시 토글 */
  setShowGrid: (show: boolean) => void;

  /** Grid 스냅 토글 */
  setSnapToGrid: (snap: boolean) => void;

  /** Grid 크기 설정 */
  setGridSize: (size: 8 | 16 | 24) => void;
}

/**
 * Settings Slice 생성
 */
export const createSettingsSlice: StateCreator<SettingsState> = (set) => ({
  showOverlay: true,
  showGrid: false,
  snapToGrid: false,
  gridSize: 8,

  /**
   * Selection Overlay 표시 토글
   */
  setShowOverlay: (show: boolean) => {
    set({ showOverlay: show });
  },

  /**
   * Grid 표시 토글
   */
  setShowGrid: (show: boolean) => {
    set({ showGrid: show });
  },

  /**
   * Grid 스냅 토글
   */
  setSnapToGrid: (snap: boolean) => {
    set({ snapToGrid: snap });
  },

  /**
   * Grid 크기 설정
   */
  setGridSize: (size: 8 | 16 | 24) => {
    set({ gridSize: size });
  },
});
