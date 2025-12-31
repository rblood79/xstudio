/**
 * Performance Monitor
 *
 * React Query 스타일 성능 모니터링 시스템
 * - SmartCache 히트율 추적
 * - Request Deduplication 효과 측정
 * - Realtime Batcher 배치 통계
 * - useAsyncData 성능 메트릭
 *
 * @example
 * // 캐시 히트 기록
 * performanceMonitor.recordCacheHit('design-tokens');
 *
 * // 중복 제거 기록
 * performanceMonitor.recordDeduplication('user-profile', true);
 *
 * // 통계 조회
 * const stats = performanceMonitor.getStats();
 * console.log(`Cache Hit Rate: ${stats.cache.hitRate}%`);
 */

export interface CacheMetrics {
  /** 총 요청 수 */
  totalRequests: number;

  /** 캐시 히트 수 */
  hits: number;

  /** 캐시 미스 수 */
  misses: number;

  /** 히트율 (%) */
  hitRate: number;

  /** 평균 응답 시간 (ms) */
  avgResponseTime: number;

  /** 총 응답 시간 (ms) - 평균 계산용 */
  totalResponseTime: number;
}

export interface DeduplicationMetrics {
  /** 총 요청 수 */
  totalRequests: number;

  /** 중복 제거된 요청 수 */
  deduplicated: number;

  /** 실제 실행된 요청 수 */
  executed: number;

  /** 중복 제거율 (%) */
  deduplicationRate: number;
}

export interface BatcherMetrics {
  /** 총 수신 이벤트 수 */
  totalEvents: number;

  /** 필터된 이벤트 수 */
  filtered: number;

  /** 배치 처리된 이벤트 수 */
  batched: number;

  /** 배치 수 */
  batchCount: number;

  /** 평균 배치 크기 */
  avgBatchSize: number;

  /** 필터 효율 (%) - 필터된 비율 */
  filterEfficiency: number;
}

export interface QueryMetrics {
  /** 활성 쿼리 수 */
  activeQueries: number;

  /** 로딩 중인 쿼리 수 */
  loadingQueries: number;

  /** 에러 발생 쿼리 수 */
  errorQueries: number;

  /** 성공한 쿼리 수 */
  successQueries: number;

  /** 평균 fetch 시간 (ms) */
  avgFetchTime: number;

  /** 총 fetch 시간 (ms) */
  totalFetchTime: number;

  /** 총 fetch 수 */
  totalFetches: number;
}

export interface PerformanceStats {
  /** 캐시 메트릭 */
  cache: CacheMetrics;

  /** 중복 제거 메트릭 */
  deduplication: DeduplicationMetrics;

  /** Batcher 메트릭 */
  batcher: BatcherMetrics;

  /** 쿼리 메트릭 */
  query: QueryMetrics;

  /** 모니터링 시작 시간 */
  startTime: number;

  /** 경과 시간 (ms) */
  elapsedTime: number;
}

export class PerformanceMonitor {
  // 메트릭 데이터
  private cacheMetrics: CacheMetrics;
  private deduplicationMetrics: DeduplicationMetrics;
  private batcherMetrics: BatcherMetrics;
  private queryMetrics: QueryMetrics;

  // 시작 시간 (monotonic timer)
  private startTime: number;

  // 쿼리별 상태 추적
  private queryStates: Map<string, 'idle' | 'loading' | 'success' | 'error'>;

  constructor() {
    this.cacheMetrics = {
      totalRequests: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
    };

    this.deduplicationMetrics = {
      totalRequests: 0,
      deduplicated: 0,
      executed: 0,
      deduplicationRate: 0,
    };

    this.batcherMetrics = {
      totalEvents: 0,
      filtered: 0,
      batched: 0,
      batchCount: 0,
      avgBatchSize: 0,
      filterEfficiency: 0,
    };

    this.queryMetrics = {
      activeQueries: 0,
      loadingQueries: 0,
      errorQueries: 0,
      successQueries: 0,
      avgFetchTime: 0,
      totalFetchTime: 0,
      totalFetches: 0,
    };

    this.startTime = performance.now();
    this.queryStates = new Map();
  }

