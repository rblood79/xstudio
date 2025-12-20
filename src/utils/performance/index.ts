/**
 * Performance Monitoring Utilities
 *
 * 스타일 패널 및 전체 애플리케이션 성능 측정을 위한 통합 모듈
 *
 * @example
 * import {
 *   stylePanelMetrics,
 *   fpsMonitor,
 *   memoryMonitor,
 *   startAllMonitors,
 *   stopAllMonitors,
 * } from '@/utils/performance';
 *
 * // 모든 모니터 시작
 * startAllMonitors();
 *
 * // 스타일 계산 측정
 * const end = stylePanelMetrics.startMeasure('style-values-calc');
 * // ... 작업
 * end();
 *
 * // 전체 통계 조회
 * const report = generatePerformanceReport();
 *
 * @since 2025-12-20 Phase 0 - Benchmark Infrastructure
 */

// ============================================
// Re-exports
// ============================================

export {
  stylePanelMetrics,
  createRenderTracker,
  PERF_MARKERS,
  type StylePanelMetrics,
  type PerformanceSummary,
} from './stylePanelMetrics';

export {
  fpsMonitor,
  measureFrameTime,
  measureAverageFrameTime,
  type FPSStats,
  type FrameInfo,
} from './fpsMonitor';

export {
  memoryMonitor,
  formatBytes,
  getCurrentMemoryMB,
  type MemoryInfo,
  type MemorySnapshot,
  type MemoryStats,
  type MemoryDiff,
} from './memoryMonitor';

// ============================================
// Import for internal use
// ============================================

import { stylePanelMetrics } from './stylePanelMetrics';
import { fpsMonitor } from './fpsMonitor';
import { memoryMonitor } from './memoryMonitor';

// ============================================
// Types
// ============================================

export interface PerformanceReport {
  /** 보고서 생성 시간 */
  generatedAt: string;

  /** 스타일 패널 메트릭 */
  stylePanel: {
    totalRenders: number;
    rendersBySection: Record<string, number>;
    avgStyleCalcTime: number;
    p95StyleCalcTime: number;
    avgRenderTime: number;
    p95RenderTime: number;
  };

  /** FPS 메트릭 */
  fps: {
    avgFps: number;
    minFps: number;
    maxFps: number;
    frameDrops: number;
    longFrames: number;
  };

  /** 메모리 메트릭 */
  memory: {
    currentMB: number;
    peakMB: number;
    baselineMB: number | null;
    deltaMB: number | null;
    estimatedGCCount: number;
    growthRateMBPerSec: number;
  };

  /** 측정 기간 (ms) */
  duration: number;

  /** SLO 위반 여부 */
  sloViolations: string[];
}

// ============================================
// SLO Thresholds for Style Panel
// ============================================

export const STYLE_PANEL_SLO = {
  /** 스타일 계산 P95 (ms) */
  styleCalcP95: 16,

  /** 렌더링 P95 (ms) */
  renderP95: 16,

  /** 최소 FPS */
  minFps: 55,

  /** 프레임 드롭 허용 비율 (%) */
  maxFrameDropRate: 5,

  /** 메모리 증가율 제한 (MB/s) */
  maxMemoryGrowthRate: 1,
} as const;

// ============================================
// Convenience Functions
// ============================================

/**
 * 모든 모니터 시작
 */
export function startAllMonitors(): void {
  console.log('🚀 Starting all performance monitors...');

  stylePanelMetrics.setEnabled(true);
  fpsMonitor.start();
  memoryMonitor.start();

  console.log('✅ All monitors started');
}

/**
 * 모든 모니터 중지
 */
export function stopAllMonitors(): void {
  console.log('🛑 Stopping all performance monitors...');

  fpsMonitor.stop();
  memoryMonitor.stop();

  console.log('✅ All monitors stopped');
}

/**
 * 모든 모니터 리셋
 */
export function resetAllMonitors(): void {
  console.log('🔄 Resetting all performance monitors...');

  stylePanelMetrics.reset();
  fpsMonitor.reset();
  memoryMonitor.reset();

  console.log('✅ All monitors reset');
}

/**
 * 모든 통계 콘솔 출력
 */
export function printAllStats(): void {
  stylePanelMetrics.printSummary();
  fpsMonitor.printStats();
  memoryMonitor.printStats();
}

/**
 * 성능 보고서 생성
 */
