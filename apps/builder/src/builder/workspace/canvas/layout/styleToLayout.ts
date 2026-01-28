/**
 * Style to Layout Converter
 *
 * 🚀 Phase 4: @pixi/layout 마이그레이션
 *
 * Element의 CSS style을 @pixi/layout의 layout prop으로 변환합니다.
 *
 * @since 2025-01-06 Phase 4
 */

import type { Element } from '../../../../types/core/store.types';

// ============================================
// Types
// ============================================

/**
 * @pixi/layout layout prop 타입
 * CSS Flexbox 속성과 유사한 구조
 */
export interface LayoutStyle {
  // Display (@pixi/layout 지원)
  display?: 'flex' | 'block' | 'none';

  // Dimensions
  width?: number | string;
  height?: number | string;
  minWidth?: number | string;
  minHeight?: number | string;
  maxWidth?: number | string;
  maxHeight?: number | string;

  // Position
  position?: 'relative' | 'absolute';
  top?: number | string;
  left?: number | string;
  right?: number | string;
  bottom?: number | string;

  // Flexbox Container
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  justifyContent?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  alignContent?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around';

  // Flexbox Item
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | string;
  alignSelf?: 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';

  // Spacing
  gap?: number | string;
  rowGap?: number | string;
  columnGap?: number | string;
  margin?: number | string;
  marginTop?: number | string;
  marginRight?: number | string;
  marginBottom?: number | string;
  marginLeft?: number | string;
  padding?: number | string;
  paddingTop?: number | string;
  paddingRight?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;

  // Border (@pixi/layout 지원)
  borderWidth?: number;
  borderTopWidth?: number;
  borderRightWidth?: number;
  borderBottomWidth?: number;
  borderLeftWidth?: number;
  borderRadius?: number;
  borderColor?: string | number;

  // Visual (@pixi/layout 지원)
  backgroundColor?: string | number;
}

// ============================================
// Types for @pixi/layout
// ============================================

/**
 * @pixi/layout NumberValue 타입
 * - number: 픽셀 값
 * - `${number}%`: 퍼센트 값
 * - `${number}`: 숫자 문자열
 */
export type LayoutNumberValue = number | `${number}%` | `${number}`;

// ============================================
// CSS Value Parsing
// ============================================

/**
 * CSS 값을 숫자로 파싱 (px, % 등)
 */
export function parseCSSValue(value: unknown): number | string | undefined {
  if (value === undefined || value === null || value === '' || value === 'auto') {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    // 퍼센트 값은 문자열로 유지
    if (value.endsWith('%')) {
      return value;
    }
    // px 값은 숫자로 변환
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }

  return undefined;
}

/**
 * 🚀 Phase 8: CSS 값을 @pixi/layout NumberValue로 변환
 *
 * - number: 그대로 반환
 * - '100%' 형식: 그대로 반환 (LayoutNumberValue 호환)
 * - '100px' 형식: 숫자로 변환
 * - 기타 문자열: fallback 반환
 * - undefined/null: fallback 반환
 *
 * @param value - CSS 값 (number | string | undefined)
 * @param fallback - 기본값
 * @returns @pixi/layout 호환 NumberValue
 */
export function toLayoutSize(
  value: number | string | undefined | null,
  fallback: number
): LayoutNumberValue {
  if (value === undefined || value === null || value === '' || value === 'auto') {
    return fallback;
  }

  if (typeof value === 'number') {
    return value;
  }

  // 퍼센트 값 ('50%', '100%' 등)
  if (typeof value === 'string' && /^\d+(\.\d+)?%$/.test(value)) {
    return value as `${number}%`;
  }

  // 숫자 문자열 ('100', '50.5' 등)
  if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) {
    return parseFloat(value);
  }

  // px 값 ('100px', '50.5px' 등)
  if (typeof value === 'string' && /^\d+(\.\d+)?px$/.test(value)) {
    return parseFloat(value);
  }

  return fallback;
}

