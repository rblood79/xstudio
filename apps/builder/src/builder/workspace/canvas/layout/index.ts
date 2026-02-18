/**
 * Layout Module
 *
 * 엔진 라우팅:
 * - flex/inline-flex  → TaffyFlexEngine (Taffy WASM)
 * - grid/inline-grid  → TaffyGridEngine (Taffy WASM)
 * - block/inline 등   → DropflowBlockEngine
 *
 * @since 2025-12-11 Phase 11 B2
 * @updated 2026-02-17 Phase 9A - 레거시 엔진 삭제, 디스패처 단순화
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

// 엔진 디스패처 + 유틸리티 re-export
export {
  // 엔진 선택 및 계산
  selectEngine,
  calculateChildrenLayout,
  // BFC 확인
  createsBFC,
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
} from './engines';
