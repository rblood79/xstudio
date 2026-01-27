/**
 * Primitives - Public API
 *
 * 디자인 토큰 (색상, 간격, 타이포그래피, radius, 그림자)
 *
 * @packageDocumentation
 */

// Colors
export {
  lightColors,
  darkColors,
  getColorToken,
  getColorTokens,
} from './colors';

// Spacing
export {
  spacing,
  getSpacingToken,
} from './spacing';

// Typography
export {
  typography,
  fontFamily,
  fontWeight,
  lineHeight,
  getTypographyToken,
} from './typography';

// Radius
export {
  radius,
  getRadiusToken,
} from './radius';

// Shadows
export {
  shadows,
  getShadowToken,
  parseShadow,
} from './shadows';

export type { ParsedShadow } from './shadows';
