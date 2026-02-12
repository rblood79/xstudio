/**
 * CanvasKit/Skia 그리드 렌더러
 *
 * PixiJS Graphics 기반 GridLayer를 CanvasKit으로 마이그레이션.
 * 화면 고정(screen-fixed) 그리드를 Skia 파이프라인에서 렌더링한다.
 *
 * @see GridLayer.tsx (원본 PixiJS 구현)
 */

import type { CanvasKit, Canvas } from 'canvaskit-wasm';

// ============================================
// Types
// ============================================

export interface GridRenderOptions {
  /** 화면 너비 (CSS px) */
  width: number;
  /** 화면 높이 (CSS px) */
  height: number;
  /** 기본 그리드 크기 */
  gridSize: number;
  /** 현재 줌 레벨 */
  zoom: number;
  /** 그리드 표시 여부 */
  showGrid: boolean;
  /** 스냅 그리드 표시 여부 */
  showSnapGrid?: boolean;
  /** 스냅 그리드 크기 */
  snapSize?: number;
}

// ============================================
// Constants (GridLayer.tsx와 동일)
// ============================================

/** slate-200 */
const GRID_COLOR = [0xe2 / 255, 0xe8 / 255, 0xf0 / 255] as const;
const GRID_ALPHA = 0.5;

/** slate-400 */
const MAJOR_GRID_COLOR = [0x94 / 255, 0xa3 / 255, 0xb8 / 255] as const;
const MAJOR_GRID_ALPHA = 0.3;

/** slate-600 */
const CENTER_LINE_COLOR = [0x47 / 255, 0x55 / 255, 0x69 / 255] as const;
const CENTER_LINE_ALPHA = 0.6;
const CENTER_LINE_WIDTH = 1;

/** blue-500 */
const SNAP_GRID_COLOR = [0x3b / 255, 0x82 / 255, 0xf6 / 255] as const;
const SNAP_GRID_ALPHA = 0.2;

// ============================================
// Helper Functions
// ============================================

/**
 * 줌 레벨에 따른 적절한 그리드 간격 계산
 */
function calculateGridInterval(baseSize: number, zoom: number): number {
  if (zoom < 0.25) return baseSize * 4;
  if (zoom < 0.5) return baseSize * 2;
  if (zoom > 2) return baseSize / 2;
  if (zoom > 4) return baseSize / 4;
  return baseSize;
}

// ============================================
// Renderer
// ============================================

/**
 * CanvasKit으로 화면 고정 그리드를 렌더링한다.
 *
 * SkiaRenderer의 screenOverlayNode로 설정되어
 * 카메라 변환 없이 스크린 좌표계에서 그려진다.
 */
export function renderGrid(
  ck: CanvasKit,
  canvas: Canvas,
  options: GridRenderOptions,
): void {
  if (!options.showGrid) return;

  const { width, height, gridSize, zoom } = options;
  const gridInterval = calculateGridInterval(gridSize, zoom);
  const majorGridInterval = gridInterval * 5;

  const paint = new ck.Paint();
  paint.setAntiAlias(false);
  paint.setStyle(ck.PaintStyle.Fill);

  // === 일반 그리드 ===
  paint.setColor(ck.Color4f(GRID_COLOR[0], GRID_COLOR[1], GRID_COLOR[2], GRID_ALPHA));

  // 수직선
  for (let x = 0; x <= width; x += gridInterval) {
    if (x % majorGridInterval === 0) continue;
    canvas.drawRect(ck.XYWHRect(x - 0.5, 0, 1, height), paint);
  }
  // 수평선
  for (let y = 0; y <= height; y += gridInterval) {
    if (y % majorGridInterval === 0) continue;
    canvas.drawRect(ck.XYWHRect(0, y - 0.5, width, 1), paint);
  }

  // === 메이저 그리드 (5배 간격, 더 진한 색상) ===
  paint.setColor(ck.Color4f(MAJOR_GRID_COLOR[0], MAJOR_GRID_COLOR[1], MAJOR_GRID_COLOR[2], MAJOR_GRID_ALPHA));

  for (let x = 0; x <= width; x += majorGridInterval) {
    canvas.drawRect(ck.XYWHRect(x - 0.5, 0, 1, height), paint);
  }
  for (let y = 0; y <= height; y += majorGridInterval) {
    canvas.drawRect(ck.XYWHRect(0, y - 0.5, width, 1), paint);
  }

  // === 중앙선 강조 ===
  paint.setColor(ck.Color4f(CENTER_LINE_COLOR[0], CENTER_LINE_COLOR[1], CENTER_LINE_COLOR[2], CENTER_LINE_ALPHA));

  canvas.drawRect(ck.XYWHRect(width / 2 - CENTER_LINE_WIDTH / 2, 0, CENTER_LINE_WIDTH, height), paint);
  canvas.drawRect(ck.XYWHRect(0, height / 2 - CENTER_LINE_WIDTH / 2, width, CENTER_LINE_WIDTH), paint);

  // === 스냅 그리드 (선택적) ===
  if (options.showSnapGrid && options.snapSize && options.snapSize !== gridInterval) {
    paint.setColor(ck.Color4f(SNAP_GRID_COLOR[0], SNAP_GRID_COLOR[1], SNAP_GRID_COLOR[2], SNAP_GRID_ALPHA));

    const snapSize = options.snapSize;
    for (let x = 0; x <= width; x += snapSize) {
      for (let y = 0; y <= height; y += snapSize) {
        canvas.drawCircle(x, y, 1, paint);
      }
    }
  }

  paint.delete();
}
