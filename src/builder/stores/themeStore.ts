/**
 * Theme Store - Unified Zustand Store
 * ThemeStudio와 Builder Theme Tab이 공유하는 통합 테마 상태 관리
 */

import { create } from 'zustand';
import { ThemeService } from '../../services/theme';
import type { DesignTheme } from '../../types/theme';

interface ThemeState {
  // State
  themes: DesignTheme[];
  activeTheme: DesignTheme | null;
  loading: boolean;
  error: string | null;
  projectId: string | null;

  // Actions
  setProjectId: (projectId: string) => void;
  fetchThemes: () => Promise<void>;
  fetchActiveTheme: () => Promise<void>;
  createTheme: (
    name: string,
    parentThemeId?: string,
    status?: 'active' | 'draft' | 'archived'
  ) => Promise<DesignTheme | null>;
  updateTheme: (
    themeId: string,
    updates: { name?: string; status?: 'active' | 'draft' | 'archived' }
  ) => Promise<DesignTheme | null>;
  deleteTheme: (themeId: string) => Promise<boolean>;
  duplicateTheme: (
    sourceThemeId: string,
    newName: string,
    inherit?: boolean
  ) => Promise<string | null>;
  activateTheme: (themeId: string) => Promise<boolean>;

  // Realtime subscription
  subscribeToThemes: () => (() => void) | null;

  // Internal state updates (for realtime)
  _addTheme: (theme: DesignTheme) => void;
  _updateTheme: (theme: DesignTheme) => void;
  _removeTheme: (themeId: string) => void;
  _setActiveTheme: (theme: DesignTheme | null) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // Initial State
  themes: [],
  activeTheme: null,
  loading: false,
  error: null,
  projectId: null,

  /**
   * Set Project ID
   */
  setProjectId: (projectId: string) => {
    set({ projectId });
  },

