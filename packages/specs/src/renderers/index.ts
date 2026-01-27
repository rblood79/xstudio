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
} from './ReactRenderer';

export type { ReactRenderResult } from './ReactRenderer';

// PIXI Renderer
export {
  renderToPixi,
  getVariantColors,
  getSizePreset,
} from './PixiRenderer';

export type { PixiRenderContext } from './PixiRenderer';

// CSS Generator
export {
  generateCSS,
  generateAllCSS,
} from './CSSGenerator';

// Token Resolver Utils
export {
  resolveToken,
  resolveColor,
  tokenToCSSVar,
  resolveBoxShadow,
  hexStringToNumber,
} from './utils/tokenResolver';
