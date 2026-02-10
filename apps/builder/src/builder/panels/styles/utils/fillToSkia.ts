/**
 * FillItem → FillStyle (Skia) 변환 레이어
 *
 * UI 모델(FillItem)을 Skia 렌더링 모델(FillStyle)로 변환
 * Phase 1: ColorFillItem → ColorFill만 지원
 *
 * @see apps/builder/src/builder/workspace/canvas/skia/types.ts
 * @see apps/builder/src/builder/workspace/canvas/skia/fills.ts (applyFill)
 */

import type { FillItem, ColorFillItem } from '../../../../types/builder/fill.types';
import { FillType } from '../../../../types/builder/fill.types';
import type { ColorFill, FillStyle } from '../../../workspace/canvas/skia/types';
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
 * FillItem → FillStyle 변환
 * Phase 1: Color만 지원, 나머지는 null 반환
 */
export function fillItemToFillStyle(item: FillItem): FillStyle | null {
  if (!item.enabled) return null;

  switch (item.type) {
    case FillType.Color:
      return colorFillItemToSkia(item);
    // Phase 2+: gradient/image/mesh 변환 추가 예정
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