  /**
   * Fetch all themes for the project
   */
  fetchThemes: async () => {
    const { projectId } = get();
    if (!projectId) {
      console.error('[ThemeStore] fetchThemes: projectId is null');
      return;
    }

    try {
      set({ loading: true, error: null });
      const themes = await ThemeService.getThemesByProject(projectId);
      set({ themes, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '테마 조회 실패';
      set({ error: message, loading: false });
      console.error('[ThemeStore] fetchThemes failed:', err);
    }
  },

  /**
   * Fetch active theme
   */
  fetchActiveTheme: async () => {
    const { projectId } = get();
    if (!projectId) {
      console.error('[ThemeStore] fetchActiveTheme: projectId is null');
      return;
    }

    try {
      set({ loading: true, error: null });
      const activeTheme = await ThemeService.getActiveTheme(projectId);
      set({ activeTheme, loading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '활성 테마 조회 실패';
      set({ error: message, loading: false });
      console.error('[ThemeStore] fetchActiveTheme failed:', err);
    }
  },

  /**
   * Create new theme
   */
  createTheme: async (
    name: string,
    parentThemeId?: string,
    status: 'active' | 'draft' | 'archived' = 'draft'
  ): Promise<DesignTheme | null> => {
    const { projectId } = get();
    if (!projectId) {
      console.error('[ThemeStore] createTheme: projectId is null');
      return null;
    }

    try {
      const newTheme = await ThemeService.createTheme({
        project_id: projectId,
        name,
        parent_theme_id: parentThemeId,
        status,
      });

      // Realtime will update automatically, but we add it manually for immediate feedback
      get()._addTheme(newTheme);

      return newTheme;
    } catch (err) {
      const message = err instanceof Error ? err.message : '테마 생성 실패';
      set({ error: message });
      console.error('[ThemeStore] createTheme failed:', err);
      return null;
    }
  },

  /**
   * Update theme
   */
  updateTheme: async (
    themeId: string,
    updates: { name?: string; status?: 'active' | 'draft' | 'archived' }
  ): Promise<DesignTheme | null> => {
    try {
      const updatedTheme = await ThemeService.updateTheme(themeId, updates);

      // Update in local state
      get()._updateTheme(updatedTheme);

      return updatedTheme;
    } catch (err) {
      const message = err instanceof Error ? err.message : '테마 업데이트 실패';
      set({ error: message });
      console.error('[ThemeStore] updateTheme failed:', err);
      return null;
    }
  },

  /**
   * Delete theme
   */
  deleteTheme: async (themeId: string): Promise<boolean> => {
    try {
      await ThemeService.deleteTheme(themeId);

      // Remove from local state
      get()._removeTheme(themeId);

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '테마 삭제 실패';
      set({ error: message });
      console.error('[ThemeStore] deleteTheme failed:', err);
      return false;
    }
  },

  /**
   * Duplicate theme
   */
  duplicateTheme: async (
    sourceThemeId: string,
    newName: string,
    inherit: boolean = false
  ): Promise<string | null> => {
    try {
      const newThemeId = await ThemeService.duplicateTheme(
        sourceThemeId,
        newName,
        inherit
      );

      // Refresh themes list
      await get().fetchThemes();

      return newThemeId;
    } catch (err) {
      const message = err instanceof Error ? err.message : '테마 복제 실패';
      set({ error: message });
      console.error('[ThemeStore] duplicateTheme failed:', err);
      return null;
    }
  },

  /**
   * Activate theme
   */
  activateTheme: async (themeId: string): Promise<boolean> => {
    try {
      await ThemeService.activateTheme(themeId);

      // Refresh themes list (status changes for multiple themes)
      await get().fetchThemes();
      await get().fetchActiveTheme();

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : '테마 활성화 실패';
      set({ error: message });
      console.error('[ThemeStore] activateTheme failed:', err);
      return false;
    }
  },

  /**
   * Subscribe to realtime theme updates
   */
  subscribeToThemes: () => {
    const { projectId } = get();
    if (!projectId) {
      console.error('[ThemeStore] subscribeToThemes: projectId is null');
      return null;
    }

    const unsubscribe = ThemeService.subscribeToProjectThemes(
      projectId,
      (payload) => {
        console.log('[ThemeStore] Realtime update:', payload);

        if (payload.eventType === 'INSERT') {
          get()._addTheme(payload.new as DesignTheme);

          // If new theme is active, set as active theme
          const newTheme = payload.new as DesignTheme;
          if (newTheme.status === 'active') {
            get()._setActiveTheme(newTheme);
          }
        } else if (payload.eventType === 'UPDATE') {
          get()._updateTheme(payload.new as DesignTheme);

          // Update active theme if it's the one being updated
          const updatedTheme = payload.new as DesignTheme;
          const { activeTheme } = get();

          if (activeTheme && updatedTheme.id === activeTheme.id) {
            get()._setActiveTheme(updatedTheme);
          }

          // If another theme becomes active
          if (updatedTheme.status === 'active' && activeTheme?.id !== updatedTheme.id) {
            get()._setActiveTheme(updatedTheme);
          }

          // If active theme becomes inactive
          if (activeTheme && updatedTheme.id === activeTheme.id && updatedTheme.status !== 'active') {
            get().fetchActiveTheme();
          }
        } else if (payload.eventType === 'DELETE') {
          get()._removeTheme(payload.old.id);

          // If active theme is deleted, fetch new active theme
          const { activeTheme } = get();
          if (activeTheme && payload.old.id === activeTheme.id) {
            get().fetchActiveTheme();
          }
        }
      }
    );

    return unsubscribe;
  },

  /**
   * Internal: Add theme to state (for realtime)
   */
  _addTheme: (theme: DesignTheme) => {
    set((state) => ({
      themes: [...state.themes, theme],
    }));
  },

  /**
   * Internal: Update theme in state (for realtime)
   */
  _updateTheme: (theme: DesignTheme) => {
    set((state) => ({
      themes: state.themes.map((t) => (t.id === theme.id ? theme : t)),
    }));
  },

  /**
   * Internal: Remove theme from state (for realtime)
   */
  _removeTheme: (themeId: string) => {
    set((state) => ({
      themes: state.themes.filter((t) => t.id !== themeId),
    }));
  },

  /**
   * Internal: Set active theme (for realtime)
   */
  _setActiveTheme: (theme: DesignTheme | null) => {
    set({ activeTheme: theme });
  },
}));
