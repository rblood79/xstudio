/**
 * Auto Recovery Hook
 *
 * 🚀 Phase 7: 성능 저하 시 자동 복구
 *
 * 기능:
 * - 주기적 성능 체크 (30초)
 * - 심각한 성능 저하 감지 시 자동 복구
 * - 복구 단계: 비활성 페이지 언로드 → 히스토리 정리 → 캐시 클리어
 *
 * @since 2025-12-10 Phase 7 Auto Recovery
 */

import { useEffect, useRef, useCallback } from 'react';
import { performanceMonitor, type PerformanceMetrics } from '../utils/performanceMonitor';
import { useStore } from '../stores';
import { historyManager } from '../stores/history';
import { pageCache } from '../utils/LRUPageCache';

// ============================================
// Types
// ============================================

export interface AutoRecoveryConfig {
  /** 체크 간격 (ms) - 기본 30초 */
  checkInterval: number;
  /** 복구 트리거 건강 점수 임계값 - 기본 30 */
  criticalHealthScore: number;
  /** 경고 트리거 건강 점수 임계값 - 기본 50 */
  warningHealthScore: number;
  /** 복구 후 쿨다운 (ms) - 기본 60초 */
  recoveryCooldown: number;
  /** 히스토리 유지 개수 - 기본 50 */
  historyKeepCount: number;
  /** 자동 복구 활성화 - 기본 true */
  enabled: boolean;
}

export interface RecoveryStats {
  /** 총 복구 횟수 */
  totalRecoveries: number;
  /** 마지막 복구 시간 */
  lastRecoveryTime: number | null;
  /** 마지막 복구 사유 */
  lastRecoveryReason: string | null;
  /** 복구 히스토리 */
  history: Array<{
    timestamp: number;
    reason: string;
    healthBefore: number;
    healthAfter: number;
  }>;
}

type RecoveryCallback = (reason: string, stats: RecoveryStats) => void;

// ============================================
// Auto Recovery Hook
// ============================================

