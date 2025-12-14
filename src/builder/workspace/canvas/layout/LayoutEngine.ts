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
import { parsePadding } from '../sprites/paddingUtils';

// yoga-layout v3.2.1: enums are directly exported from 'yoga-layout/load'
import {
  FlexDirection,
  Wrap,
  Justify,
  Align,
  Edge,
  Gutter,
  Direction,
  PositionType,
} from 'yoga-layout/load';

// @pixi/layout requires yoga instance to be set via setYoga()
import { setYoga } from '@pixi/layout';

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
  padding?: string | number;  // shorthand: "20px" or "10px 20px" etc.
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
// yoga-layout v3.2.1: loadYoga() is exported from 'yoga-layout/load'
type YogaInstance = Awaited<ReturnType<typeof import('yoga-layout/load').loadYoga>>;
type YogaNode = ReturnType<YogaInstance['Node']['create']>;

// ============================================
// Yoga Instance Management
// ============================================

let Yoga: YogaInstance | null = null;
let yogaLoadPromise: Promise<YogaInstance> | null = null;

/**
 * Yoga 엔진 초기화 (싱글톤)
 * yoga-layout v3.2.1: loadYoga() must be imported from 'yoga-layout/load'
 *
 * Also sets the yoga instance for @pixi/layout via setYoga()
 */
