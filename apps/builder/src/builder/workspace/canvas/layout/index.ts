/**
 * Layout Module
 *
 * 🚀 Phase 11 B2: PixiJS 레이아웃 시스템
 * 🚀 Phase 7: @pixi/layout 마이그레이션 완료 - LayoutEngine.ts 삭제
 * 🚀 Phase 2 (2026-01-28): 하이브리드 레이아웃 엔진 아키텍처 추가
 *
 * @pixi/layout 기반 선언적 Flexbox 레이아웃
 * 커스텀 CSS Grid 지원 (GridLayout.utils)
 * 하이브리드 엔진: Block/Grid는 커스텀, Flex는 Yoga 위임
 *
 * @since 2025-12-11 Phase 11 B2
 * @updated 2025-01-06 Phase 7 - LayoutEngine.ts 삭제, @pixi/layout 완전 전환
 * @updated 2026-01-28 Phase 2 - 하이브리드 레이아웃 엔진 추가
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

// 🚀 Phase 2 (2026-01-28): 하이브리드 레이아웃 엔진
// 🚀 Phase 5 (2026-01-28): P1 기능 (BFC, 부모-자식 margin collapse)
// 🚀 Phase 6 (2026-01-28): P2 기능 (vertical-align, LineBox)
export {
  // 엔진 선택 및 계산
  selectEngine,
  calculateChildrenLayout,
  shouldDelegateToPixiLayout,
  // 🚀 Phase 5: BFC 확인
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
  // 🚀 Phase 6: vertical-align, line-height
  parseVerticalAlign,
  parseLineHeight,
  calculateBaseline,
  // 타입
  type LayoutEngine,
  type ComputedLayout,
  type LayoutContext,
  type Margin,
  type BoxModel,
  type BlockLayoutResult,
  // 🚀 Phase 6: LineBox 타입
  type VerticalAlign,
  type LineBoxItem,
  type LineBox,
} from './engines';
