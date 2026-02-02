/**
 * Style Converter
 *
 * 🚀 Phase 10 B1.2: CSS Style → PixiJS 속성 변환
 * 🚀 P7: StylePanel ↔ Canvas 스타일 동기화 확장
 * 🚀 Phase 22: colord 기반 색상 파싱 통합
 *
 * @since 2025-12-11 Phase 10 B1.2
 * @updated 2025-12-13 P7.2-P7.6 - 타이포그래피 속성 확장
 * @updated 2025-12-20 Phase 22 - colord 색상 파싱
 */

import { cssColorToPixiHex } from '../../../../utils/color';
import { colord } from 'colord';
import type { EffectStyle, DropShadowEffect } from '../skia/types';

// ============================================
// Types
// ============================================

export interface CSSStyle {
  left?: number | string;
  top?: number | string;
  width?: number | string;
  height?: number | string;
  backgroundColor?: string;
  borderRadius?: number | string;
  borderWidth?: number | string;
  borderTopWidth?: number | string;
  borderRightWidth?: number | string;
  borderBottomWidth?: number | string;
  borderLeftWidth?: number | string;
  borderColor?: string;
  borderStyle?: string;
  opacity?: number | string;
  color?: string;
  fontSize?: number | string;
  fontWeight?: string | number;
  fontFamily?: string;
  fontStyle?: string; // P7.2: italic, oblique
  textAlign?: string;
  lineHeight?: number | string; // P7.4: 줄 간격
  letterSpacing?: number | string; // P7.3: 자간
  textDecoration?: string; // P7.7: underline, line-through
  textTransform?: string; // P7.6: uppercase, lowercase
  verticalAlign?: string; // P7.5: top, middle, bottom
  padding?: number | string;
  paddingTop?: number | string;
  paddingRight?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  boxShadow?: string;
  overflow?: string;
  filter?: string;
  backdropFilter?: string;
  mixBlendMode?: string;
  // Layout properties
  display?: string;
  flexDirection?: string;
  gap?: number | string;
}

export interface PixiTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

export interface PixiFillStyle {
  color: number;
  alpha: number;
}

export interface PixiStrokeStyle {
  width: number;
  color: number;
  alpha: number;
}

export interface PixiTextStyle {
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: 'normal' | 'italic' | 'oblique'; // P7.2
  fill: number;
  align: 'left' | 'center' | 'right';
  letterSpacing: number; // P7.3
  leading: number; // P7.4: lineHeight → leading
  wordWrap: boolean;
  wordWrapWidth: number;
}

// ============================================
// Color Conversion
// ============================================

/**
 * CSS 색상을 PixiJS 숫자로 변환
 *
 * 🚀 Phase 22: colord 기반으로 리팩토링
 * - 모든 CSS 색상 형식 지원 (hex, rgb, hsl, named colors 등)
 *
 * @example
 * cssColorToHex('#3b82f6') // 0x3b82f6
 * cssColorToHex('rgb(59, 130, 246)') // 0x3b82f6
 * cssColorToHex('blue') // 0x0000ff
 * cssColorToHex('hsl(217, 91%, 60%)') // 0x3b82f6
 */
export function cssColorToHex(color: string | undefined, fallback = 0x000000): number {
  return cssColorToPixiHex(color, fallback);
}

/**
 * CSS 색상에서 알파 값 추출
 *
 * colord를 사용하여 rgba/hsla/oklch/#rrggbbaa 등 모든 CSS 색상 형식을 지원한다 (I-L17).
 */
export function cssColorToAlpha(color: string | undefined): number {
  if (!color) return 1;
  if (color.toLowerCase() === 'transparent') return 0;

  const parsed = colord(color);
  if (parsed.isValid()) {
    return parsed.toRgb().a ?? 1;
  }

  return 1;
}

// ============================================
// Size Conversion
// ============================================

/**
 * CSS 크기 값을 숫자로 변환
 *
 * @example
 * parseCSSSize('100px') // 100
 * parseCSSSize('50%', 800) // 400
 * parseCSSSize(200) // 200
 * parseCSSSize('100vh', undefined, 0, { width: 1920, height: 1080 }) // 1080
 * parseCSSSize('50vw', undefined, 0, { width: 1920, height: 1080 }) // 960
 */
