/**
 * @xstudio/specs
 *
 * Component Spec Architecture - Single Source of Truth
 * Builder(WebGL)와 Publish(React)의 100% 시각적 일치 보장
 *
 * @packageDocumentation
 */

// ─── Types ───────────────────────────────────────────────────────────────────
export type {
  // Spec Types
  ComponentSpec,
  ComponentState,
  VariantSpec,
  SizeSpec,
  RenderSpec,
  // Shape Types
  Shape,
  ShapeBase,
  RectShape,
  RoundRectShape,
  CircleShape,
  TextShape,
  ShadowShape,
  BorderShape,
  ContainerShape,
  ContainerLayout,
  GradientShape,
  ImageShape,
  LineShape,
  ColorValue,
  // Token Types
  TokenRef,
  ColorTokenRef,
  SpacingTokenRef,
  TypographyTokenRef,
  RadiusTokenRef,
  ShadowTokenRef,
  StrictTokenRef,
  TokenCategories,
  ColorTokens,
  SpacingTokens,
  TypographyTokens,
  RadiusTokens,
  ShadowTokens,
  // State Types
  StateStyles,
  StateEffect,
} from './types';

export { isValidTokenRef } from './types';

// ─── Primitives ──────────────────────────────────────────────────────────────
export {
  // Colors
  lightColors,
  darkColors,
  getColorToken,
  getColorTokens,
  // Spacing
  spacing,
  getSpacingToken,
  // Typography
  typography,
  fontFamily,
  fontWeight,
  lineHeight,
  getTypographyToken,
  // Radius
  radius,
  getRadiusToken,
  // Shadows
  shadows,
  getShadowToken,
  parseShadow,
} from './primitives';

export type { ParsedShadow } from './primitives';

// ─── Renderers ───────────────────────────────────────────────────────────────
export {
  // React Renderer
  renderToReact,
  generateCSSVariables,
  generateSizeVariables,
  // PIXI Renderer
  renderToPixi,
  getVariantColors,
  getSizePreset,
  // CSS Generator
  generateCSS,
  generateAllCSS,
  // Token Resolver
  resolveToken,
  resolveColor,
  tokenToCSSVar,
  resolveBoxShadow,
  hexStringToNumber,
} from './renderers';

export type {
  ReactRenderResult,
  PixiRenderContext,
} from './renderers';

// ─── Components ──────────────────────────────────────────────────────────────
export { ButtonSpec } from './components/Button.spec';
export type { ButtonProps } from './components/Button.spec';
