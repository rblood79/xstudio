/**
 * Spacing Tokens
 *
 * 간격 토큰 정의
 *
 * @packageDocumentation
 */

import type { SpacingTokens } from '../types/token.types';

/**
 * 간격 토큰
 */
export const spacing: SpacingTokens = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

/**
 * 간격 토큰 값 반환
 */
export function getSpacingToken(name: keyof SpacingTokens): number {
  return spacing[name];
}
