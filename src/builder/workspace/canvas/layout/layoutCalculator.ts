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
  // Flexbox properties
  flexDirection?: string;
  flexWrap?: string;
  alignItems?: string;
  justifyContent?: string;
}

// 무한 재귀 및 스택 오버플로 방지를 위한 최대 허용 깊이
const MAX_LAYOUT_DEPTH = 1000;

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
    const bodyFlexStyle = getParentFlexStyle(bodyElement);
    const visited = new Set<string>([bodyElement.id]);

    if (bodyFlexStyle.display === 'flex') {
      calculateFlexLayout(
        pageElements,
        bodyElement.id,
        bodyPadding.left,
        bodyPadding.top,
        pageWidth - bodyPadding.left - bodyPadding.right,
        pageHeight - bodyPadding.top - bodyPadding.bottom,
        bodyFlexStyle,
        positions,
        visited,
        0
      );
    } else {
      calculateChildrenLayout(
        pageElements,
        bodyElement.id,
        bodyPadding.left,
        bodyPadding.top,
        pageWidth - bodyPadding.left - bodyPadding.right,
        pageHeight - bodyPadding.top - bodyPadding.bottom,
        positions,
        visited,
        0
      );
    }
  }

  return { positions };
}

/**
 * 부모 요소의 Flex 스타일 추출
 */
function getParentFlexStyle(element: Element): {
  display: string;
  flexDirection: string;
  flexWrap: string;
  alignItems: string;
  justifyContent: string;
  gap: number;
} {
  const style = element.props?.style as CSSStyle | undefined;
  return {
    display: style?.display || 'block',
    flexDirection: style?.flexDirection || 'row',
    flexWrap: style?.flexWrap || 'nowrap',
    alignItems: style?.alignItems || 'stretch',
    justifyContent: style?.justifyContent || 'flex-start',
    gap: parseCSSValue(style?.gap, 0),
  };
}

/**
 * Flexbox 레이아웃 계산
 */
function calculateFlexLayout(
  elements: Element[],
  parentId: string,
  parentX: number,
  parentY: number,
  parentWidth: number,
  parentHeight: number,
  flexStyle: ReturnType<typeof getParentFlexStyle>,
  positions: Map<string, LayoutPosition>,
  visited: Set<string>,
  depth: number
): void {
  if (depth > MAX_LAYOUT_DEPTH) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[LayoutCalculator] Max depth reached in flex layout, aborting to prevent overflow');
    }
    return;
  }

  const children = elements
    .filter((el) => el.parent_id === parentId)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  if (children.length === 0) return;

  const { flexDirection, alignItems, justifyContent, gap } = flexStyle;
  const isRow = flexDirection === 'row' || flexDirection === 'row-reverse';
  const isReverse = flexDirection === 'row-reverse' || flexDirection === 'column-reverse';

  // 자식 크기 계산
  const childSizes = children.map((child) => {
    const size = getElementSize(child, isRow ? 100 : parentWidth, isRow ? parentHeight : 40);
    const margin = getElementMargin(child);
    return {
      element: child,
      width: size.width,
      height: size.height,
      margin,
      totalWidth: size.width + margin.left + margin.right,
      totalHeight: size.height + margin.top + margin.bottom,
    };
  });

  // 전체 콘텐츠 크기 계산
  const totalGap = gap * (children.length - 1);
  const totalContentSize = isRow
    ? childSizes.reduce((sum, c) => sum + c.totalWidth, 0) + totalGap
    : childSizes.reduce((sum, c) => sum + c.totalHeight, 0) + totalGap;

  // Main axis 시작 위치 계산 (justifyContent)
  const availableSpace = isRow ? parentWidth : parentHeight;
  const freeSpace = Math.max(0, availableSpace - totalContentSize);

  let mainStart: number;
  let itemGap = gap;

  switch (justifyContent) {
    case 'center':
      mainStart = freeSpace / 2;
      break;
    case 'flex-end':
      mainStart = freeSpace;
      break;
    case 'space-between':
      mainStart = 0;
      itemGap = children.length > 1 ? freeSpace / (children.length - 1) : 0;
      break;
    case 'space-around':
      itemGap = children.length > 0 ? freeSpace / children.length : 0;
      mainStart = itemGap / 2;
      break;
    case 'space-evenly':
      itemGap = children.length > 0 ? freeSpace / (children.length + 1) : 0;
      mainStart = itemGap;
      break;
    case 'flex-start':
    default:
      mainStart = 0;
      break;
  }

  // 자식 위치 계산
  let currentMain = mainStart;
  const orderedChildren = isReverse ? [...childSizes].reverse() : childSizes;

  for (const childSize of orderedChildren) {
    const { element: child, width, height, margin } = childSize;

    if (visited.has(child.id)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[LayoutCalculator] Detected cyclic parent chain, skipping:', child.id);
      }
      continue;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(child.id);
    const style = child.props?.style as CSSStyle | undefined;
    const position = style?.position || 'relative';

    // position: absolute는 flex에서 제외
    if (position === 'absolute') {
      const offset = getPositionOffset(child);
      positions.set(child.id, {
        x: parentX + offset.left,
        y: parentY + offset.top,
        width,
        height,
      });
      continue;
    }

    let x: number;
    let y: number;

    if (isRow) {
      // Row direction
      x = parentX + currentMain + margin.left;

      // Cross axis alignment (alignItems)
      switch (alignItems) {
        case 'center':
          y = parentY + (parentHeight - height) / 2;
          break;
        case 'flex-end':
          y = parentY + parentHeight - height - margin.bottom;
          break;
        case 'flex-start':
        case 'stretch':
        default:
          y = parentY + margin.top;
          break;
      }

      currentMain += childSize.totalWidth + itemGap;
    } else {
      // Column direction
      y = parentY + currentMain + margin.top;

      // Cross axis alignment (alignItems)
      switch (alignItems) {
        case 'center':
          x = parentX + (parentWidth - width) / 2;
          break;
        case 'flex-end':
          x = parentX + parentWidth - width - margin.right;
          break;
        case 'flex-start':
        case 'stretch':
        default:
          x = parentX + margin.left;
          break;
      }

      currentMain += childSize.totalHeight + itemGap;
    }

    // 위치 저장
    positions.set(child.id, { x, y, width, height });

    // 자식 요소들 재귀 처리
    const childPadding = getElementPadding(child);
    const childFlexStyle = getParentFlexStyle(child);

    if (childFlexStyle.display === 'flex') {
      calculateFlexLayout(
        elements,
        child.id,
        x + childPadding.left,
        y + childPadding.top,
        width - childPadding.left - childPadding.right,
        height - childPadding.top - childPadding.bottom,
        childFlexStyle,
        positions,
        nextVisited,
        depth + 1
      );
    } else {
      calculateChildrenLayout(
        elements,
        child.id,
        x + childPadding.left,
        y + childPadding.top,
        width - childPadding.left - childPadding.right,
        height - childPadding.top - childPadding.bottom,
        positions,
        nextVisited,
        depth + 1
      );
    }
  }
}

