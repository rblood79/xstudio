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
} from "./colors";

// Spacing
export {
  spacing,
  getSpacingToken,
  breadcrumbSeparatorAfterPaddingXPx,
  normalizeBreadcrumbRspSizeKey,
} from "./spacing";

// Typography
export {
  typography,
  fontFamily,
  fontWeight,
  lineHeight,
  getTypographyToken,
  getLabelLineHeight,
} from "./typography";

// Radius
export { radius, getRadiusToken } from "./radius";

// Shadows
export { shadows, getShadowToken, parseShadow } from "./shadows";

export type { ParsedShadow } from "./shadows";

// Font (CSS 표준 상수 — ADR-091 Phase 1)
export { FONT_STRETCH_KEYWORD_MAP } from "./font";

// HTML primitive defaults (ADR-096 Phase 2)
export {
  HTML_PRIMITIVE_DEFAULT_WIDTHS,
  HTML_PRIMITIVE_DEFAULT_HEIGHTS,
} from "./elementDefaults";
