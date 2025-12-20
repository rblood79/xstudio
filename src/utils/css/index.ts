/**
 * CSS Utilities
 *
 * CSS 처리를 위한 유틸리티 모듈
 *
 * @since 2025-12-20 Phase 2 - Structural Optimization
 */

export {
  // Types
  type FourWayValues,
  type BorderRadiusValues,
  type BorderValues,

  // Expansion (Shorthand → Individual)
  expandSpacing,
  expandPadding,
  expandMargin,
  expandBorderRadius,
  expandBorder,

  // Collapse (Individual → Shorthand)
  collapseSpacing,
  collapseBorderRadius,
  collapseBorder,
} from './shorthandExpander';
