/**
 * Layout Module
 *
 * 🚀 Phase 11 B2: PixiJS 레이아웃 시스템
 * 🚀 P7.8: Yoga 기반 Flexbox 레이아웃 엔진으로 리팩토링
 *
 * yoga-layout v3 기반 Flexbox 및 커스텀 CSS Grid 지원
 *
 * @since 2025-12-11 Phase 11 B2
 * @updated 2025-12-13 P7.8 - Yoga 기반 LayoutEngine으로 교체
 */

// Layout Engine (Yoga-based Flexbox + Block)
export {
  initYoga,
  calculateLayout,
  isFlexContainer,
  type LayoutPosition,
  type LayoutResult,
} from './LayoutEngine';

// Grid Layout (Custom)
export {
  GridLayout,
  isGridContainer,
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
} from './GridLayout';
