/**
 * Graphics Utilities
 *
 * PixiJS Graphics를 위한 border-box 방식 도형 그리기 유틸리티
 * - drawBox: 사각형 (border-box 방식)
 * - drawCircle: 원형 (border-box 방식)
 *
 * @since 2025-12-15 Canvas Border-Box v2
 */

import { Graphics as PixiGraphics } from 'pixi.js';
import {
  getBorderBoxInnerBounds,
  isValidBorder,
  type BorderConfig,
  type BorderBoxInnerBounds,
} from './borderUtils';

// ============================================
// Feature Flag
// ============================================

/**
 * border-box 렌더링 활성화 플래그
 * false로 설정하면 기존 방식(stroke at edge)으로 롤백
 */
export const ENABLE_BORDER_BOX = true;

// ============================================
// Types
// ============================================

export interface DrawBoxOptions {
  /** 요소 전체 너비 */
  width: number;
  /** 요소 전체 높이 */
  height: number;
  /** 배경 색상 (PixiJS hex) */
  backgroundColor?: number;
  /** 배경 투명도 (0-1) */
  backgroundAlpha?: number;
  /** border 모서리 반경 (border 없이도 적용 가능) */
  borderRadius?: number;
  /** border 설정 (null이면 border 없음) */
  border?: BorderConfig | null;
}

export interface DrawCircleOptions {
  /** 원 중심 X 좌표 */
  x: number;
  /** 원 중심 Y 좌표 */
  y: number;
  /** 원 반지름 */
  radius: number;
  /** 배경 색상 (PixiJS hex) */
  backgroundColor?: number;
  /** 배경 투명도 (0-1) */
  backgroundAlpha?: number;
  /** border 설정 */
  border?: {
    width: number;
    color: number;
    alpha?: number;
  } | null;
}

// ============================================
// Main Drawing Functions
// ============================================

/**
 * border-box 방식으로 Box 그리기
 *
 * CSS box-sizing: border-box와 동일하게 동작
 * - border가 width/height 안에 포함됨
 * - stroke가 요소 바깥으로 튀어나가지 않음
 *
 * @example
 * drawBox(g, {
 *   width: 100,
 *   height: 50,
 *   backgroundColor: 0xffffff,
 *   border: { width: 2, color: 0x000000, alpha: 1, style: 'solid', radius: 8 }
 * });
 */
export function drawBox(g: PixiGraphics, options: DrawBoxOptions): void {
  g.clear();

  const {
    width,
    height,
    backgroundColor = 0xffffff,
    backgroundAlpha = 1,
    borderRadius: explicitBorderRadius,
    border,
  } = options;

  // borderRadius 우선순위: 명시적 옵션 > border.radius > 0
  const borderRadius = explicitBorderRadius ?? border?.radius ?? 0;

  // 1. Fill (전체 영역)
  if (borderRadius > 0) {
    g.roundRect(0, 0, width, height, borderRadius);
  } else {
    g.rect(0, 0, width, height);
  }
  g.fill({ color: backgroundColor, alpha: backgroundAlpha });

  // 2. Stroke (border가 있는 경우)
  if (isValidBorder(border)) {
    if (ENABLE_BORDER_BOX) {
      // border-box 방식: 안쪽으로 offset
      const inner = getBorderBoxInnerBounds(width, height, border.width, borderRadius);
      drawBorderByStyle(g, width, height, inner, border);
    } else {
      // 기존 방식: stroke at edge (롤백용)
      drawBorderLegacy(g, width, height, borderRadius, border);
    }
  }
}

/**
 * border-box 방식으로 Circle 그리기
 *
 * @example
 * drawCircle(g, {
 *   x: 50,
 *   y: 50,
 *   radius: 20,
 *   backgroundColor: 0x3b82f6,
 *   border: { width: 2, color: 0x000000 }
 * });
 */
export function drawCircle(g: PixiGraphics, options: DrawCircleOptions): void {
  const {
    x,
    y,
    radius,
    backgroundColor = 0xffffff,
    backgroundAlpha = 1,
    border,
  } = options;

  const borderWidth = border?.width ?? 0;

  // border-box: 실제 반지름은 border 포함
  const innerRadius = ENABLE_BORDER_BOX
    ? Math.max(0, radius - borderWidth / 2)
    : radius;

  // Fill
  g.circle(x, y, innerRadius);
  g.fill({ color: backgroundColor, alpha: backgroundAlpha });

  // Stroke
  if (border && borderWidth > 0) {
    g.circle(x, y, innerRadius);
    g.stroke({ width: borderWidth, color: border.color, alpha: border.alpha ?? 1 });
  }
}

// ============================================
// Border Style Renderers
// ============================================

/**
 * borderStyle에 따라 적절한 렌더러 호출
 */
function drawBorderByStyle(
  g: PixiGraphics,
  outerWidth: number,
  outerHeight: number,
  inner: BorderBoxInnerBounds,
  border: BorderConfig
): void {
  switch (border.style) {
    case 'dashed':
      drawDashedBorder(g, inner, border);
      break;
    case 'dotted':
      drawDottedBorder(g, inner, border);
      break;
    case 'double':
      drawDoubleBorder(g, outerWidth, outerHeight, border);
      break;
    case 'solid':
    default:
      drawSolidBorder(g, inner, border);
      break;
  }
}

