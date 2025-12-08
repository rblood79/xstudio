import { StateCreator } from "zustand";

export interface HistoryInfo {
  canUndo: boolean;
  canRedo: boolean;
  totalEntries: number;
  currentIndex: number;
}

/**
 * Settings 상태 인터페이스
 * 빌더 환경 설정 관리
 */
export interface SettingsState {
  /** 빌더 뷰 모드 (기본값: 'canvas') */
  viewMode: 'canvas' | 'workflow';

  /** Selection Overlay 표시 여부 (기본값: true) */
  showOverlay: boolean;

  /** Grid 표시 여부 (기본값: false) */
  showGrid: boolean;

  /** Grid에 스냅 활성화 여부 (기본값: false) */
  snapToGrid: boolean;

  /** Grid 크기 (기본값: 8px) */
  gridSize: 8 | 16 | 24;

  /** Element 테두리 표시 여부 (기본값: false) */
  showElementBorders: boolean;

  /** Element 라벨 표시 여부 (기본값: false) */
  showElementLabels: boolean;

  /** Overlay 투명도 (기본값: 100, 범위: 0-100) */
  overlayOpacity: number;

  /** 테마 모드 (기본값: 'auto') */
  themeMode: 'light' | 'dark' | 'auto';

  /** UI 스케일 (기본값: 100, 범위: 80 | 100 | 120) */
  uiScale: 80 | 100 | 120;

  /** History 정보 (Monitor에서 사용) */
  historyInfo: HistoryInfo;

  /** Selection Overlay 표시 토글 */
  setShowOverlay: (show: boolean) => void;

  /** Grid 표시 토글 */
  setShowGrid: (show: boolean) => void;

  /** Grid 스냅 토글 */
  setSnapToGrid: (snap: boolean) => void;

  /** Grid 크기 설정 */
  setGridSize: (size: 8 | 16 | 24) => void;

  /** Element 테두리 표시 토글 */
  setShowElementBorders: (show: boolean) => void;

  /** Element 라벨 표시 토글 */
  setShowElementLabels: (show: boolean) => void;

  /** Overlay 투명도 설정 */
  setOverlayOpacity: (opacity: number) => void;

  /** 테마 모드 설정 */
  setThemeMode: (mode: 'light' | 'dark' | 'auto') => void;

  /** UI 스케일 설정 */
  setUiScale: (scale: 80 | 100 | 120) => void;

  /** History 정보 업데이트 */
  setHistoryInfo: (info: HistoryInfo) => void;

  /** 뷰 모드 설정 */
  setViewMode: (mode: 'canvas' | 'workflow') => void;

  /** 뷰 모드 토글 */
  toggleViewMode: () => void;
}

/**
 * Settings Slice 생성
 */
export const createSettingsSlice: StateCreator<SettingsState> = (set, get) => ({
  viewMode: 'canvas',
  showOverlay: true,
  showGrid: false,
  snapToGrid: false,
  gridSize: 8,
  showElementBorders: false,
  showElementLabels: false,
  overlayOpacity: 100,
  themeMode: 'auto',
  uiScale: 100,
  historyInfo: {
    canUndo: false,
    canRedo: false,
    totalEntries: 0,
    currentIndex: -1,
  },

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

  /**
   * Element 테두리 표시 토글
   */
  setShowElementBorders: (show: boolean) => {
    set({ showElementBorders: show });
  },

  /**
   * Element 라벨 표시 토글
   */
  setShowElementLabels: (show: boolean) => {
    set({ showElementLabels: show });
  },

  /**
   * Overlay 투명도 설정
   */
  setOverlayOpacity: (opacity: number) => {
    set({ overlayOpacity: opacity });
  },

  /**
   * 테마 모드 설정
   */
  setThemeMode: (mode: 'light' | 'dark' | 'auto') => {
    set({ themeMode: mode });
  },

  /**
   * UI 스케일 설정
   */
  setUiScale: (scale: 80 | 100 | 120) => {
    set({ uiScale: scale });
  },

  /**
   * History 정보 업데이트
   */
  setHistoryInfo: (info: HistoryInfo) => {
    set({ historyInfo: info });
  },

  /**
   * 뷰 모드 설정
   */
  setViewMode: (mode: 'canvas' | 'workflow') => {
    set({ viewMode: mode });
  },

  /**
   * 뷰 모드 토글
   */
  toggleViewMode: () => {
    const current = get().viewMode;
    set({ viewMode: current === 'canvas' ? 'workflow' : 'canvas' });
  },
});
