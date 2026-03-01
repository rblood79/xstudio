/**
 * Layout Module
 *
 * ADR-005: Taffy WASM 단일 엔진 (fullTreeLayout)
 *
 * @since 2025-12-11 Phase 11 B2
 * @updated 2026-03-01 ADR-005 Foundation 완료 - Dropflow 제거, 단일 엔진 전환
 */

// Grid Layout (Custom)
export {
  GridLayout,
} from './GridLayout';

export {
  isGridContainer,
  isFlexContainer,  // 🚀 Phase 7: LayoutEngine.ts에서 이동
  parseGridTemplate,
  parseGap,
  parseGridArea,
  parseGridTemplateAreas,
  calculateGridCellBounds,
  useGridLayout,
  type GridStyle,
  type GridTrack,
  type GridCellBounds,
  type GridLayoutProps,
} from './GridLayout.utils';

// 엔진 유틸리티 re-export
export {
  // 유틸리티
  parseMargin,
  parsePadding,
  parseBorder,
  parseBoxModel,
  parseSize,
  calculateContentWidth,
  calculateContentHeight,
  resetWarnedTokens,
  // vertical-align, line-height
  parseVerticalAlign,
  parseLineHeight,
  calculateBaseline,
  // 타입
  type LayoutEngine,
  type ComputedLayout,
  type LayoutContext,
  type Margin,
  type BoxModel,
  // LineBox 타입
  type VerticalAlign,
  type LineBoxItem,
  type LineBox,
  // W3-7: CSS var() DOM fallback
  type CSSVariableScope,
  createVariableScopeWithDOMFallback,
  // ADR-005 Phase 2: Persistent Taffy Tree + Incremental Layout
  calculateFullTreeLayout,
  resetPersistentTree,
  // ADR-005 Phase 3: Flat Render Command Stream — 공유 Layout Map
  publishLayoutMap,
  getSharedLayoutMap,
  getSharedLayoutVersion,
} from './engines';