/**
 * flex 단축 속성 파싱
 * flex: "1" | "1 0 auto" | "none" 등
 */
function parseFlexShorthand(flex: string | number): {
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: number | string;
} {
  if (typeof flex === 'number') {
    return { flexGrow: flex };
  }

  if (flex === 'none') {
    return { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' };
  }

  if (flex === 'auto') {
    return { flexGrow: 1, flexShrink: 1, flexBasis: 'auto' };
  }

  const parts = flex.split(/\s+/);
  const result: { flexGrow?: number; flexShrink?: number; flexBasis?: number | string } = {};

  if (parts[0]) {
    result.flexGrow = parseFloat(parts[0]) || 0;
  }
  if (parts[1]) {
    result.flexShrink = parseFloat(parts[1]) || 1;
  }
  if (parts[2]) {
    result.flexBasis = parseCSSValue(parts[2]);
  }

  return result;
}

// ============================================
// Main Converter
// ============================================

/**
 * Element의 style을 @pixi/layout layout prop으로 변환
 *
 * @param element - Element 객체
 * @returns layout prop 객체
 */
export function styleToLayout(element: Element): LayoutStyle {
  const style = (element.props?.style || {}) as Record<string, unknown>;
  const layout: LayoutStyle = {};

  // Dimensions
  const width = parseCSSValue(style.width);
  const height = parseCSSValue(style.height);
  if (width !== undefined) layout.width = width;
  if (height !== undefined) layout.height = height;

  const minWidth = parseCSSValue(style.minWidth);
  const minHeight = parseCSSValue(style.minHeight);
  const maxWidth = parseCSSValue(style.maxWidth);
  const maxHeight = parseCSSValue(style.maxHeight);
  if (minWidth !== undefined) layout.minWidth = minWidth;
  if (minHeight !== undefined) layout.minHeight = minHeight;
  if (maxWidth !== undefined) layout.maxWidth = maxWidth;
  if (maxHeight !== undefined) layout.maxHeight = maxHeight;

  // Position
  // position: 'absolute'가 명시적으로 지정된 경우에만 absolute 처리
  // 그 외에는 모두 flexbox 아이템으로 자동 배치
  if (style.position === 'absolute') {
    layout.position = 'absolute';
    const top = parseCSSValue(style.top);
    const left = parseCSSValue(style.left);
    const right = parseCSSValue(style.right);
    const bottom = parseCSSValue(style.bottom);
    if (top !== undefined) layout.top = top;
    if (left !== undefined) layout.left = left;
    if (right !== undefined) layout.right = right;
    if (bottom !== undefined) layout.bottom = bottom;
  }

  // Display
  // @pixi/layout은 display: 'flex', 'block', 'none' 지원
  if (style.display === 'flex' || style.display === 'inline-flex') {
    layout.display = 'flex';
    // CSS flex의 기본 flexDirection은 'row'
    layout.flexDirection = (style.flexDirection as LayoutStyle['flexDirection']) ?? 'row';
  }

  // Flexbox Container
  // @pixi/layout에서는 display: 'flex' 없이도 flexbox 속성이 적용됨
  // flexDirection, gap 등이 있으면 자동으로 flex 컨테이너로 동작
  if (style.flexDirection) {
    layout.flexDirection = style.flexDirection as LayoutStyle['flexDirection'];
  }
  if (style.flexWrap) {
    layout.flexWrap = style.flexWrap as LayoutStyle['flexWrap'];
  }
  if (style.justifyContent) {
    layout.justifyContent = style.justifyContent as LayoutStyle['justifyContent'];
  }
  if (style.alignItems) {
    layout.alignItems = style.alignItems as LayoutStyle['alignItems'];
  }
  if (style.alignContent) {
    layout.alignContent = style.alignContent as LayoutStyle['alignContent'];
  }

  // Flexbox Item
  if (style.flex !== undefined) {
    const flexProps = parseFlexShorthand(style.flex as string | number);
    Object.assign(layout, flexProps);
  } else {
    if (style.flexGrow !== undefined) layout.flexGrow = Number(style.flexGrow);
    if (style.flexShrink !== undefined) layout.flexShrink = Number(style.flexShrink);
    if (style.flexBasis !== undefined) layout.flexBasis = parseCSSValue(style.flexBasis);
  }
  if (style.alignSelf) {
    layout.alignSelf = style.alignSelf as LayoutStyle['alignSelf'];
  }

  // Gap
  const gap = parseCSSValue(style.gap);
  const rowGap = parseCSSValue(style.rowGap);
  const columnGap = parseCSSValue(style.columnGap);
  if (gap !== undefined) layout.gap = gap;
  if (rowGap !== undefined) layout.rowGap = rowGap;
  if (columnGap !== undefined) layout.columnGap = columnGap;

  // Margin
  const margin = parseCSSValue(style.margin);
  if (margin !== undefined) layout.margin = margin;
  const marginTop = parseCSSValue(style.marginTop);
  const marginRight = parseCSSValue(style.marginRight);
  const marginBottom = parseCSSValue(style.marginBottom);
  const marginLeft = parseCSSValue(style.marginLeft);
  if (marginTop !== undefined) layout.marginTop = marginTop;
  if (marginRight !== undefined) layout.marginRight = marginRight;
  if (marginBottom !== undefined) layout.marginBottom = marginBottom;
  if (marginLeft !== undefined) layout.marginLeft = marginLeft;

  // Padding
  const padding = parseCSSValue(style.padding);
  if (padding !== undefined) layout.padding = padding;
  const paddingTop = parseCSSValue(style.paddingTop);
  const paddingRight = parseCSSValue(style.paddingRight);
  const paddingBottom = parseCSSValue(style.paddingBottom);
  const paddingLeft = parseCSSValue(style.paddingLeft);
  if (paddingTop !== undefined) layout.paddingTop = paddingTop;
  if (paddingRight !== undefined) layout.paddingRight = paddingRight;
  if (paddingBottom !== undefined) layout.paddingBottom = paddingBottom;
  if (paddingLeft !== undefined) layout.paddingLeft = paddingLeft;

  // Border (@pixi/layout 지원)
  const borderWidth = parseCSSValue(style.borderWidth);
  if (typeof borderWidth === 'number') layout.borderWidth = borderWidth;
  const borderTopWidth = parseCSSValue(style.borderTopWidth);
  const borderRightWidth = parseCSSValue(style.borderRightWidth);
  const borderBottomWidth = parseCSSValue(style.borderBottomWidth);
  const borderLeftWidth = parseCSSValue(style.borderLeftWidth);
  if (typeof borderTopWidth === 'number') layout.borderTopWidth = borderTopWidth;
  if (typeof borderRightWidth === 'number') layout.borderRightWidth = borderRightWidth;
  if (typeof borderBottomWidth === 'number') layout.borderBottomWidth = borderBottomWidth;
  if (typeof borderLeftWidth === 'number') layout.borderLeftWidth = borderLeftWidth;

  const borderRadius = parseCSSValue(style.borderRadius);
  if (typeof borderRadius === 'number') layout.borderRadius = borderRadius;

  // borderColor는 CSS 색상 문자열 또는 숫자(hex)
  if (style.borderColor !== undefined && style.borderColor !== null) {
    layout.borderColor = style.borderColor as string | number;
  }

  // Visual (@pixi/layout 지원)
  if (style.backgroundColor !== undefined && style.backgroundColor !== null) {
    layout.backgroundColor = style.backgroundColor as string | number;
  }

  return layout;
}

/**
 * 빈 layout 객체인지 확인
 */
export function isEmptyLayout(layout: LayoutStyle): boolean {
  return Object.keys(layout).length === 0;
}

export default styleToLayout;
