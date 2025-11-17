/**
 * Realtime Event Batcher
 *
 * Supabase Realtime 이벤트를 배칭하여 성능 최적화
 * - Event batching: 100ms 내 이벤트를 일괄 처리
 * - Event filtering: 중복/불필요한 이벤트 필터링
 * - Monotonic timer: performance.now() 사용 (시계 동기화 이슈 방지)
 *
 * ✅ Phase 5: Performance Monitor 통합
 * - 배치 통계 자동 추적
 *
 * @example
 * const batcher = new RealtimeBatcher({
 *   batchDelay: 100,           // 100ms 배칭
 *   onBatch: (events) => {
 *     console.log('Batched events:', events);
 *   },
 * });
 *
 * // Realtime 구독에서 호출
 * channel.on('postgres_changes', (payload) => {
 *   batcher.addEvent(payload);
 * });
 */

import { globalPerformanceMonitor } from './performanceMonitor';

export interface RealtimeEvent {
  /** 이벤트 타입 (INSERT, UPDATE, DELETE) */
  eventType: 'INSERT' | 'UPDATE' | 'DELETE' | '*';

  /** 테이블 이름 */
  table: string;

  /** 변경된 데이터 (new) */
  new?: Record<string, unknown>;

  /** 이전 데이터 (old) */
  old?: Record<string, unknown>;

  /** 레코드 ID */
  id?: string;

  /** 이벤트 수신 시각 (monotonic timer) */
  timestamp: number;

  /** 원본 payload (디버깅용) */
  raw?: unknown;
}

export interface RealtimeBatcherOptions {
  /** 배칭 딜레이 (ms, 기본: 100) */
  batchDelay?: number;

  /** 배치 처리 콜백 */
  onBatch: (events: RealtimeEvent[]) => void;

  /** 이벤트 필터 함수 (false 반환 시 무시) */
  filter?: (event: RealtimeEvent) => boolean;

  /** 중복 제거 활성화 (기본: true) */
  deduplication?: boolean;
}

export class RealtimeBatcher {
  private batchDelay: number;
  private onBatch: (events: RealtimeEvent[]) => void;
  private filter?: (event: RealtimeEvent) => boolean;
  private deduplication: boolean;

  // 배칭용 버퍼
  private eventBuffer: RealtimeEvent[] = [];

  // 타이머 ID
  private timerId: number | null = null;

  // 성능 측정용 (monotonic timer)
  private startTime: number;

  // 통계
  private stats = {
    totalReceived: 0,
    totalFiltered: 0,
    totalBatched: 0,
    batchCount: 0,
  };

  // ✅ Performance Monitor용 - 마지막 보고 시점 통계
  private lastReportedStats = {
    totalReceived: 0,
    totalFiltered: 0,
    totalBatched: 0,
  };

  constructor(options: RealtimeBatcherOptions) {
    this.batchDelay = options.batchDelay ?? 100;
    this.onBatch = options.onBatch;
    this.filter = options.filter;
    this.deduplication = options.deduplication ?? true;
    this.startTime = performance.now();
  }

  /**
   * 이벤트 추가
   *
   * @param payload - Supabase Realtime payload
   */
  addEvent(payload: Record<string, unknown>): void {
    this.stats.totalReceived++;

    // Realtime event 변환
    const event: RealtimeEvent = {
      eventType: (payload.eventType as RealtimeEvent['eventType']) || '*',
      table: (payload.table as string) || 'unknown',
      new: payload.new as Record<string, unknown> | undefined,
      old: payload.old as Record<string, unknown> | undefined,
      id: this.extractId(payload),
      timestamp: performance.now(), // ✅ Monotonic timer
      raw: payload,
    };

    // 필터 적용
    if (this.filter && !this.filter(event)) {
      this.stats.totalFiltered++;
      console.log(`🚫 [RealtimeBatcher] Event filtered:`, event.table, event.id);
      return;
    }

    // 중복 제거
    if (this.deduplication && this.isDuplicate(event)) {
      this.stats.totalFiltered++;
      console.log(`🔄 [RealtimeBatcher] Duplicate event ignored:`, event.table, event.id);
      return;
    }

    // 버퍼에 추가
    this.eventBuffer.push(event);
    console.log(`📥 [RealtimeBatcher] Event buffered:`, event.table, event.id, `(${this.eventBuffer.length} in buffer)`);

    // 타이머 시작 (아직 없으면)
    this.startTimer();
  }

