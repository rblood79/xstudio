/**
 * Color Utility Functions
 *
 * 색상 형식 변환 유틸리티
 * - normalizeToHex8: 다양한 CSS 색상 입력 → "#RRGGBBAA" 정규화
 * - hex8 ↔ RGBA/HSL/HSB 상호 변환
 *
 * 의존성: colord (프로젝트에 이미 설치됨, styleConverter.ts에서 사용 중)
 *
 * @see docs/COLOR_PICKER.md Section 3.4
 */

import { colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names';
import hwbPlugin from 'colord/plugins/hwb';

// colord 플러그인 등록 (named colors: 'red', 'blue' 등)
extend([namesPlugin, hwbPlugin]);

// ============================================
// Types
// ============================================

export interface RgbaColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-1
}

export interface HslColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
  a: number; // 0-1
}

export interface HsbColor {
  h: number; // 0-360
  s: number; // 0-100
  b: number; // 0-100
  a: number; // 0-1
}

// ============================================
// Core: Normalize to Hex8
// ============================================

/**
 * 다양한 CSS 색상값을 "#RRGGBBAA" 8자리 hex로 정규화
 *
 * 지원 형식:
 * - "#RGB", "#RRGGBB", "#RRGGBBAA"
 * - "rgb(255, 0, 0)", "rgba(255, 0, 0, 0.5)"
 * - "hsl(0, 100%, 50%)", "hsla(0, 100%, 50%, 0.5)"
 * - Named colors: "red", "blue", "transparent"
 *
 * @param input CSS 색상 문자열
 * @param fallback 파싱 실패 시 반환값 (기본: "#000000FF")
 * @returns "#RRGGBBAA" 형식 문자열
 */
export function normalizeToHex8(input: string, fallback = '#000000FF'): string {
  if (!input || input === 'inherit' || input === 'initial' || input === 'unset') {
    return fallback;
  }

  // CSS 변수 참조는 변환 불가
  if (input.startsWith('var(') || input.startsWith('$--')) {
    return fallback;
  }

  // transparent 특수 처리
  if (input === 'transparent') {
    return '#00000000';
  }

  try {
    const c = colord(input);
    if (!c.isValid()) return fallback;

    const rgba = c.toRgb();
    const r = Math.round(rgba.r).toString(16).padStart(2, '0');
    const g = Math.round(rgba.g).toString(16).padStart(2, '0');
    const b = Math.round(rgba.b).toString(16).padStart(2, '0');
    const a = Math.round(rgba.a * 255).toString(16).padStart(2, '0');

    return `#${r}${g}${b}${a}`.toUpperCase();
  } catch {
    return fallback;
  }
}

// ============================================
// Hex8 ↔ RGBA
// ============================================

/** "#RRGGBBAA" → RGBA 객체 */
export function hex8ToRgba(hex: string): RgbaColor {
  const c = colord(hex);
  if (!c.isValid()) return { r: 0, g: 0, b: 0, a: 1 };
  const rgba = c.toRgb();
  return { r: rgba.r, g: rgba.g, b: rgba.b, a: rgba.a };
}

/** RGBA 객체 → "#RRGGBBAA" */
export function rgbaToHex8(rgba: RgbaColor): string {
  const r = Math.round(Math.max(0, Math.min(255, rgba.r))).toString(16).padStart(2, '0');
  const g = Math.round(Math.max(0, Math.min(255, rgba.g))).toString(16).padStart(2, '0');
  const b = Math.round(Math.max(0, Math.min(255, rgba.b))).toString(16).padStart(2, '0');
  const a = Math.round(Math.max(0, Math.min(1, rgba.a)) * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}${a}`.toUpperCase();
}

// ============================================
// Hex8 ↔ HSL
// ============================================

/** "#RRGGBBAA" → HSL 객체 */
export function hex8ToHsl(hex: string): HslColor {
  const c = colord(hex);
  if (!c.isValid()) return { h: 0, s: 0, l: 0, a: 1 };
  const hsl = c.toHsl();
  return { h: Math.round(hsl.h), s: Math.round(hsl.s), l: Math.round(hsl.l), a: hsl.a };
}

/** HSL 객체 → "#RRGGBBAA" */
export function hslToHex8(hsl: HslColor): string {
  const c = colord({ h: hsl.h, s: hsl.s, l: hsl.l, a: hsl.a });
  return normalizeToHex8(c.toHex());
}

// ============================================
// Hex8 ↔ HSB (HSV)
// ============================================

/** "#RRGGBBAA" → HSB 객체 */
export function hex8ToHsb(hex: string): HsbColor {
  const c = colord(hex);
  if (!c.isValid()) return { h: 0, s: 0, b: 0, a: 1 };
  const hsv = c.toHsv();
  return { h: Math.round(hsv.h), s: Math.round(hsv.s), b: Math.round(hsv.v), a: hsv.a };
}

/** HSB 객체 → "#RRGGBBAA" */
export function hsbToHex8(hsb: HsbColor): string {
  const c = colord({ h: hsb.h, s: hsb.s, v: hsb.b, a: hsb.a });
  return normalizeToHex8(c.toHex());
}

// ============================================
// Hex8 ↔ CSS String
// ============================================

/** "#RRGGBBAA" → CSS 문자열 (rgba 형식) */
export function hex8ToCss(hex: string): string {
  const c = colord(hex);
  if (!c.isValid()) return 'rgba(0, 0, 0, 1)';
  const rgba = c.toRgb();
  if (rgba.a === 1) {
    return `rgb(${rgba.r}, ${rgba.g}, ${rgba.b})`;
  }
  return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
}

/** CSS 문자열 → "#RRGGBBAA" */
export function cssToHex8(css: string): string {
  return normalizeToHex8(css);
}

// ============================================
// Hex8 → Hex6 (알파 제거)
// ============================================

/** "#RRGGBBAA" → "#RRGGBB" (알파 제거) */
export function hex8ToHex6(hex: string): string {
  const normalized = normalizeToHex8(hex);
  return normalized.slice(0, 7);
}

/** "#RRGGBB" → "#RRGGBBFF" (알파 추가) */
export function hex6ToHex8(hex: string): string {
  if (hex.length === 9) return hex.toUpperCase(); // 이미 hex8
  if (hex.length === 7) return `${hex}FF`.toUpperCase();
  return normalizeToHex8(hex);
}

// ============================================
// Float32Array 변환 (Skia 용)
// ============================================

/** "#RRGGBBAA" → Float32Array [r, g, b, a] (0-1 범위) */
export function hex8ToFloat32(hex: string): Float32Array {
  const rgba = hex8ToRgba(hex);
  return Float32Array.of(
    rgba.r / 255,
    rgba.g / 255,
    rgba.b / 255,
    rgba.a,
  );
}
