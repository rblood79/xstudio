/**
 * Layout Calculator
 *
 * DOM의 기본 레이아웃 방식을 Canvas에서 재현
 * - display: block → 수직 스택
 * - position: relative → normal flow + left/top 오프셋
 *
 * @since 2025-12-12
 */

import type { Element } from '../../../../types/core/store.types';

// ============================================
// Types
// ============================================

export interface LayoutPosition {
  /** 계산된 X 좌표 */
  x: number;
  /** 계산된 Y 좌표 */
  y: number;
  /** 너비 */
  width: number;
  /** 높이 */
  height: number;
}

export interface LayoutResult {
  /** element.id → LayoutPosition 매핑 */
  positions: Map<string, LayoutPosition>;
}

interface CSSStyle {
  display?: string;
  position?: string;
  left?: string | number;
  top?: string | number;
  width?: string | number;
  height?: string | number;
  marginTop?: string | number;
  marginBottom?: string | number;
  marginLeft?: string | number;
  marginRight?: string | number;
  paddingTop?: string | number;
  paddingBottom?: string | number;
  paddingLeft?: string | number;
  paddingRight?: string | number;
  gap?: string | number;
}

// ============================================
// Utility Functions
// ============================================

/**
 * CSS 값 파싱 (px, %, 숫자 등)
 */
function parseCSSValue(value: unknown, defaultValue: number = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

/**
 * 요소의 스타일에서 크기 정보 추출
 */
function getElementSize(element: Element, defaultWidth: number, defaultHeight: number): { width: number; height: number } {
  const style = element.props?.style as CSSStyle | undefined;
  return {
    width: parseCSSValue(style?.width, defaultWidth),
    height: parseCSSValue(style?.height, defaultHeight),
  };
}

/**
 * 요소의 margin 정보 추출
 */
function getElementMargin(element: Element): { top: number; bottom: number; left: number; right: number } {
  const style = element.props?.style as CSSStyle | undefined;
  return {
    top: parseCSSValue(style?.marginTop, 0),
    bottom: parseCSSValue(style?.marginBottom, 0),
    left: parseCSSValue(style?.marginLeft, 0),
    right: parseCSSValue(style?.marginRight, 0),
  };
}

/**
 * 요소의 padding 정보 추출
 */
function getElementPadding(element: Element): { top: number; bottom: number; left: number; right: number } {
  const style = element.props?.style as CSSStyle | undefined;
  return {
    top: parseCSSValue(style?.paddingTop, 0),
    bottom: parseCSSValue(style?.paddingBottom, 0),
    left: parseCSSValue(style?.paddingLeft, 0),
    right: parseCSSValue(style?.paddingRight, 0),
  };
}

/**
 * 요소의 position 오프셋 추출 (position: relative용)
 */
function getPositionOffset(element: Element): { left: number; top: number } {
  const style = element.props?.style as CSSStyle | undefined;
  return {
    left: parseCSSValue(style?.left, 0),
    top: parseCSSValue(style?.top, 0),
  };
}

// ============================================
// Layout Calculator
// ============================================

/**
 * 요소 트리의 레이아웃 계산
 *
 * @param elements - 전체 요소 배열
 * @param pageId - 현재 페이지 ID
 * @param pageWidth - 페이지 너비
 * @param pageHeight - 페이지 높이
 */
export function calculateLayout(
  elements: Element[],
  pageId: string,
  pageWidth: number,
  pageHeight: number
): LayoutResult {
  const positions = new Map<string, LayoutPosition>();

  // 현재 페이지의 요소만 필터링
  const pageElements = elements.filter((el) => el.page_id === pageId);

  // Body 요소 찾기
  const bodyElement = pageElements.find((el) => el.tag.toLowerCase() === 'body');

  if (bodyElement) {
    // Body 위치 설정
    positions.set(bodyElement.id, {
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
    });

    // Body의 자식 요소들 레이아웃 계산
    const bodyPadding = getElementPadding(bodyElement);
    calculateChildrenLayout(
      pageElements,
      bodyElement.id,
      bodyPadding.left,
      bodyPadding.top,
      pageWidth - bodyPadding.left - bodyPadding.right,
      positions
    );
  }

  return { positions };
}

/**
 * 자식 요소들의 레이아웃 계산 (재귀)
 */
function calculateChildrenLayout(
  elements: Element[],
  parentId: string,
  parentX: number,
  parentY: number,
  parentWidth: number,
  positions: Map<string, LayoutPosition>
): void {
  // 부모의 직접 자식 요소들 찾기 (order_num으로 정렬)
  const children = elements
    .filter((el) => el.parent_id === parentId)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  let currentY = parentY; // 현재 Y 위치 (수직 스택용)

  for (const child of children) {
    const style = child.props?.style as CSSStyle | undefined;
    const display = style?.display || 'block';
    const position = style?.position || 'relative';

    // 요소 크기
    const size = getElementSize(child, parentWidth, 40); // 기본 높이 40px
    const margin = getElementMargin(child);
    const offset = getPositionOffset(child);

    // margin-top 적용
    currentY += margin.top;

    let x: number;
    let y: number;

    if (position === 'absolute') {
      // position: absolute → 부모 기준 절대 위치
      x = parentX + offset.left;
      y = parentY + offset.top;
    } else {
      // position: relative (기본값) → normal flow + 오프셋
      if (display === 'block') {
        // block 요소: 수직 스택
        x = parentX + margin.left + offset.left;
        y = currentY + offset.top;

        // 다음 요소를 위해 Y 위치 업데이트
        currentY += size.height + margin.bottom;
      } else {
        // inline 등 다른 display는 일단 block처럼 처리
        x = parentX + margin.left + offset.left;
        y = currentY + offset.top;
        currentY += size.height + margin.bottom;
      }
    }

    // 위치 저장
    positions.set(child.id, {
      x,
      y,
      width: size.width,
      height: size.height,
    });

    // 자식 요소들 재귀 처리
    const childPadding = getElementPadding(child);
    calculateChildrenLayout(
      elements,
      child.id,
      x + childPadding.left,
      y + childPadding.top,
      size.width - childPadding.left - childPadding.right,
      positions
    );
  }
}

export default calculateLayout;
