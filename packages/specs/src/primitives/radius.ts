/**
 * Radius Tokens
 *
 * 둥근 모서리 토큰 정의
 *
 * @packageDocumentation
 */

import type { RadiusTokens } from '../types/token.types';

/**
 * 둥근 모서리 토큰
 */
/**
 * CSS 변수 기준:
 * --radius-sm: 0.25rem = 4px
 * --radius-md: 0.375rem = 6px
 * --radius-lg: 0.5rem = 8px
 * --radius-xl: 0.75rem = 12px
 */
export const radius: RadiusTokens = {
  none: 0,
  sm: 4,    // 0.25rem
  md: 6,    // 0.375rem
  lg: 8,    // 0.5rem
  xl: 12,   // 0.75rem
  full: 9999,
};

/**
 * 둥근 모서리 토큰 값 반환
 */
export function getRadiusToken(name: keyof RadiusTokens): number {
  return radius[name];
}