  /**
   * 캐시 히트 기록
   *
   * @param queryKey - 쿼리 키
   * @param responseTime - 응답 시간 (ms)
   */
  recordCacheHit(_queryKey: string, responseTime: number = 0): void {
    this.cacheMetrics.totalRequests++;
    this.cacheMetrics.hits++;
    this.cacheMetrics.totalResponseTime += responseTime;

    // 히트율 계산
    this.cacheMetrics.hitRate = (this.cacheMetrics.hits / this.cacheMetrics.totalRequests) * 100;

    // 평균 응답 시간 계산
    this.cacheMetrics.avgResponseTime = this.cacheMetrics.totalResponseTime / this.cacheMetrics.totalRequests;
  }

  /**
   * 캐시 미스 기록
   *
   * @param queryKey - 쿼리 키
   * @param responseTime - 응답 시간 (ms)
   */
  recordCacheMiss(_queryKey: string, responseTime: number = 0): void {
    this.cacheMetrics.totalRequests++;
    this.cacheMetrics.misses++;
    this.cacheMetrics.totalResponseTime += responseTime;

    // 히트율 계산
    this.cacheMetrics.hitRate = (this.cacheMetrics.hits / this.cacheMetrics.totalRequests) * 100;

    // 평균 응답 시간 계산
    this.cacheMetrics.avgResponseTime = this.cacheMetrics.totalResponseTime / this.cacheMetrics.totalRequests;
  }

  /**
   * Request Deduplication 기록
   *
   * @param queryKey - 쿼리 키
   * @param wasDeduplicated - 중복 제거 여부 (true: 기존 요청 재사용, false: 새 요청)
   */
  recordDeduplication(queryKey: string, wasDeduplicated: boolean): void {
    this.deduplicationMetrics.totalRequests++;

    if (wasDeduplicated) {
      this.deduplicationMetrics.deduplicated++;
      console.log(`📊 [Monitor] Request DEDUPLICATED: ${queryKey}`);
    } else {
      this.deduplicationMetrics.executed++;
      console.log(`📊 [Monitor] Request EXECUTED: ${queryKey}`);
    }

    // 중복 제거율 계산
    this.deduplicationMetrics.deduplicationRate =
      (this.deduplicationMetrics.deduplicated / this.deduplicationMetrics.totalRequests) * 100;
  }

  /**
   * Realtime Batcher 이벤트 기록
   *
   * @param received - 수신된 이벤트 수
   * @param filtered - 필터된 이벤트 수
   * @param batched - 배치 처리된 이벤트 수
   */
  recordBatcherEvents(received: number, filtered: number, batched: number): void {
    this.batcherMetrics.totalEvents += received;
    this.batcherMetrics.filtered += filtered;
    this.batcherMetrics.batched += batched;

    if (batched > 0) {
      this.batcherMetrics.batchCount++;
    }

    // 평균 배치 크기 계산
    if (this.batcherMetrics.batchCount > 0) {
      this.batcherMetrics.avgBatchSize = this.batcherMetrics.batched / this.batcherMetrics.batchCount;
    }

    // 필터 효율 계산
    if (this.batcherMetrics.totalEvents > 0) {
      this.batcherMetrics.filterEfficiency = (this.batcherMetrics.filtered / this.batcherMetrics.totalEvents) * 100;
    }

    console.log(
      `📊 [Monitor] Batcher: Received ${received}, Filtered ${filtered}, Batched ${batched} (Avg: ${this.batcherMetrics.avgBatchSize.toFixed(1)})`
    );
  }

  /**
   * 쿼리 상태 변경 기록
   *
   * @param queryKey - 쿼리 키
   * @param state - 새로운 상태
   */
  recordQueryState(queryKey: string, state: 'idle' | 'loading' | 'success' | 'error'): void {
    this.queryStates.set(queryKey, state);

    // 상태별 카운트 업데이트
    this.updateQueryCounts();
  }

  /**
   * Fetch 완료 기록
   *
   * @param queryKey - 쿼리 키
   * @param fetchTime - Fetch 소요 시간 (ms)
   * @param isSuccess - 성공 여부
   */
  recordFetchComplete(queryKey: string, fetchTime: number, isSuccess: boolean): void {
    this.queryMetrics.totalFetches++;
    this.queryMetrics.totalFetchTime += fetchTime;

    // 평균 fetch 시간 계산
    this.queryMetrics.avgFetchTime = this.queryMetrics.totalFetchTime / this.queryMetrics.totalFetches;

    // 성공/에러 카운트 업데이트
    if (isSuccess) {
      this.recordQueryState(queryKey, 'success');
    } else {
      this.recordQueryState(queryKey, 'error');
    }
  }

