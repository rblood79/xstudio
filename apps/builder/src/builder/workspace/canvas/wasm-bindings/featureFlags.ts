/**
 * WASM Feature Flags
 *
 * Canvas 렌더링 관련 WASM 모듈의 활성화 상태.
 * 모든 플래그는 하드코딩 — 환경변수 분기 없음.
 *
 * @see docs/RENDERING_ARCHITECTURE.md §0.3 Feature Flag 인프라
 */

export const WASM_FLAGS = {
  /** Phase 1: SpatialIndex WASM 가속 (Rust wasm-pack 빌드 필요) */
  SPATIAL_INDEX: true,

  /** Phase 2: Layout Engine WASM 가속 (TaffyFlexEngine, TaffyGridEngine 의존) */
  LAYOUT_ENGINE: true,

  /** Phase 4: Layout Worker (Rust WASM 초기화 필요) */
  LAYOUT_WORKER: false,

  /** Phase 5: CanvasKit/Skia 렌더러 활성화 */
  CANVASKIT_RENDERER: true,

  /** Phase 6: 이중 Surface 캐싱 + Dirty Rect 렌더링 */
  DUAL_SURFACE_CACHE: true,
} as const;

/** 현재 렌더 모드 (skia 고정) */
export type RenderMode = "skia";

export function getRenderMode(): RenderMode {
  return "skia";
}

/** ADR-100: Unified Skia Engine — 점진 전환 flag */
export const UNIFIED_ENGINE_FLAGS = {
  // Phase 1: Layout Engine 교체
  USE_RUST_LAYOUT_ENGINE: false,

  // Phase 2: PixiJS 점진 제거
  USE_DOM_HOVER: false,
  USE_DOM_CURSOR: false,
  USE_CAMERA_OBJECT: false,
  USE_SCENE_GRAPH: true,
  REMOVE_PIXI: true,

  // Phase 3: 렌더링 확장
  USE_HYBRID_TEXT: false,
  USE_CSS3_EFFECTS: false,

  // Phase 4: 성능
  USE_TILE_CACHE: false,

  // 전체 전환 — PixiJS Application 제거 시 레이아웃 파이프라인도 중단되어 미사용
  // Phase 6 완료 후 레이아웃 독립화 필요
  UNIFIED_ENGINE: false,
} as const;

export type UnifiedEngineFlag = keyof typeof UNIFIED_ENGINE_FLAGS;

export function isUnifiedFlag(flag: UnifiedEngineFlag): boolean {
  if (UNIFIED_ENGINE_FLAGS.UNIFIED_ENGINE) return true;
  return UNIFIED_ENGINE_FLAGS[flag];
}
