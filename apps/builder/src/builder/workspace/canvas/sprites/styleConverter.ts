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
import { resolveCSSSizeValue } from '../layout/engines/cssValueParser';
import type { CSSValueContext } from '../layout/engines/cssValueParser';

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
  // Text wrapping
  whiteSpace?: string;
  wordBreak?: string;
  overflowWrap?: string;
  // Layout properties
  display?: string;
  flexDirection?: string;
  gap?: number | string;
  // Visibility
  visibility?: 'visible' | 'hidden' | 'collapse';
  // CSS Transform
  transform?: string;
  transformOrigin?: string;
  // Stacking
  zIndex?: number | string;
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
 * 내부적으로 resolveCSSSizeValue()에 위임하여 일관된 단위 해석을 제공한다.
 * calc(), em, rem 등 확장 단위를 지원한다.
 *
 * @example
 * parseCSSSize('100px') // 100
 * parseCSSSize('50%', 800) // 400
 * parseCSSSize(200) // 200
 * parseCSSSize('100vh', undefined, 0, { width: 1920, height: 1080 }) // 1080
 * parseCSSSize('50vw', undefined, 0, { width: 1920, height: 1080 }) // 960
 * parseCSSSize('calc(100% - 20px)', 800) // 780
 */
export function parseCSSSize(
  value: string | number | undefined,
  parentSize?: number,
  fallback = 0,
  viewport?: { width: number; height: number }
): number {
  if (value === undefined || value === null) return fallback;

  const ctx: CSSValueContext = {
    parentSize,
    containerSize: parentSize,
    viewportWidth: viewport?.width,
    viewportHeight: viewport?.height,
  };

  return resolveCSSSizeValue(value, ctx, fallback) ?? fallback;
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
 *
 * CSS border-radius 형식:
 * - 단일 값: "8px" → 8
 * - 2값: "8px 4px" → [8, 4, 8, 4] (tl=br, tr=bl)
 * - 3값: "8px 4px 2px" → [8, 4, 2, 4] (tr=bl)
 * - 4값: "8px 4px 2px 6px" → [8, 4, 2, 6] (tl, tr, br, bl)
 */
export function convertBorderRadius(
  borderRadius: string | number | undefined
): number | [number, number, number, number] {
  if (!borderRadius) return 0;

  if (typeof borderRadius === 'number') return borderRadius;

  // 공백 구분 다중 값 파싱
  const parts = borderRadius.trim().split(/\s+/);
  if (parts.length === 1) {
    return parseCSSSize(parts[0], undefined, 0);
  }

  const values = parts.map(p => {
    const v = parseCSSSize(p, undefined, 0);
    // 음수 및 invalid 값 방어
    return Number.isFinite(v) && v >= 0 ? v : 0;
  });
  if (values.length === 2) {
    return [values[0], values[1], values[0], values[1]];
  }
  if (values.length === 3) {
    return [values[0], values[1], values[2], values[1]];
  }
  // 4값: tl, tr, br, bl
  return [values[0], values[1], values[2], values[3]];
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
  /** CSS transform → CanvasKit 3x3 matrix (Float32Array(9)) */
  transform?: Float32Array;
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

  // 2. boxShadow → DropShadowEffect (다중 shadow 지원)
  if (style.boxShadow && style.boxShadow !== 'none') {
    const shadows = parseAllBoxShadows(style.boxShadow);
    for (const shadow of shadows) {
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

  // 5. CSS transform → CanvasKit 3x3 matrix
  let transformMatrix: Float32Array | undefined;
  if (style.transform && style.transform !== 'none') {
    // width/height는 transform-origin의 % 해석에 필요 — SkiaEffectsResult에서는
    // 호출측에서 별도 width/height 전달이 필요하나, 현재 buildSkiaEffects()는
    // style만 받으므로 transform-origin의 % 및 키워드는 0 기반으로 처리한다.
    // 실제 origin 적용은 BoxSprite 등에서 width/height를 알고 있는 시점에서 수행.
    transformMatrix = parseTransform(style.transform) ?? undefined;
  }

  return {
    effects: effects.length > 0 ? effects : undefined,
    blendMode: style.mixBlendMode || undefined,
    transform: transformMatrix,
  };
}

/**
 * 다중 CSS boxShadow를 파싱하여 DropShadowEffect 배열로 변환
 *
 * 쉼표로 분리하되, 괄호 내부의 쉼표(rgb() 등)는 무시한다.
 */
function parseAllBoxShadows(raw: string): DropShadowEffect[] {
  const parts = raw.split(/,(?![^(]*\))/);
  return parts
    .map(s => parseOneShadow(s.trim()))
    .filter((s): s is DropShadowEffect => s !== null);
}

/**
 * 단일 CSS boxShadow 값을 파싱하여 DropShadowEffect로 변환
 *
 * 지원 포맷: [inset] offsetX offsetY [blurRadius [spreadRadius]] [color]
 */
function parseOneShadow(raw: string): DropShadowEffect | null {
  if (!raw || raw === 'none') return null;

  const inner = /\binset\b/.test(raw);
  let cleaned = raw.replace(/\binset\b/, '').trim();

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

// ============================================
// CSS Transform → CanvasKit 3x3 Matrix
// ============================================

/**
 * 3x3 행렬 곱셈 (row-major, CanvasKit 규격)
 *
 * CanvasKit 3x3 layout:
 * [scaleX, skewX,  transX]   [0, 1, 2]
 * [skewY,  scaleY, transY] = [3, 4, 5]
 * [persp0, persp1, persp2]   [6, 7, 8]
 */
function multiply3x3(a: Float32Array, b: Float32Array): Float32Array {
  return Float32Array.of(
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
    a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
    a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
    a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
    a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
    a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
    a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
    a[6] * b[2] + a[7] * b[5] + a[8] * b[8],
  );
}

/** 단위 행렬 (3x3 identity) */
function identity3x3(): Float32Array {
  return Float32Array.of(1, 0, 0, 0, 1, 0, 0, 0, 1);
}

/** 이동 행렬 */
function translateMatrix(tx: number, ty: number): Float32Array {
  return Float32Array.of(1, 0, tx, 0, 1, ty, 0, 0, 1);
}

/** 회전 행렬 (라디안) */
function rotateMatrix(radians: number): Float32Array {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return Float32Array.of(c, -s, 0, s, c, 0, 0, 0, 1);
}

/** 스케일 행렬 */
function scaleMatrix(sx: number, sy: number): Float32Array {
  return Float32Array.of(sx, 0, 0, 0, sy, 0, 0, 0, 1);
}

/** skew 행렬 (라디안) */
function skewMatrix(ax: number, ay: number): Float32Array {
  return Float32Array.of(1, Math.tan(ax), 0, Math.tan(ay), 1, 0, 0, 0, 1);
}

/** 각도 문자열을 라디안으로 변환 */
function parseAngle(value: string): number {
  const trimmed = value.trim();
  if (trimmed.endsWith('rad')) return parseFloat(trimmed);
  if (trimmed.endsWith('turn')) return parseFloat(trimmed) * Math.PI * 2;
  if (trimmed.endsWith('grad')) return parseFloat(trimmed) * (Math.PI / 200);
  // deg (기본)
  return parseFloat(trimmed) * (Math.PI / 180);
}

/**
 * CSS transform 문자열을 CanvasKit 3x3 matrix로 변환
 *
 * 지원 함수: translate, translateX, translateY, rotate, scale, scaleX, scaleY,
 *           skew, skewX, skewY
 *
 * 여러 함수를 순서대로 왼쪽에서 오른쪽으로 합성한다.
 */
export function parseTransform(value: string): Float32Array | null {
  if (!value || value === 'none') return null;

  // 각 transform 함수를 추출: functionName(args)
  const funcRegex = /(\w+)\(([^)]*)\)/g;
  let result = identity3x3();
  let matched = false;
  let match: RegExpExecArray | null;

  while ((match = funcRegex.exec(value)) !== null) {
    const fn = match[1];
    const args = match[2].split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
    let mat: Float32Array | null = null;

    switch (fn) {
      case 'translate': {
        const tx = parseCSSSize(args[0], undefined, 0);
        const ty = args[1] ? parseCSSSize(args[1], undefined, 0) : 0;
        mat = translateMatrix(tx, ty);
        break;
      }
      case 'translateX': {
        mat = translateMatrix(parseCSSSize(args[0], undefined, 0), 0);
        break;
      }
      case 'translateY': {
        mat = translateMatrix(0, parseCSSSize(args[0], undefined, 0));
        break;
      }
      case 'rotate': {
        mat = rotateMatrix(parseAngle(args[0]));
        break;
      }
      case 'scale': {
        const sx = parseFloat(args[0]);
        const sy = args[1] ? parseFloat(args[1]) : sx;
        if (!isNaN(sx) && !isNaN(sy)) mat = scaleMatrix(sx, sy);
        break;
      }
      case 'scaleX': {
        const sx = parseFloat(args[0]);
        if (!isNaN(sx)) mat = scaleMatrix(sx, 1);
        break;
      }
      case 'scaleY': {
        const sy = parseFloat(args[0]);
        if (!isNaN(sy)) mat = scaleMatrix(1, sy);
        break;
      }
      case 'skew': {
        const ax = parseAngle(args[0]);
        const ay = args[1] ? parseAngle(args[1]) : 0;
        mat = skewMatrix(ax, ay);
        break;
      }
      case 'skewX': {
        mat = skewMatrix(parseAngle(args[0]), 0);
        break;
      }
      case 'skewY': {
        mat = skewMatrix(0, parseAngle(args[0]));
        break;
      }
      // matrix()는 향후 확장 가능
      default:
        break;
    }

    if (mat) {
      result = multiply3x3(result, mat);
      matched = true;
    }
  }

  return matched ? result : null;
}

/**
 * CSS transform-origin 값을 [ox, oy] 좌표로 변환
 *
 * 지원 키워드: left, center, right, top, bottom
 * 지원 단위: px, %, 숫자
 *
 * 기본값: center center → (width/2, height/2)
 */
export function parseTransformOrigin(
  value: string | undefined,
  width: number,
  height: number,
): [number, number] {
  if (!value) return [width / 2, height / 2];

  const parts = value.trim().split(/\s+/);
  const resolveX = (v: string): number => {
    switch (v) {
      case 'left': return 0;
      case 'center': return width / 2;
      case 'right': return width;
      default:
        if (v.endsWith('%')) return (parseFloat(v) / 100) * width;
        return parseCSSSize(v, width, width / 2);
    }
  };
  const resolveY = (v: string): number => {
    switch (v) {
      case 'top': return 0;
      case 'center': return height / 2;
      case 'bottom': return height;
      default:
        if (v.endsWith('%')) return (parseFloat(v) / 100) * height;
        return parseCSSSize(v, height, height / 2);
    }
  };

  const ox = resolveX(parts[0]);
  const oy = parts[1] ? resolveY(parts[1]) : height / 2;

  return [ox, oy];
}

/**
 * transform-origin을 적용한 최종 3x3 matrix 생성
 *
 * 원리: translate(ox, oy) × matrix × translate(-ox, -oy)
 * → origin으로 이동 후 변환 적용, 다시 원위치
 */
export function applyTransformOrigin(
  matrix: Float32Array,
  ox: number,
  oy: number,
): Float32Array {
  const pre = translateMatrix(ox, oy);
  const post = translateMatrix(-ox, -oy);
  return multiply3x3(multiply3x3(pre, matrix), post);
}

export default convertStyle;
