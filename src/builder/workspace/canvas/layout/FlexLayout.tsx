/**
 * Flex Layout
 *
 * 🚀 Phase 11 B2.2: @pixi/layout 기반 Flexbox 레이아웃
 *
 * @pixi/layout의 Yoga 엔진을 사용하여 CSS Flexbox 스타일 레이아웃을 지원합니다.
 *
 * @since 2025-12-11 Phase 11 B2.2
 */

import { memo, useMemo } from 'react';
import type { Element } from '../../../../types/core/store.types';
import type { CSSStyle } from '../sprites/styleConverter';

// ============================================
// Types
// ============================================

/**
 * Flexbox CSS 스타일 속성
 */
export interface FlexStyle {
  display?: 'flex' | 'block' | 'none';
  flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  alignContent?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around';
  gap?: number | string;
  rowGap?: number | string;
  columnGap?: number | string;
  flex?: number | string;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | string;
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
}

/**
 * @pixi/layout 호환 레이아웃 설정
 */
export interface PixiLayoutConfig {
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  minHeight?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;
  padding?: number | string;
  paddingTop?: number | string;
  paddingRight?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  margin?: number | string;
  marginTop?: number | string;
  marginRight?: number | string;
  marginBottom?: number | string;
  marginLeft?: number | string;
  flexDirection?: 'row' | 'row-reverse' | 'column' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  alignContent?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around';
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  gap?: number;
  rowGap?: number;
  columnGap?: number;
  flex?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | string;
  position?: 'relative' | 'absolute';
  top?: number | string;
  right?: number | string;
  bottom?: number | string;
  left?: number | string;
}

export interface FlexLayoutProps {
  element: Element;
  isSelected?: boolean;
  children?: React.ReactNode;
}

// ============================================
// Utility Functions
// ============================================

/**
 * CSS gap 값을 숫자로 파싱
 */
function parseGap(value: number | string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  if (value.endsWith('px')) return parseFloat(value);
  return parseFloat(value) || undefined;
}

/**
 * Element가 Flex 컨테이너인지 확인
 */
export function isFlexContainer(element: Element): boolean {
  const style = element.props?.style as CSSStyle | undefined;
  return style?.display === 'flex';
}

/**
 * CSS 스타일을 @pixi/layout 설정으로 변환
 */
export function convertToPixiLayout(style: CSSStyle | FlexStyle | undefined): PixiLayoutConfig | true {
  if (!style) return true;

  const flexStyle = style as FlexStyle;

  // Flex가 아닌 경우 기본 layout만 활성화
  if (flexStyle.display !== 'flex') {
    return true;
  }

  const layout: PixiLayoutConfig = {};

  // 크기 설정
  if (style.width !== undefined) layout.width = style.width;
  if (style.height !== undefined) layout.height = style.height;

  // Flex 방향
  if (flexStyle.flexDirection) layout.flexDirection = flexStyle.flexDirection;
  if (flexStyle.flexWrap) layout.flexWrap = flexStyle.flexWrap;

  // 정렬
  if (flexStyle.justifyContent) layout.justifyContent = flexStyle.justifyContent;
  if (flexStyle.alignItems) layout.alignItems = flexStyle.alignItems;
  if (flexStyle.alignContent) layout.alignContent = flexStyle.alignContent;
  if (flexStyle.alignSelf) layout.alignSelf = flexStyle.alignSelf;

  // Gap
  const gap = parseGap(flexStyle.gap);
  if (gap !== undefined) layout.gap = gap;

  const rowGap = parseGap(flexStyle.rowGap);
  if (rowGap !== undefined) layout.rowGap = rowGap;

  const columnGap = parseGap(flexStyle.columnGap);
  if (columnGap !== undefined) layout.columnGap = columnGap;

  // Flex 아이템 속성
  if (flexStyle.flex !== undefined) {
    layout.flex = typeof flexStyle.flex === 'string' ? parseFloat(flexStyle.flex) : flexStyle.flex;
  }
  if (flexStyle.flexGrow !== undefined) layout.flexGrow = flexStyle.flexGrow;
  if (flexStyle.flexShrink !== undefined) layout.flexShrink = flexStyle.flexShrink;
  if (flexStyle.flexBasis !== undefined) layout.flexBasis = flexStyle.flexBasis;

  // 패딩
  if (style.padding !== undefined) layout.padding = style.padding;
  if (style.paddingTop !== undefined) layout.paddingTop = style.paddingTop;
  if (style.paddingRight !== undefined) layout.paddingRight = style.paddingRight;
  if (style.paddingBottom !== undefined) layout.paddingBottom = style.paddingBottom;
  if (style.paddingLeft !== undefined) layout.paddingLeft = style.paddingLeft;

  // 위치 (absolute positioning)
  if (style.left !== undefined) layout.left = style.left;
  if (style.top !== undefined) layout.top = style.top;

  return layout;
}

