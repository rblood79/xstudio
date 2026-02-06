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
import { isLowEndDevice } from '../pixiSetup';
import {
  getBorderBoxInnerBounds,
  isValidBorder,
  type BorderConfig,
  type BorderBoxInnerBounds,
} from './borderUtils';

// ============================================
// Smooth RoundRect Implementation
// ============================================

/**
 * 부드러운 둥근 모서리 사각형 그리기
 *
 * PixiJS 기본 roundRect보다 더 많은 세그먼트를 사용하여
 * 확대 시에도 부드러운 곡선을 유지합니다.
 *
 * @param g - Graphics 객체
 * @param x - X 좌표
 * @param y - Y 좌표
 * @param width - 너비
 * @param height - 높이
 * @param radius - 모서리 반경
 * @param segments - 각 모서리당 세그먼트 수 (미지정 시 반경 기반 자동 계산)
 */
export function smoothRoundRect(
  g: PixiGraphics,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  segments?: number
): void {
  // radius가 0이면 일반 사각형
  if (radius <= 0) {
    g.rect(x, y, width, height);
    return;
  }

  // radius가 너무 크면 조정
  const maxRadius = Math.min(width, height) / 2;
  const r = Math.min(radius, maxRadius);
  const cornerSegments = segments ?? getRoundRectSegments(r);

  // 시작점 (top-left 직선 시작)
  g.moveTo(x + r, y);

  // Top edge
  g.lineTo(x + width - r, y);

  // Top-right corner (arc)
  drawArc(g, x + width - r, y + r, r, -Math.PI / 2, 0, cornerSegments);

  // Right edge
  g.lineTo(x + width, y + height - r);

  // Bottom-right corner (arc)
  drawArc(g, x + width - r, y + height - r, r, 0, Math.PI / 2, cornerSegments);

  // Bottom edge
  g.lineTo(x + r, y + height);

  // Bottom-left corner (arc)
  drawArc(g, x + r, y + height - r, r, Math.PI / 2, Math.PI, cornerSegments);

  // Left edge
  g.lineTo(x, y + r);

  // Top-left corner (arc)
  drawArc(g, x + r, y + r, r, Math.PI, Math.PI * 1.5, cornerSegments);

  // Close path
  g.closePath();
}

/**
 * 개별 모서리 반경을 가진 부드러운 둥근 사각형 그리기
 *
 * CSS border-radius와 동일한 순서: [top-left, top-right, bottom-right, bottom-left]
 *
 * @param g - Graphics 객체
 * @param x - X 좌표
 * @param y - Y 좌표
 * @param width - 너비
 * @param height - 높이
 * @param radii - 모서리 반경 배열 [tl, tr, br, bl]
 * @param segments - 각 모서리당 세그먼트 수 (미지정 시 최대 반경 기반 자동 계산)
 */
export function smoothRoundRectCorners(
  g: PixiGraphics,
  x: number,
  y: number,
  width: number,
  height: number,
  radii: [number, number, number, number],
  segments?: number
): void {
  const [tl, tr, br, bl] = radii;

  // 모든 radius가 0이면 일반 사각형
  if (tl <= 0 && tr <= 0 && br <= 0 && bl <= 0) {
    g.rect(x, y, width, height);
    return;
  }

  // radius가 너무 크면 조정
  const maxRadius = Math.min(width, height) / 2;
  const rTL = Math.min(tl, maxRadius);
  const rTR = Math.min(tr, maxRadius);
  const rBR = Math.min(br, maxRadius);
  const rBL = Math.min(bl, maxRadius);

  // 세그먼트 수는 최대 반경 기준
  const maxR = Math.max(rTL, rTR, rBR, rBL);
  const cornerSegments = segments ?? getRoundRectSegments(maxR);

  // 시작점 (top-left 직선 시작)
  g.moveTo(x + rTL, y);

  // Top edge
  g.lineTo(x + width - rTR, y);

  // Top-right corner (arc)
  if (rTR > 0) {
    drawArc(g, x + width - rTR, y + rTR, rTR, -Math.PI / 2, 0, cornerSegments);
  }

  // Right edge
  g.lineTo(x + width, y + height - rBR);

  // Bottom-right corner (arc)
  if (rBR > 0) {
    drawArc(g, x + width - rBR, y + height - rBR, rBR, 0, Math.PI / 2, cornerSegments);
  }

  // Bottom edge
  g.lineTo(x + rBL, y + height);

  // Bottom-left corner (arc)
  if (rBL > 0) {
    drawArc(g, x + rBL, y + height - rBL, rBL, Math.PI / 2, Math.PI, cornerSegments);
  }

  // Left edge
  g.lineTo(x, y + rTL);

  // Top-left corner (arc)
  if (rTL > 0) {
    drawArc(g, x + rTL, y + rTL, rTL, Math.PI, Math.PI * 1.5, cornerSegments);
  }

  // Close path
  g.closePath();
}

/**
 * 호(arc) 그리기 - lineTo로 세그먼트화
 */
function drawArc(
  g: PixiGraphics,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  segments: number
): void {
  const safeSegments = Math.max(1, Math.floor(segments));
  const angleStep = (endAngle - startAngle) / safeSegments;

  for (let i = 1; i <= safeSegments; i++) {
    const angle = startAngle + angleStep * i;
    const px = cx + Math.cos(angle) * radius;
    const py = cy + Math.sin(angle) * radius;
    g.lineTo(px, py);
  }
}

