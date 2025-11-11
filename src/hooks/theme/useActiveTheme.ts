/**
 * useActiveTheme Hook
 * 현재 활성 테마 관리 (Realtime 동기화)
 *
 * ✅ Migrated to use unified theme store
 * This is now a wrapper around the unified theme store
 */

import { useEffect } from 'react';
import { useUnifiedThemeStore } from '../../builder/stores/themeStore';
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
 * useActiveTheme - Wrapper around unified theme store
 * Provides backward compatibility with existing code
 */
export function useActiveTheme(
  options: UseActiveThemeOptions
): UseActiveThemeReturn {
  const { projectId, enableRealtime = true } = options;

  // Use unified theme store
  const activeTheme = useUnifiedThemeStore((state) => state.activeTheme);
  const loading = useUnifiedThemeStore((state) => state.loading);
  const error = useUnifiedThemeStore((state) => state.error);
  const setProjectId = useUnifiedThemeStore((state) => state.setProjectId);
  const loadActiveTheme = useUnifiedThemeStore((state) => state.loadActiveTheme);
  const activateTheme = useUnifiedThemeStore((state) => state.activateTheme);
  const subscribeToThemes = useUnifiedThemeStore((state) => state.subscribeToThemes);

  /**
   * Initialize store with projectId
   * Note: Zustand store functions are stable, but we only depend on projectId
   * to avoid unnecessary re-runs
   */
  useEffect(() => {
    setProjectId(projectId);
    loadActiveTheme(projectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /**
   * Setup Realtime subscription
   * The store handles all realtime logic internally
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
    refetch: async () => { await loadActiveTheme(projectId); },
    switchTheme,
  };
}
