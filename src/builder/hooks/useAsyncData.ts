/**
 * useAsyncData Hook
 *
 * React Query의 useQuery 스타일 훅
 * - 데이터 페칭
 * - 자동 refetch (interval)
 * - 로딩/에러 상태 자동 관리
 * - onSuccess/onError 콜백
 *
 * @example
 * const { data, isLoading, error, refetch } = useAsyncData({
 *   queryKey: 'design-tokens',
 *   queryFn: async () => fetchDesignTokens(),
 *   staleTime: 5 * 60 * 1000, // 5분 캐시
 * });
 */

import { useState, useEffect, useCallback } from 'react';
import { useAsyncState } from '../stores/asyncState';
import { SmartCache } from '../../utils/smartCache';
import { globalRequestDeduplicator } from '../../utils/requestDeduplication';
import { globalPerformanceMonitor } from '../../utils/performanceMonitor';

interface UseAsyncDataOptions<TData> {
  /** 쿼리 식별 키 (asyncState + 캐시 키) */
  queryKey: string;

  /** 데이터 fetch 함수 */
  queryFn: () => Promise<TData>;

  /** 활성화 여부 (false면 fetch 안 함) */
  enabled?: boolean;

  /** Stale time (ms) - 이 시간 내에는 캐시 사용 */
  staleTime?: number;

  /** Refetch interval (ms) - 주기적 갱신 */
  refetchInterval?: number;

  /** 성공 시 콜백 */
  onSuccess?: (data: TData) => void;

  /** 에러 시 콜백 */
  onError?: (error: Error) => void;
}

interface UseAsyncDataResult<TData> {
  /** Fetched 데이터 */
  data: TData | null;

  /** 로딩 중 여부 */
  isLoading: boolean;

  /** 에러 객체 */
  error: Error | null;

  /** 에러 발생 여부 */
  isError: boolean;

  /** 성공 여부 */
  isSuccess: boolean;

  /** 수동 refetch */
  refetch: () => Promise<void>;
}

// ✅ SmartCache로 교체 (LRU + TTL 지원)
// max: 100개 쿼리, ttl: 기본 5분 (useAsyncData의 staleTime으로 오버라이드 가능)
const dataCache = new SmartCache<string, { data: any; timestamp: number }>({
  max: 100,
  ttl: 5 * 60 * 1000, // 5분 기본값
});

export function useAsyncData<TData>({
  queryKey,
  queryFn,
  enabled = true,
  staleTime = 0,
  refetchInterval,
  onSuccess,
  onError,
}: UseAsyncDataOptions<TData>): UseAsyncDataResult<TData> {
  const [data, setData] = useState<TData | null>(null);

  const setLoading = useAsyncState((state) => state.setLoading);
  const setError = useAsyncState((state) => state.setError);

  const isLoading = useAsyncState((state) => state.loading[queryKey] || false);
  const error = useAsyncState((state) => state.errors[queryKey] || null);

  /**
   * 데이터 fetch
   *
   * ✅ Phase 5: Performance Monitor 통합
   * - 캐시 히트/미스 추적
   * - Request deduplication 추적
   * - Query 상태 추적
   * - Fetch 시간 측정
   */
  const fetchData = useCallback(async () => {
    if (!enabled) {
      return;
    }

    // 캐시 확인
    const cached = dataCache.get(queryKey);
    if (cached && staleTime > 0) {
      const age = Date.now() - cached.timestamp;
      if (age < staleTime) {
        // ✅ 캐시 히트 기록
        globalPerformanceMonitor.recordCacheHit(queryKey, 0);

        // 캐시 히트
        setData(cached.data);
        setLoading(queryKey, false);
        setError(queryKey, null);

        // ✅ Query 상태: success
        globalPerformanceMonitor.recordQueryState(queryKey, 'success');

        return;
      }
    }

    // ✅ 캐시 미스 기록 (또는 stale)
    if (!cached || staleTime === 0) {
      // 캐시 미스 또는 staleTime=0 (캐싱 안 함)
    }

    // 로딩 시작
    setLoading(queryKey, true);
    setError(queryKey, null);

    // ✅ Query 상태: loading
    globalPerformanceMonitor.recordQueryState(queryKey, 'loading');

    // ✅ Fetch 시작 시간
    const fetchStartTime = performance.now();

    try {
      // ✅ Request Deduplication 적용
      // 동일한 queryKey로 여러 컴포넌트가 동시 호출 시 1번만 fetch
      const wasDeduplicated = globalRequestDeduplicator.isPending(queryKey);

      const result = await globalRequestDeduplicator.deduplicate(
        queryKey,
        queryFn
      );

      // ✅ Fetch 완료 시간
      const fetchTime = performance.now() - fetchStartTime;

      // ✅ Deduplication 기록
      globalPerformanceMonitor.recordDeduplication(queryKey, wasDeduplicated);

      // ✅ 캐시 미스 기록 (fetch 성공)
      globalPerformanceMonitor.recordCacheMiss(queryKey, fetchTime);

      // 상태 업데이트
      setData(result);
      setLoading(queryKey, false);
      setError(queryKey, null);

      // 캐시 저장
      dataCache.set(queryKey, {
        data: result,
        timestamp: Date.now(),
      });

      // ✅ Fetch 완료 기록 (성공)
      globalPerformanceMonitor.recordFetchComplete(queryKey, fetchTime, true);

      // 성공 콜백
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (err) {
      const error = err as Error;

      // ✅ Fetch 완료 시간
      const fetchTime = performance.now() - fetchStartTime;

      // 에러 상태
      setLoading(queryKey, false);
      setError(queryKey, error);

      // ✅ Fetch 완료 기록 (실패)
      globalPerformanceMonitor.recordFetchComplete(queryKey, fetchTime, false);

      // 에러 콜백
      if (onError) {
        onError(error);
      }
    }
    // setData, setError, setLoading are stable functions from useState
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, queryFn, enabled, staleTime, onSuccess, onError]);

  /**
   * 초기 로드
   */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Refetch Interval
   */
  useEffect(() => {
    if (!refetchInterval || !enabled) {
      return;
    }

    const interval = setInterval(() => {
      fetchData();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, enabled, fetchData]);

  /**
   * 수동 refetch
   */
  const refetch = useCallback(async () => {
    // 캐시 무효화
    dataCache.delete(queryKey);

    // ✅ 진행 중인 중복 요청 취소 (fresh fetch 강제)
    globalRequestDeduplicator.cancel(queryKey);

    // 다시 fetch
    await fetchData();
  }, [queryKey, fetchData]);

  return {
    data,
    isLoading,
    error,
    isError: error !== null,
    isSuccess: !isLoading && error === null && data !== null,
    refetch,
  };
}

/**
 * 캐시 무효화 헬퍼 함수
 */
export function invalidateQuery(queryKey: string): boolean {
  return dataCache.delete(queryKey);
}

/**
 * 전체 캐시 초기화
 */
export function clearAllCache(): void {
  dataCache.clear();
}

/**
 * 캐시 통계 조회 (디버깅용)
 */
export function getCacheStats() {
  return dataCache.getStats();
}

/**
 * 만료된 캐시 정리 (메모리 최적화)
 */
export function cleanupExpiredCache(): number {
  return dataCache.cleanup();
}
