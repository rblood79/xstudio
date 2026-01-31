/**
 * WASM Feature Flags
 *
 * Canvas 렌더링 관련 WASM 모듈의 활성화 상태를 관리한다.
 * 전역 featureFlags.ts와 분리하여 canvas/ 하위 모듈에서 직접 참조한다.
 *
 * @see docs/WASM.md §0.3 Feature Flag 인프라
 */

export const WASM_FLAGS = {
  /** Phase 1: SpatialIndex WASM 가속 */
  SPATIAL_INDEX: import.meta.env.VITE_WASM_SPATIAL === 'true',

  /** Phase 2: Layout Engine WASM 가속 */
  LAYOUT_ENGINE: import.meta.env.VITE_WASM_LAYOUT === 'true',

  /** Phase 5: CanvasKit/Skia 렌더러 활성화 */
  CANVASKIT_RENDERER:
    import.meta.env.VITE_RENDER_MODE === 'skia' ||
    import.meta.env.VITE_RENDER_MODE === 'hybrid',

  /** Phase 6: 이중 Surface 캐싱 + Dirty Rect 렌더링 */
  DUAL_SURFACE_CACHE:
    import.meta.env.VITE_SKIA_DUAL_SURFACE !== 'false' &&
    (import.meta.env.VITE_RENDER_MODE === 'skia' ||
     import.meta.env.VITE_RENDER_MODE === 'hybrid'),
} as const;

/** 현재 렌더 모드 */
export type RenderMode = 'pixi' | 'skia' | 'hybrid';

export function getRenderMode(): RenderMode {
  const mode = import.meta.env.VITE_RENDER_MODE;
  if (mode === 'skia' || mode === 'hybrid') return mode;
  return 'pixi';
}
