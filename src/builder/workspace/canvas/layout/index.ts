/**
 * Layout Module
 *
 * 🚀 Phase 11 B2: PixiJS 레이아웃 시스템
 *
 * @pixi/layout 기반 Flexbox 및 커스텀 CSS Grid 지원
 *
 * @since 2025-12-11 Phase 11 B2
 */

// Flex Layout (@pixi/layout)
export {
  FlexLayout,
  isFlexContainer,
  convertToPixiLayout,
  getFlexItemLayout,
  type FlexStyle,
  type FlexLayoutProps,
  type PixiLayoutConfig,
} from './FlexLayout';

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
