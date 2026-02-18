/**
 * Style to Layout Converter
 *
 * Element의 CSS style을 레이아웃 엔진용 LayoutStyle 객체로 변환합니다.
 *
 * @note Phase 11에서 @pixi/layout(Yoga)이 제거됨. 현재 이 모듈은
 * TaffyFlexEngine의 스타일 파싱과 useLayoutValues 훅에서 사용됨.
 *
 * @since 2025-01-06 Phase 4
 * @updated 2026-02-18 Phase 11 - @pixi/layout 제거 완료, 엔진 전용으로 유지
 */

import type { Element } from '../../../../types/core/store.types';
import { getBadgeSizePreset } from '../utils/cssVariableReader';
import { calculateContentHeight, measureTextWidth as measureTextWidthFull } from './engines/utils';
import { measureWrappedTextHeight } from '../utils/textMeasure';
import { resolveCSSSizeValue } from './engines/cssValueParser';
import type { ComputedStyle } from './engines/cssResolver';
// CHECKBOX_BOX_SIZES는 INDICATOR_SIZES로 인라인 처리됨

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
// Badge Text Measurement
// ============================================

/** Canvas 2D 측정 컨텍스트 (싱글톤) */
let badgeMeasureCanvas: HTMLCanvasElement | null = null;
let badgeMeasureContext: CanvasRenderingContext2D | null = null;

/**
 * Badge 텍스트 너비 측정
 *
 * PixiBadge의 measureTextSize와 동일한 결과를 반환하기 위해
 * Canvas 2D measureText 사용
 */
function measureBadgeTextWidth(text: string, fontSize: number): number {
  if (!text) return 0;

  if (!badgeMeasureContext) {
    badgeMeasureCanvas = document.createElement('canvas');
    badgeMeasureContext = badgeMeasureCanvas.getContext('2d');
  }

  if (!badgeMeasureContext) {
    // Canvas 미지원 환경: 추정값 사용
    return text.length * (fontSize * 0.6);
  }

  // PixiBadge와 동일한 폰트 설정
  const fontFamily = 'Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif';
  badgeMeasureContext.font = `${fontSize}px ${fontFamily}`;
  return badgeMeasureContext.measureText(text).width;
}

/** 일반 텍스트 폭 측정 (Checkbox 라벨 등) */
function measureTextWidth(text: string, fontSize: number): number {
  return measureBadgeTextWidth(text, fontSize);
}

// ============================================
// CSS Value Parsing
// ============================================

/**
 * CSS 값을 숫자로 파싱 (px, %, vh, vw, em, rem, calc 등)
 *
 * 내부적으로 resolveCSSSizeValue()에 위임하되, Yoga 호환을 위해:
 * - %: 문자열로 유지 (@pixi/layout이 직접 처리)
 * - vh/vw: % 문자열로 변환 (@pixi/layout이 부모 기준으로 처리)
 *   빌더에서는 viewport = 페이지 = body이므로 vw/vh를 %로 변환하면
 *   Yoga가 부모의 padding/border를 고려하여 content area 기준으로 계산
 * - px, rem, em, calc: 숫자로 변환
 */