/**
 * 자동 복구 훅
 *
 * @example
 * ```tsx
 * function BuilderApp() {
 *   const { stats, triggerRecovery } = useAutoRecovery({
 *     onRecovery: (reason) => {
 *       console.log('Recovery triggered:', reason);
 *     }
 *   });
 *
 *   return (
 *     <div>
 *       <span>Recoveries: {stats.totalRecoveries}</span>
 *       <button onClick={() => triggerRecovery('manual')}>
 *         Manual Recovery
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAutoRecovery(options?: {
  config?: Partial<AutoRecoveryConfig>;
  onRecovery?: RecoveryCallback;
  onWarning?: (metrics: PerformanceMetrics) => void;
}): {
  stats: RecoveryStats;
  triggerRecovery: (reason?: string) => void;
  isRecovering: boolean;
} {
  const config: AutoRecoveryConfig = {
    checkInterval: 30000,
    criticalHealthScore: 30,
    warningHealthScore: 50,
    recoveryCooldown: 60000,
    historyKeepCount: 50,
    enabled: true,
    ...options?.config,
  };

  const statsRef = useRef<RecoveryStats>({
    totalRecoveries: 0,
    lastRecoveryTime: null,
    lastRecoveryReason: null,
    history: [],
  });

  const isRecoveringRef = useRef(false);
  const lastCheckTimeRef = useRef(0);

  // Store 액션
  const clearAllPages = useStore((state) => state.clearAllPages);
  const currentPageId = useStore((state) => state.currentPageId);

  /**
   * 복구 실행
   */
  const executeRecovery = useCallback(
    async (reason: string): Promise<void> => {
      if (isRecoveringRef.current) {
        console.warn('[AutoRecovery] Recovery already in progress');
        return;
      }

      // 쿨다운 체크
      const now = Date.now();
      if (
        statsRef.current.lastRecoveryTime &&
        now - statsRef.current.lastRecoveryTime < config.recoveryCooldown
      ) {
        console.warn('[AutoRecovery] In cooldown period');
        return;
      }

      isRecoveringRef.current = true;
      const healthBefore = performanceMonitor.getLastMetrics()?.healthScore ?? 0;

      console.warn(`🔧 [AutoRecovery] Starting recovery: ${reason}`);
      console.log('  Health before:', healthBefore);

      try {
        // 1단계: 비활성 페이지 언로드
        console.log('  Step 1: Unloading inactive pages...');
        if (clearAllPages) {
          clearAllPages();
        }

        // 2단계: 히스토리 정리
        console.log('  Step 2: Trimming history...');
        historyManager.trim(config.historyKeepCount);

        // 3단계: LRU 캐시 정리 (현재 페이지 제외)
        console.log('  Step 3: Clearing caches...');
        const cachedPages = pageCache.getPageIds();
        cachedPages.forEach((pageId) => {
          if (pageId !== currentPageId) {
            pageCache.remove(pageId);
          }
        });

        // 4단계: 가비지 컬렉션 힌트 (Chrome only)
        if ('gc' in window && typeof (window as Window & { gc?: () => void }).gc === 'function') {
          console.log('  Step 4: Requesting GC...');
          (window as Window & { gc?: () => void }).gc?.();
        }

        // 메트릭 재수집
        await new Promise((resolve) => setTimeout(resolve, 100));
        const metricsAfter = performanceMonitor.collect();

        // 통계 업데이트
        statsRef.current.totalRecoveries++;
        statsRef.current.lastRecoveryTime = now;
        statsRef.current.lastRecoveryReason = reason;
        statsRef.current.history.push({
          timestamp: now,
          reason,
          healthBefore,
          healthAfter: metricsAfter.healthScore,
        });

        // 히스토리 최대 10개 유지
        if (statsRef.current.history.length > 10) {
          statsRef.current.history.shift();
        }

        console.log(`✅ [AutoRecovery] Recovery complete`);
        console.log(`  Health after: ${metricsAfter.healthScore}`);
        console.log(`  Improvement: +${metricsAfter.healthScore - healthBefore}`);

        // 콜백 호출
        options?.onRecovery?.(reason, { ...statsRef.current });
      } catch (error) {
        console.error('[AutoRecovery] Recovery failed:', error);
      } finally {
        isRecoveringRef.current = false;
      }
    },
    [clearAllPages, currentPageId, config.historyKeepCount, config.recoveryCooldown, options]
  );

  /**
   * 수동 복구 트리거
   */
  const triggerRecovery = useCallback(
    (reason = 'manual') => {
      executeRecovery(reason);
    },
    [executeRecovery]
  );

  /**
   * 자동 체크 루프
   */
  useEffect(() => {
    if (!config.enabled) return;

    // 성능 모니터 자동 수집 시작
    performanceMonitor.startAutoCollect(config.checkInterval);

    // 메트릭 리스너 등록
    const unsubscribe = performanceMonitor.addListener((metrics) => {
      // 중복 체크 방지
      const now = Date.now();
      if (now - lastCheckTimeRef.current < 5000) return;
      lastCheckTimeRef.current = now;

      // 경고 상태
      if (metrics.healthScore < config.warningHealthScore && metrics.healthScore >= config.criticalHealthScore) {
        console.warn(`⚠️ [AutoRecovery] Warning: Health ${metrics.healthScore}%`);
        options?.onWarning?.(metrics);
      }

      // 심각 상태 - 자동 복구
      if (metrics.healthScore < config.criticalHealthScore) {
        console.error(`🚨 [AutoRecovery] Critical: Health ${metrics.healthScore}%`);
        executeRecovery(`critical_health_${metrics.healthScore}`);
      }
    });

    return () => {
      unsubscribe();
      performanceMonitor.stopAutoCollect();
    };
  }, [config.enabled, config.checkInterval, config.criticalHealthScore, config.warningHealthScore, executeRecovery, options]);

  return {
    stats: statsRef.current,
    triggerRecovery,
    isRecovering: isRecoveringRef.current,
  };
}

// ============================================
// Standalone Recovery Functions
// ============================================

/**
 * 메모리 압박 시 긴급 복구
 * (React 컴포넌트 외부에서 호출 가능)
 */
export async function emergencyRecovery(): Promise<void> {
  console.error('🚨 [EmergencyRecovery] Starting emergency recovery...');

  try {
    // 1. 히스토리 대폭 정리
    historyManager.trim(20);

    // 2. LRU 캐시 완전 클리어
    pageCache.clear();

    // 3. GC 힌트
    if ('gc' in window) {
      (window as Window & { gc?: () => void }).gc?.();
    }

    console.log('✅ [EmergencyRecovery] Complete');
  } catch (error) {
    console.error('[EmergencyRecovery] Failed:', error);
  }
}

/**
 * 메모리 압박 이벤트 리스너 등록
 */
export function setupMemoryPressureListener(): () => void {
  // Chrome의 메모리 압박 API (실험적)
  if ('memory' in performance) {
    const checkMemory = () => {
      const memory = (performance as Performance & {
        memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
      }).memory;

      if (memory) {
        const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
        if (usagePercent > 90) {
          emergencyRecovery();
        }
      }
    };

    const intervalId = setInterval(checkMemory, 10000);
    return () => clearInterval(intervalId);
  }

  return () => {};
}
