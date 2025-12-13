/**
 * Layout Engine
 *
 * 🚀 P7.8: Yoga 기반 Flexbox 레이아웃 엔진
 *
 * @pixi/layout의 peer dependency인 yoga-layout v3를 직접 사용하여
 * CSS Flexbox 스펙을 완벽하게 지원합니다.
 *
 * @since 2025-12-13 P7.8
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
  minWidth?: string | number;
  minHeight?: string | number;
  maxWidth?: string | number;
  maxHeight?: string | number;
  marginTop?: string | number;
  marginBottom?: string | number;
  marginLeft?: string | number;
  marginRight?: string | number;
  paddingTop?: string | number;
  paddingBottom?: string | number;
  paddingLeft?: string | number;
  paddingRight?: string | number;
  gap?: string | number;
  rowGap?: string | number;
  columnGap?: string | number;
  // Flexbox properties
  flexDirection?: string;
  flexWrap?: string;
  alignItems?: string;
  alignContent?: string;
  justifyContent?: string;
  flex?: string | number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string | number;
  alignSelf?: string;
}

// Yoga 타입 (동적 로딩)
type YogaInstance = Awaited<typeof import('yoga-layout')>;
type YogaNode = ReturnType<YogaInstance['Node']['create']>;

// ============================================
// Yoga Instance Management
// ============================================

let Yoga: YogaInstance | null = null;
let yogaLoadPromise: Promise<YogaInstance> | null = null;

/**
 * Yoga 엔진 초기화 (싱글톤)
 */
export async function initYoga(): Promise<YogaInstance> {
  if (Yoga) return Yoga;

  if (!yogaLoadPromise) {
    yogaLoadPromise = import('yoga-layout').then((module) => {
      Yoga = module;
      return module;
    });
  }

  return yogaLoadPromise;
}

/**
 * Yoga 동기 접근 (초기화 후 사용)
 */
function getYoga(): YogaInstance {
  if (!Yoga) {
    throw new Error('Yoga not initialized. Call initYoga() first.');
  }
  return Yoga;
}

// ============================================
// Utility Functions
// ============================================

/**
 * CSS 값 파싱 (px, %, 숫자 등)
 */
