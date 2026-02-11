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
  ImageFillItem,
  MeshGradientFillItem,
} from '../../../../types/builder/fill.types';
import { FillType } from '../../../../types/builder/fill.types';
import type {
  ColorFill,
  LinearGradientFill,
  RadialGradientFill,
  AngularGradientFill,
  ImageFill,
  MeshGradientFill,
  FillStyle,
} from '../../../workspace/canvas/skia/types';
import { getSkImage, loadSkImage } from '../../../workspace/canvas/skia/imageCache';
import { isCanvasKitInitialized, getCanvasKit } from '../../../workspace/canvas/skia/initCanvasKit';
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
 * ImageFillItem → Skia ImageFill 변환
 * Phase 4: imageCache에서 동기 조회 (캐시 미스 시 비동기 로딩 트리거)
 */
function imageFillItemToSkia(
  item: ImageFillItem,
  width: number,
  height: number,
): ImageFill | null {
  if (!item.url || !isCanvasKitInitialized()) return null;

  const skImage = getSkImage(item.url);

  // 캐시 미스 — 백그라운드 로딩 트리거 후 null 반환 (다음 렌더에서 캐시 히트)
  if (!skImage) {
    loadSkImage(item.url);
    return null;
  }

  const ck = getCanvasKit();

  // mode → 변환 매트릭스 계산
  const imgWidth = skImage.width();
  const imgHeight = skImage.height();
  let matrix: Float32Array | undefined;

  if (item.mode === 'stretch') {
    // 단순 스케일 (종횡비 무시)
    matrix = Float32Array.of(
      width / imgWidth, 0, 0,
      0, height / imgHeight, 0,
      0, 0, 1,
    );
  } else if (item.mode === 'fill') {
    // 커버: 짧은 축 기준 스케일 (잘림 허용)
    const scale = Math.max(width / imgWidth, height / imgHeight);
    const tx = (width - imgWidth * scale) / 2;
    const ty = (height - imgHeight * scale) / 2;
    matrix = Float32Array.of(scale, 0, tx, 0, scale, ty, 0, 0, 1);
  } else {
    // fit: 긴 축 기준 스케일 (전체 표시)
    const scale = Math.min(width / imgWidth, height / imgHeight);
    const tx = (width - imgWidth * scale) / 2;
    const ty = (height - imgHeight * scale) / 2;
    matrix = Float32Array.of(scale, 0, tx, 0, scale, ty, 0, 0, 1);
  }

  return {
    type: 'image',
    image: skImage,
    tileMode: ck.TileMode.Clamp,
    sampling: ck.FilterMode.Linear,
    matrix,
  };
}

/**
 * MeshGradientFillItem → Skia MeshGradientFill 변환
 * Phase 4: N×M 포인트 → colors 배열
 */
function meshGradientFillItemToSkia(
  item: MeshGradientFillItem,
  width: number,
  height: number,
): MeshGradientFill | null {
  if (!item.points || item.points.length === 0) return null;

  const colors = item.points.map((p) => {
    const c = hex8ToFloat32(p.color);
    return Float32Array.of(c[0], c[1], c[2], c[3] * item.opacity);
  });

  return {
    type: 'mesh-gradient',
    rows: item.rows,
    columns: item.columns,
    colors,
    width,
    height,
  };
}

/**
 * FillItem → FillStyle 변환
 * Phase 4: Color + 3종 Gradient + Image + MeshGradient 지원
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
    case FillType.Image:
      return imageFillItemToSkia(item, width, height);
    case FillType.MeshGradient:
      return meshGradientFillItemToSkia(item, width, height);
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
