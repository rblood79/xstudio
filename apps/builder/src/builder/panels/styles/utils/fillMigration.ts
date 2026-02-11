/**
 * Fill Migration Utilities
 *
 * 기존 backgroundColor CSS string → fills 배열 자동 변환
 * DB 스키마 변경 전까지 메모리에서만 마이그레이션 수행
 *
 * @see docs/COLOR_PICKER.md Section 7
 */

import type {
  FillItem,
  ColorFillItem,
  LinearGradientFillItem,
  RadialGradientFillItem,
  AngularGradientFillItem,
  ImageFillItem,
} from '../../../../types/builder/fill.types';
import { FillType, createDefaultColorFill } from '../../../../types/builder/fill.types';
import { normalizeToHex8, gradientStopsToCss } from './colorUtils';

/**
 * Element의 backgroundColor CSS string → FillItem[] 변환
 *
 * @param backgroundColor CSS backgroundColor 값 (예: "#FF0000", "rgb(255,0,0)")
 * @returns FillItem[] (빈 값이면 빈 배열)
 */
export function migrateBackgroundColor(backgroundColor: string | undefined | null): FillItem[] {
  if (!backgroundColor || backgroundColor === 'transparent' || backgroundColor === '') {
    return [];
  }

  // CSS 변수 참조는 마이그레이션 불가 — 빈 배열 반환
  if (backgroundColor.startsWith('var(') || backgroundColor.startsWith('$--')) {
    return [];
  }

  const hex8 = normalizeToHex8(backgroundColor);

  return [createDefaultColorFill(hex8)];
}

/**
 * Element에서 fills 배열 보장
 * - element.fills가 있으면 그대로 반환
 * - 없으면 backgroundColor에서 마이그레이션
 *
 * @param fills 기존 fills 배열 (있을 수도 없을 수도)
 * @param backgroundColor CSS backgroundColor 값
 * @returns FillItem[] (항상 배열, 빈 배열 가능)
 */
export function ensureFills(
  fills: FillItem[] | undefined | null,
  backgroundColor: string | undefined | null,
): FillItem[] {
  if (fills && fills.length > 0) {
    return fills;
  }
  return migrateBackgroundColor(backgroundColor);
}

/**
 * fills 배열의 첫 번째 활성 ColorFill의 색상값 추출
 * fills → backgroundColor 역동기화에 사용
 *
 * @param fills FillItem 배열
 * @returns CSS backgroundColor 문자열 또는 undefined
 */
export function fillsToBackgroundColor(fills: FillItem[]): string | undefined {
  if (!fills || fills.length === 0) return undefined;

  // 마지막 활성 fill의 색상 사용 (시각적으로 가장 위에 표시되는 fill)
  for (let i = fills.length - 1; i >= 0; i--) {
    const fill = fills[i];
    if (fill.enabled && fill.type === FillType.Color) {
      // hex8 → hex6 (CSS backgroundColor는 alpha 미포함이 일반적)
      const hex6 = (fill as ColorFillItem).color.slice(0, 7);
      return hex6;
    }
  }

  return undefined;
}

/**
 * fills 배열 → CSS background 속성 변환
 * Color → backgroundColor, Gradient → backgroundImage
 *
 * @param fills FillItem 배열
 * @returns { backgroundColor?, backgroundImage? }
 */
export function fillsToCssBackground(fills: FillItem[]): {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
} {
  if (!fills || fills.length === 0) return {};

  for (let i = fills.length - 1; i >= 0; i--) {
    const fill = fills[i];
    if (!fill.enabled) continue;

    switch (fill.type) {
      case FillType.Color: {
        const hex6 = (fill as ColorFillItem).color.slice(0, 7);
        return { backgroundColor: hex6 };
      }
      case FillType.LinearGradient: {
        const lg = fill as LinearGradientFillItem;
        const stops = gradientStopsToCss(lg.stops);
        return { backgroundImage: `linear-gradient(${lg.rotation}deg, ${stops})` };
      }
      case FillType.RadialGradient: {
        const rg = fill as RadialGradientFillItem;
        const stops = gradientStopsToCss(rg.stops);
        const cx = Math.round(rg.center.x * 100);
        const cy = Math.round(rg.center.y * 100);
        return { backgroundImage: `radial-gradient(circle at ${cx}% ${cy}%, ${stops})` };
      }
      case FillType.AngularGradient: {
        const ag = fill as AngularGradientFillItem;
        const stops = gradientStopsToCss(ag.stops);
        const cx = Math.round(ag.center.x * 100);
        const cy = Math.round(ag.center.y * 100);
        return { backgroundImage: `conic-gradient(from ${ag.rotation}deg at ${cx}% ${cy}%, ${stops})` };
      }
      case FillType.Image: {
        const img = fill as ImageFillItem;
        if (!img.url) continue;
        const sizeMap: Record<string, string> = {
          stretch: '100% 100%',
          fill: 'cover',
          fit: 'contain',
        };
        return {
          backgroundImage: `url(${img.url})`,
          backgroundSize: sizeMap[img.mode] ?? 'cover',
        };
      }
      default:
        continue;
    }
  }

  return {};
}
