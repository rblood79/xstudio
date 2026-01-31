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
}

export interface ImageFill {
  type: 'image';
  image: unknown; // CanvasKit.Image
  tileMode: unknown; // CanvasKit.TileMode
  sampling: unknown; // CanvasKit.FilterMode
  matrix?: Float32Array;
}

export interface MeshGradientFill {
  type: 'mesh-gradient';
  // CanvasKit에 직접 매핑이 없음 — Phase 5 착수 시 구현 전략 결정
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

export type EffectStyle =
  | OpacityEffect
  | BackgroundBlurEffect
  | DropShadowEffect;

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
  | 'camera-only' // 줌/팬만 변경 → 캐시 블리팅
  | 'content'     // 요소 변경 → dirty rect 부분 렌더링
  | 'full';       // 리사이즈/첫 프레임 → 전체 렌더링

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
