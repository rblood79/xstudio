/**
 * Settings Store
 *
 * 사용자 설정 관리 (localStorage 기반 영구 저장)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSettings, SyncMode, ProjectCreationMode } from '../types/settings.types';
import { DEFAULT_SETTINGS } from '../types/settings.types';

interface SettingsState extends UserSettings {
  // Actions
  setSyncMode: (mode: SyncMode) => void;
  setProjectCreation: (mode: ProjectCreationMode) => void;
  setAutoSyncInterval: (minutes: number) => void;
  setAutoDownloadOnOpen: (enabled: boolean) => void;
  resetSettings: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state from defaults
      ...DEFAULT_SETTINGS,

      // Actions
      setSyncMode: (mode) => set({ syncMode: mode }),

      setProjectCreation: (mode) => set({ projectCreation: mode }),

      setAutoSyncInterval: (minutes) => set({ autoSyncInterval: minutes }),

      setAutoDownloadOnOpen: (enabled) => set({ autoDownloadOnOpen: enabled }),

      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'xstudio-settings', // localStorage key
      version: 1,
    }
  )
);

// 편의 함수: 현재 설정 가져오기
export const getSettings = (): UserSettings => {
  const state = useSettingsStore.getState();
  return {
    syncMode: state.syncMode,
    projectCreation: state.projectCreation,
    autoSyncInterval: state.autoSyncInterval,
    autoDownloadOnOpen: state.autoDownloadOnOpen,
  };
};