function parseCSSValue(value: unknown, defaultValue = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

/**
 * CSS flexDirection을 Yoga FlexDirection으로 변환
 */
function toYogaFlexDirection(yoga: YogaInstance, value: string | undefined): number {
  switch (value) {
    case 'row': return yoga.FlexDirection.Row;
    case 'row-reverse': return yoga.FlexDirection.RowReverse;
    case 'column': return yoga.FlexDirection.Column;
    case 'column-reverse': return yoga.FlexDirection.ColumnReverse;
    default: return yoga.FlexDirection.Row;
  }
}

/**
 * CSS flexWrap을 Yoga Wrap으로 변환
 */
function toYogaWrap(yoga: YogaInstance, value: string | undefined): number {
  switch (value) {
    case 'wrap': return yoga.Wrap.Wrap;
    case 'wrap-reverse': return yoga.Wrap.WrapReverse;
    case 'nowrap':
    default: return yoga.Wrap.NoWrap;
  }
}

/**
 * CSS justifyContent를 Yoga Justify로 변환
 */
function toYogaJustify(yoga: YogaInstance, value: string | undefined): number {
  switch (value) {
    case 'flex-start': return yoga.Justify.FlexStart;
    case 'flex-end': return yoga.Justify.FlexEnd;
    case 'center': return yoga.Justify.Center;
    case 'space-between': return yoga.Justify.SpaceBetween;
    case 'space-around': return yoga.Justify.SpaceAround;
    case 'space-evenly': return yoga.Justify.SpaceEvenly;
    default: return yoga.Justify.FlexStart;
  }
}

/**
 * CSS alignItems를 Yoga Align으로 변환
 */
function toYogaAlign(yoga: YogaInstance, value: string | undefined): number {
  switch (value) {
    case 'flex-start': return yoga.Align.FlexStart;
    case 'flex-end': return yoga.Align.FlexEnd;
    case 'center': return yoga.Align.Center;
    case 'stretch': return yoga.Align.Stretch;
    case 'baseline': return yoga.Align.Baseline;
    default: return yoga.Align.Stretch;
  }
}

/**
 * CSS alignContent를 Yoga Align으로 변환
 */
function toYogaAlignContent(yoga: YogaInstance, value: string | undefined): number {
  switch (value) {
    case 'flex-start': return yoga.Align.FlexStart;
    case 'flex-end': return yoga.Align.FlexEnd;
    case 'center': return yoga.Align.Center;
    case 'stretch': return yoga.Align.Stretch;
    case 'space-between': return yoga.Align.SpaceBetween;
    case 'space-around': return yoga.Align.SpaceAround;
    default: return yoga.Align.Stretch;
  }
}

// ============================================
// Node Tree Building
// ============================================

/**
 * Element에서 Yoga 노드 생성 및 스타일 적용
 */
function createYogaNode(
  yoga: YogaInstance,
  element: Element,
  parentWidth: number,
  parentHeight: number
): YogaNode {
  const node = yoga.Node.create();
  const style = element.props?.style as CSSStyle | undefined;

  // 크기 설정
  const width = parseCSSValue(style?.width, 0);
  const height = parseCSSValue(style?.height, 0);

  if (width > 0) node.setWidth(width);
  if (height > 0) node.setHeight(height);

  // Min/Max 크기
  if (style?.minWidth) node.setMinWidth(parseCSSValue(style.minWidth));
  if (style?.minHeight) node.setMinHeight(parseCSSValue(style.minHeight));
  if (style?.maxWidth) node.setMaxWidth(parseCSSValue(style.maxWidth));
  if (style?.maxHeight) node.setMaxHeight(parseCSSValue(style.maxHeight));

  // Margin
  if (style?.marginTop) node.setMargin(yoga.Edge.Top, parseCSSValue(style.marginTop));
  if (style?.marginRight) node.setMargin(yoga.Edge.Right, parseCSSValue(style.marginRight));
  if (style?.marginBottom) node.setMargin(yoga.Edge.Bottom, parseCSSValue(style.marginBottom));
  if (style?.marginLeft) node.setMargin(yoga.Edge.Left, parseCSSValue(style.marginLeft));

  // Padding
  if (style?.paddingTop) node.setPadding(yoga.Edge.Top, parseCSSValue(style.paddingTop));
  if (style?.paddingRight) node.setPadding(yoga.Edge.Right, parseCSSValue(style.paddingRight));
  if (style?.paddingBottom) node.setPadding(yoga.Edge.Bottom, parseCSSValue(style.paddingBottom));
  if (style?.paddingLeft) node.setPadding(yoga.Edge.Left, parseCSSValue(style.paddingLeft));

  // Flexbox Container 속성
  if (style?.display === 'flex') {
    node.setFlexDirection(toYogaFlexDirection(yoga, style.flexDirection));
    node.setFlexWrap(toYogaWrap(yoga, style.flexWrap));
    node.setJustifyContent(toYogaJustify(yoga, style.justifyContent));
    node.setAlignItems(toYogaAlign(yoga, style.alignItems));
    node.setAlignContent(toYogaAlignContent(yoga, style.alignContent));

    // Gap
    if (style.gap) node.setGap(yoga.Gutter.All, parseCSSValue(style.gap));
    if (style.rowGap) node.setGap(yoga.Gutter.Row, parseCSSValue(style.rowGap));
    if (style.columnGap) node.setGap(yoga.Gutter.Column, parseCSSValue(style.columnGap));
  }

  // Flex Item 속성
  if (style?.flex !== undefined) {
    node.setFlex(parseCSSValue(style.flex, 0));
  }
  if (style?.flexGrow !== undefined) {
    node.setFlexGrow(style.flexGrow);
  }
  if (style?.flexShrink !== undefined) {
    node.setFlexShrink(style.flexShrink);
  }
  if (style?.flexBasis !== undefined) {
    node.setFlexBasis(parseCSSValue(style.flexBasis));
  }
  if (style?.alignSelf) {
    node.setAlignSelf(toYogaAlign(yoga, style.alignSelf));
  }

  // Position
  if (style?.position === 'absolute') {
    node.setPositionType(yoga.PositionType.Absolute);
    if (style.left !== undefined) node.setPosition(yoga.Edge.Left, parseCSSValue(style.left));
    if (style.top !== undefined) node.setPosition(yoga.Edge.Top, parseCSSValue(style.top));
  }

  return node;
}

/**
 * 요소 트리를 Yoga 노드 트리로 변환
 */
function buildYogaTree(
  yoga: YogaInstance,
  elements: Element[],
  parentId: string,
  parentNode: YogaNode,
  parentWidth: number,
  parentHeight: number,
  nodeMap: Map<string, YogaNode>,
  visited: Set<string>
): void {
  const children = elements
    .filter((el) => el.parent_id === parentId)
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (visited.has(child.id)) {
      console.warn('[LayoutEngine] Cyclic reference detected:', child.id);
      continue;
    }

    visited.add(child.id);

    const childNode = createYogaNode(yoga, child, parentWidth, parentHeight);
    parentNode.insertChild(childNode, i);
    nodeMap.set(child.id, childNode);

    // 재귀적으로 자식 처리
    const style = child.props?.style as CSSStyle | undefined;
    const childWidth = parseCSSValue(style?.width, parentWidth);
    const childHeight = parseCSSValue(style?.height, 40);

    buildYogaTree(yoga, elements, child.id, childNode, childWidth, childHeight, nodeMap, visited);
  }
}

