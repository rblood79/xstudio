/**
 * Renderers - Public API
 *
 * React, PIXI, CSS 렌더러
 *
 * @packageDocumentation
 */

// React Renderer
export {
  renderToReact,
  generateCSSVariables,
  generateSizeVariables,
} from "./ReactRenderer";

export type { ReactRenderResult } from "./ReactRenderer";

// Variant/Size resolvers (Skia/Canvas 공용, ADR-100 PixiRenderer 제거 후 분리)
export { getVariantColors, getSizePreset } from "./utils/variantColors";

// CSS Generator
export { generateCSS, generateAllCSS } from "./CSSGenerator";

// Token Resolver Utils
export {
  resolveToken,
  resolveColor,
  tokenToCSSVar,
  cssVarToTokenRef,
  resolveBoxShadow,
  hexStringToNumber,
} from "./utils/tokenResolver";

// FontSize resolver
export { resolveSpecFontSize } from "./utils/resolveSpecFontSize";
