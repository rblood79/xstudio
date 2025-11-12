/**
 * Panel Layout Slice
 *
 * 패널 레이아웃 상태를 관리하는 Zustand slice
 */

import type { StateCreator } from 'zustand';
import type { PanelLayoutState } from '../panels/core/types';
import { DEFAULT_PANEL_LAYOUT } from '../panels/core/types';
import { PANEL_LAYOUT_STORAGE_KEY } from '../layout/types';

/**
 * Panel Layout State
 */
export interface PanelLayoutSliceState {
  panelLayout: PanelLayoutState;
}

/**
 * Panel Layout Actions
 */
export interface PanelLayoutSliceActions {
  setPanelLayout: (layout: PanelLayoutState) => void;
  resetPanelLayout: () => void;
  savePanelLayoutToStorage: () => void;
  loadPanelLayoutFromStorage: () => void;
}

/**
 * Panel Layout Slice 전체 타입
 */
export type PanelLayoutState = PanelLayoutSliceState & PanelLayoutSliceActions;

/**
 * LocalStorage에서 레이아웃 로드
 */
function loadLayoutFromStorage(): PanelLayoutState | null {
  try {
    const stored = localStorage.getItem(PANEL_LAYOUT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 기본값과 병합하여 누락된 필드 방지
      return {
        ...DEFAULT_PANEL_LAYOUT,
        ...parsed,
      };
    }
  } catch (error) {
    console.error('[PanelLayout] Failed to load from localStorage:', error);
  }
  return null;
}

/**
 * LocalStorage에 레이아웃 저장
 */
function saveLayoutToStorage(layout: PanelLayoutState): void {
  try {
    localStorage.setItem(PANEL_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch (error) {
    console.error('[PanelLayout] Failed to save to localStorage:', error);
  }
}

/**
 * Panel Layout Slice 생성
 */
export const createPanelLayoutSlice: StateCreator<
  PanelLayoutState,
  [],
  [],
  PanelLayoutState
> = (set, get) => ({
  // 초기 상태: localStorage에서 로드하거나 기본값 사용
  panelLayout: loadLayoutFromStorage() || DEFAULT_PANEL_LAYOUT,

  /**
   * 레이아웃 설정 및 자동 저장
   */
  setPanelLayout: (layout) => {
    set({ panelLayout: layout });
    saveLayoutToStorage(layout);
  },

  /**
   * 레이아웃 초기화
   */
  resetPanelLayout: () => {
    set({ panelLayout: DEFAULT_PANEL_LAYOUT });
    saveLayoutToStorage(DEFAULT_PANEL_LAYOUT);
  },

  /**
   * 현재 레이아웃을 localStorage에 저장
   */
  savePanelLayoutToStorage: () => {
    const { panelLayout } = get();
    saveLayoutToStorage(panelLayout);
  },

  /**
   * localStorage에서 레이아웃 로드
   */
  loadPanelLayoutFromStorage: () => {
    const loaded = loadLayoutFromStorage();
    if (loaded) {
      set({ panelLayout: loaded });
    }
  },
});