/**
 * Yoga 계산 결과에서 위치 추출
 */
function extractPositions(
  nodeMap: Map<string, YogaNode>,
  parentOffsets: Map<string, { x: number; y: number }>,
  elements: Element[]
): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>();

  for (const [elementId, node] of nodeMap) {
    const layout = node.getComputedLayout();
    const element = elements.find((el) => el.id === elementId);
    const parentId = element?.parent_id;

    // 부모의 절대 위치 가져오기
    const parentOffset = parentId ? parentOffsets.get(parentId) : { x: 0, y: 0 };
    const absoluteX = (parentOffset?.x || 0) + layout.left;
    const absoluteY = (parentOffset?.y || 0) + layout.top;

    positions.set(elementId, {
      x: absoluteX,
      y: absoluteY,
      width: layout.width,
      height: layout.height,
    });

    // 자식을 위해 이 요소의 절대 위치 저장
    parentOffsets.set(elementId, { x: absoluteX, y: absoluteY });
  }

  return positions;
}

// ============================================
// Main API
// ============================================

/**
 * 요소 트리의 레이아웃 계산 (Yoga 엔진 사용)
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

  // Yoga가 초기화되지 않았으면 빈 결과 반환
  if (!Yoga) {
    console.warn('[LayoutEngine] Yoga not initialized. Returning empty layout.');
    return { positions };
  }

  const yoga = getYoga();

  // 현재 페이지의 요소만 필터링
  const pageElements = elements.filter((el) => el.page_id === pageId);

  // Body 요소 찾기
  const bodyElement = pageElements.find((el) => el.tag.toLowerCase() === 'body');

  if (!bodyElement) {
    return { positions };
  }

  // Root Yoga 노드 생성
  const rootNode = yoga.Node.create();
  rootNode.setWidth(pageWidth);
  rootNode.setHeight(pageHeight);
  rootNode.setFlexDirection(yoga.FlexDirection.Column);

  // Body 스타일 적용
  const bodyStyle = bodyElement.props?.style as CSSStyle | undefined;
  if (bodyStyle?.display === 'flex') {
    rootNode.setFlexDirection(toYogaFlexDirection(yoga, bodyStyle.flexDirection));
    rootNode.setFlexWrap(toYogaWrap(yoga, bodyStyle.flexWrap));
    rootNode.setJustifyContent(toYogaJustify(yoga, bodyStyle.justifyContent));
    rootNode.setAlignItems(toYogaAlign(yoga, bodyStyle.alignItems));
    rootNode.setAlignContent(toYogaAlignContent(yoga, bodyStyle.alignContent));

    if (bodyStyle.gap) rootNode.setGap(yoga.Gutter.All, parseCSSValue(bodyStyle.gap));
  }

  // Padding 적용
  if (bodyStyle?.paddingTop) rootNode.setPadding(yoga.Edge.Top, parseCSSValue(bodyStyle.paddingTop));
  if (bodyStyle?.paddingRight) rootNode.setPadding(yoga.Edge.Right, parseCSSValue(bodyStyle.paddingRight));
  if (bodyStyle?.paddingBottom) rootNode.setPadding(yoga.Edge.Bottom, parseCSSValue(bodyStyle.paddingBottom));
  if (bodyStyle?.paddingLeft) rootNode.setPadding(yoga.Edge.Left, parseCSSValue(bodyStyle.paddingLeft));

  // 노드 맵 생성
  const nodeMap = new Map<string, YogaNode>();
  const visited = new Set<string>([bodyElement.id]);

  // Yoga 트리 구축
  buildYogaTree(yoga, pageElements, bodyElement.id, rootNode, pageWidth, pageHeight, nodeMap, visited);

  // 레이아웃 계산
  rootNode.calculateLayout(pageWidth, pageHeight, yoga.Direction.LTR);

  // Body 위치 설정
  positions.set(bodyElement.id, {
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
  });

  // 자식 요소 위치 추출
  const parentOffsets = new Map<string, { x: number; y: number }>();
  parentOffsets.set(bodyElement.id, { x: 0, y: 0 });

  const childPositions = extractPositions(nodeMap, parentOffsets, pageElements);
  for (const [id, pos] of childPositions) {
    positions.set(id, pos);
  }

  // Yoga 노드 정리 (메모리 해제)
  rootNode.freeRecursive();

  return { positions };
}

// ============================================
// Utility Exports
// ============================================

/**
 * Element가 Flex 컨테이너인지 확인
 */
export function isFlexContainer(element: Element): boolean {
  const style = element.props?.style as CSSStyle | undefined;
  return style?.display === 'flex';
}

export default calculateLayout;