export function generatePerformanceReport(): PerformanceReport {
  const stylePanelSummary = stylePanelMetrics.getSummary();
  const fpsStats = fpsMonitor.getStats();
  const memoryStats = memoryMonitor.getStats();

  const sloViolations: string[] = [];

  // SLO 검증
  if (stylePanelSummary.p95StyleCalcTime > STYLE_PANEL_SLO.styleCalcP95) {
    sloViolations.push(
      `Style calc P95 (${stylePanelSummary.p95StyleCalcTime.toFixed(2)}ms) > ${STYLE_PANEL_SLO.styleCalcP95}ms`
    );
  }

  if (stylePanelSummary.p95RenderTime > STYLE_PANEL_SLO.renderP95) {
    sloViolations.push(
      `Render P95 (${stylePanelSummary.p95RenderTime.toFixed(2)}ms) > ${STYLE_PANEL_SLO.renderP95}ms`
    );
  }

  if (fpsStats.avgFps > 0 && fpsStats.avgFps < STYLE_PANEL_SLO.minFps) {
    sloViolations.push(`Avg FPS (${fpsStats.avgFps}) < ${STYLE_PANEL_SLO.minFps}`);
  }

  const frameDropRate =
    fpsStats.totalFrames > 0 ? (fpsStats.frameDrops / fpsStats.totalFrames) * 100 : 0;
  if (frameDropRate > STYLE_PANEL_SLO.maxFrameDropRate) {
    sloViolations.push(
      `Frame drop rate (${frameDropRate.toFixed(1)}%) > ${STYLE_PANEL_SLO.maxFrameDropRate}%`
    );
  }

  const growthRateMB = memoryStats.growthRate / (1024 * 1024);
  if (growthRateMB > STYLE_PANEL_SLO.maxMemoryGrowthRate) {
    sloViolations.push(
      `Memory growth rate (${growthRateMB.toFixed(2)}MB/s) > ${STYLE_PANEL_SLO.maxMemoryGrowthRate}MB/s`
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    stylePanel: {
      totalRenders: stylePanelSummary.totalRenders,
      rendersBySection: stylePanelSummary.rendersBySection,
      avgStyleCalcTime: stylePanelSummary.avgStyleCalcTime,
      p95StyleCalcTime: stylePanelSummary.p95StyleCalcTime,
      avgRenderTime: stylePanelSummary.avgRenderTime,
      p95RenderTime: stylePanelSummary.p95RenderTime,
    },
    fps: {
      avgFps: fpsStats.avgFps,
      minFps: fpsStats.minFps,
      maxFps: fpsStats.maxFps,
      frameDrops: fpsStats.frameDrops,
      longFrames: fpsStats.longFrames,
    },
    memory: {
      currentMB: memoryStats.current.usedJSHeapSize / (1024 * 1024),
      peakMB: memoryStats.peakUsage / (1024 * 1024),
      baselineMB: memoryStats.baseline
        ? memoryStats.baseline.usedJSHeapSize / (1024 * 1024)
        : null,
      deltaMB: memoryStats.baseline
        ? (memoryStats.current.usedJSHeapSize - memoryStats.baseline.usedJSHeapSize) /
          (1024 * 1024)
        : null,
      estimatedGCCount: memoryStats.estimatedGCCount,
      growthRateMBPerSec: growthRateMB,
    },
    duration: Math.max(
      stylePanelSummary.duration,
      fpsStats.duration,
      memoryStats.duration
    ),
    sloViolations,
  };
}

/**
 * 보고서를 JSON으로 내보내기
 */
export function exportReportJSON(): string {
  const report = generatePerformanceReport();
  return JSON.stringify(report, null, 2);
}

// ============================================
// React Hook Helper
// ============================================

/**
 * 렌더 추적 훅에서 사용할 헬퍼
 *
 * @example
 * import { useRenderCount } from '@/utils/performance';
 *
 * function TransformSection() {
 *   useRenderCount('TransformSection');
 *   // ...
 * }
 */
export function useRenderCount(sectionName: string): void {
  stylePanelMetrics.recordRender(sectionName);
}

// ============================================
// DevTools Integration
// ============================================

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 전역 객체에 성능 유틸리티 노출
  (window as unknown as {
    __perfTools: {
      startAll: typeof startAllMonitors;
      stopAll: typeof stopAllMonitors;
      resetAll: typeof resetAllMonitors;
      printAll: typeof printAllStats;
      report: typeof generatePerformanceReport;
      exportJSON: typeof exportReportJSON;
    };
  }).__perfTools = {
    startAll: startAllMonitors,
    stopAll: stopAllMonitors,
    resetAll: resetAllMonitors,
    printAll: printAllStats,
    report: generatePerformanceReport,
    exportJSON: exportReportJSON,
  };

  console.log('🔧 Performance tools available at window.__perfTools');
}
