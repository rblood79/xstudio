/**
 * useMemoryStats Hook
 *
 * Monitor Panel의 메모리 통계를 수집하고 관리하는 훅
 * - RequestIdleCallback 기반 성능 최적화
 * - 브라우저 메모리 정보 (Chrome/Edge 전용)
 * - historyManager 통계 수집
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { historyManager } from "../../../stores/history";

export interface MemoryStats {
  pageCount: number;
  totalEntries: number;
  commandStoreStats: {
    commandCount: number;
    cacheSize: number;
    estimatedMemoryUsage: number;
    compressionRatio: number;
  };
  browserMemory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usagePercent: number;
  } | null;
  recommendation: string;
  isBrowserMemorySupported: boolean;
}

// 브라우저 메모리 API 타입 정의 (Chrome 전용)
interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

/**
 * 메모리 통계 수집 훅
 */
export function useMemoryStats() {
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // 통계 수집 함수
  const collectStats = useCallback(() => {
    try {
      const historyStats = historyManager.getMemoryStats();

      // 브라우저 메모리 정보 (Chrome/Edge 전용)
      const perfWithMemory = performance as PerformanceWithMemory;
      const browserMemory = perfWithMemory.memory
        ? {
            usedJSHeapSize: perfWithMemory.memory.usedJSHeapSize,
            totalJSHeapSize: perfWithMemory.memory.totalJSHeapSize,
            jsHeapSizeLimit: perfWithMemory.memory.jsHeapSizeLimit,
            usagePercent:
              (perfWithMemory.memory.usedJSHeapSize /
                perfWithMemory.memory.jsHeapSizeLimit) *
              100,
          }
        : null;

      // 권장사항 생성
      const recommendation = generateRecommendation(
        historyStats.totalEntries,
        historyStats.commandStoreStats.estimatedMemoryUsage,
        browserMemory?.usagePercent
      );

      setStats({
        pageCount: historyStats.pageCount,
        totalEntries: historyStats.totalEntries,
        commandStoreStats: historyStats.commandStoreStats,
        browserMemory,
        recommendation,
        isBrowserMemorySupported: !!perfWithMemory.memory,
      });
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn("[useMemoryStats] Failed to collect stats:", error);
      }
    }
  }, []);

  // 통계 수집 시작
  useEffect(() => {
    // 초기 수집
    if ("requestIdleCallback" in window) {
      (window as Window).requestIdleCallback(() => {
        collectStats();
      });
    } else {
      setTimeout(collectStats, 0);
    }

    // 주기적 수집 (10초마다)
    intervalRef.current = window.setInterval(() => {
      if ("requestIdleCallback" in window) {
        (window as Window).requestIdleCallback(() => {
          collectStats();
        });
      } else {
        collectStats();
      }
    }, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [collectStats]);

  // 메모리 최적화 함수
  const optimize = useCallback(async () => {
    setIsOptimizing(true);
    setStatusMessage("메모리 최적화 중...");

    try {
      // 최적화 실행
      historyManager.optimizeMemory();

      // 가비지 컬렉션 힌트 (효과 없을 수 있음)
      if ("gc" in window) {
        (window as Window & { gc?: () => void }).gc?.();
      }

      // 통계 재수집
      await new Promise((resolve) => setTimeout(resolve, 100));
      collectStats();

      setStatusMessage("메모리 최적화 완료");
    } catch (error) {
      setStatusMessage("최적화 중 오류 발생");
      if (import.meta.env.DEV) {
        console.error("[useMemoryStats] Optimization failed:", error);
      }
    } finally {
      setIsOptimizing(false);
      // 상태 메시지 자동 제거
      setTimeout(() => setStatusMessage(""), 3000);
    }
  }, [collectStats]);

  return { stats, statusMessage, optimize, isOptimizing };
}

/**
 * 메모리 상태 기반 권장사항 생성
 */
function generateRecommendation(
  totalEntries: number,
  estimatedMemory: number,
  browserUsagePercent?: number
): string {
  const memoryMB = estimatedMemory / (1024 * 1024);

  // 브라우저 메모리 사용량 기반 권장사항
  if (browserUsagePercent && browserUsagePercent > 75) {
    return "브라우저 메모리 사용량이 높습니다. 일부 탭을 닫거나 페이지를 새로고침하세요.";
  }

  // 히스토리 메모리 기반 권장사항
  if (memoryMB > 50) {
    return "메모리 사용량이 50MB를 초과했습니다. 최적화를 실행하세요.";
  }

  if (totalEntries > 200) {
    return "히스토리 항목이 많습니다. 불필요한 작업을 정리하세요.";
  }

  if (memoryMB > 20) {
    return "메모리 사용량이 적정 수준입니다.";
  }

  return "메모리 상태가 양호합니다.";
}

/**
 * 바이트 단위 포맷팅
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
