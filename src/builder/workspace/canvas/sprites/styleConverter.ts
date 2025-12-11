/**
 * Style Converter
 *
 * 🚀 Phase 10 B1.2: CSS Style → PixiJS 속성 변환
 *
 * @since 2025-12-11 Phase 10 B1.2
 */

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
  borderColor?: string;
  borderStyle?: string;
  opacity?: number | string;
  color?: string;
  fontSize?: number | string;
  fontWeight?: string | number;
  fontFamily?: string;
  textAlign?: string;
  padding?: number | string;
  paddingTop?: number | string;
  paddingRight?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  boxShadow?: string;
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
  fill: number;
  align: 'left' | 'center' | 'right';
  wordWrap: boolean;
  wordWrapWidth: number;
}

// ============================================
// Color Conversion
// ============================================

/**
 * CSS 색상을 PixiJS 숫자로 변환
 *
 * @example
 * cssColorToHex('#3b82f6') // 0x3b82f6
 * cssColorToHex('rgb(59, 130, 246)') // 0x3b82f6
 * cssColorToHex('blue') // 0x0000ff
 */
export function cssColorToHex(color: string | undefined, fallback = 0x000000): number {
  if (!color) return fallback;

  // Hex color
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      // Short hex (#fff → #ffffff)
      const expanded = hex
        .split('')
        .map((c) => c + c)
        .join('');
      return parseInt(expanded, 16);
    }
    return parseInt(hex, 16);
  }

  // RGB/RGBA
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return (r << 16) | (g << 8) | b;
  }

  // Named colors (basic subset)
  const namedColors: Record<string, number> = {
    white: 0xffffff,
    black: 0x000000,
    red: 0xff0000,
    green: 0x00ff00,
    blue: 0x0000ff,
    yellow: 0xffff00,
    cyan: 0x00ffff,
    magenta: 0xff00ff,
    gray: 0x808080,
    grey: 0x808080,
    transparent: 0x000000,
  };

  return namedColors[color.toLowerCase()] ?? fallback;
}

/**
 * CSS 색상에서 알파 값 추출
 */
export function cssColorToAlpha(color: string | undefined): number {
  if (!color) return 1;

  // RGBA
  const rgbaMatch = color.match(/rgba\([\d\s,]+,\s*([\d.]+)\)/);
  if (rgbaMatch) {
    return parseFloat(rgbaMatch[1]);
  }

  // Transparent
  if (color.toLowerCase() === 'transparent') {
    return 0;
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
 */
export function parseCSSSize(
  value: string | number | undefined,
  parentSize?: number,
  fallback = 0
): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'number') return value;

  // Pixel value
  if (value.endsWith('px')) {
    return parseFloat(value);
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
 */
export function convertToTextStyle(
  style: CSSStyle | undefined,
  containerWidth = 100
): PixiTextStyle {
  return {
    fontFamily: style?.fontFamily || 'Pretendard, sans-serif',
    fontSize: parseCSSSize(style?.fontSize, undefined, 16),
    fontWeight: String(style?.fontWeight || 'normal'),
    fill: cssColorToHex(style?.color, 0x000000),
    align: (style?.textAlign as 'left' | 'center' | 'right') || 'left',
    wordWrap: true,
    wordWrapWidth: containerWidth,
  };
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

export default convertStyle;
