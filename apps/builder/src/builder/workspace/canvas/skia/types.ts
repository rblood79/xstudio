/**
 * CanvasKit/Skia 렌더링 타입 정의
 *
 * Pencil의 renderSkia() 패턴을 xstudio에 도입하기 위한 인터페이스.
 *
 * @see docs/WASM.md §5.3 renderSkia() 패턴 도입
 */

import type { CanvasKit, Canvas } from 'canvaskit-wasm';

// ============================================
// Core Interfaces
// ============================================

/**
 * CanvasKit Canvas에 직접 렌더링할 수 있는 노드 인터페이스
 *
 * Pencil의 모든 씬 노드가 구현하는 renderSkia() 패턴.
 * xstudio의 Sprite 계층(BoxSprite, TextSprite, ImageSprite 등)에 구현한다.
 */
export interface SkiaRenderable {
  renderSkia(canvas: Canvas, cullingBounds: DOMRect): void;
}

/**
 * SkiaRenderer에서 renderSkia() 호출 시 전달되는 컨텍스트
 */
export interface SkiaRenderContext {
  canvasKit: CanvasKit;
  canvas: Canvas;
  cullingBounds: DOMRect;
}

// ============================================
// Fill Types
// ============================================

export interface ColorFill {
  type: 'color';
  rgba: [number, number, number, number]; // [r, g, b, a] 0-1 범위
}

export interface LinearGradientFill {
  type: 'linear-gradient';
  start: [number, number];
  end: [number, number];
  colors: Float32Array[];
  positions: number[];
}

export interface RadialGradientFill {
  type: 'radial-gradient';
  center: [number, number];
  startRadius: number;
  endRadius: number;
  colors: Float32Array[];
  positions: number[];
}

export interface AngularGradientFill {
  type: 'angular-gradient';
  cx: number;
  cy: number;
  colors: Float32Array[];
  positions: number[];
  /** CSS conic-gradient(12시) → CanvasKit(3시) 보정용 회전 행렬 */
  rotationMatrix?: Float32Array;
}

export interface ImageFill {
  type: 'image';
  image: unknown; // CanvasKit.Image
  /** X축 TileMode (repeat-x 등 축별 분리 지원) */
  tileModeX: unknown; // CanvasKit.TileMode
  /** Y축 TileMode */
  tileModeY: unknown; // CanvasKit.TileMode
  /** @deprecated tileModeX/Y로 대체됨. 하위 호환성 유지용 */
  tileMode?: unknown; // CanvasKit.TileMode
  sampling: unknown; // CanvasKit.FilterMode
  matrix?: Float32Array;
}

export interface MeshGradientFill {
  type: 'mesh-gradient';
  /** 그리드 행 수 (최소 2) */
  rows: number;
  /** 그리드 열 수 (최소 2) */
  columns: number;
  /** rows × columns 개의 색상 (Float32Array[]) — 좌상→우하 순서 */
  colors: Float32Array[];
  /** 요소 너비 (셰이더 좌표 계산용) */
  width: number;
  /** 요소 높이 (셰이더 좌표 계산용) */
  height: number;
}

export type FillStyle =
  | ColorFill
  | LinearGradientFill
  | RadialGradientFill
  | AngularGradientFill
  | ImageFill
  | MeshGradientFill;

// ============================================
// Effect Types
// ============================================

export interface OpacityEffect {
  type: 'opacity';
  value: number; // 0-1
}

export interface BackgroundBlurEffect {
  type: 'background-blur';
  sigma: number;
}

export interface DropShadowEffect {
  type: 'drop-shadow';
  dx: number;
  dy: number;
  sigmaX: number;
  sigmaY: number;
  color: Float32Array; // CanvasKit Color4f
  inner: boolean;
}

export interface LayerBlurEffect {
  type: 'layer-blur';
  /** 가우시안 블러 시그마 (전경 콘텐츠에 적용) */
  sigma: number;
}

/**
 * CSS filter 함수(brightness, contrast, saturate, hue-rotate)를
 * CanvasKit ColorFilter.MakeMatrix()용 4x5 색상 행렬로 변환한 이펙트.
 *
 * 행렬 레이아웃 (row-major, 20개 요소):
 * | R' |   | m0  m1  m2  m3  m4  |   | R |
 * | G' | = | m5  m6  m7  m8  m9  | x | G |
 * | B' |   | m10 m11 m12 m13 m14 |   | B |
 * | A' |   | m15 m16 m17 m18 m19 |   | A |
 *                                     | 1 |
 *
 * m4, m9, m14, m19 는 오프셋 열 (0-255 범위 / 255 정규화)
 */
