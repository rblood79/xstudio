/**
 * Skia 호버 하이라이트 렌더러
 *
 * 마우스 오버 시 요소 테두리를 CanvasKit으로 렌더링한다.
 * selectionRenderer.ts와 동일한 패턴(순수 함수 + SkiaDisposable).
 * 카메라 변환(translate + scale) 내부에서 씬-로컬 좌표로 호출된다.
 */

import type { CanvasKit, Canvas } from 'canvaskit-wasm';
import { SkiaDisposable } from './disposable';
import type { BoundingBox } from '../selection/types';

// ============================================
// Constants — 호버 하이라이트 (blue-500, alpha 0.5)
// ============================================

const HOVER_R = 0x3b / 255;
const HOVER_G = 0x82 / 255;
const HOVER_B = 0xf6 / 255;
const HOVER_ALPHA = 0.5;

// ============================================
// Constants — editingContext 경계 (gray-400, alpha 0.3)
// ============================================

const CONTEXT_R = 0x9c / 255;
const CONTEXT_G = 0xa3 / 255;
const CONTEXT_B = 0xaf / 255;
const CONTEXT_ALPHA = 0.3;

// ============================================
// Hover Highlight
// ============================================

/**
 * 호버 요소의 테두리를 CanvasKit으로 렌더링한다.
 *
 * 씬-로컬 좌표계에서 호출. strokeWidth = 1/zoom으로 화면상 1px 유지.
 * dashed=true이면 그룹 내부 리프 노드 스타일 (점선).
 */
export function renderHoverHighlight(
  ck: CanvasKit,
  canvas: Canvas,
  bounds: BoundingBox,
  zoom: number,
  dashed = false,
): void {
  const scope = new SkiaDisposable();
  let dashEffect: ReturnType<typeof ck.PathEffect.MakeDash> | null = null;
  try {
    const sw = dashed ? 1 / zoom : 2 / zoom;
    const paint = scope.track(new ck.Paint());
    paint.setAntiAlias(true);
    paint.setStyle(ck.PaintStyle.Stroke);
    paint.setStrokeWidth(sw);
    paint.setColor(ck.Color4f(HOVER_R, HOVER_G, HOVER_B, HOVER_ALPHA));

    if (dashed) {
      dashEffect = ck.PathEffect.MakeDash([4 / zoom, 3 / zoom]);
      paint.setPathEffect(dashEffect);
    }

    const rect = ck.LTRBRect(
      bounds.x,
      bounds.y,
      bounds.x + bounds.width,
      bounds.y + bounds.height,
    );

    canvas.drawRect(rect, paint);
  } finally {
    dashEffect?.delete();
    scope.dispose();
  }
}

// ============================================
// Editing Context Border
// ============================================

/**
 * editingContext(그룹 편집 모드)의 경계를 점선으로 렌더링한다.
 *
 * 씬-로컬 좌표계에서 호출. strokeWidth = 1/zoom으로 화면상 1px 유지.
 */
export function renderEditingContextBorder(
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
    paint.setColor(ck.Color4f(CONTEXT_R, CONTEXT_G, CONTEXT_B, CONTEXT_ALPHA));

    // 점선 효과
    const dashEffect = ck.PathEffect.MakeDash([6 / zoom, 4 / zoom]);
    paint.setPathEffect(dashEffect);

    const rect = ck.LTRBRect(
      bounds.x,
      bounds.y,
      bounds.x + bounds.width,
      bounds.y + bounds.height,
    );
    canvas.drawRect(rect, paint);

    dashEffect.delete();
  } finally {
    scope.dispose();
  }
}
