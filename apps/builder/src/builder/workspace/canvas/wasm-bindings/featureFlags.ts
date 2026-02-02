/**
 * WASM Feature Flags
 *
 * Canvas 렌더링 관련 WASM 모듈의 활성화 상태.
 * 모든 플래그는 하드코딩 — 환경변수 분기 없음.
 *
 * @see docs/WASM.md §0.3 Feature Flag 인프라
 */

export const WASM_FLAGS = {
  /** Phase 1: SpatialIndex WASM 가속 */
  SPATIAL_INDEX: true,

  /** Phase 2: Layout Engine WASM 가속 */
  LAYOUT_ENGINE: true,

  /** Phase 4: Layout Worker (비동기 레이아웃 계산) */
  LAYOUT_WORKER: true,

  /** Phase 5: CanvasKit/Skia 렌더러 활성화 */
  CANVASKIT_RENDERER: true,

  /** Phase 6: 이중 Surface 캐싱 + Dirty Rect 렌더링 */
  DUAL_SURFACE_CACHE: true,
} as const;

/** 현재 렌더 모드 (skia 고정) */
export type RenderMode = 'skia';

export function getRenderMode(): RenderMode {
  return 'skia';
}
