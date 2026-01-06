/**
 * Layout Module
 *
 * 🚀 Phase 11 B2: PixiJS 레이아웃 시스템
 * 🚀 Phase 7: @pixi/layout 마이그레이션 완료 - LayoutEngine.ts 삭제
 *
 * @pixi/layout 기반 선언적 Flexbox 레이아웃
 * 커스텀 CSS Grid 지원 (GridLayout.utils)
 *
 * @since 2025-12-11 Phase 11 B2
 * @updated 2025-01-06 Phase 7 - LayoutEngine.ts 삭제, @pixi/layout 완전 전환
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

// 🚀 Phase 4: Style to Layout Converter
export {
  styleToLayout,
  isEmptyLayout,
  type LayoutStyle,
} from './styleToLayout';

// 🚀 Phase 7: Yoga 초기화 (@pixi/layout용)
export {
  initYoga,
  isYogaInitialized,
} from './initYoga';
