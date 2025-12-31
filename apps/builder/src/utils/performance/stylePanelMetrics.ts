/**
 * Style Panel Performance Metrics
 *
 * 스타일 패널 성능 측정을 위한 마커 및 메트릭 시스템
 * - Performance.mark/measure API 기반
 * - 리렌더링 횟수 추적
 * - 스타일 계산 시간 측정
 * - 섹션별 렌더링 성능
 *
 * @example
 * // 스타일 계산 측정
 * const end = stylePanelMetrics.startMeasure('style-values-calc');
 * const values = computeStyleValues(element);
 * end();
 *
 * // 리렌더링 기록
 * stylePanelMetrics.recordRender('TransformSection');
 *
 * @since 2025-12-20 Phase 0 - Benchmark Infrastructure
 */

// ============================================
// Types
// ============================================

export interface StylePanelMetrics {
  /** 섹션별 리렌더링 횟수 */
  renderCounts: Record<string, number>;

  /** 섹션별 렌더링 시간 (ms) */
  renderTimes: Record<string, number[]>;

  /** 스타일 계산 시간 (ms) */
  styleCalculationTimes: number[];

  /** 캔버스 동기화 시간 (ms) */
  canvasSyncTimes: number[];

  /** 입력 반응 시간 (ms) */
  inputResponseTimes: number[];

  /** 측정 시작 시간 */
  startTime: number;
}

export interface PerformanceSummary {
  /** 총 리렌더링 횟수 */
  totalRenders: number;

  /** 섹션별 리렌더링 */
  rendersBySection: Record<string, number>;

  /** 평균 스타일 계산 시간 (ms) */
  avgStyleCalcTime: number;

  /** P95 스타일 계산 시간 (ms) */
  p95StyleCalcTime: number;

  /** 평균 렌더링 시간 (ms) */
  avgRenderTime: number;

  /** P95 렌더링 시간 (ms) */
  p95RenderTime: number;

  /** 평균 캔버스 동기화 시간 (ms) */
  avgCanvasSyncTime: number;

  /** 측정 기간 (ms) */
  duration: number;
}

// ============================================
// Constants
// ============================================

export const PERF_MARKERS = {
  // 스타일 계산
  STYLE_VALUES_CALC: 'style-panel:style-values-calc',
  TRANSFORM_VALUES: 'style-panel:transform-values',
  LAYOUT_VALUES: 'style-panel:layout-values',
  APPEARANCE_VALUES: 'style-panel:appearance-values',
  TYPOGRAPHY_VALUES: 'style-panel:typography-values',

  // 섹션 렌더링
  SECTION_RENDER: 'style-panel:section-render',
  TRANSFORM_SECTION: 'style-panel:transform-section',
  LAYOUT_SECTION: 'style-panel:layout-section',
  APPEARANCE_SECTION: 'style-panel:appearance-section',
  TYPOGRAPHY_SECTION: 'style-panel:typography-section',

  // 캔버스 동기화
  CANVAS_SYNC: 'style-panel:canvas-sync',

  // 입력 처리
  INPUT_RESPONSE: 'style-panel:input-response',
} as const;

// ============================================
// Utility Functions
// ============================================

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ============================================
// StylePanelMetricsCollector Class
// ============================================

class StylePanelMetricsCollector {
  private metrics: StylePanelMetrics;
  private enabled: boolean;
  private measureIdCounter: number = 0;

  constructor() {
    this.metrics = this.createEmptyMetrics();
    this.enabled = process.env.NODE_ENV === 'development';
  }

  private createEmptyMetrics(): StylePanelMetrics {
    return {
      renderCounts: {},
      renderTimes: {},
      styleCalculationTimes: [],
      canvasSyncTimes: [],
      inputResponseTimes: [],
      startTime: performance.now(),
    };
  }

  /**
   * 측정 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 측정 시작 - 종료 함수 반환
   *
   * @example
   * const end = stylePanelMetrics.startMeasure('style-values-calc');
   * // ... 작업 수행
   * const duration = end(); // 측정 종료 및 시간 반환
   */
  startMeasure(name: string): () => number {
    if (!this.enabled) {
      return () => 0;
    }

    const measureId = `${name}-${++this.measureIdCounter}`;
    const startMark = `${measureId}-start`;
    const endMark = `${measureId}-end`;

    performance.mark(startMark);

    return () => {
      performance.mark(endMark);

      try {
        const measure = performance.measure(measureId, startMark, endMark);
        const duration = measure.duration;

        // 마크 정리
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
        performance.clearMeasures(measureId);

        // 메트릭 기록
        this.recordMeasurement(name, duration);

        return duration;
      } catch {
        return 0;
      }
    };
  }

  /**
   * 측정값 기록 (내부 헬퍼)
   */
  private recordMeasurement(name: string, duration: number): void {
    if (name.includes('style-values') || name.includes('values')) {
      this.metrics.styleCalculationTimes.push(duration);
    } else if (name.includes('section') || name.includes('render')) {
      if (!this.metrics.renderTimes[name]) {
        this.metrics.renderTimes[name] = [];
      }
      this.metrics.renderTimes[name].push(duration);
    } else if (name.includes('canvas')) {
      this.metrics.canvasSyncTimes.push(duration);
    } else if (name.includes('input')) {
      this.metrics.inputResponseTimes.push(duration);
    }
  }