  /**
   * 쿼리 카운트 업데이트 (내부 헬퍼)
   */
  private updateQueryCounts(): void {
    let activeQueries = 0;
    let loadingQueries = 0;
    let errorQueries = 0;
    let successQueries = 0;

    for (const state of this.queryStates.values()) {
      if (state !== 'idle') {
        activeQueries++;
      }
      if (state === 'loading') {
        loadingQueries++;
      }
      if (state === 'error') {
        errorQueries++;
      }
      if (state === 'success') {
        successQueries++;
      }
    }

    this.queryMetrics.activeQueries = activeQueries;
    this.queryMetrics.loadingQueries = loadingQueries;
    this.queryMetrics.errorQueries = errorQueries;
    this.queryMetrics.successQueries = successQueries;
  }

  /**
   * 전체 통계 조회
   */
  getStats(): PerformanceStats {
    const elapsedTime = performance.now() - this.startTime;

    return {
      cache: { ...this.cacheMetrics },
      deduplication: { ...this.deduplicationMetrics },
      batcher: { ...this.batcherMetrics },
      query: { ...this.queryMetrics },
      startTime: this.startTime,
      elapsedTime,
    };
  }

  /**
   * 통계 초기화
   */
  reset(): void {
    this.cacheMetrics = {
      totalRequests: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      avgResponseTime: 0,
      totalResponseTime: 0,
    };

    this.deduplicationMetrics = {
      totalRequests: 0,
      deduplicated: 0,
      executed: 0,
      deduplicationRate: 0,
    };

    this.batcherMetrics = {
      totalEvents: 0,
      filtered: 0,
      batched: 0,
      batchCount: 0,
      avgBatchSize: 0,
      filterEfficiency: 0,
    };

    this.queryMetrics = {
      activeQueries: 0,
      loadingQueries: 0,
      errorQueries: 0,
      successQueries: 0,
      avgFetchTime: 0,
      totalFetchTime: 0,
      totalFetches: 0,
    };

    this.queryStates.clear();
    this.startTime = performance.now();

    console.log('🔄 [Monitor] Performance stats reset');
  }

  /**
   * 통계 출력 (디버깅용)
   */
  printStats(): void {
    const stats = this.getStats();

    console.log('📊 Performance Monitor Stats:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n📦 Cache Metrics:');
    console.log(`  Total Requests: ${stats.cache.totalRequests}`);
    console.log(`  Hits: ${stats.cache.hits}`);
    console.log(`  Misses: ${stats.cache.misses}`);
    console.log(`  Hit Rate: ${stats.cache.hitRate.toFixed(1)}%`);
    console.log(`  Avg Response Time: ${stats.cache.avgResponseTime.toFixed(2)}ms`);

    console.log('\n🔄 Deduplication Metrics:');
    console.log(`  Total Requests: ${stats.deduplication.totalRequests}`);
    console.log(`  Deduplicated: ${stats.deduplication.deduplicated}`);
    console.log(`  Executed: ${stats.deduplication.executed}`);
    console.log(`  Deduplication Rate: ${stats.deduplication.deduplicationRate.toFixed(1)}%`);

    console.log('\n📡 Batcher Metrics:');
    console.log(`  Total Events: ${stats.batcher.totalEvents}`);
    console.log(`  Filtered: ${stats.batcher.filtered}`);
    console.log(`  Batched: ${stats.batcher.batched}`);
    console.log(`  Batch Count: ${stats.batcher.batchCount}`);
    console.log(`  Avg Batch Size: ${stats.batcher.avgBatchSize.toFixed(1)}`);
    console.log(`  Filter Efficiency: ${stats.batcher.filterEfficiency.toFixed(1)}%`);

    console.log('\n🔍 Query Metrics:');
    console.log(`  Active Queries: ${stats.query.activeQueries}`);
    console.log(`  Loading: ${stats.query.loadingQueries}`);
    console.log(`  Success: ${stats.query.successQueries}`);
    console.log(`  Error: ${stats.query.errorQueries}`);
    console.log(`  Avg Fetch Time: ${stats.query.avgFetchTime.toFixed(2)}ms`);
    console.log(`  Total Fetches: ${stats.query.totalFetches}`);

    console.log(`\n⏱️  Elapsed Time: ${stats.elapsedTime.toFixed(2)}ms`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

/**
 * 전역 Performance Monitor 인스턴스
 */
export const globalPerformanceMonitor = new PerformanceMonitor();