export async function initYoga(): Promise<YogaInstance> {
  if (Yoga) return Yoga;

  if (!yogaLoadPromise) {
    yogaLoadPromise = import('yoga-layout/load')
      .then(async (module) => {
        // yoga-layout v3.2.1: loadYoga() returns the Yoga instance
        const yogaInstance = await module.loadYoga();
        Yoga = yogaInstance;

        // Set yoga instance for @pixi/layout
        // This is required for LayoutText, LayoutContainer to work
        setYoga(yogaInstance);

        console.log('[LayoutEngine] Yoga initialized successfully (also set for @pixi/layout)');
        return yogaInstance;
      })
      .catch((error) => {
        console.error('[LayoutEngine] Failed to initialize Yoga:', error);
        yogaLoadPromise = null; // Reset so it can be retried
        throw error;
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
 * CSS 값이 퍼센트 단위인지 확인
 */
function isPercentValue(value: unknown): boolean {
  return typeof value === 'string' && value.trim().endsWith('%');
}

/**
 * CSS 값 파싱 (px, %, 숫자 등)
 * 퍼센트 값도 숫자로 반환 (50% → 50)
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
 * 크기 값 설정 (px 또는 % 단위 지원)
 */
function setNodeSize(
  node: YogaNode,
  dimension: 'width' | 'height',
  value: unknown
): void {
  if (value === undefined || value === null || value === '' || value === 'auto') {
    return;
  }

  const numValue = parseCSSValue(value, 0);
  if (numValue <= 0) return;

  if (isPercentValue(value)) {
    // 퍼센트 값
    if (dimension === 'width') {
      node.setWidthPercent(numValue);
    } else {
      node.setHeightPercent(numValue);
    }
  } else {
    // 픽셀 값
    if (dimension === 'width') {
      node.setWidth(numValue);
    } else {
      node.setHeight(numValue);
    }
  }
}

/**
 * Min/Max 크기 값 설정 (px 또는 % 단위 지원)
 */
function setNodeMinMaxSize(
  node: YogaNode,
  type: 'minWidth' | 'minHeight' | 'maxWidth' | 'maxHeight',
  value: unknown
): void {
  if (value === undefined || value === null || value === '') {
    return;
  }

  const numValue = parseCSSValue(value, 0);
  if (numValue <= 0) return;

  const isPercent = isPercentValue(value);

  switch (type) {
    case 'minWidth':
      isPercent ? node.setMinWidthPercent(numValue) : node.setMinWidth(numValue);
      break;
    case 'minHeight':
      isPercent ? node.setMinHeightPercent(numValue) : node.setMinHeight(numValue);
      break;
    case 'maxWidth':
      isPercent ? node.setMaxWidthPercent(numValue) : node.setMaxWidth(numValue);
      break;
    case 'maxHeight':
      isPercent ? node.setMaxHeightPercent(numValue) : node.setMaxHeight(numValue);
      break;
  }
}

/**
 * CSS flexDirection을 Yoga FlexDirection으로 변환
 */
function toYogaFlexDirection(value: string | undefined): FlexDirection {
  switch (value) {
    case 'row': return FlexDirection.Row;
    case 'row-reverse': return FlexDirection.RowReverse;
    case 'column': return FlexDirection.Column;
    case 'column-reverse': return FlexDirection.ColumnReverse;
    default: return FlexDirection.Row;
  }
}

/**
 * CSS flexWrap을 Yoga Wrap으로 변환
 */
function toYogaWrap(value: string | undefined): Wrap {
  switch (value) {
    case 'wrap': return Wrap.Wrap;
    case 'wrap-reverse': return Wrap.WrapReverse;
    case 'nowrap':
    default: return Wrap.NoWrap;
  }
}

/**
 * CSS justifyContent를 Yoga Justify로 변환
 */
function toYogaJustify(value: string | undefined): Justify {
  switch (value) {
    case 'flex-start': return Justify.FlexStart;
    case 'flex-end': return Justify.FlexEnd;
    case 'center': return Justify.Center;
    case 'space-between': return Justify.SpaceBetween;
    case 'space-around': return Justify.SpaceAround;
    case 'space-evenly': return Justify.SpaceEvenly;
    default: return Justify.FlexStart;
  }
}

/**
 * CSS alignItems를 Yoga Align으로 변환
 */
function toYogaAlign(value: string | undefined): Align {
  switch (value) {
    case 'flex-start': return Align.FlexStart;
    case 'flex-end': return Align.FlexEnd;
    case 'center': return Align.Center;
    case 'stretch': return Align.Stretch;
    case 'baseline': return Align.Baseline;
    default: return Align.Stretch;
  }
}

/**
 * CSS alignContent를 Yoga Align으로 변환
 */
function toYogaAlignContent(value: string | undefined): Align {
  switch (value) {
    case 'flex-start': return Align.FlexStart;
    case 'flex-end': return Align.FlexEnd;
    case 'center': return Align.Center;
    case 'stretch': return Align.Stretch;
    case 'space-between': return Align.SpaceBetween;
    case 'space-around': return Align.SpaceAround;
    default: return Align.Stretch;
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
  element: Element
): YogaNode {
  const node = yoga.Node.create();
  const style = element.props?.style as CSSStyle | undefined;

  // 크기 설정 (px 및 % 단위 지원)
  setNodeSize(node, 'width', style?.width);
  setNodeSize(node, 'height', style?.height);

  // Min/Max 크기 (px 및 % 단위 지원)
  setNodeMinMaxSize(node, 'minWidth', style?.minWidth);
  setNodeMinMaxSize(node, 'minHeight', style?.minHeight);
  setNodeMinMaxSize(node, 'maxWidth', style?.maxWidth);
  setNodeMinMaxSize(node, 'maxHeight', style?.maxHeight);

  // Margin
  if (style?.marginTop) node.setMargin(Edge.Top, parseCSSValue(style.marginTop));
  if (style?.marginRight) node.setMargin(Edge.Right, parseCSSValue(style.marginRight));
  if (style?.marginBottom) node.setMargin(Edge.Bottom, parseCSSValue(style.marginBottom));
  if (style?.marginLeft) node.setMargin(Edge.Left, parseCSSValue(style.marginLeft));

  // Padding (shorthand + 개별 값 모두 지원)
  const padding = parsePadding(style as import('../sprites/styleConverter').CSSStyle | undefined);
  if (padding.top > 0) node.setPadding(Edge.Top, padding.top);
  if (padding.right > 0) node.setPadding(Edge.Right, padding.right);
  if (padding.bottom > 0) node.setPadding(Edge.Bottom, padding.bottom);
  if (padding.left > 0) node.setPadding(Edge.Left, padding.left);

  // Flexbox Container 속성
  if (style?.display === 'flex') {
    node.setFlexDirection(toYogaFlexDirection(style.flexDirection));
    node.setFlexWrap(toYogaWrap(style.flexWrap));
    node.setJustifyContent(toYogaJustify(style.justifyContent));
    node.setAlignItems(toYogaAlign(style.alignItems));
    node.setAlignContent(toYogaAlignContent(style.alignContent));

    // Gap
    if (style.gap) node.setGap(Gutter.All, parseCSSValue(style.gap));
    if (style.rowGap) node.setGap(Gutter.Row, parseCSSValue(style.rowGap));
    if (style.columnGap) node.setGap(Gutter.Column, parseCSSValue(style.columnGap));
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
    node.setAlignSelf(toYogaAlign(style.alignSelf));
  }

  // Position
  if (style?.position === 'absolute') {
    node.setPositionType(PositionType.Absolute);
    if (style.left !== undefined) node.setPosition(Edge.Left, parseCSSValue(style.left));
    if (style.top !== undefined) node.setPosition(Edge.Top, parseCSSValue(style.top));
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

    const childNode = createYogaNode(yoga, child);
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

  // Yoga.Node가 존재하는지 확인
  if (!yoga.Node) {
    console.error('[LayoutEngine] Yoga.Node is not available');
    return { positions };
  }

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
  rootNode.setFlexDirection(FlexDirection.Column);

  // Body 스타일 적용
  const bodyStyle = bodyElement.props?.style as CSSStyle | undefined;
  if (bodyStyle?.display === 'flex') {
    rootNode.setFlexDirection(toYogaFlexDirection(bodyStyle.flexDirection));
    rootNode.setFlexWrap(toYogaWrap(bodyStyle.flexWrap));
    rootNode.setJustifyContent(toYogaJustify(bodyStyle.justifyContent));
    rootNode.setAlignItems(toYogaAlign(bodyStyle.alignItems));
    rootNode.setAlignContent(toYogaAlignContent(bodyStyle.alignContent));

    if (bodyStyle.gap) rootNode.setGap(Gutter.All, parseCSSValue(bodyStyle.gap));
  }

  // Padding 적용 (shorthand + 개별 값 모두 지원)
  const bodyPadding = parsePadding(bodyStyle as import('../sprites/styleConverter').CSSStyle | undefined);
  if (bodyPadding.top > 0) rootNode.setPadding(Edge.Top, bodyPadding.top);
  if (bodyPadding.right > 0) rootNode.setPadding(Edge.Right, bodyPadding.right);
  if (bodyPadding.bottom > 0) rootNode.setPadding(Edge.Bottom, bodyPadding.bottom);
  if (bodyPadding.left > 0) rootNode.setPadding(Edge.Left, bodyPadding.left);

  // 노드 맵 생성
  const nodeMap = new Map<string, YogaNode>();
  const visited = new Set<string>([bodyElement.id]);

  // Yoga 트리 구축
  buildYogaTree(yoga, pageElements, bodyElement.id, rootNode, pageWidth, pageHeight, nodeMap, visited);

  // 레이아웃 계산
  rootNode.calculateLayout(pageWidth, pageHeight, Direction.LTR);

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
