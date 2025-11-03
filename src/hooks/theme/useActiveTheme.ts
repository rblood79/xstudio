/**
 * useActiveTheme Hook
 * 현재 활성 테마 관리 (Realtime 동기화)
 *
 * ⚠️ Refactored to use unified Zustand themeStore
 * This is now a wrapper around the centralized theme store
 */

import { useEffect } from 'react';
import { useThemeStore } from '../../builder/stores/themeStore';
import type { DesignTheme } from '../../types/theme';

export interface UseActiveThemeOptions {
  projectId: string;
  enableRealtime?: boolean;
}

export interface UseActiveThemeReturn {
  activeTheme: DesignTheme | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  switchTheme: (themeId: string) => Promise<boolean>;
}

/**
 * useActiveTheme - Wrapper around Zustand themeStore
 * Provides backward compatibility with existing code
 */
export function useActiveTheme(
  options: UseActiveThemeOptions
): UseActiveThemeReturn {
  const { projectId, enableRealtime = true } = options;

  // Use centralized Zustand store
  const activeTheme = useThemeStore((state) => state.activeTheme);
  const loading = useThemeStore((state) => state.loading);
  const error = useThemeStore((state) => state.error);
  const setProjectId = useThemeStore((state) => state.setProjectId);
  const fetchActiveTheme = useThemeStore((state) => state.fetchActiveTheme);
  const activateTheme = useThemeStore((state) => state.activateTheme);
  const subscribeToThemes = useThemeStore((state) => state.subscribeToThemes);

  /**
   * Initialize store with projectId
   */
  useEffect(() => {
    setProjectId(projectId);
    fetchActiveTheme();
  }, [projectId, setProjectId, fetchActiveTheme]);

  /**
   * Setup Realtime subscription
   * The store handles all realtime logic internally
   */
  useEffect(() => {
    if (!enableRealtime) return;

    const unsubscribe = subscribeToThemes();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [enableRealtime, subscribeToThemes]);

  /**
   * Alias for activateTheme (backward compatibility)
   */
  const switchTheme = async (themeId: string): Promise<boolean> => {
    return activateTheme(themeId);
  };

  return {
    activeTheme,
    loading,
    error,
    refetch: fetchActiveTheme,
    switchTheme,
  };
}
