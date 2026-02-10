/**
 * FillItem → FillStyle (Skia) 변환 레이어
 *
 * UI 모델(FillItem)을 Skia 렌더링 모델(FillStyle)로 변환
 * Phase 1: ColorFillItem → ColorFill만 지원
 *
 * @see apps/builder/src/builder/workspace/canvas/skia/types.ts
 * @see apps/builder/src/builder/workspace/canvas/skia/fills.ts (applyFill)
 */

import type {
  FillItem,
  ColorFillItem,
  LinearGradientFillItem,
  RadialGradientFillItem,
  AngularGradientFillItem,
} from '../../../../types/builder/fill.types';
import { FillType } from '../../../../types/builder/fill.types';
import type {
  ColorFill,
  LinearGradientFill,
  RadialGradientFill,
  AngularGradientFill,
  FillStyle,
} from '../../../workspace/canvas/skia/types';
import { hex8ToFloat32 } from './colorUtils';

/**
 * ColorFillItem → Skia ColorFill 변환
 */
function colorFillItemToSkia(item: ColorFillItem): ColorFill {
  const float32 = hex8ToFloat32(item.color);
  return {
    type: 'color',
    rgba: [
      float32[0],
      float32[1],
      float32[2],
      float32[3] * item.opacity, // Fill opacity 적용
    ],
  };
}

/**
 * LinearGradientFillItem → Skia LinearGradientFill 변환
 */
function linearGradientFillItemToSkia(
  item: LinearGradientFillItem,
  width: number,
  height: number,
): LinearGradientFill {
  const colors = item.stops.map(s => {
    const c = hex8ToFloat32(s.color);
    return Float32Array.of(c[0], c[1], c[2], c[3] * item.opacity);
  });
  const positions = item.stops.map(s => s.position);

  const rad = (item.rotation * Math.PI) / 180;
  const cx = width / 2;
  const cy = height / 2;
  const len = Math.max(width, height) / 2;
  const start: [number, number] = [cx - Math.cos(rad) * len, cy - Math.sin(rad) * len];
  const end: [number, number] = [cx + Math.cos(rad) * len, cy + Math.sin(rad) * len];

  return {
    type: 'linear-gradient',
    start,
    end,
    colors,
    positions,
  };
}

/**
 * RadialGradientFillItem → Skia RadialGradientFill 변환
 */
function radialGradientFillItemToSkia(
  item: RadialGradientFillItem,
  width: number,
  height: number,
): RadialGradientFill {
  const colors = item.stops.map(s => {
    const c = hex8ToFloat32(s.color);
    return Float32Array.of(c[0], c[1], c[2], c[3] * item.opacity);
  });
  const positions = item.stops.map(s => s.position);

  const centerX = item.center.x * width;
  const centerY = item.center.y * height;
  const endRadius = Math.max(item.radius.width * width, item.radius.height * height);

  return {
    type: 'radial-gradient',
    center: [centerX, centerY],
    startRadius: 0,
    endRadius,
    colors,
    positions,
  };
}

/**
 * AngularGradientFillItem → Skia AngularGradientFill 변환
 */
function angularGradientFillItemToSkia(
  item: AngularGradientFillItem,
  width: number,
  height: number,
): AngularGradientFill {
  const colors = item.stops.map(s => {
    const c = hex8ToFloat32(s.color);
    return Float32Array.of(c[0], c[1], c[2], c[3] * item.opacity);
  });
  const positions = item.stops.map(s => s.position);

  return {
    type: 'angular-gradient',
    cx: item.center.x * width,
    cy: item.center.y * height,
    colors,
    positions,
  };
}

/**
 * FillItem → FillStyle 변환
 * Phase 2: Color + 3종 Gradient 지원
 */
export function fillItemToFillStyle(item: FillItem, width = 100, height = 100): FillStyle | null {
  if (!item.enabled) return null;

  switch (item.type) {
    case FillType.Color:
      return colorFillItemToSkia(item);
    case FillType.LinearGradient:
      return linearGradientFillItemToSkia(item, width, height);
    case FillType.RadialGradient:
      return radialGradientFillItemToSkia(item, width, height);
    case FillType.AngularGradient:
      return angularGradientFillItemToSkia(item, width, height);
    default:
      return null;
  }
}

/**
 * fills 배열 → Skia 렌더링 데이터 변환
 * Phase 1: 마지막 enabled fill의 fillColor만 반환
 *
 * @returns fillColor Float32Array (0-1 범위) 또는 null
 */
export function fillsToSkiaFillColor(fills: FillItem[]): Float32Array | null {
  if (!fills || fills.length === 0) return null;

  // 마지막 enabled fill 찾기 (시각적으로 가장 위)
  for (let i = fills.length - 1; i >= 0; i--) {
    const fill = fills[i];
    if (!fill.enabled) continue;

    const fillStyle = fillItemToFillStyle(fill);
    if (fillStyle && fillStyle.type === 'color') {
      return Float32Array.of(
        fillStyle.rgba[0],
        fillStyle.rgba[1],
        fillStyle.rgba[2],
        fillStyle.rgba[3],
      );
    }
  }

  return null;
}

/**
 * fills 배열 → FillStyle 변환 (그래디언트 포함)
 * 마지막 enabled fill의 FillStyle 반환
 *
 * @returns FillStyle 또는 null
 */
export function fillsToSkiaFillStyle(fills: FillItem[], width: number, height: number): FillStyle | null {
  if (!fills || fills.length === 0) return null;

  for (let i = fills.length - 1; i >= 0; i--) {
    const fill = fills[i];
    if (!fill.enabled) continue;

    const fillStyle = fillItemToFillStyle(fill, width, height);
    if (fillStyle) return fillStyle;
  }

  return null;
}