const DEFAULT_MIN_ROUND_SEGMENTS = 8;
const DEFAULT_MAX_ROUND_SEGMENTS = 48;
const LOW_END_MIN_ROUND_SEGMENTS = 6;
const LOW_END_MAX_ROUND_SEGMENTS = 24;

function getRoundRectSegments(radius: number): number {
  const isLowEnd = isLowEndDevice();
  const minSegments = isLowEnd ? LOW_END_MIN_ROUND_SEGMENTS : DEFAULT_MIN_ROUND_SEGMENTS;
  const maxSegments = isLowEnd ? LOW_END_MAX_ROUND_SEGMENTS : DEFAULT_MAX_ROUND_SEGMENTS;
  const deviceScale = isLowEnd ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  const scaled = Math.round(radius * deviceScale);
  return Math.min(maxSegments, Math.max(minSegments, scaled));
}

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
  /**
   * border 모서리 반경 (border 없이도 적용 가능)
   * - number: 모든 모서리에 동일 적용
   * - [tl, tr, br, bl]: 각 모서리별 개별 적용 (CSS 순서)
   */
  borderRadius?: number | [number, number, number, number];
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
  const rawRadius = explicitBorderRadius ?? border?.radius ?? 0;

  // 개별 모서리 지원: [tl, tr, br, bl] 또는 단일 값
  const isArrayRadius = Array.isArray(rawRadius);
  const hasRadius = isArrayRadius
    ? rawRadius.some(r => r > 0)
    : rawRadius > 0;

  // 1. Fill (전체 영역)
  // 🚀 smoothRoundRect 사용: 확대 시에도 부드러운 모서리
  if (hasRadius) {
    if (isArrayRadius) {
      smoothRoundRectCorners(g, 0, 0, width, height, rawRadius as [number, number, number, number]);
    } else {
      smoothRoundRect(g, 0, 0, width, height, rawRadius as number);
    }
  } else {
    g.rect(0, 0, width, height);
  }
  g.fill({ color: backgroundColor, alpha: backgroundAlpha });

  // 2. Stroke (border가 있는 경우)
  if (isValidBorder(border)) {
    // 개별 모서리인 경우 최대값 사용 (border inner bounds 계산용)
    const uniformRadius = isArrayRadius
      ? Math.max(...(rawRadius as number[]))
      : rawRadius as number;

    if (ENABLE_BORDER_BOX) {
      // border-box 방식: 안쪽으로 offset
      const inner = getBorderBoxInnerBounds(width, height, border.width, uniformRadius);

      // 개별 모서리인 경우 drawBorderByStyleCorners 사용
      if (isArrayRadius) {
        const radii = rawRadius as [number, number, number, number];
        // inner radius 계산: 각 모서리별로 border.width 만큼 축소
        const innerRadii: [number, number, number, number] = [
          Math.max(0, radii[0] - border.width),
          Math.max(0, radii[1] - border.width),
          Math.max(0, radii[2] - border.width),
          Math.max(0, radii[3] - border.width),
        ];
        drawSolidBorderCorners(g, inner, innerRadii, border);
      } else {
        drawBorderByStyle(g, width, height, inner, border);
      }
    } else {
      // 기존 방식: stroke at edge (롤백용)
      drawBorderLegacy(g, width, height, uniformRadius, border);
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
 * 🚀 smoothRoundRect 사용: 확대 시에도 부드러운 모서리
 */
function drawSolidBorder(
  g: PixiGraphics,
  inner: BorderBoxInnerBounds,
  border: BorderConfig
): void {
  if (inner.radius > 0) {
    smoothRoundRect(g, inner.x, inner.y, inner.width, inner.height, inner.radius);
  } else {
    g.rect(inner.x, inner.y, inner.width, inner.height);
  }
  g.stroke({ width: border.width, color: border.color, alpha: border.alpha });
}

/**
 * Solid border 그리기 (개별 모서리 radius 지원)
 */
function drawSolidBorderCorners(
  g: PixiGraphics,
  inner: BorderBoxInnerBounds,
  radii: [number, number, number, number],
  border: BorderConfig
): void {
  const hasRadius = radii.some(r => r > 0);
  if (hasRadius) {
    smoothRoundRectCorners(g, inner.x, inner.y, inner.width, inner.height, radii);
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
  // 🚀 smoothRoundRect 사용: 확대 시에도 부드러운 모서리
  if (inner.radius > 0) {
    smoothRoundRect(g, inner.x, inner.y, inner.width, inner.height, inner.radius);
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
 * 🚀 smoothRoundRect 사용: 확대 시에도 부드러운 모서리
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
    smoothRoundRect(g, outerOffset, outerOffset, outerWidth - lineWidth, outerHeight - lineWidth, outerRadius);
  } else {
    g.rect(outerOffset, outerOffset, outerWidth - lineWidth, outerHeight - lineWidth);
  }
  g.stroke();

  // Inner border
  if (innerRadius > 0) {
    smoothRoundRect(
      g,
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
 * 🚀 smoothRoundRect 사용: 확대 시에도 부드러운 모서리
 */
function drawBorderLegacy(
  g: PixiGraphics,
  width: number,
  height: number,
  borderRadius: number,
  border: BorderConfig
): void {
  if (borderRadius > 0) {
    smoothRoundRect(g, 0, 0, width, height, borderRadius);
  } else {
    g.rect(0, 0, width, height);
  }
  g.stroke({ width: border.width, color: border.color, alpha: border.alpha });
}