export function parseCSSSize(
  value: string | number | undefined,
  parentSize?: number,
  fallback = 0,
  viewport?: { width: number; height: number }
): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'number') return value;

  // Pixel value
  if (value.endsWith('px')) {
    return parseFloat(value);
  }

  // rem 단위 (기본 16px 기준)
  if (value.endsWith('rem')) {
    return parseFloat(value) * 16;
  }

  // vh 단위 (viewport height 기준)
  if (value.endsWith('vh')) {
    const vh = viewport?.height ?? 1080;
    return (parseFloat(value) / 100) * vh;
  }

  // vw 단위 (viewport width 기준)
  if (value.endsWith('vw')) {
    const vw = viewport?.width ?? 1920;
    return (parseFloat(value) / 100) * vw;
  }

  // em 단위 (parentSize가 있으면 사용, 없으면 16px)
  // Note: 'rem' check must come before 'em' check (rem endsWith em)
  if (value.endsWith('em')) {
    const base = parentSize !== undefined ? parentSize : 16;
    return parseFloat(value) * base;
  }

  // Percentage
  if (value.endsWith('%') && parentSize !== undefined) {
    return (parseFloat(value) / 100) * parentSize;
  }

  // Auto or other
  if (value === 'auto') {
    return fallback;
  }

  // Try parsing as number
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
}

// ============================================
// Style Converters
// ============================================

/**
 * CSS 스타일을 PixiJS Transform으로 변환
 */
export function convertToTransform(style: CSSStyle | undefined): PixiTransform {
  if (!style) {
    return { x: 0, y: 0, width: 100, height: 100 };
  }

  return {
    x: parseCSSSize(style.left, undefined, 0),
    y: parseCSSSize(style.top, undefined, 0),
    width: parseCSSSize(style.width, undefined, 100),
    height: parseCSSSize(style.height, undefined, 100),
  };
}

/**
 * CSS 스타일을 PixiJS Fill 스타일로 변환
 */
export function convertToFillStyle(style: CSSStyle | undefined): PixiFillStyle {
  const color = cssColorToHex(style?.backgroundColor, 0xffffff);
  const alpha = style?.opacity !== undefined
    ? parseCSSSize(style.opacity, undefined, 1)
    : cssColorToAlpha(style?.backgroundColor);

  return { color, alpha };
}

/**
 * CSS 스타일을 PixiJS Stroke 스타일로 변환
 */
export function convertToStrokeStyle(style: CSSStyle | undefined): PixiStrokeStyle | null {
  if (!style?.borderWidth && !style?.borderColor) {
    return null;
  }

  return {
    width: parseCSSSize(style.borderWidth, undefined, 1),
    color: cssColorToHex(style.borderColor, 0x000000),
    alpha: cssColorToAlpha(style.borderColor),
  };
}

/**
 * CSS 스타일을 PixiJS Text 스타일로 변환
 * P7.2-P7.4: fontStyle, letterSpacing, lineHeight (leading) 추가
 */
export function convertToTextStyle(
  style: CSSStyle | undefined,
  containerWidth = 100
): PixiTextStyle {
  const fontSize = parseCSSSize(style?.fontSize, undefined, 16);

  // P7.4: lineHeight → leading 변환
  // CSS lineHeight가 배수(1.5)이면 (배수 - 1) * fontSize
  // 픽셀 값이면 fontSize를 뺌
  let leading = 0;
  if (style?.lineHeight) {
    const lh = parseCSSSize(style.lineHeight, undefined, 0);
    if (typeof style.lineHeight === 'number' && lh < 10) {
      // 배수 값 (예: 1.5)
      leading = (lh - 1) * fontSize;
    } else {
      // 픽셀 값
      leading = Math.max(0, lh - fontSize);
    }
  }

  return {
    fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
    fontSize,
    fontWeight: String(style?.fontWeight || 'normal'),
    fontStyle: (style?.fontStyle as 'normal' | 'italic' | 'oblique') || 'normal', // P7.2
    fill: cssColorToHex(style?.color, 0x000000),
    align: (style?.textAlign as 'left' | 'center' | 'right') || 'left',
    letterSpacing: parseCSSSize(style?.letterSpacing, undefined, 0), // P7.3
    leading, // P7.4
    wordWrap: true,
    wordWrapWidth: containerWidth,
  };
}

// ============================================
// P7.5-P7.6: Text Transform Utilities
// ============================================

/**
 * P7.6: CSS textTransform 적용
 */
export function applyTextTransform(text: string, transform: string | undefined): string {
  if (!transform || transform === 'none') return text;

  switch (transform.toLowerCase()) {
    case 'uppercase':
      return text.toUpperCase();
    case 'lowercase':
      return text.toLowerCase();
    case 'capitalize':
      return text.replace(/\b\w/g, (c) => c.toUpperCase());
    default:
      return text;
  }
}

/**
 * P7.5: CSS verticalAlign을 기반으로 텍스트 Y 위치 계산
 */
export function calculateTextY(
  containerHeight: number,
  textHeight: number,
  verticalAlign: string | undefined,
  paddingTop = 0,
  paddingBottom = 0
): number {
  const contentHeight = containerHeight - paddingTop - paddingBottom;

  switch (verticalAlign?.toLowerCase()) {
    case 'top':
      return paddingTop;
    case 'bottom':
      return containerHeight - textHeight - paddingBottom;
    case 'middle':
    default:
      return paddingTop + (contentHeight - textHeight) / 2;
  }
}

/**
 * CSS borderRadius를 PixiJS 반경 배열로 변환
 */