  /**
   * 타이머 시작
   */
  private startTimer(): void {
    if (this.timerId !== null) {
      return; // 이미 진행 중
    }

    // ✅ globalThis.setTimeout 사용 (Node.js + Browser 호환)
    this.timerId = globalThis.setTimeout(() => {
      this.flush();
    }, this.batchDelay) as unknown as number;
  }

  /**
   * 버퍼 비우기 (배치 처리)
   *
   * ✅ Phase 5: Performance Monitor 통합
   * - 배치 처리 시 증분 통계 기록
   */
  flush(): void {
    if (this.eventBuffer.length === 0) {
      this.timerId = null;
      return;
    }

    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    this.timerId = null;

    this.stats.totalBatched += events.length;
    this.stats.batchCount++;

    const elapsedTime = performance.now() - this.startTime;

    console.log(`✅ [RealtimeBatcher] Flushing ${events.length} events (batch #${this.stats.batchCount}, elapsed: ${elapsedTime.toFixed(2)}ms)`);

    // ✅ Performance Monitor에 배치 통계 기록 (증분)
    const receivedDelta = this.stats.totalReceived - this.lastReportedStats.totalReceived;
    const filteredDelta = this.stats.totalFiltered - this.lastReportedStats.totalFiltered;
    const batchedDelta = this.stats.totalBatched - this.lastReportedStats.totalBatched;

    globalPerformanceMonitor.recordBatcherEvents(receivedDelta, filteredDelta, batchedDelta);

    // 마지막 보고 시점 업데이트
    this.lastReportedStats.totalReceived = this.stats.totalReceived;
    this.lastReportedStats.totalFiltered = this.stats.totalFiltered;
    this.lastReportedStats.totalBatched = this.stats.totalBatched;

    // 배치 처리 콜백 호출
    this.onBatch(events);
  }

  /**
   * ID 추출 (new.id 또는 old.id)
   */
  private extractId(payload: Record<string, unknown>): string | undefined {
    const newData = payload.new as Record<string, unknown> | undefined;
    const oldData = payload.old as Record<string, unknown> | undefined;

    return (newData?.id as string) || (oldData?.id as string);
  }

  /**
   * 중복 이벤트 확인
   *
   * 같은 table + id + eventType이 버퍼에 있으면 중복
   */
  private isDuplicate(event: RealtimeEvent): boolean {
    if (!event.id) {
      return false; // ID 없으면 중복 체크 불가
    }

    return this.eventBuffer.some(
      (e) =>
        e.table === event.table &&
        e.id === event.id &&
        e.eventType === event.eventType
    );
  }

  /**
   * 강제 플러시 (즉시 배치 처리)
   */
  forceFlush(): void {
    if (this.timerId !== null) {
      globalThis.clearTimeout(this.timerId);
      this.timerId = null;
    }

    this.flush();
  }

  /**
   * 통계 조회
   */
  getStats(): {
    totalReceived: number;
    totalFiltered: number;
    totalBatched: number;
    batchCount: number;
    averageBatchSize: number;
    bufferSize: number;
    elapsedTime: number;
  } {
    const elapsedTime = performance.now() - this.startTime;

    return {
      ...this.stats,
      averageBatchSize: this.stats.batchCount > 0
        ? this.stats.totalBatched / this.stats.batchCount
        : 0,
      bufferSize: this.eventBuffer.length,
      elapsedTime,
    };
  }

  /**
   * 통계 초기화
   */
  resetStats(): void {
    this.stats = {
      totalReceived: 0,
      totalFiltered: 0,
      totalBatched: 0,
      batchCount: 0,
    };
    this.startTime = performance.now();
  }

  /**
   * 정리 (타이머 취소)
   */
  destroy(): void {
    if (this.timerId !== null) {
      globalThis.clearTimeout(this.timerId);
      this.timerId = null;
    }

    this.eventBuffer = [];
  }
}

/**
 * 공통 이벤트 필터 함수들
 */
export const RealtimeFilters = {
  /**
   * 특정 테이블만 허용
   */
  tableFilter(allowedTables: string[]) {
    return (event: RealtimeEvent) => allowedTables.includes(event.table);
  },

  /**
   * 특정 이벤트 타입만 허용
   */
  eventTypeFilter(allowedTypes: RealtimeEvent['eventType'][]) {
    return (event: RealtimeEvent) => allowedTypes.includes(event.eventType);
  },

  /**
   * ID가 있는 이벤트만 허용
   */
  hasIdFilter() {
    return (event: RealtimeEvent) => event.id !== undefined;
  },

  /**
   * 여러 필터 AND 조합
   */
  combineFilters(...filters: Array<(event: RealtimeEvent) => boolean>) {
    return (event: RealtimeEvent) => filters.every((f) => f(event));
  },
};
