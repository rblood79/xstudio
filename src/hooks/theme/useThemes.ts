/**
 * useThemes Hook
 * 프로젝트의 테마 목록 관리 (Realtime 동기화)
 *
 * ✅ Migrated to use unified theme store
 * This is now a wrapper around the unified theme store
 */

import { useEffect } from 'react';
import { useUnifiedThemeStore } from '../../builder/stores/themeStore';
import type { DesignTheme } from '../../types/theme';

export interface UseThemesOptions {
  projectId: string;
  enableRealtime?: boolean;
}

export interface UseThemesReturn {
  themes: DesignTheme[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
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
}

/**
 * useThemes - Wrapper around unified theme store
 * Provides backward compatibility with existing code
 */
export function useThemes(options: UseThemesOptions): UseThemesReturn {
  const { projectId, enableRealtime = true } = options;

  // Use unified theme store
  const themes = useUnifiedThemeStore((state) => state.themes);
  const loading = useUnifiedThemeStore((state) => state.loading);
  const error = useUnifiedThemeStore((state) => state.error);
  const setProjectId = useUnifiedThemeStore((state) => state.setProjectId);
  const loadThemes = useUnifiedThemeStore((state) => state.loadThemes);
  const createTheme = useUnifiedThemeStore((state) => state.createTheme);
  const updateTheme = useUnifiedThemeStore((state) => state.updateTheme);
  const deleteTheme = useUnifiedThemeStore((state) => state.deleteTheme);
  const duplicateTheme = useUnifiedThemeStore((state) => state.duplicateTheme);
  const activateTheme = useUnifiedThemeStore((state) => state.activateTheme);
  const subscribeToThemes = useUnifiedThemeStore((state) => state.subscribeToThemes);

  /**
   * Initialize store with projectId
   * Note: Zustand store functions are stable, but we only depend on projectId
   * to avoid unnecessary re-runs
   */
  useEffect(() => {
    setProjectId(projectId);
    loadThemes(projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /**
   * Setup Realtime subscription
   * Note: Only depend on enableRealtime flag, not the function reference
   */
  useEffect(() => {
    if (!enableRealtime) return;

    const unsubscribe = subscribeToThemes();
    return () => {
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enableRealtime]);

  return {
    themes,
    loading,
    error,
    refetch: async () => { await loadThemes(projectId); },
    createTheme,
    updateTheme,
    deleteTheme,
    duplicateTheme,
    activateTheme,
  };
}