  /**
   * 래핑된 함수 실행 및 측정
   *
   * @example
   * const result = stylePanelMetrics.measure('style-values-calc', () => {
   *   return computeStyleValues(element);
   * });
   */
  measure<T>(name: string, fn: () => T): T {
    const end = this.startMeasure(name);
    try {
      return fn();
    } finally {
      end();
    }
  }

  /**
   * 비동기 함수 측정
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const end = this.startMeasure(name);
    try {
      return await fn();
    } finally {
      end();
    }
  }

  /**
   * 컴포넌트 리렌더링 기록
   */
  recordRender(sectionName: string): void {
    if (!this.enabled) return;

    if (!this.metrics.renderCounts[sectionName]) {
      this.metrics.renderCounts[sectionName] = 0;
    }
    this.metrics.renderCounts[sectionName]++;
  }

  /**
   * 캔버스 동기화 시간 기록
   */
  recordCanvasSync(duration: number): void {
    if (!this.enabled) return;
    this.metrics.canvasSyncTimes.push(duration);
  }

  /**
   * 입력 반응 시간 기록
   */
  recordInputResponse(duration: number): void {
    if (!this.enabled) return;
    this.metrics.inputResponseTimes.push(duration);
  }

  /**
   * 성능 요약 조회
   */
  getSummary(): PerformanceSummary {
    const allRenderTimes = Object.values(this.metrics.renderTimes).flat();

    return {
      totalRenders: Object.values(this.metrics.renderCounts).reduce((a, b) => a + b, 0),
      rendersBySection: { ...this.metrics.renderCounts },
      avgStyleCalcTime: mean(this.metrics.styleCalculationTimes),
      p95StyleCalcTime: percentile(this.metrics.styleCalculationTimes, 95),
      avgRenderTime: mean(allRenderTimes),
      p95RenderTime: percentile(allRenderTimes, 95),
      avgCanvasSyncTime: mean(this.metrics.canvasSyncTimes),
      duration: performance.now() - this.metrics.startTime,
    };
  }

  /**
   * 원시 메트릭 조회
   */
  getRawMetrics(): StylePanelMetrics {
    return { ...this.metrics };
  }

  /**
   * 메트릭 초기화
   */
  reset(): void {
    this.metrics = this.createEmptyMetrics();
    this.measureIdCounter = 0;
    console.log('🔄 [StylePanelMetrics] Metrics reset');
  }

  /**
   * 콘솔에 요약 출력
   */
  printSummary(): void {
    const summary = this.getSummary();

    console.log('\n📊 Style Panel Performance Summary');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log('\n🔄 Render Counts:');
    console.log(`  Total: ${summary.totalRenders}`);
    for (const [section, count] of Object.entries(summary.rendersBySection)) {
      console.log(`  ${section}: ${count}`);
    }

    console.log('\n⏱️ Style Calculation:');
    console.log(`  Avg: ${summary.avgStyleCalcTime.toFixed(2)}ms`);
    console.log(`  P95: ${summary.p95StyleCalcTime.toFixed(2)}ms`);
    console.log(`  Samples: ${this.metrics.styleCalculationTimes.length}`);

    console.log('\n🎨 Render Times:');
    console.log(`  Avg: ${summary.avgRenderTime.toFixed(2)}ms`);
    console.log(`  P95: ${summary.p95RenderTime.toFixed(2)}ms`);

    console.log('\n🖼️ Canvas Sync:');
    console.log(`  Avg: ${summary.avgCanvasSyncTime.toFixed(2)}ms`);
    console.log(`  Samples: ${this.metrics.canvasSyncTimes.length}`);

    console.log(`\n⏱️ Duration: ${(summary.duration / 1000).toFixed(2)}s`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }

  /**
   * JSON 형태로 내보내기
   */
  exportJSON(): string {
    return JSON.stringify(
      {
        summary: this.getSummary(),
        raw: this.metrics,
        exportedAt: new Date().toISOString(),
      },
      null,
      2
    );
  }
}

// ============================================
// React Hook for Render Tracking
// ============================================

/**
 * 렌더링 추적을 위한 React 훅에서 사용할 헬퍼
 *
 * @example
 * function TransformSection() {
 *   useRenderTracker('TransformSection');
 *   // ...
 * }
 */
export function createRenderTracker(sectionName: string) {
  return () => {
    stylePanelMetrics.recordRender(sectionName);
  };
}

// ============================================
// Singleton Export
// ============================================

export const stylePanelMetrics = new StylePanelMetricsCollector();

// 개발 환경에서 전역 접근 허용
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as unknown as { __stylePanelMetrics: StylePanelMetricsCollector }).__stylePanelMetrics =
    stylePanelMetrics;
}