/**
 * 자식 요소의 Flex 아이템 레이아웃 설정 추출
 */
export function getFlexItemLayout(style: CSSStyle | FlexStyle | undefined): PixiLayoutConfig | true {
  if (!style) return true;

  const flexStyle = style as FlexStyle;
  const layout: PixiLayoutConfig = {};

  // 크기
  if (style.width !== undefined) layout.width = style.width;
  if (style.height !== undefined) layout.height = style.height;

  // Flex 아이템 속성
  if (flexStyle.flex !== undefined) {
    layout.flex = typeof flexStyle.flex === 'string' ? parseFloat(flexStyle.flex) : flexStyle.flex;
  }
  if (flexStyle.flexGrow !== undefined) layout.flexGrow = flexStyle.flexGrow;
  if (flexStyle.flexShrink !== undefined) layout.flexShrink = flexStyle.flexShrink;
  if (flexStyle.flexBasis !== undefined) layout.flexBasis = flexStyle.flexBasis;
  if (flexStyle.alignSelf !== undefined) layout.alignSelf = flexStyle.alignSelf;

  // 마진
  if (style.marginTop !== undefined) layout.marginTop = style.marginTop;
  if (style.marginRight !== undefined) layout.marginRight = style.marginRight;
  if (style.marginBottom !== undefined) layout.marginBottom = style.marginBottom;
  if (style.marginLeft !== undefined) layout.marginLeft = style.marginLeft;

  return Object.keys(layout).length > 0 ? layout : true;
}

// ============================================
// Components
// ============================================

/**
 * FlexLayout 컨테이너
 *
 * @pixi/layout을 사용하여 Flexbox 레이아웃을 렌더링합니다.
 *
 * @example
 * <FlexLayout element={flexContainerElement}>
 *   <ElementSprite element={childElement} />
 * </FlexLayout>
 */
export const FlexLayout = memo(function FlexLayout({
  element,
  children,
}: FlexLayoutProps) {
  const style = element.props?.style as CSSStyle | undefined;

  // @pixi/layout 설정 변환
  const layoutConfig = useMemo(() => {
    return convertToPixiLayout(style);
  }, [style]);

  // 위치 계산
  const position = useMemo(() => {
    const left = typeof style?.left === 'number' ? style.left :
      typeof style?.left === 'string' ? parseFloat(style.left) : 0;
    const top = typeof style?.top === 'number' ? style.top :
      typeof style?.top === 'string' ? parseFloat(style.top) : 0;
    return { x: left, y: top };
  }, [style?.left, style?.top]);

  // Container에 layout 속성 전달
  // @pixi/layout이 import되면 Container에 layout prop이 추가됨
  return (
    <pixiContainer
      x={position.x}
      y={position.y}
      // @ts-expect-error - @pixi/layout extends Container with layout prop
      layout={layoutConfig}
    >
      {children}
    </pixiContainer>
  );
});

export default FlexLayout;
