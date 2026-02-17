/**
 * Dropflow Fork 기반 블록 레이아웃 엔진
 *
 * 기존 BlockEngine과 동일한 LayoutEngine 인터페이스를 구현하되,
 * 내부적으로 packages/layout-flow의 Dropflow Fork를 사용하여
 * CSS 명세에 더 부합하는 블록 레이아웃을 계산합니다.
 *
 * Feature Flag(dropflowBlockLayout)가 활성화된 경우에만 사용됩니다.
 *
 * 차이점 vs BlockEngine:
 * - margin collapse: Dropflow BFC가 완전한 CSS 명세를 구현
 * - float 지원: BlockEngine에 없는 float 레이아웃 처리
 * - replaced elements: img/video 등을 ReplacedBox로 올바르게 처리
 *
 * @since Phase 3 - BlockEngine → Dropflow Fork 교체
 */

import type { Element } from '../../../../../types/core/store.types';
import type { LayoutEngine, ComputedLayout, LayoutContext } from './LayoutEngine';
import {
  calculateBlockLayout,
  elementStyleToDropflowStyle,
} from '@xstudio/layout-flow';
import type {
  XElement,
  XComputedLayout,
  XLayoutContext,
} from '@xstudio/layout-flow';

// ---------------------------------------------------------------------------
// Element → XElement 변환
// ---------------------------------------------------------------------------

/**
 * apps/builder Element를 layout-flow XElement로 변환
 *
 * Element와 XElement는 구조가 거의 동일하지만
 * 패키지 간 의존을 피하기 위해 XElement로 재정의되어 있습니다.
 */
function elementToXElement(element: Element): XElement {
  return {
    id: element.id,
    tag: element.tag ?? 'div',
    props: (element.props ?? {}) as Record<string, unknown>,
    parent_id: element.parent_id ?? null,
    order_num: element.order_num,
  };
}

/**
 * LayoutContext를 XLayoutContext로 변환
 */
function contextToXContext(context: LayoutContext | undefined): XLayoutContext | undefined {
  if (!context) return undefined;
  return {
    bfcId: context.bfcId,
    prevSiblingMarginBottom: context.prevSiblingMarginBottom,
    parentMarginCollapse: context.parentMarginCollapse,
    viewportWidth: context.viewportWidth,
    viewportHeight: context.viewportHeight,
    parentDisplay: context.parentDisplay,
  };
}

/**
 * XComputedLayout을 ComputedLayout으로 변환
 */
function xLayoutToComputedLayout(xl: XComputedLayout): ComputedLayout {
  return {
    elementId: xl.elementId,
    x: xl.x,
    y: xl.y,
    width: xl.width,
    height: xl.height,
    margin: xl.margin,
  };
}

// ---------------------------------------------------------------------------
// DropflowBlockEngine
// ---------------------------------------------------------------------------

/**
 * Dropflow Fork 기반 블록 레이아웃 엔진
 *
 * LayoutEngine 인터페이스를 구현하여 기존 BlockEngine의 드롭인 교체로 사용 가능.
 *
 * 내부적으로 Dropflow의 BlockFormattingContext를 사용하므로
 * CSS 명세에 더 부합하는 margin collapse, float 처리를 제공합니다.
 */
export class DropflowBlockEngine implements LayoutEngine {
  /**
   * 처리 가능한 display 타입 목록
   *
   * BlockEngine과 동일하게 block, inline-block, inline, flow-root를 처리.
   * flex/grid는 FlexEngine/GridEngine이 처리하므로 제외.
   */
  readonly displayTypes = ['block', 'inline-block', 'inline', 'flow-root'];

  calculate(
    parent: Element,
    children: Element[],
    availableWidth: number,
    availableHeight: number,
    context?: LayoutContext,
  ): ComputedLayout[] {
    if (children.length === 0) return [];

    const xParent = elementToXElement(parent);
    const xChildren = children.map(elementToXElement);
    const xContext = contextToXContext(context);

    const xLayouts = calculateBlockLayout(
      xParent,
      xChildren,
      availableWidth,
      availableHeight,
      xContext,
    );

    return xLayouts.map(xLayoutToComputedLayout);
  }

  /**
   * 요소가 새로운 BFC(Block Formatting Context)를 생성하는지 확인
   *
   * Dropflow Style의 display/overflow/float/position으로 판별.
   * 기존 BlockEngine.createsBFC()와 동일한 조건을 사용합니다.
   */
  createsBFC(element: Element): boolean {
    const xElement = elementToXElement(element);
    const style = elementStyleToDropflowStyle(xElement);

    // display.inner === 'flow-root'
    if (style.display.inner === 'flow-root') return true;

    // display.outer === 'inline' (inline-block)
    if (style.display.outer === 'inline') return true;

    // overflow 기반 BFC
    if (style.overflow === 'hidden') return true;

    // float 기반 BFC
    if (style.float !== 'none') return true;

    // position 기반 BFC (absolute, fixed 모두 BFC 생성)
    if (style.position === 'absolute') return true;

    // display: flex / grid (Dropflow는 block으로 폴백하지만 BFC 생성 여부는 올바르게 판별)
    const raw = element.props?.style as Record<string, unknown> | undefined;
    const display = raw?.display as string | undefined;
    if (
      display === 'flex' ||
      display === 'inline-flex' ||
      display === 'grid' ||
      display === 'inline-grid'
    ) {
      return true;
    }

    // position: fixed도 BFC 생성 (Dropflow Style에서 absolute로 변환되므로 raw에서 별도 확인)
    const position = raw?.position as string | undefined;
    if (position === 'fixed') return true;

    return false;
  }
}
