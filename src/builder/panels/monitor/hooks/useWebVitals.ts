/**
 * useWebVitals Hook
 *
 * Core Web Vitals 모니터링
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - TTFB (Time to First Byte)
 *
 * 🚀 Phase 11: WebGL-only 모드에서는 iframe 통신 스킵
 */

import { useState, useEffect, useCallback } from "react";
// 🚀 Phase 11: Feature Flags for WebGL-only mode
import { isWebGLCanvas, isCanvasCompareMode } from "../../../../utils/featureFlags";

export interface WebVitals {
  lcp: number | null; // Largest Contentful Paint (ms)
  fid: number | null; // First Input Delay (ms)
  cls: number | null; // Cumulative Layout Shift (score)
  ttfb: number | null; // Time to First Byte (ms)
}

interface UseWebVitalsOptions {
  /** 훅 활성화 여부 (비활성 시 listener 해제) */
  enabled?: boolean;
}

export function useWebVitals(options: UseWebVitalsOptions = {}) {
  const { enabled = true } = options;
  const [vitals, setVitals] = useState<WebVitals>({
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
  });

  // Canvas iframe으로부터 메시지 수신 (enabled 가드 적용)
  useEffect(() => {
    // 🛡️ enabled=false 시 listener 등록 안함
    if (!enabled) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "WEB_VITALS_UPDATE") {
        setVitals(event.data.vitals);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [enabled]);

  // 🚀 Phase 11: WebGL-only 모드 체크
  const isWebGLOnly = isWebGLCanvas() && !isCanvasCompareMode();

  // Canvas에 Web Vitals 수집 요청
  // 🚀 Phase 11: WebGL-only 모드에서는 iframe이 없으므로 스킵
  const requestVitals = useCallback(() => {
    if (isWebGLOnly) return;

    const iframe = document.querySelector<HTMLIFrameElement>(".canvas-iframe");
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: "REQUEST_WEB_VITALS" }, "*");
    }
  }, [isWebGLOnly]);

  // 현재 페이지의 Web Vitals 직접 수집 (Builder 자체)
  const collectLocalVitals = useCallback(() => {
    const newVitals: WebVitals = {
      lcp: null,
      fid: null,
      cls: null,
      ttfb: null,
    };

    if ("PerformanceObserver" in window) {
      // LCP
      const lcpEntries = performance.getEntriesByType(
        "largest-contentful-paint"
      );
      if (lcpEntries.length > 0) {
        newVitals.lcp = Math.round(
          lcpEntries[lcpEntries.length - 1].startTime
        );
      }

      // TTFB
      const navEntries = performance.getEntriesByType("navigation");
      if (navEntries.length > 0) {
        const nav = navEntries[0] as PerformanceNavigationTiming;
        newVitals.ttfb = Math.round(nav.responseStart - nav.requestStart);
      }

      // CLS (Layout Shift 기반)
      const layoutShiftEntries = performance.getEntriesByType("layout-shift");
      newVitals.cls = layoutShiftEntries.reduce((sum, entry) => {
        return sum + ((entry as PerformanceEntry & { value: number }).value || 0);
      }, 0);
    }

    setVitals(newVitals);
    return newVitals;
  }, []);

  return { vitals, requestVitals, collectLocalVitals };
}
