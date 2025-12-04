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
export type PanelLayoutSlice = PanelLayoutSliceState & PanelLayoutSliceActions;

/**
 * LocalStorage에서 레이아웃 로드
 */
function loadLayoutFromStorage(): import('../panels/core/types').PanelLayoutState | null {
  try {
    const stored = localStorage.getItem(PANEL_LAYOUT_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);

      // 마이그레이션: 구 형식(activeLeftPanel/activeRightPanel) → 신 형식(배열)
      const migrated = { ...parsed };

      // activeLeftPanel(구) → activeLeftPanels(신)
      if ('activeLeftPanel' in parsed && !Array.isArray(parsed.activeLeftPanels)) {
        migrated.activeLeftPanels = parsed.activeLeftPanel ? [parsed.activeLeftPanel] : [];
        delete migrated.activeLeftPanel;
      }

      // activeRightPanel(구) → activeRightPanels(신)
      if ('activeRightPanel' in parsed && !Array.isArray(parsed.activeRightPanels)) {
        migrated.activeRightPanels = parsed.activeRightPanel ? [parsed.activeRightPanel] : [];
        delete migrated.activeRightPanel;
      }

      // 기본값과 병합하여 누락된 필드 방지
      const result = {
        ...DEFAULT_PANEL_LAYOUT,
        ...migrated,
      };

      // 배열 유효성 검증
      if (!Array.isArray(result.activeLeftPanels)) {
        result.activeLeftPanels = DEFAULT_PANEL_LAYOUT.activeLeftPanels;
      }
      if (!Array.isArray(result.activeRightPanels)) {
        result.activeRightPanels = DEFAULT_PANEL_LAYOUT.activeRightPanels;
      }

      // Bottom panel 마이그레이션 (Phase 2에서 추가)
      if (!Array.isArray(result.bottomPanels)) {
        result.bottomPanels = DEFAULT_PANEL_LAYOUT.bottomPanels;
      }
      if (!Array.isArray(result.activeBottomPanels)) {
        result.activeBottomPanels = DEFAULT_PANEL_LAYOUT.activeBottomPanels;
      }
      if (typeof result.showBottom !== 'boolean') {
        result.showBottom = DEFAULT_PANEL_LAYOUT.showBottom;
      }
      if (typeof result.bottomHeight !== 'number') {
        result.bottomHeight = DEFAULT_PANEL_LAYOUT.bottomHeight;
      }

      // 마이그레이션: datasetEditor가 leftPanels에 없으면 추가
      if (Array.isArray(result.leftPanels) && !result.leftPanels.includes('datasetEditor')) {
        const datasetIndex = result.leftPanels.indexOf('dataset');
        if (datasetIndex >= 0) {
          // dataset 바로 뒤에 삽입
          result.leftPanels.splice(datasetIndex + 1, 0, 'datasetEditor');
        } else {
          // dataset이 없으면 맨 뒤에 추가
          result.leftPanels.push('datasetEditor');
        }
      }

      // 🔧 임시 수정: 너무 많은 패널이 활성화된 경우 기본값으로 리셋
      if (result.activeLeftPanels.length > 2 || result.activeRightPanels.length > 2) {
        console.warn('[PanelLayout] 너무 많은 패널이 활성화되어 있습니다. 기본값으로 리셋합니다.');
        result.activeLeftPanels = DEFAULT_PANEL_LAYOUT.activeLeftPanels;
        result.activeRightPanels = DEFAULT_PANEL_LAYOUT.activeRightPanels;
        // 리셋된 값을 저장
        saveLayoutToStorage(result);
      }

      return result;
    }
  } catch (error) {
    console.error('[PanelLayout] Failed to load from localStorage:', error);
  }
  return null;
}

/**
 * LocalStorage에 레이아웃 저장
 */
function saveLayoutToStorage(layout: import('../panels/core/types').PanelLayoutState): void {
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
  PanelLayoutSlice,
  [],
  [],
  PanelLayoutSlice
> = (set, get) => ({
  // 초기 상태: localStorage에서 로드하거나 기본값 사용
  panelLayout: loadLayoutFromStorage() || DEFAULT_PANEL_LAYOUT,

  /**
   * 레이아웃 설정 및 자동 저장
   */
  setPanelLayout: (layout: import('../panels/core/types').PanelLayoutState) => {
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
