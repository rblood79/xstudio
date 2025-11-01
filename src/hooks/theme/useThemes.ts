/**
 * useThemes Hook
 * 프로젝트의 테마 목록 관리 (Realtime 동기화)
 */

import { useState, useEffect, useCallback } from 'react';
import { ThemeService } from '../../services/theme';
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

export function useThemes(options: UseThemesOptions): UseThemesReturn {
  const { projectId, enableRealtime = true } = options;

  const [themes, setThemes] = useState<DesignTheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 테마 목록 가져오기
   */
  const fetchThemes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await ThemeService.getThemesByProject(projectId);
      setThemes(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '테마 조회 실패';
      setError(message);
      console.error('[useThemes] fetchThemes failed:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  /**
   * 초기 데이터 로드
   */
  useEffect(() => {
    fetchThemes();
  }, [fetchThemes]);

  /**
   * Realtime 구독
   */
  useEffect(() => {
    if (!enableRealtime || !projectId) return;

    const unsubscribe = ThemeService.subscribeToProjectThemes(
      projectId,
      (payload) => {
        console.log('[useThemes] Realtime update:', payload);

        if (payload.eventType === 'INSERT') {
          setThemes((prev) => [...prev, payload.new as DesignTheme]);
        } else if (payload.eventType === 'UPDATE') {
          setThemes((prev) =>
            prev.map((theme) =>
              theme.id === payload.new.id ? (payload.new as DesignTheme) : theme
            )
          );
        } else if (payload.eventType === 'DELETE') {
          setThemes((prev) =>
            prev.filter((theme) => theme.id !== payload.old.id)
          );
        }
      }
    );

    return unsubscribe;
  }, [enableRealtime, projectId]);

  /**
   * 테마 생성
   */
  const createTheme = useCallback(
    async (
      name: string,
      parentThemeId?: string,
      status: 'active' | 'draft' | 'archived' = 'draft'
    ): Promise<DesignTheme | null> => {
      try {
        const newTheme = await ThemeService.createTheme({
          project_id: projectId,
          name,
          parent_theme_id: parentThemeId,
          status,
        });

        // Realtime이 비활성화된 경우 수동으로 상태 업데이트
        if (!enableRealtime) {
          setThemes((prev) => [...prev, newTheme]);
        }

        return newTheme;
      } catch (err) {
        const message = err instanceof Error ? err.message : '테마 생성 실패';
        setError(message);
        console.error('[useThemes] createTheme failed:', err);
        return null;
      }
    },
    [projectId, enableRealtime]
  );

  /**
   * 테마 업데이트
   */
  const updateTheme = useCallback(
    async (
      themeId: string,
      updates: { name?: string; status?: 'active' | 'draft' | 'archived' }
    ): Promise<DesignTheme | null> => {
      try {
        const updatedTheme = await ThemeService.updateTheme(themeId, updates);

        // Realtime이 비활성화된 경우 수동으로 상태 업데이트
        if (!enableRealtime) {
          setThemes((prev) =>
            prev.map((theme) =>
              theme.id === themeId ? updatedTheme : theme
            )
          );
        }

        return updatedTheme;
      } catch (err) {
        const message = err instanceof Error ? err.message : '테마 업데이트 실패';
        setError(message);
        console.error('[useThemes] updateTheme failed:', err);
        return null;
      }
    },
    [enableRealtime]
  );

  /**
   * 테마 삭제
   */
  const deleteTheme = useCallback(
    async (themeId: string): Promise<boolean> => {
      try {
        await ThemeService.deleteTheme(themeId);

        // Realtime이 비활성화된 경우 수동으로 상태 업데이트
        if (!enableRealtime) {
          setThemes((prev) => prev.filter((theme) => theme.id !== themeId));
        }

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : '테마 삭제 실패';
        setError(message);
        console.error('[useThemes] deleteTheme failed:', err);
        return false;
      }
    },
    [enableRealtime]
  );

  /**
   * 테마 복제
   */
  const duplicateTheme = useCallback(
    async (
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

        // 복제 후 목록 갱신 (RPC가 새 테마를 자동으로 반환하지 않음)
        await fetchThemes();

        return newThemeId;
      } catch (err) {
        const message = err instanceof Error ? err.message : '테마 복제 실패';
        setError(message);
        console.error('[useThemes] duplicateTheme failed:', err);
        return null;
      }
    },
    [fetchThemes]
  );

  /**
   * 테마 활성화
   */
  const activateTheme = useCallback(
    async (themeId: string): Promise<boolean> => {
      try {
        await ThemeService.activateTheme(themeId);

        // 활성화 후 목록 갱신 (다른 테마들의 상태도 변경됨)
        await fetchThemes();

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : '테마 활성화 실패';
        setError(message);
        console.error('[useThemes] activateTheme failed:', err);
        return false;
      }
    },
    [fetchThemes]
  );

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
