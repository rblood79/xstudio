/**
 * Canvas Settings Slice
 *
 * 빌더 캔버스 환경 설정 관리
 * - viewMode, showGrid, snapToGrid, gridSize 등
 *
 * @since 2024-12-29
 * @updated 2025-12-29 - overlay/visualization 설정 제거 (WebGL 전환으로 불필요)
 */

import { StateCreator } from "zustand";

export interface HistoryInfo {
  canUndo: boolean;
  canRedo: boolean;
  totalEntries: number;
  currentIndex: number;
}

/**
 * Settings 상태 인터페이스
 * 빌더 캔버스 환경 설정 관리
 *
 * Note: themeMode, uiScale은 src/stores/uiStore.ts로 이관됨
 * Note: showOverlay, overlayOpacity, showElementBorders, showElementLabels 제거됨 (WebGL 전환)
 */
export interface SettingsState {
  /** 빌더 뷰 모드 (기본값: 'canvas') */
  viewMode: 'canvas' | 'workflow';

  /** Grid 표시 여부 (기본값: false) */
  showGrid: boolean;

  /** Grid에 스냅 활성화 여부 (기본값: false) */
  snapToGrid: boolean;

  /** Grid 크기 (기본값: 8px) */
  gridSize: 8 | 16 | 24;

  /** History 정보 (Monitor에서 사용) */
  historyInfo: HistoryInfo;

  /** Grid 표시 토글 */
  setShowGrid: (show: boolean) => void;

  /** Grid 스냅 토글 */
  setSnapToGrid: (snap: boolean) => void;

  /** Grid 크기 설정 */
  setGridSize: (size: 8 | 16 | 24) => void;

  /** History 정보 업데이트 */
  setHistoryInfo: (info: HistoryInfo) => void;

  /** Workflow 오버레이 표시 여부 (기본값: false) */
  showWorkflowOverlay: boolean;

  /** 뷰 모드 설정 */
  setViewMode: (mode: 'canvas' | 'workflow') => void;

  /** 뷰 모드 토글 */
  toggleViewMode: () => void;

  /** Workflow 오버레이 표시 설정 */
  setShowWorkflowOverlay: (show: boolean) => void;

  /** Workflow 오버레이 표시 토글 */
  toggleWorkflowOverlay: () => void;

  /** Workflow Navigation edges 표시 여부 (기본값: true) */
  showWorkflowNavigation: boolean;
  /** Workflow Navigation edges 표시 설정 */
  setShowWorkflowNavigation: (show: boolean) => void;
  /** Workflow Navigation edges 표시 토글 */
  toggleWorkflowNavigation: () => void;

  /** Workflow Event-navigation edges 표시 여부 (기본값: true) */
  showWorkflowEvents: boolean;
  /** Workflow Event-navigation edges 표시 설정 */
  setShowWorkflowEvents: (show: boolean) => void;
  /** Workflow Event-navigation edges 표시 토글 */
  toggleWorkflowEvents: () => void;

  /** Workflow Data source connections 표시 여부 (기본값: true) */
  showWorkflowDataSources: boolean;
  /** Workflow Data source connections 표시 설정 */
  setShowWorkflowDataSources: (show: boolean) => void;
  /** Workflow Data source connections 표시 토글 */
  toggleWorkflowDataSources: () => void;

  /** Workflow Layout group visualization 표시 여부 (기본값: true) */
  showWorkflowLayoutGroups: boolean;
  /** Workflow Layout group visualization 표시 설정 */
  setShowWorkflowLayoutGroups: (show: boolean) => void;
  /** Workflow Layout group visualization 표시 토글 */
  toggleWorkflowLayoutGroups: () => void;

  /** Workflow에서 포커스된 페이지 ID (기본값: null) */
  workflowFocusedPageId: string | null;
  /** Workflow 포커스 페이지 설정 */
  setWorkflowFocusedPageId: (pageId: string | null) => void;
}

/**
 * Settings Slice 생성
 */
export const createSettingsSlice: StateCreator<SettingsState> = (set, get) => ({
  viewMode: 'canvas',
  showGrid: false,
  snapToGrid: false,
  showWorkflowOverlay: false,
  showWorkflowNavigation: true,
  showWorkflowEvents: true,
  showWorkflowDataSources: true,
  showWorkflowLayoutGroups: true,
  workflowFocusedPageId: null,
  gridSize: 8,
  historyInfo: {
    canUndo: false,
    canRedo: false,
    totalEntries: 0,
    currentIndex: -1,
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

  /**
   * Workflow 오버레이 표시 설정
   */
  setShowWorkflowOverlay: (show: boolean) => {
    set({ showWorkflowOverlay: show });
  },

  /**
   * Workflow 오버레이 표시 토글
   */
  toggleWorkflowOverlay: () => {
    set((state) => ({ showWorkflowOverlay: !state.showWorkflowOverlay }));
  },

  /**
   * Workflow Navigation edges 표시 설정
   */
  setShowWorkflowNavigation: (show: boolean) => {
    set({ showWorkflowNavigation: show });
  },

  /**
   * Workflow Navigation edges 표시 토글
   */
  toggleWorkflowNavigation: () => {
    set((state) => ({ showWorkflowNavigation: !state.showWorkflowNavigation }));
  },

  /**
   * Workflow Event-navigation edges 표시 설정
   */
  setShowWorkflowEvents: (show: boolean) => {
    set({ showWorkflowEvents: show });
  },

  /**
   * Workflow Event-navigation edges 표시 토글
   */
  toggleWorkflowEvents: () => {
    set((state) => ({ showWorkflowEvents: !state.showWorkflowEvents }));
  },

  /**
   * Workflow Data source connections 표시 설정
   */
  setShowWorkflowDataSources: (show: boolean) => {
    set({ showWorkflowDataSources: show });
  },

  /**
   * Workflow Data source connections 표시 토글
   */
  toggleWorkflowDataSources: () => {
    set((state) => ({ showWorkflowDataSources: !state.showWorkflowDataSources }));
  },

  /**
   * Workflow Layout group visualization 표시 설정
   */
  setShowWorkflowLayoutGroups: (show: boolean) => {
    set({ showWorkflowLayoutGroups: show });
  },

  /**
   * Workflow Layout group visualization 표시 토글
   */
  toggleWorkflowLayoutGroups: () => {
    set((state) => ({ showWorkflowLayoutGroups: !state.showWorkflowLayoutGroups }));
  },

  /**
   * Workflow 포커스 페이지 설정
   */
  setWorkflowFocusedPageId: (pageId: string | null) => {
    set({ workflowFocusedPageId: pageId });
  },
});