export interface ColorMatrixEffect {
  type: 'color-matrix';
  matrix: Float32Array; // 4x5 = 20개 요소
}

export type EffectStyle =
  | OpacityEffect
  | BackgroundBlurEffect
  | DropShadowEffect
  | LayerBlurEffect
  | ColorMatrixEffect;

// ============================================
// AI Visual Feedback Types (G.3)
// ============================================

/** Generating Effect 상태 — AI가 작업 중인 노드에 표시 */
export interface GeneratingEffectState {
  /** 대상 element ID */
  elementId: string;
  /** 효과 시작 시각 (performance.now()) */
  startTime: number;
  /** 블러 시그마 값 */
  blurSigma: number;
  /** 파티클 색상 [r, g, b, a] 0-1 범위 */
  particleColor: Float32Array;
  /** 파티클 수 */
  particleCount: number;
}

/** Flash 애니메이션 설정 */
export interface FlashConfig {
  /** 스트로크 색상 [r, g, b] 0-1 범위 */
  color: [number, number, number];
  /** 스트로크 너비 (px) */
  strokeWidth: number;
  /** 오래 지속 여부 (2초 vs 기본 0.5초) */
  longHold: boolean;
  /** 스캔라인 그라디언트 활성화 */
  scanLine: boolean;
}

/** Flash 애니메이션 상태 — AI 작업 완료 후 변경 노드에 표시 */
export interface FlashAnimationState {
  /** 대상 element ID */
  elementId: string;
  /** 애니메이션 시작 시각 (performance.now()) */
  startTime: number;
  /** 전체 지속 시간 (ms) */
  duration: number;
  /** Flash 설정 */
  config: FlashConfig;
}

/** AI 이펙트 렌더링에 필요한 노드 바운딩 정보 */
export interface AIEffectNodeBounds {
  elementId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
}

// ============================================
// Phase 6: Dirty Rect / Frame Classification Types
// ============================================

/** Dirty rect — 변경된 영역의 바운딩 박스 (씬 좌표) */
export interface DirtyRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 렌더 프레임 분류 */
export type FrameType =
  | 'idle'        // 변경 없음 → 렌더링 스킵
  | 'present'     // 오버레이만 변경 → 캐시 blit + 오버레이 렌더링
  | 'camera-only' // 카메라만 변경 → 캐시 blit + 아핀 변환 (~1ms)
  | 'content'     // 요소 변경 → 컨텐츠 재렌더링 후 블리팅
  | 'full';       // 리사이즈/첫 프레임/cleanup → 전체 재렌더링

/** 카메라 상태 스냅샷 (블리팅 변환용) */
export interface CameraState {
  zoom: number;
  panX: number;
  panY: number;
}

// ============================================
// Utility Functions
// ============================================

/**
 * PixiJS Matrix (2x3) → CanvasKit SkMatrix (3x3 flat array) 변환
 *
 * PixiJS: { a, b, c, d, tx, ty } → 2x3 affine
 * CanvasKit: Float32Array(9) → [scaleX, skewX, transX, skewY, scaleY, transY, persp0, persp1, persp2]
 */
export function toSkMatrix(m: {
  a: number;
  b: number;
  c: number;
  d: number;
  tx: number;
  ty: number;
}): Float32Array {
  return Float32Array.of(
    m.a, m.c, m.tx,  // row 0: scaleX, skewX, transX
    m.b, m.d, m.ty,  // row 1: skewY, scaleY, transY
    0,   0,   1,     // row 2: perspective (항상 identity)
  );
}

/**
 * 두 AABB(Axis-Aligned Bounding Box)가 교차하는지 검사
 *
 * renderSkia()의 뷰포트 컬링에 사용한다.
 * cullingBounds와 요소의 worldBounds를 비교하여 화면 밖 요소를 건너뛴다.
 */
export function intersectsAABB(a: DOMRect, b: DOMRect): boolean {
  return (
    a.left <= b.right &&
    a.right >= b.left &&
    a.top <= b.bottom &&
    a.bottom >= b.top
  );
}
