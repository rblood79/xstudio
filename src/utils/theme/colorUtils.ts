/**
 * Color Utilities
 * HSL ↔ RGB ↔ HEX 변환 및 색상 조작
 */

import type { ColorValueHSL, ColorValueRGB } from '../../types/theme/token.types';

/**
 * HSL → RGB 변환
 */
export function hslToRgb(hsl: ColorValueHSL): ColorValueRGB {
  const { h, s, l, a } = hsl;
  const hNorm = h / 360;
  const sNorm = s / 100;
  const lNorm = l / 100;

  let r: number, g: number, b: number;

  if (sNorm === 0) {
    r = g = b = lNorm; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
    const p = 2 * lNorm - q;
    r = hue2rgb(p, q, hNorm + 1 / 3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a,
  };
}

/**
 * RGB → HSL 변환
 */
export function rgbToHsl(rgb: ColorValueRGB): ColorValueHSL {
  const { r, g, b, a } = rgb;
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
        break;
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) / 6;
        break;
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a,
  };
}

/**
 * HEX → RGB 변환
 */
export function hexToRgb(hex: string): ColorValueRGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
        a: 1,
      }
    : null;
}

/**
 * RGB → HEX 변환
 */
export function rgbToHex(rgb: ColorValueRGB): string {
  const toHex = (n: number) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * HSL → HEX 변환
 */
export function hslToHex(hsl: ColorValueHSL): string {
  const rgb = hslToRgb(hsl);
  return rgbToHex(rgb);
}

/**
 * HEX → HSL 변환
 */
export function hexToHsl(hex: string): ColorValueHSL | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(rgb) : null;
}

/**
 * HSL → CSS 문자열
 */
export function hslToString(hsl: ColorValueHSL): string {
  return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${hsl.a})`;
}

/**
 * RGB → CSS 문자열
 */
export function rgbToString(rgb: ColorValueRGB): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${rgb.a})`;
}

/**
 * 색상 밝기 조정
 */
export function adjustLightness(hsl: ColorValueHSL, amount: number): ColorValueHSL {
  return {
    ...hsl,
    l: Math.max(0, Math.min(100, hsl.l + amount)),
  };
}

/**
 * 색상 채도 조정
 */
export function adjustSaturation(hsl: ColorValueHSL, amount: number): ColorValueHSL {
  return {
    ...hsl,
    s: Math.max(0, Math.min(100, hsl.s + amount)),
  };
}

/**
 * 색상 투명도 조정
 */
export function adjustAlpha(color: ColorValueHSL | ColorValueRGB, amount: number): typeof color {
  return {
    ...color,
    a: Math.max(0, Math.min(1, color.a + amount)),
  };
}

/**
 * 색상 반전
 */
export function invertColor(hsl: ColorValueHSL): ColorValueHSL {
  return {
    ...hsl,
    h: (hsl.h + 180) % 360,
  };
}

/**
 * 색상 명암비 계산 (WCAG)
 */
export function getContrastRatio(color1: ColorValueHSL, color2: ColorValueHSL): number {
  const getLuminance = (hsl: ColorValueHSL): number => {
    const rgb = hslToRgb(hsl);
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
      const sRGB = val / 255;
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * WCAG 준수 여부 확인
 */
export function meetsWCAG(
  color1: ColorValueHSL,
  color2: ColorValueHSL,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean {
  const ratio = getContrastRatio(color1, color2);

  if (level === 'AA') {
    return size === 'large' ? ratio >= 3 : ratio >= 4.5;
  } else {
    // AAA
    return size === 'large' ? ratio >= 4.5 : ratio >= 7;
  }
}

/**
 * 색상 스케일 생성 (lightness 기준)
 */
export function generateColorScale(
  baseColor: ColorValueHSL,
  steps: number = 10
): ColorValueHSL[] {
  const scale: ColorValueHSL[] = [];
  const lightnessRange = 100;
  const stepSize = lightnessRange / (steps - 1);

  for (let i = 0; i < steps; i++) {
    scale.push({
      ...baseColor,
      l: Math.round(stepSize * i),
    });
  }

  return scale;
}

/**
 * 보색 생성
 */
export function getComplementaryColor(hsl: ColorValueHSL): ColorValueHSL {
  return invertColor(hsl);
}

/**
 * 3색 조화 (Triadic) 생성
 */
export function getTriadicColors(hsl: ColorValueHSL): [ColorValueHSL, ColorValueHSL, ColorValueHSL] {
  return [
    hsl,
    { ...hsl, h: (hsl.h + 120) % 360 },
    { ...hsl, h: (hsl.h + 240) % 360 },
  ];
}

/**
 * 분할 보색 (Split Complementary) 생성
 */
export function getSplitComplementaryColors(hsl: ColorValueHSL): [ColorValueHSL, ColorValueHSL, ColorValueHSL] {
  const complementary = (hsl.h + 180) % 360;
  return [
    hsl,
    { ...hsl, h: (complementary - 30 + 360) % 360 },
    { ...hsl, h: (complementary + 30) % 360 },
  ];
}

/**
 * 유사색 (Analogous) 생성
 */
export function getAnalogousColors(hsl: ColorValueHSL, angle: number = 30): [ColorValueHSL, ColorValueHSL, ColorValueHSL] {
  return [
    { ...hsl, h: (hsl.h - angle + 360) % 360 },
    hsl,
    { ...hsl, h: (hsl.h + angle) % 360 },
  ];
}

/**
 * 색상 문자열 파싱 (HEX, RGB, HSL)
 */
export function parseColorString(colorString: string): ColorValueHSL | null {
  // HEX
  if (colorString.startsWith('#')) {
    return hexToHsl(colorString);
  }

  // RGB/RGBA
  const rgbMatch = colorString.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    const rgb: ColorValueRGB = {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3]),
      a: rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1,
    };
    return rgbToHsl(rgb);
  }

  // HSL/HSLA
  const hslMatch = colorString.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)/);
  if (hslMatch) {
    return {
      h: parseInt(hslMatch[1]),
      s: parseInt(hslMatch[2]),
      l: parseInt(hslMatch[3]),
      a: hslMatch[4] ? parseFloat(hslMatch[4]) : 1,
    };
  }

  return null;
}

/**
 * 다크모드 색상 자동 생성
 * Light 토큰 → Dark 변형 생성
 * - Lightness 반전 (100 - L)
 * - 채도 15% 감소 (더 차분한 다크모드)
 */
export function generateDarkVariant(hsl: ColorValueHSL): ColorValueHSL {
  // Lightness 반전: 밝은 색 → 어두운 색, 어두운 색 → 밝은 색
  const invertedL = 100 - hsl.l;

  // 채도 15% 감소 (0 미만 방지)
  const reducedS = Math.max(0, hsl.s - 15);

  return {
    h: hsl.h,        // 색상(Hue)은 동일 유지
    s: reducedS,     // 채도 감소
    l: invertedL,    // 명도 반전
    a: hsl.a,        // 투명도 유지
  };
}
