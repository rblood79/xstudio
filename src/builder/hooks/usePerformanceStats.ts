/**
 * usePerformanceStats Hook
 *
 * Performance Monitor 통계를 React 컴포넌트에서 사용하기 위한 훅
 *
 * @example
 * function PerformancePanel() {
 *   const { stats, printStats, reset } = usePerformanceStats();
 *
 *   return (
 *     <div>
 *       <p>Cache Hit Rate: {stats.cache.hitRate.toFixed(1)}%</p>
 *       <p>Deduplication Rate: {stats.deduplication.deduplicationRate.toFixed(1)}%</p>
 *       <button onClick={printStats}>Print Stats</button>
 *       <button onClick={reset}>Reset</button>
 *     </div>
 *   );
 * }
 */

import { useState, useEffect, useCallback } from 'react';
import { globalPerformanceMonitor, type PerformanceStats } from '../../utils/performanceMonitor';

export interface UsePerformanceStatsOptions {
  /**
   * 통계 갱신 간격 (ms)
   * 기본값: 1000 (1초)
   */
  refreshInterval?: number;

  /**
   * 자동 갱신 활성화 여부
   * 기본값: true
   */
  autoRefresh?: boolean;
}

export interface UsePerformanceStatsResult {
  /** 성능 통계 */
  stats: PerformanceStats;

  /** 통계 강제 갱신 */
  refresh: () => void;

  /** 통계 출력 (console.log) */
  printStats: () => void;

  /** 통계 초기화 */
  reset: () => void;

  /** 자동 갱신 활성화 여부 */
  isAutoRefresh: boolean;

  /** 자동 갱신 토글 */
  toggleAutoRefresh: () => void;
}

/**
 * Performance Monitor 통계를 조회하는 React Hook
 *
 * @param options - 옵션
 * @returns 성능 통계 및 제어 함수
 */
export function usePerformanceStats(
  options: UsePerformanceStatsOptions = {}
): UsePerformanceStatsResult {
  const {
    refreshInterval = 1000,
    autoRefresh: initialAutoRefresh = true,
  } = options;

  const [stats, setStats] = useState<PerformanceStats>(() => globalPerformanceMonitor.getStats());
  const [isAutoRefresh, setIsAutoRefresh] = useState(initialAutoRefresh);

  /**
   * 통계 강제 갱신
   */
  const refresh = useCallback(() => {
    const newStats = globalPerformanceMonitor.getStats();
    setStats(newStats);
  }, []);

  /**
   * 통계 출력
   */
  const printStats = useCallback(() => {
    globalPerformanceMonitor.printStats();
  }, []);

  /**
   * 통계 초기화
   */
  const reset = useCallback(() => {
    globalPerformanceMonitor.reset();
    refresh();
  }, [refresh]);

  /**
   * 자동 갱신 토글
   */
  const toggleAutoRefresh = useCallback(() => {
    setIsAutoRefresh((prev) => !prev);
  }, []);

  /**
   * 자동 갱신 interval
   */
  useEffect(() => {
    if (!isAutoRefresh) {
      return;
    }

    const interval = setInterval(() => {
      refresh();
    }, refreshInterval);

    return () => {
      clearInterval(interval);
    };
  }, [isAutoRefresh, refreshInterval, refresh]);

  return {
    stats,
    refresh,
    printStats,
    reset,
    isAutoRefresh,
    toggleAutoRefresh,
  };
}

/**
 * 주요 메트릭만 반환하는 경량 훅
 *
 * @example
 * const { cacheHitRate, deduplicationRate, avgBatchSize } = usePerformanceMetrics();
 */
export function usePerformanceMetrics() {
  const { stats } = usePerformanceStats({ refreshInterval: 2000 });

  return {
    /** 캐시 히트율 (%) */
    cacheHitRate: stats.cache.hitRate,

    /** 캐시 평균 응답 시간 (ms) */
    avgCacheResponseTime: stats.cache.avgResponseTime,

    /** Request Deduplication 효율 (%) */
    deduplicationRate: stats.deduplication.deduplicationRate,

    /** Realtime Batcher 평균 배치 크기 */
    avgBatchSize: stats.batcher.avgBatchSize,

    /** Realtime Batcher 필터 효율 (%) */
    filterEfficiency: stats.batcher.filterEfficiency,

    /** 활성 쿼리 수 */
    activeQueries: stats.query.activeQueries,

    /** 평균 Fetch 시간 (ms) */
    avgFetchTime: stats.query.avgFetchTime,

    /** 경과 시간 (ms) */
    elapsedTime: stats.elapsedTime,
  };
}