/**
 * 자식 요소들의 레이아웃 계산 (재귀) - Block 레이아웃
 */
function calculateChildrenLayout(
  elements: Element[],
  parentId: string,
  parentX: number,
  parentY: number,
  parentWidth: number,
  parentHeight: number,
  positions: Map<string, LayoutPosition>,
  visited: Set<string>,
  depth: number
): void {
  if (depth > MAX_LAYOUT_DEPTH) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[LayoutCalculator] Max depth reached in block layout, aborting to prevent overflow');
    }
    return;
  }

  // 부모 요소 찾기
  const parentElement = elements.find((el) => el.id === parentId);
  if (parentElement) {
    const flexStyle = getParentFlexStyle(parentElement);
    if (flexStyle.display === 'flex') {
      calculateFlexLayout(
        elements,
        parentId,
        parentX,
        parentY,
        parentWidth,
        parentHeight,
        flexStyle,
        positions,
        visited,
        depth
      );
      return;
    }
  }

  // 부모의 직접 자식 요소들 찾기 (order_num으로 정렬)
  const children = elements
    .filter((el) => el.parent_id === parentId)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  let currentY = parentY; // 현재 Y 위치 (수직 스택용)

  for (const child of children) {
    if (visited.has(child.id)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[LayoutCalculator] Detected cyclic parent chain, skipping:', child.id);
      }
      continue;
    }

    const nextVisited = new Set(visited);
    nextVisited.add(child.id);
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
    const childFlexStyle = getParentFlexStyle(child);

    if (childFlexStyle.display === 'flex') {
      calculateFlexLayout(
        elements,
        child.id,
        x + childPadding.left,
        y + childPadding.top,
        size.width - childPadding.left - childPadding.right,
        size.height - childPadding.top - childPadding.bottom,
        childFlexStyle,
        positions,
        nextVisited,
        depth + 1
      );
    } else {
      calculateChildrenLayout(
        elements,
        child.id,
        x + childPadding.left,
        y + childPadding.top,
        size.width - childPadding.left - childPadding.right,
        size.height - childPadding.top - childPadding.bottom,
        positions,
        nextVisited,
        depth + 1
      );
    }
  }
}

export default calculateLayout;
