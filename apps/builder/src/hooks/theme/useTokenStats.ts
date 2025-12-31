/**
 * useTokenStats Hook
 * 토큰 통계 및 분석 정보
 */

import { useState, useEffect, useCallback } from 'react';
import { TokenService } from '../../services/theme';

interface TokenStats {
  total: number;
  raw: number;
  semantic: number;
  byType: Record<string, number>;
  inherited: number;
}

export interface UseTokenStatsOptions {
  themeId: string;
  enableRealtime?: boolean;
}

export interface UseTokenStatsReturn {
  stats: TokenStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  percentages: {
    raw: number;
    semantic: number;
    inherited: number;
  };
  topTypes: Array<{ type: string; count: number; percentage: number }>;
}

const EMPTY_STATS: TokenStats = {
  total: 0,
  raw: 0,
  semantic: 0,
  byType: {},
  inherited: 0,
};

export function useTokenStats(
  options: UseTokenStatsOptions
): UseTokenStatsReturn {
  const { themeId, enableRealtime = true } = options;

  const [stats, setStats] = useState<TokenStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 통계 가져오기
   */
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await TokenService.getTokenStats(themeId);
      setStats(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : '통계 조회 실패';
      setError(message);
      console.error('[useTokenStats] fetchStats failed:', err);
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  }, [themeId]);

  /**
   * 초기 데이터 로드
   */
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  /**
   * Realtime 구독 (토큰 변경 시 통계 갱신)
   */
  useEffect(() => {
    if (!enableRealtime || !themeId) return;

    const unsubscribe = TokenService.subscribeToTokenChanges(
      themeId,
      (payload) => {
        console.log('[useTokenStats] Realtime update:', payload);
        // 토큰 변경 시 통계 재조회
        fetchStats();
      }
    );

    return unsubscribe;
  }, [enableRealtime, themeId, fetchStats]);

  /**
   * 퍼센티지 계산
   */
  const percentages = {
    raw: stats ? (stats.total > 0 ? (stats.raw / stats.total) * 100 : 0) : 0,
    semantic:
      stats ? (stats.total > 0 ? (stats.semantic / stats.total) * 100 : 0) : 0,
    inherited:
      stats ? (stats.total > 0 ? (stats.inherited / stats.total) * 100 : 0) : 0,
  };

  /**
   * 상위 타입 (개수 순 정렬)
   */
  const topTypes = stats
    ? Object.entries(stats.byType)
        .map(([type, count]) => ({
          type,
          count,
          percentage: stats.total > 0 ? (count / stats.total) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
    : [];

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
    percentages,
    topTypes,
  };
}
