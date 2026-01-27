/**
 * Token Resolver
 *
 * 토큰 참조를 실제 값으로 변환하는 유틸리티
 *
 * @packageDocumentation
 */

import type { TokenRef } from '../../types/token.types';
import type { ColorValue } from '../../types/shape.types';
import type { ShadowTokenRef } from '../../types/token.types';
import { lightColors, darkColors } from '../../primitives/colors';
import { spacing } from '../../primitives/spacing';
import { typography } from '../../primitives/typography';
import { radius } from '../../primitives/radius';
import { shadows } from '../../primitives/shadows';

/**
 * 토큰 참조를 실제 값으로 변환
 */
export function resolveToken(ref: TokenRef, theme: 'light' | 'dark' = 'light'): string | number {
  // '{color.primary}' → 'primary'
  const match = ref.match(/^\{(\w+)\.(.+)\}$/);
  if (!match) {
    console.warn(`Invalid token reference: ${ref}`);
    return ref;
  }

  const [, category, name] = match;

  switch (category) {
    case 'color':
      return theme === 'dark'
        ? darkColors[name as keyof typeof darkColors]
        : lightColors[name as keyof typeof lightColors];
    case 'spacing':
      return spacing[name as keyof typeof spacing];
    case 'typography':
      return typography[name as keyof typeof typography];
    case 'radius':
      return radius[name as keyof typeof radius];
    case 'shadow':
      return shadows[name as keyof typeof shadows];
    default:
      console.warn(`Unknown token category: ${category}`);
      return ref;
  }
}

/**
 * ColorValue를 실제 색상으로 변환
 */
export function resolveColor(value: ColorValue, theme: 'light' | 'dark' = 'light'): string | number {
  if (typeof value === 'string' && value.startsWith('{')) {
    return resolveToken(value as TokenRef, theme);
  }
  return value;
}

/**
 * CSS 변수명으로 변환
 */
export function tokenToCSSVar(ref: TokenRef): string {
  // '{color.primary}' → 'var(--primary)'
  // '{color.on-primary}' → 'var(--on-primary)'
  const match = ref.match(/^\{(\w+)\.(.+)\}$/);
  if (!match) return ref;

  const [, category, name] = match;

  switch (category) {
    case 'color':
      return `var(--${name})`;
    case 'spacing':
      return `var(--spacing-${name})`;
    case 'typography':
      return `var(--${name})`;
    case 'radius':
      return `var(--radius-${name})`;
    case 'shadow':
      return `var(--shadow-${name})`;
    default:
      return `var(--${name})`;
  }
}

/**
 * 그림자 토큰 참조를 실제 값으로 변환
 */
export function resolveBoxShadow(
  value: string | ShadowTokenRef,
  theme: 'light' | 'dark' = 'light'
): string {
  // 토큰 참조인 경우 (예: '{shadow.md}')
  if (typeof value === 'string' && value.startsWith('{shadow.')) {
    return resolveToken(value as TokenRef, theme) as string;
  }
  // 직접 값인 경우
  return value;
}

/**
 * hex 문자열을 숫자로 변환
 */
export function hexStringToNumber(hex: string): number {
  if (hex.startsWith('#')) {
    return parseInt(hex.slice(1), 16);
  }
  if (hex.startsWith('0x')) {
    return parseInt(hex, 16);
  }
  // rgb() 등 다른 형식은 colord로 처리 필요
  return 0x000000;
}
