/**
 * Typography Tokens
 *
 * 타이포그래피 토큰 정의
 *
 * @packageDocumentation
 */

import type { TypographyTokens } from '../types/token.types';

/**
 * 폰트 크기 토큰
 */
export const typography: TypographyTokens = {
  'text-xs': 12,
  'text-sm': 14,
  'text-md': 16,
  'text-lg': 18,
  'text-xl': 20,
  'text-2xl': 24,
};

/**
 * 폰트 패밀리
 */
export const fontFamily = {
  sans: 'Inter, system-ui, -apple-system, sans-serif',
  mono: 'JetBrains Mono, Consolas, monospace',
};

/**
 * 폰트 두께
 */
export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
};

/**
 * 줄 높이 (배수)
 */
export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
};

/**
 * 타이포그래피 토큰 값 반환
 */
export function getTypographyToken(name: keyof TypographyTokens): number {
  return typography[name];
}
