/**
 * useThemes Hook
 * 프로젝트의 테마 목록 관리 (Realtime 동기화)
 *
 * ⚠️ Refactored to use unified Zustand themeStore
 * This is now a wrapper around the centralized theme store
 */

import { useEffect } from 'react';
import { useThemeStore } from '../../builder/stores/themeStore';
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
 * useThemes - Wrapper around Zustand themeStore
 * Provides backward compatibility with existing code
 */
export function useThemes(options: UseThemesOptions): UseThemesReturn {
  const { projectId, enableRealtime = true } = options;

  // Use centralized Zustand store
  const themes = useThemeStore((state) => state.themes);
  const loading = useThemeStore((state) => state.loading);
  const error = useThemeStore((state) => state.error);
  const setProjectId = useThemeStore((state) => state.setProjectId);
  const fetchThemes = useThemeStore((state) => state.fetchThemes);
  const createTheme = useThemeStore((state) => state.createTheme);
  const updateTheme = useThemeStore((state) => state.updateTheme);
  const deleteTheme = useThemeStore((state) => state.deleteTheme);
  const duplicateTheme = useThemeStore((state) => state.duplicateTheme);
  const activateTheme = useThemeStore((state) => state.activateTheme);
  const subscribeToThemes = useThemeStore((state) => state.subscribeToThemes);

  /**
   * Initialize store with projectId
   */
  useEffect(() => {
    setProjectId(projectId);
    fetchThemes();
  }, [projectId, setProjectId, fetchThemes]);

  /**
   * Setup Realtime subscription
   */
  useEffect(() => {
    if (!enableRealtime) return;

    const unsubscribe = subscribeToThemes();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [enableRealtime, subscribeToThemes]);

  return {
    themes,
    loading,
    error,
    refetch: fetchThemes,
    createTheme,
    updateTheme,
    deleteTheme,
    duplicateTheme,
    activateTheme,
  };
}
