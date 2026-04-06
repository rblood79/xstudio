/**
 * Mutable Viewport State (ADR-100 Phase 5)
 *
 * ViewportController가 매 pointermove에서 동기적으로 갱신.
 * SkiaCanvas RAF에서 zero-latency 읽기.
 *
 * Zustand store와 별개 — store는 React 컴포넌트용,
 * 이 모듈은 RAF 렌더 루프용.
 */

export const viewportState = {
  x: 0,
  y: 0,
  zoom: 1,
};
