/**
 * Skia Selection 오버레이 렌더러
 *
 * Pencil 방식 단일 캔버스: Selection Box, Transform Handles, Lasso를
 * CanvasKit으로 직접 렌더링한다.
 *
 * aiEffects.ts와 동일한 패턴(순수 함수 + SkiaDisposable).
 * 카메라 변환(translate + scale) 내부에서 씬-로컬 좌표로 호출된다.
 *
 * @see docs/WASM.md §5.11
 */

import type { CanvasKit, Canvas } from 'canvaskit-wasm';
import { SkiaDisposable } from './disposable';
import type { BoundingBox } from '../selection/types';
import { HANDLE_SIZE, HANDLE_CONFIGS } from '../selection/types';

// ============================================
// Constants (0x3b82f6 = blue-500)
// ============================================

/** Selection 테두리 색상 — ck.Color4f 형식 */
const SELECTION_R = 0x3b / 255; // 0.231
const SELECTION_G = 0x82 / 255; // 0.510
const SELECTION_B = 0xf6 / 255; // 0.965

// ============================================
// Types
// ============================================

/** 라쏘 렌더 데이터 */
export interface LassoRenderData {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================
// Selection Box
// ============================================

/**
 * 선택 박스 테두리를 CanvasKit으로 렌더링한다.
 *
 * 씬-로컬 좌표계에서 호출. strokeWidth = 1/zoom으로 화면상 1px 유지.
 */
export function renderSelectionBox(
  ck: CanvasKit,
  canvas: Canvas,
  bounds: BoundingBox,
  zoom: number,
): void {
  const scope = new SkiaDisposable();
  try {
    const sw = 1 / zoom;
    const paint = scope.track(new ck.Paint());
    paint.setAntiAlias(true);
    paint.setStyle(ck.PaintStyle.Stroke);
    paint.setStrokeWidth(sw);
    paint.setColor(ck.Color4f(SELECTION_R, SELECTION_G, SELECTION_B, 1));

    const rect = ck.LTRBRect(
      bounds.x,
      bounds.y,
      bounds.x + bounds.width,
      bounds.y + bounds.height,
    );
    canvas.drawRect(rect, paint);
  } finally {
    scope.dispose();
  }
}

// ============================================
// Transform Handles (코너 4개)
// ============================================

/**
 * 4개 코너 핸들을 CanvasKit으로 렌더링한다.
 *
 * 흰색 Fill + 파란 Stroke, 크기 = HANDLE_SIZE/zoom (화면상 6px 유지).
 * 엣지 핸들은 시각적 렌더링 불필요 (PixiJS 히트 영역으로 유지).
 */
export function renderTransformHandles(
  ck: CanvasKit,
  canvas: Canvas,
  bounds: BoundingBox,
  zoom: number,
): void {
  const scope = new SkiaDisposable();
  try {
    const handleSize = HANDLE_SIZE / zoom;
    const sw = 1 / zoom;
    const halfHandle = handleSize / 2;

    // Fill paint (흰색)
    const fillPaint = scope.track(new ck.Paint());
    fillPaint.setAntiAlias(true);
    fillPaint.setStyle(ck.PaintStyle.Fill);
    fillPaint.setColor(ck.Color4f(1, 1, 1, 1));

    // Stroke paint (파란색)
    const strokePaint = scope.track(new ck.Paint());
    strokePaint.setAntiAlias(true);
    strokePaint.setStyle(ck.PaintStyle.Stroke);
    strokePaint.setStrokeWidth(sw);
    strokePaint.setColor(ck.Color4f(SELECTION_R, SELECTION_G, SELECTION_B, 1));

    for (const config of HANDLE_CONFIGS) {
      if (!config.isCorner) continue;

      const cx = bounds.x + bounds.width * config.relativeX;
      const cy = bounds.y + bounds.height * config.relativeY;

      const rect = ck.LTRBRect(
        cx - halfHandle,
        cy - halfHandle,
        cx + halfHandle,
        cy + halfHandle,
      );

      canvas.drawRect(rect, fillPaint);
      canvas.drawRect(rect, strokePaint);
    }
  } finally {
    scope.dispose();
  }
}

// ============================================
// Lasso Selection
// ============================================

/**
 * 라쏘(사각형 드래그) 선택 영역을 CanvasKit으로 렌더링한다.
 *
 * 반투명 파란 Fill + 파란 Stroke.
 */
export function renderLasso(
  ck: CanvasKit,
  canvas: Canvas,
  lasso: LassoRenderData,
  zoom: number,
): void {
  const scope = new SkiaDisposable();
  try {
    const sw = 1 / zoom;

    const rect = ck.LTRBRect(
      lasso.x,
      lasso.y,
      lasso.x + lasso.width,
      lasso.y + lasso.height,
    );

    // Fill (반투명)
    const fillPaint = scope.track(new ck.Paint());
    fillPaint.setAntiAlias(true);
    fillPaint.setStyle(ck.PaintStyle.Fill);
    fillPaint.setColor(ck.Color4f(SELECTION_R, SELECTION_G, SELECTION_B, 0.1));
    canvas.drawRect(rect, fillPaint);

    // Stroke
    const strokePaint = scope.track(new ck.Paint());
    strokePaint.setAntiAlias(true);
    strokePaint.setStyle(ck.PaintStyle.Stroke);
    strokePaint.setStrokeWidth(sw);
    strokePaint.setColor(ck.Color4f(SELECTION_R, SELECTION_G, SELECTION_B, 0.8));
    canvas.drawRect(rect, strokePaint);
  } finally {
    scope.dispose();
  }
}
