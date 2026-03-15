/**
 * Types - Public API
 *
 * @packageDocumentation
 */

// Spec Types
export type {
  ArchetypeId,
  ComponentSpec,
  ComponentState,
  VariantSpec,
  SizeSpec,
  RenderSpec,
  CompositionSpec,
  DelegationSpec,
} from "./spec.types";

// Shape Types
export type {
  Shape,
  ShapeBase,
  RectShape,
  RoundRectShape,
  CircleShape,
  ArcShape,
  TextShape,
  ShadowShape,
  BorderShape,
  ContainerShape,
  ContainerLayout,
  GradientShape,
  ImageShape,
  LineShape,
  IconFontShape,
  ColorValue,
} from "./shape.types";

// Token Types
export type {
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
} from "./token.types";

export { isValidTokenRef } from "./token.types";

// State Types
export type { StateStyles, StateEffect } from "./state.types";
