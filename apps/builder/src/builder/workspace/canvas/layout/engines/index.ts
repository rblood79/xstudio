/**
 * Layout Engine 디스패처
 *
 * display 속성에 따라 적절한 레이아웃 엔진을 선택합니다.
 *
 * @since 2026-01-28 Phase 2 - 하이브리드 레이아웃 엔진
 * @updated 2026-01-28 Phase 3 - BlockEngine 추가
 * @updated 2026-01-28 Phase 5 - P1 기능 (BFC, 부모-자식 margin collapse)
 * @updated 2026-01-28 Phase 6 - P2 기능 (vertical-align, LineBox)
 */

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
import { BlockEngine, type BlockLayoutResult } from './BlockEngine';
import { FlexEngine, shouldDelegateToPixiLayout } from './FlexEngine';
import { GridEngine } from './GridEngine';

// Re-export types
export type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
export type { Margin, BoxModel, VerticalAlign, LineBoxItem, LineBox } from './types';
export type { BlockLayoutResult } from './BlockEngine';

// Re-export utilities
export {
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
} from './utils';

// Re-export engine utilities
export { shouldDelegateToPixiLayout } from './FlexEngine';

/**
 * 요소가 새로운 BFC(Block Formatting Context)를 생성하는지 확인
 *
 * BFC 생성 조건: flow-root, flex, grid, inline-block, overflow 등
 */
export function createsBFC(element: Element): boolean {
  return blockEngine.createsBFC(element);
}

// 싱글톤 엔진 인스턴스
const blockEngine = new BlockEngine();
const flexEngine = new FlexEngine();
const gridEngine = new GridEngine();

/**
 * display 속성에 따라 적절한 레이아웃 엔진 선택
 *
 * @example
 * const engine = selectEngine('flex');
 * if (shouldDelegateToPixiLayout(engine)) {
 *   // @pixi/layout 사용
 * } else {
 *   // engine.calculate() 호출
 * }
 */
export function selectEngine(display: string | undefined): LayoutEngine {
  switch (display) {
    case 'flex':
    case 'inline-flex':
      return flexEngine;

    case 'grid':
    case 'inline-grid':
      return gridEngine;

    case 'block':
    case 'inline-block':
      return blockEngine;

    case undefined:
      // display 미지정 시 block (CSS 기본값)
      return blockEngine;

    default:
      // 알 수 없는 display는 block으로 폴백
      return blockEngine;
  }
}

/**
 * 요소의 자식들에 대한 레이아웃 계산
 *
 * 주의: Flex 엔진은 shouldDelegate === true이므로
 * 이 함수 대신 @pixi/layout을 직접 사용해야 함
 */
export function calculateChildrenLayout(
  parent: Element,
  children: Element[],
  availableWidth: number,
  availableHeight: number,
  context?: LayoutContext
): ComputedLayout[] {
  const style = parent.props?.style as Record<string, unknown> | undefined;
  const display = style?.display as string | undefined;

  const engine = selectEngine(display);

  // Flex 엔진은 @pixi/layout에 위임
  if (shouldDelegateToPixiLayout(engine)) {
    if (import.meta.env.DEV) {
      console.warn(
        '[calculateChildrenLayout] Flex layout should use @pixi/layout directly'
      );
    }
    return [];
  }

  return engine.calculate(parent, children, availableWidth, availableHeight, context);
}