export function parseCSSValue(
  value: unknown,
  parentFontSize?: number,
): number | string | undefined {
  if (value === undefined || value === null || value === '' || value === 'auto') {
    return undefined;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    // 퍼센트 값은 문자열로 유지 (@pixi/layout이 Yoga를 통해 처리)
    if (value.endsWith('%')) {
      return value;
    }
    // vh 단위: % 문자열로 변환 (Yoga가 부모 기준으로 처리)
    // 빌더에서 viewport height ≈ body height이므로 Xvh → "X%" 변환
    if (value.endsWith('vh')) {
      return `${parseFloat(value)}%`;
    }
    // vw 단위: % 문자열로 변환 (Yoga가 부모 기준으로 처리)
    // 빌더에서 viewport width ≈ body width이므로 Xvw → "X%" 변환
    if (value.endsWith('vw')) {
      return `${parseFloat(value)}%`;
    }

    // 나머지 단위(px, rem, em, calc 등)는 통합 파서에 위임
    // S4: parentFontSize가 있으면 em 단위 해석에 활용
    return resolveCSSSizeValue(value, {
      parentSize: parentFontSize,
    });
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
 * @param viewport - 뷰포트 크기 (vh/vw 단위 변환용, 선택사항)
 * @returns layout prop 객체
 */
export function styleToLayout(
  element: Element,
  computedStyle?: ComputedStyle,
): LayoutStyle {
  const style = (element.props?.style || {}) as Record<string, unknown>;
  const layout: LayoutStyle = {};

  // S4: computedStyle이 제공되면 상속된 fontSize를 em 해석에 활용
  const parentFontSize = computedStyle?.fontSize;
  const parse = (value: unknown) => parseCSSValue(value, parentFontSize);

  // Dimensions
  // 🚀 @pixi/layout의 formatStyles가 이전 스타일과 병합하므로,
  // width/height가 없을 때 명시적으로 'auto'를 설정해야 이전 값이 리셋됨
  const widthRaw = style.width as string | undefined;
  const heightRaw = style.height as string | undefined;
  const isFitContentWidth = widthRaw === 'fit-content';
  const isFitContentHeight = heightRaw === 'fit-content';
  const width = parse(style.width);
  const height = parse(style.height);
  layout.width = width !== undefined ? width : 'auto';
  layout.height = height !== undefined ? height : 'auto';

  // 🚀 fit-content: Yoga가 네이티브 지원하지 않으므로 워크어라운드 적용
  // FIT_CONTENT sentinel(-2)이 Yoga에 직접 전달되면 잘못된 레이아웃이 발생
  // → 'auto'로 리셋하고, 리프 노드는 아래에서 명시적 크기 계산
  if (isFitContentWidth) {
    layout.width = 'auto';
    if (layout.flexGrow === undefined) layout.flexGrow = 0;
    if (layout.flexShrink === undefined) layout.flexShrink = 0;
  }
  if (isFitContentHeight) {
    layout.height = 'auto';
  }

  // 🚀 태그별 기본 스타일 처리
  const tag = element.tag?.toLowerCase() ?? '';
  const props = element.props as Record<string, unknown> | undefined;

  // 🚀 ToggleButtonGroup: 기본 display: flex, flexDirection, alignItems 설정
  // CSS 기본값: display: flex, flex-direction: row, align-items: center
  const isToggleButtonGroup = tag === 'togglebuttongroup';
  if (isToggleButtonGroup) {
    // display가 명시적으로 설정되지 않았으면 flex 기본값 적용
    if (!style.display) {
      layout.display = 'flex';
    }
    // flexDirection이 명시적으로 설정되지 않았으면 orientation에 따라 설정
    if (!style.flexDirection) {
      const orientation = String(props?.orientation || 'horizontal');
      layout.flexDirection = orientation === 'vertical' ? 'column' : 'row';
    }
    // alignItems가 명시적으로 설정되지 않았으면 center (자식이 부모 높이로 늘어나지 않도록)
    if (!style.alignItems) {
      layout.alignItems = 'center';
    }
    // CSS 기본값: width: fit-content (horizontal/vertical 모두)
    // width 미지정 시 CSS 스타일시트의 fit-content를 Yoga 워크어라운드로 적용
    // ⚠️ alignSelf는 설정하지 않음 — 부모의 align-items가 교차축 정렬을 결정해야 함
    // (CSS에서 width: fit-content와 align-self는 독립적 속성)
    if (width === undefined && !isFitContentWidth) {
      layout.flexGrow = 0;
      layout.flexShrink = 0;
    }
  }

  // 🚀 TagGroup: 기본 flex column 레이아웃 (Label + TagList 수직 배치)
  const isTagGroup = tag === 'taggroup';
  if (isTagGroup) {
    if (!style.display) layout.display = 'flex';
    if (!style.flexDirection) layout.flexDirection = 'column';
  }

  // 🚀 TagList: 기본 flex row wrap 레이아웃 (Tags 가로 배치)
  const isTagList = tag === 'taglist';
  if (isTagList) {
    if (!style.display) layout.display = 'flex';
    if (!style.flexDirection) layout.flexDirection = 'row';
    if (!style.flexWrap) layout.flexWrap = 'wrap';
  }

  // 🚀 Label: Yoga 리프 노드이므로 고유 크기를 명시적으로 제공해야 함
  // width: 'auto'만으로는 Yoga가 콘텐츠 폭을 알 수 없어 width=0이 됨
  // - fit-content: 텍스트 폭을 width로 설정 (shrink-to-fit)
  // - width 미설정(auto): minWidth로 텍스트 폭 설정 (stretch는 유지하면서 부모 fit-content 시 최소 크기 제공)
  if (tag === 'label') {
    const textContent = String(props?.children || props?.text || props?.label || '');
    const fontSize = typeof style.fontSize === 'number' ? style.fontSize : 14;
    const measuredWidth = Math.ceil(measureTextWidth(textContent, fontSize));
    if (isFitContentWidth) {
      layout.width = measuredWidth;
    } else if (width === undefined) {
      layout.minWidth = measuredWidth;
    }
  }

  // 🚀 Button/ToggleButton/FancyButton: fit-content 시 텍스트 폭 계산
  // SELF_PADDING_TAGS 리프 노드 — padding이 strip되므로 Yoga가 콘텐츠 크기를 모름
  // → textWidth + paddingX*2 + borderWidth*2 로 명시적 pixel width 설정
  const SELF_RENDERING_BTN_TAGS = new Set(['button', 'submitbutton', 'fancybutton', 'togglebutton']);
  if (SELF_RENDERING_BTN_TAGS.has(tag) && isFitContentWidth) {
    const textContent = String(props?.children ?? props?.text ?? props?.label ?? '');
    if (textContent) {
      const BTN_PAD: Record<string, { px: number; fs: number }> = {
        xs: { px: 8, fs: 12 }, sm: { px: 12, fs: 14 }, md: { px: 24, fs: 16 },
        lg: { px: 32, fs: 18 }, xl: { px: 40, fs: 20 },
      };
      const defaultSize = tag === 'togglebutton' ? 'md' : 'sm';
      const sizeName = (props?.size as string) ?? defaultSize;
      const bp = BTN_PAD[sizeName] ?? BTN_PAD.sm;
      const fontSize = typeof style.fontSize === 'number' ? style.fontSize : bp.fs;
      const paddingX = typeof style.paddingLeft === 'number' ? style.paddingLeft
        : typeof style.padding === 'number' ? style.padding : bp.px;
      const borderW = typeof style.borderWidth === 'number' ? style.borderWidth : 1;
      const fontWeight = typeof style.fontWeight === 'number' ? style.fontWeight : 500;
      layout.width = Math.round(measureTextWidthFull(textContent, fontSize, 'Pretendard', fontWeight)) + paddingX * 2 + borderW * 2;
      layout.flexGrow = 0;
      layout.flexShrink = 0;
    }
  }

  // 🚀 순수 텍스트 태그: 컨테이너 자식으로 배치될 때 Yoga가 텍스트 높이/너비를 알 수 없으므로
  // height 미설정 또는 fit-content 시 calculateContentHeight()로 높이 자동 계산
  // width 미설정 시 minWidth로 텍스트 폭 설정 (stretch 유지 + 부모 fit-content 시 최소 크기 제공)
  const TEXT_LAYOUT_TAGS = new Set(['label', 'text', 'heading', 'paragraph']);
  if (TEXT_LAYOUT_TAGS.has(tag)) {
    if (height === undefined || isFitContentHeight) {
      layout.height = calculateContentHeight(element);
    }
    // Yoga 리프 노드 → 고유 너비 제공 (Label은 위에서 별도 처리)
    if (tag !== 'label' && width === undefined && !isFitContentWidth) {
      const textContent = String(props?.children || props?.text || props?.label || '');
      if (textContent) {
        const fontSize = typeof style.fontSize === 'number' ? style.fontSize : 14;
        layout.minWidth = Math.ceil(measureTextWidth(textContent, fontSize));
      }
    }
  }

  // 🚀 Checkbox/Radio/Switch: 기본 flex row 레이아웃 + 크기 계산
  // CSS 기본값: display: flex, flex-direction: row, align-items: center, justify-content: flex-start
  const isInlineFormControl = tag === 'checkbox' || tag === 'radio' || tag === 'switch';
  if (isInlineFormControl) {
    if (!style.display) {
      layout.display = 'flex';
    }
    if (!style.flexDirection) {
      layout.flexDirection = 'row';
    }
    if (!style.alignItems) {
      layout.alignItems = 'center';
    }
    if (!style.justifyContent) {
      layout.justifyContent = 'flex-start';
    }
    // height/width: flexDirection에 따라 크기 계산
    const sizeName = (props?.size as string) ?? 'md';
    const flexDir = (style.flexDirection as string) || 'row';
    const isColumn = flexDir === 'column' || flexDir === 'column-reverse';

    // indicator/gap/fontSize 크기 테이블
    const INDICATOR_SIZES: Record<string, Record<string, number>> = {
      checkbox: { sm: 16, md: 20, lg: 24 },
      radio: { sm: 16, md: 20, lg: 24 },
      switch: { sm: 26, md: 34, lg: 42 },
    };
    const indicatorSize = INDICATOR_SIZES[tag]?.[sizeName] ?? 20;
    const gap = sizeName === 'sm' ? 6 : sizeName === 'lg' ? 10 : 8;
    const fontSize = sizeName === 'sm' ? 12 : sizeName === 'lg' ? 16 : 14;
    const textLineHeight = Math.round(fontSize * 1.4);

    if (isColumn) {
      // Column: 세로 쌓기
      if (height === undefined || isFitContentHeight) {
        layout.height = indicatorSize + gap + textLineHeight;
      }
      if (width === undefined || isFitContentWidth) {
        const labelText = String(props?.children ?? props?.label ?? props?.text ?? '');
        const textWidth = labelText ? measureTextWidth(labelText, fontSize) : 0;
        layout.width = Math.max(indicatorSize, Math.ceil(textWidth));
      }
    } else {
      // Row: 가로 배치
      if (height === undefined || isFitContentHeight) {
        const INLINE_FORM_HEIGHTS: Record<string, Record<string, number>> = {
          checkbox: { sm: 20, md: 24, lg: 28 },
          radio: { sm: 20, md: 24, lg: 28 },
          switch: { sm: 20, md: 24, lg: 28 },
        };
        layout.height = INLINE_FORM_HEIGHTS[tag]?.[sizeName] ?? 24;
      }
      if (width === undefined || isFitContentWidth) {
        const labelText = String(props?.children ?? props?.label ?? props?.text ?? '');
        const textWidth = labelText ? measureTextWidth(labelText, fontSize) : 0;
        layout.width = Math.ceil(indicatorSize + gap + textWidth);
      }
    }
  }

  // 🚀 Badge/Tag/Chip: 명시적 width/height가 없으면 자체 크기 계산
  // PixiBadge와 동일한 방식으로 계산하여 Yoga 레이아웃에 전달
  const isBadgeType = tag === 'badge' || tag === 'tag' || tag === 'chip';
  if (isBadgeType) {
    const size = (props?.size as string) ?? 'md';
    const sizePreset = getBadgeSizePreset(size);

    // width 자동 계산 (명시적 width가 없거나 fit-content일 때)
    if (width === undefined || isFitContentWidth) {
      const badgeText = String(props?.children ?? props?.text ?? props?.label ?? '');
      const textWidth = measureBadgeTextWidth(badgeText, sizePreset.fontSize);
      const badgeWidth = Math.max(sizePreset.minWidth, textWidth + sizePreset.paddingX * 2);
      layout.width = Math.ceil(badgeWidth);
    }

    // height 자동 계산 (명시적 height가 없거나 fit-content일 때)
    if (height === undefined || isFitContentHeight) {
      layout.height = sizePreset.height;
    }
  }

  const minWidth = parse(style.minWidth);
  const minHeight = parse(style.minHeight);
  const maxWidth = parse(style.maxWidth);
  const maxHeight = parse(style.maxHeight);
  if (minWidth !== undefined) layout.minWidth = minWidth;
  if (minHeight !== undefined) layout.minHeight = minHeight;
  if (maxWidth !== undefined) layout.maxWidth = maxWidth;
  if (maxHeight !== undefined) layout.maxHeight = maxHeight;

  // Position
  // position: 'absolute'가 명시적으로 지정된 경우에만 absolute 처리
  // 그 외에는 모두 flexbox 아이템으로 자동 배치
  if (style.position === 'absolute' || style.position === 'fixed') {
    layout.position = 'absolute';
    const top = parse(style.top);
    const left = parse(style.left);
    const right = parse(style.right);
    const bottom = parse(style.bottom);
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
  } else if (style.display === 'block' || style.display === 'inline-block') {
    layout.display = 'block';
  }

  // Flexbox Container
  // 🚀 Phase 12: flexDirection이 있으면 display: flex 자동 설정 (웹모드와 동일)
  // 빌더 편의 기능: flex-direction 설정 시 자동으로 flex 컨테이너로 전환
  if (style.flexDirection) {
    layout.display = 'flex';
    layout.flexDirection = style.flexDirection as LayoutStyle['flexDirection'];
  }
  if (style.flexWrap) {
    layout.flexWrap = style.flexWrap as LayoutStyle['flexWrap'];
  }
  if (style.justifyContent) {
    layout.display = 'flex';
    layout.justifyContent = style.justifyContent as LayoutStyle['justifyContent'];
  }
  if (style.alignItems) {
    layout.display = 'flex';
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
    if (style.flexBasis !== undefined) layout.flexBasis = parse(style.flexBasis);
  }
  if (style.alignSelf) {
    layout.alignSelf = style.alignSelf as LayoutStyle['alignSelf'];
  }

  // Gap
  const gap = parse(style.gap);
  const rowGap = parse(style.rowGap);
  const columnGap = parse(style.columnGap);
  if (gap !== undefined) layout.gap = gap;
  if (rowGap !== undefined) layout.rowGap = rowGap;
  if (columnGap !== undefined) layout.columnGap = columnGap;

  // Margin
  const margin = parse(style.margin);
  if (margin !== undefined) layout.margin = margin;
  const marginTop = parse(style.marginTop);
  const marginRight = parse(style.marginRight);
  const marginBottom = parse(style.marginBottom);
  const marginLeft = parse(style.marginLeft);
  if (marginTop !== undefined) layout.marginTop = marginTop;
  if (marginRight !== undefined) layout.marginRight = marginRight;
  if (marginBottom !== undefined) layout.marginBottom = marginBottom;
  if (marginLeft !== undefined) layout.marginLeft = marginLeft;

  // Padding
  const padding = parse(style.padding);
  if (padding !== undefined) layout.padding = padding;
  const paddingTop = parse(style.paddingTop);
  const paddingRight = parse(style.paddingRight);
  const paddingBottom = parse(style.paddingBottom);
  const paddingLeft = parse(style.paddingLeft);
  if (paddingTop !== undefined) layout.paddingTop = paddingTop;
  if (paddingRight !== undefined) layout.paddingRight = paddingRight;
  if (paddingBottom !== undefined) layout.paddingBottom = paddingBottom;
  if (paddingLeft !== undefined) layout.paddingLeft = paddingLeft;

  // Border (@pixi/layout 지원)
  const borderWidth = parse(style.borderWidth);
  if (typeof borderWidth === 'number') layout.borderWidth = borderWidth;
  const borderTopWidth = parse(style.borderTopWidth);
  const borderRightWidth = parse(style.borderRightWidth);
  const borderBottomWidth = parse(style.borderBottomWidth);
  const borderLeftWidth = parse(style.borderLeftWidth);
  if (typeof borderTopWidth === 'number') layout.borderTopWidth = borderTopWidth;
  if (typeof borderRightWidth === 'number') layout.borderRightWidth = borderRightWidth;
  if (typeof borderBottomWidth === 'number') layout.borderBottomWidth = borderBottomWidth;
  if (typeof borderLeftWidth === 'number') layout.borderLeftWidth = borderLeftWidth;

  const borderRadius = parse(style.borderRadius);
  if (typeof borderRadius === 'number') layout.borderRadius = borderRadius;

  // borderColor는 CSS 색상 문자열 또는 숫자(hex)
  if (style.borderColor !== undefined && style.borderColor !== null) {
    layout.borderColor = style.borderColor as string | number;
  }

  // Visual (@pixi/layout 지원)
  if (style.backgroundColor !== undefined && style.backgroundColor !== null) {
    layout.backgroundColor = style.backgroundColor as string | number;
  }

  // 🚀 Button/ToggleButton/FancyButton: Yoga 리프 노드 높이 계산
  // SELF_PADDING_TAGS는 stripSelfRenderedProps로 padding/border가 제거되어
  // Yoga가 height를 결정할 수 없음 → 명시적 height 설정 필요
  const SELF_RENDERING_BUTTON_TAGS = new Set(['button', 'submitbutton', 'fancybutton', 'togglebutton']);
  if (SELF_RENDERING_BUTTON_TAGS.has(tag) && (height === undefined || isFitContentHeight)) {
    // parseFloat(v) || undefined는 0을 undefined로 처리하므로 ?? 사용
    const toNum = (v: unknown): number | undefined =>
      typeof v === 'number' ? v
        : typeof v === 'string' ? (isNaN(parseFloat(v)) ? undefined : parseFloat(v))
        : undefined;
    // Button size config: paddingX, paddingY, fontSize
    const BUTTON_PADDING: Record<string, { px: number; py: number; fs: number }> = {
      xs: { px: 8, py: 2, fs: 12 },
      sm: { px: 12, py: 4, fs: 14 },
      md: { px: 24, py: 8, fs: 16 },
      lg: { px: 32, py: 12, fs: 18 },
      xl: { px: 40, py: 16, fs: 20 },
    };
    const defaultSize = tag === 'togglebutton' ? 'md' : 'sm';
    const sizeName = (props?.size as string) ?? defaultSize;
    const bp = BUTTON_PADDING[sizeName] ?? BUTTON_PADDING[defaultSize];
    const fontSize = toNum(style.fontSize) ?? bp.fs;
    const paddingY = toNum(style.paddingTop) ?? toNum(style.padding) ?? bp.py;
    const borderW = toNum(style.borderWidth) ?? 1;
    const lineHeight = fontSize * 1.2;
    // 기본 최소 높이: paddingY * 2 + lineHeight + border * 2 (한 줄 텍스트)
    // height 대신 minHeight를 사용하여 부모 align-items: stretch 시 cross-axis 확장 허용
    layout.minHeight = paddingY * 2 + lineHeight + borderW * 2;

    // 고정 width가 있으면 텍스트 줄바꿈 높이를 측정하여 minHeight로 Yoga에 전달
    if (typeof width === 'number' && width > 0) {
      const textContent = String(props?.children ?? props?.text ?? props?.label ?? '');
      if (textContent) {
        const paddingX = toNum(style.paddingLeft) ?? toNum(style.padding) ?? bp.px;
        const maxTextWidth = width - paddingX * 2;
        if (maxTextWidth > 0) {
          const wrappedH = measureWrappedTextHeight(textContent, fontSize, 500, 'Pretendard', maxTextWidth);
          if (wrappedH > lineHeight + 0.5) {
            // 다중 줄: paddingY * 2 + wrappedHeight + border
            const totalHeight = paddingY * 2 + wrappedH + borderW * 2;
            layout.minHeight = Math.max(layout.minHeight ?? 0, totalHeight);
          }
        }
      }
    }
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
