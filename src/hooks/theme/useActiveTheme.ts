/**
 * useActiveTheme Hook
 * 현재 활성 테마 관리 (Realtime 동기화)
 */

import { useState, useEffect, useCallback } from 'react';
import { ThemeService } from '../../services/theme';
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

export function useActiveTheme(
  options: UseActiveThemeOptions
): UseActiveThemeReturn {
  const { projectId, enableRealtime = true } = options;

  const [activeTheme, setActiveTheme] = useState<DesignTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 활성 테마 가져오기
   */
  const fetchActiveTheme = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const theme = await ThemeService.getActiveTheme(projectId);
      setActiveTheme(theme);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '활성 테마 조회 실패';
      setError(message);
      console.error('[useActiveTheme] fetchActiveTheme failed:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  /**
   * 초기 데이터 로드
   */
  useEffect(() => {
    fetchActiveTheme();
  }, [fetchActiveTheme]);

  /**
   * Realtime 구독
   */
  useEffect(() => {
    if (!enableRealtime || !projectId) return;

    const unsubscribe = ThemeService.subscribeToProjectThemes(
      projectId,
      (payload) => {
        console.log('[useActiveTheme] Realtime update:', payload);

        // 활성 테마가 업데이트된 경우
        if (payload.eventType === 'UPDATE') {
          const updatedTheme = payload.new as DesignTheme;

          // 현재 활성 테마가 업데이트된 경우
          if (
            activeTheme &&
            updatedTheme.id === activeTheme.id &&
            updatedTheme.status === 'active'
          ) {
            setActiveTheme(updatedTheme);
          }

          // 다른 테마가 활성화된 경우
          if (
            updatedTheme.status === 'active' &&
            activeTheme?.id !== updatedTheme.id
          ) {
            setActiveTheme(updatedTheme);
          }

          // 활성 테마가 비활성화된 경우
          if (
            activeTheme &&
            updatedTheme.id === activeTheme.id &&
            updatedTheme.status !== 'active'
          ) {
            // 첫 번째 테마를 활성 테마로 설정 (fallback)
            fetchActiveTheme();
          }
        }

        // 활성 테마가 삭제된 경우
        if (
          payload.eventType === 'DELETE' &&
          activeTheme &&
          payload.old.id === activeTheme.id
        ) {
          fetchActiveTheme();
        }

        // 새 테마가 활성 상태로 생성된 경우
        if (payload.eventType === 'INSERT') {
          const newTheme = payload.new as DesignTheme;
          if (newTheme.status === 'active') {
            setActiveTheme(newTheme);
          }
        }
      }
    );

    return unsubscribe;
  }, [enableRealtime, projectId, activeTheme, fetchActiveTheme]);

  /**
   * 테마 전환
   */
  const switchTheme = useCallback(
    async (themeId: string): Promise<boolean> => {
      try {
        await ThemeService.activateTheme(themeId);

        // Realtime이 비활성화된 경우 수동으로 상태 업데이트
        if (!enableRealtime) {
          const theme = await ThemeService.getThemeById(themeId);
          setActiveTheme(theme);
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : '테마 전환 실패';
        setError(message);
        console.error('[useActiveTheme] switchTheme failed:', err);
        return false;
      }
    },
    [enableRealtime]
  );

  return {
    activeTheme,
    loading,
    error,
    refetch: fetchActiveTheme,
    switchTheme,
  };
}
