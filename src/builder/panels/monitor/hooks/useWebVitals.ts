/**
 * useWebVitals Hook
 *
 * Core Web Vitals 모니터링
 * - LCP (Largest Contentful Paint)
 * - FID (First Input Delay)
 * - CLS (Cumulative Layout Shift)
 * - TTFB (Time to First Byte)
 */

import { useState, useEffect, useCallback } from "react";

export interface WebVitals {
  lcp: number | null; // Largest Contentful Paint (ms)
  fid: number | null; // First Input Delay (ms)
  cls: number | null; // Cumulative Layout Shift (score)
  ttfb: number | null; // Time to First Byte (ms)
}

export function useWebVitals() {
  const [vitals, setVitals] = useState<WebVitals>({
    lcp: null,
    fid: null,
    cls: null,
    ttfb: null,
  });

  // Canvas iframe으로부터 메시지 수신
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "WEB_VITALS_UPDATE") {
        setVitals(event.data.vitals);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Canvas에 Web Vitals 수집 요청
  const requestVitals = useCallback(() => {
    const iframe = document.querySelector<HTMLIFrameElement>(".canvas-iframe");
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ type: "REQUEST_WEB_VITALS" }, "*");
    }
  }, []);

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
