/**
 * UI Store
 *
 * 앱 전역 UI 설정 관리 (localStorage 기반 영구 저장)
 * - themeMode: 테마 모드 (light/dark/auto)
 * - uiScale: UI 스케일 (80/100/120)
 *
 * Phase 1: settings.ts에서 분리하여 글로벌 UI 설정 격리
 *
 * @since 2024-12-29
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// Types
// ============================================

export type ThemeMode = 'light' | 'dark' | 'auto';
export type UiScale = 80 | 100 | 120;

export interface UiState {
  /** 테마 모드 (기본값: 'auto') */
  themeMode: ThemeMode;

  /** UI 스케일 (기본값: 100) */
  uiScale: UiScale;

  /** 테마 모드 설정 */
  setThemeMode: (mode: ThemeMode) => void;

  /** UI 스케일 설정 */
  setUiScale: (scale: UiScale) => void;

  /** 설정 초기화 */
  resetUiSettings: () => void;
}

// ============================================
// Default Values
// ============================================

const DEFAULT_UI_STATE = {
  themeMode: 'auto' as ThemeMode,
  uiScale: 100 as UiScale,
};

// ============================================
// Store
// ============================================

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      // Initial state
      ...DEFAULT_UI_STATE,

      // Actions
      setThemeMode: (mode: ThemeMode) => {
        set({ themeMode: mode });
      },

      setUiScale: (scale: UiScale) => {
        document.documentElement.style.setProperty('--ui-scale', String(scale));
        set({ uiScale: scale });
      },

      resetUiSettings: () => {
        set(DEFAULT_UI_STATE);
      },
    }),
    {
      name: 'xstudio-ui', // localStorage key
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state?.uiScale) {
          document.documentElement.style.setProperty('--ui-scale', String(state.uiScale));
        }
      },
    }
  )
);

// ============================================
// Selectors (for convenience)
// ============================================

export const useThemeMode = () => useUiStore((state) => state.themeMode);
export const useUiScale = () => useUiStore((state) => state.uiScale);

// ============================================
// Non-React Access (for effects, services)
// ============================================

export const getUiState = (): Pick<UiState, 'themeMode' | 'uiScale'> => {
  const state = useUiStore.getState();
  return {
    themeMode: state.themeMode,
    uiScale: state.uiScale,
  };
};