export function convertBorderRadius(
  borderRadius: string | number | undefined
): number | [number, number, number, number] {
  if (!borderRadius) return 0;

  const value = parseCSSSize(borderRadius, undefined, 0);
  return value;
}

// ============================================
// Full Style Conversion
// ============================================

export interface ConvertedStyle {
  transform: PixiTransform;
  fill: PixiFillStyle;
  stroke: PixiStrokeStyle | null;
  text: PixiTextStyle;
  borderRadius: number | [number, number, number, number];
}

/**
 * CSS 스타일을 모든 PixiJS 스타일로 변환
 */
export function convertStyle(style: CSSStyle | undefined): ConvertedStyle {
  const transform = convertToTransform(style);

  return {
    transform,
    fill: convertToFillStyle(style),
    stroke: convertToStrokeStyle(style),
    text: convertToTextStyle(style, transform.width),
    borderRadius: convertBorderRadius(style?.borderRadius),
  };
}

// ============================================
// Skia Effects Builder
// ============================================

interface SkiaEffectsResult {
  effects?: EffectStyle[];
  blendMode?: string;
}

/**
 * CSS 스타일에서 Skia 이펙트 목록과 blend mode를 추출한다.
 *
 * 지원 속성:
 * - opacity → OpacityEffect
 * - boxShadow → DropShadowEffect
 * - filter: blur() → LayerBlurEffect
 * - backdropFilter: blur() → BackgroundBlurEffect
 * - mixBlendMode → blendMode string
 */
export function buildSkiaEffects(style: CSSStyle | undefined): SkiaEffectsResult {
  if (!style) return {};

  const effects: EffectStyle[] = [];

  // 1. opacity → OpacityEffect
  if (style.opacity !== undefined) {
    const value = parseCSSSize(style.opacity, undefined, 1);
    if (value < 1) {
      effects.push({ type: 'opacity', value });
    }
  }

  // 2. boxShadow → DropShadowEffect
  if (style.boxShadow && style.boxShadow !== 'none') {
    const shadow = parseFirstBoxShadow(style.boxShadow);
    if (shadow) {
      effects.push(shadow);
    }
  }

  // 3. filter: blur(Xpx) → LayerBlurEffect
  if (style.filter) {
    const blurMatch = style.filter.match(/blur\((\d+(?:\.\d+)?)(px)?\)/);
    if (blurMatch) {
      effects.push({ type: 'layer-blur', sigma: parseFloat(blurMatch[1]) });
    }
  }

  // 4. backdropFilter: blur(Xpx) → BackgroundBlurEffect
  if (style.backdropFilter) {
    const blurMatch = style.backdropFilter.match(/blur\((\d+(?:\.\d+)?)(px)?\)/);
    if (blurMatch) {
      effects.push({ type: 'background-blur', sigma: parseFloat(blurMatch[1]) });
    }
  }

  return {
    effects: effects.length > 0 ? effects : undefined,
    blendMode: style.mixBlendMode || undefined,
  };
}

/**
 * CSS boxShadow의 첫 번째 shadow를 파싱하여 DropShadowEffect로 변환
 *
 * 지원 포맷: [inset] offsetX offsetY [blurRadius [spreadRadius]] [color]
 */
function parseFirstBoxShadow(raw: string): DropShadowEffect | null {
  // 콤마 분리 시 괄호 안의 콤마는 제외
  const first = raw.split(/,(?![^(]*\))/)[0].trim();
  if (!first || first === 'none') return null;

  const inner = /\binset\b/.test(first);
  let cleaned = first.replace(/\binset\b/, '').trim();

  // 색상 추출 (rgb/rgba/hsl/hsla/#hex)
  let colorStr = 'rgba(0,0,0,1)';
  const colorPatterns = [
    /rgba?\([^)]+\)/,
    /hsla?\([^)]+\)/,
    /#[0-9a-fA-F]{3,8}/,
  ];
  for (const pattern of colorPatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      colorStr = match[0];
      cleaned = cleaned.replace(match[0], '').trim();
      break;
    }
  }

  // 숫자값 추출 (px 단위 선택적)
  const nums = cleaned.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length < 2) return null;

  const dx = nums[0];
  const dy = nums[1];
  const blurRadius = nums[2] ?? 0;
  // CSS blur-radius → Skia sigma (sigma ≈ blurRadius / 2)
  const sigma = blurRadius / 2;

  // 색상 → Float32Array
  const hex = cssColorToHex(colorStr, 0x000000);
  const alpha = cssColorToAlpha(colorStr);
  const color = Float32Array.of(
    ((hex >> 16) & 0xff) / 255,
    ((hex >> 8) & 0xff) / 255,
    (hex & 0xff) / 255,
    alpha,
  );

  return {
    type: 'drop-shadow',
    dx,
    dy,
    sigmaX: sigma,
    sigmaY: sigma,
    color,
    inner,
  };
}

export default convertStyle;