/**
 * Solid border 그리기 (border-box)
 */
function drawSolidBorder(
  g: PixiGraphics,
  inner: BorderBoxInnerBounds,
  border: BorderConfig
): void {
  if (inner.radius > 0) {
    g.roundRect(inner.x, inner.y, inner.width, inner.height, inner.radius);
  } else {
    g.rect(inner.x, inner.y, inner.width, inner.height);
  }
  g.stroke({ width: border.width, color: border.color, alpha: border.alpha });
}

/**
 * Dashed border 그리기 (border-box)
 */
function drawDashedBorder(
  g: PixiGraphics,
  inner: BorderBoxInnerBounds,
  border: BorderConfig
): void {
  const dashLength = Math.max(border.width * 3, 6);
  const gapLength = Math.max(border.width * 2, 4);

  g.setStrokeStyle({ width: border.width, color: border.color, alpha: border.alpha });

  // borderRadius가 있으면 solid로 fallback (dashed corners 복잡)
  if (inner.radius > 0) {
    g.roundRect(inner.x, inner.y, inner.width, inner.height, inner.radius);
    g.stroke();
    return;
  }

  // 각 변에 대시 그리기
  const { x, y, width, height } = inner;
  const right = x + width;
  const bottom = y + height;

  // Top
  for (let px = x; px < right; px += dashLength + gapLength) {
    g.moveTo(px, y);
    g.lineTo(Math.min(px + dashLength, right), y);
  }
  // Right
  for (let py = y; py < bottom; py += dashLength + gapLength) {
    g.moveTo(right, py);
    g.lineTo(right, Math.min(py + dashLength, bottom));
  }
  // Bottom
  for (let px = right; px > x; px -= dashLength + gapLength) {
    g.moveTo(px, bottom);
    g.lineTo(Math.max(px - dashLength, x), bottom);
  }
  // Left
  for (let py = bottom; py > y; py -= dashLength + gapLength) {
    g.moveTo(x, py);
    g.lineTo(x, Math.max(py - dashLength, y));
  }

  g.stroke();
}

/**
 * Dotted border 그리기 (border-box)
 */
function drawDottedBorder(
  g: PixiGraphics,
  inner: BorderBoxInnerBounds,
  border: BorderConfig
): void {
  const dotRadius = border.width / 2;
  const gap = border.width * 2;

  const { x, y, width, height } = inner;
  const right = x + width;
  const bottom = y + height;

  // Top edge
  for (let px = x + dotRadius; px < right - dotRadius; px += gap) {
    g.circle(px, y, dotRadius);
  }
  // Right edge
  for (let py = y + dotRadius; py < bottom - dotRadius; py += gap) {
    g.circle(right, py, dotRadius);
  }
  // Bottom edge
  for (let px = right - dotRadius; px > x + dotRadius; px -= gap) {
    g.circle(px, bottom, dotRadius);
  }
  // Left edge
  for (let py = bottom - dotRadius; py > y + dotRadius; py -= gap) {
    g.circle(x, py, dotRadius);
  }

  g.fill({ color: border.color, alpha: border.alpha });
}

/**
 * Double border 그리기 (border-box)
 */
function drawDoubleBorder(
  g: PixiGraphics,
  outerWidth: number,
  outerHeight: number,
  border: BorderConfig
): void {
  const lineWidth = border.width / 3;
  const outerOffset = lineWidth / 2;
  const innerOffset = border.width - lineWidth / 2;
  const innerRadius = Math.max(0, border.radius - innerOffset);

  g.setStrokeStyle({ width: lineWidth, color: border.color, alpha: border.alpha });

  // Outer border
  if (border.radius > 0) {
    const outerRadius = Math.max(0, border.radius - outerOffset);
    g.roundRect(outerOffset, outerOffset, outerWidth - lineWidth, outerHeight - lineWidth, outerRadius);
  } else {
    g.rect(outerOffset, outerOffset, outerWidth - lineWidth, outerHeight - lineWidth);
  }
  g.stroke();

  // Inner border
  if (innerRadius > 0) {
    g.roundRect(
      innerOffset,
      innerOffset,
      outerWidth - innerOffset * 2,
      outerHeight - innerOffset * 2,
      innerRadius
    );
  } else {
    g.rect(
      innerOffset,
      innerOffset,
      outerWidth - innerOffset * 2,
      outerHeight - innerOffset * 2
    );
  }
  g.stroke();
}

/**
 * 기존 방식 border 그리기 (롤백용)
 */
function drawBorderLegacy(
  g: PixiGraphics,
  width: number,
  height: number,
  borderRadius: number,
  border: BorderConfig
): void {
  if (borderRadius > 0) {
    g.roundRect(0, 0, width, height, borderRadius);
  } else {
    g.rect(0, 0, width, height);
  }
  g.stroke({ width: border.width, color: border.color, alpha: border.alpha });
}
