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
import { CanvasTextMetrics, TextStyle, type TextStyleFontWeight } from 'pixi.js';
import { getRadioSizePreset, getTextFieldSizePreset } from '../utils/cssVariableReader';

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
  // Typography properties (P7.10)
  fontFamily?: string;
  fontSize?: string | number;
  fontWeight?: string | number;
  fontStyle?: string;
  letterSpacing?: string | number;
  lineHeight?: string | number;
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
      if (isPercent) {
        node.setMinWidthPercent(numValue);
      } else {
        node.setMinWidth(numValue);
      }
      break;
    case 'minHeight':
      if (isPercent) {
        node.setMinHeightPercent(numValue);
      } else {
        node.setMinHeight(numValue);
      }
      break;
    case 'maxWidth':
      if (isPercent) {
        node.setMaxWidthPercent(numValue);
      } else {
        node.setMaxWidth(numValue);
      }
      break;
    case 'maxHeight':
      if (isPercent) {
        node.setMaxHeightPercent(numValue);
      } else {
        node.setMaxHeight(numValue);
      }
      break;
  }
}

// ============================================
// Text Measurement (P7.10)
// ============================================

/** 텍스트 기반 요소 태그 목록 (intrinsic size 측정 대상) */
const TEXT_ELEMENT_TAGS = new Set([
  // 순수 텍스트 요소
  'Text', 'Heading', 'Label', 'Badge',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span',
  // 텍스트 포함 인터랙티브 요소
  'Button', 'Link', 'a',
  'Tab', 'Tag', 'Breadcrumb',
  // 폼 요소 (label/placeholder 텍스트)
  'Switch', 'ToggleButton'
]);

/** Checkbox/RadioGroup 요소 (box + gap + text 크기 측정 필요) */
const CHECKBOX_RADIO_TAGS = new Set(['Checkbox', 'CheckboxGroup', 'RadioGroup']);

// ============================================
// Checkbox/Radio Size Presets (PixiCheckbox.tsx, PixiRadio.tsx와 동기화)
// ============================================

interface CheckboxRadioSizePreset {
  boxSize: number;
  gap: number;  // box와 text 사이 간격
}

/**
 * Checkbox/Radio size prop에 따른 크기 프리셋
 * - sm: 16px box
 * - md: 20px box (default)
 * - lg: 24px box
 */
const CHECKBOX_RADIO_SIZE_PRESETS: Record<string, CheckboxRadioSizePreset> = {
  sm: { boxSize: 16, gap: 8 },
  md: { boxSize: 20, gap: 8 },
  lg: { boxSize: 24, gap: 8 },
};

const DEFAULT_CHECKBOX_RADIO_PRESET = CHECKBOX_RADIO_SIZE_PRESETS.md;

// ============================================
// Button Size Presets (PixiButton.tsx와 동기화)
// ============================================

interface ButtonSizePreset {
  fontSize: number;
  paddingX: number;  // 좌우 padding
  paddingY: number;  // 상하 padding
}

/**
 * Button size prop에 따른 크기 프리셋 (Button.css와 동기화)
 *
 * Button.css 값:
 * - xs: padding: 2px 8px,  font-size: 10px
 * - sm: padding: 4px 12px, font-size: 14px
 * - md: padding: 8px 24px, font-size: 16px
 * - lg: padding: 12px 32px, font-size: 18px
 * - xl: padding: 16px 40px, font-size: 20px
 */
const BUTTON_SIZE_PRESETS: Record<string, ButtonSizePreset> = {
  xs: { fontSize: 10, paddingX: 8,  paddingY: 2 },
  sm: { fontSize: 14, paddingX: 12, paddingY: 4 },
  md: { fontSize: 16, paddingX: 24, paddingY: 8 },
  lg: { fontSize: 18, paddingX: 32, paddingY: 12 },
  xl: { fontSize: 20, paddingX: 40, paddingY: 16 },
};

const DEFAULT_BUTTON_SIZE_PRESET = BUTTON_SIZE_PRESETS.sm;

/**
 * 요소가 텍스트 기반인지 확인
 */
function isTextElement(element: Element): boolean {
  return TEXT_ELEMENT_TAGS.has(element.tag);
}

/**
 * Button 요소의 size prop에서 패딩 가져오기
 */
function getButtonSizePadding(
  element: Element
): { paddingX: number; paddingY: number; fontSize: number } {
  const props = element.props as Record<string, unknown> | undefined;
  const size = (props?.size as string) || 'sm';
  const preset = BUTTON_SIZE_PRESETS[size] || DEFAULT_BUTTON_SIZE_PRESET;
  return {
    paddingX: preset.paddingX,
    paddingY: preset.paddingY,
    fontSize: preset.fontSize,
  };
}

/**
 * PixiJS CanvasTextMetrics를 사용하여 텍스트 크기 측정 (v8)
 *
 * Button 요소의 경우 size prop에 따른 preset 패딩 사용
 */
function measureTextSize(
  element: Element,
  style: CSSStyle | undefined
): { width: number; height: number } | null {
  const props = element.props as Record<string, unknown> | undefined;
  const textContent = String(props?.children || props?.text || props?.label || '');

  if (!textContent) {
    return null;
  }

  // Button/ToggleButton 요소인 경우 size prop에서 패딩/폰트 크기 가져오기
  // 🚀 ToggleButton도 Button과 동일한 size preset 사용
  const isButton = element.tag === 'Button' || element.tag === 'SubmitButton' || element.tag === 'ToggleButton';
  const buttonSize = isButton ? getButtonSizePadding(element) : null;

  // fontSize: inline style > size preset > 기본값
  const fontSize = parseCSSValue(
    style?.fontSize,
    buttonSize?.fontSize ?? 16
  );

  // PixiJS TextStyle 생성
  const textStyle = new TextStyle({
    fontFamily: (style?.fontFamily as string) || 'Arial',
    fontSize,
    fontWeight: ((style?.fontWeight as string) || 'normal') as TextStyleFontWeight,
    fontStyle: (style?.fontStyle as 'normal' | 'italic' | 'oblique') || 'normal',
    letterSpacing: parseCSSValue(style?.letterSpacing, 0),
  });

  // CanvasTextMetrics로 크기 측정 (PixiJS v8)
  const metrics = CanvasTextMetrics.measureText(textContent, textStyle);

  // padding 계산: Button인 경우 size preset 사용, 아니면 style에서 파싱
  let paddingLeft: number;
  let paddingRight: number;
  let paddingTop: number;
  let paddingBottom: number;

  if (buttonSize) {
    // Button: inline style이 있으면 우선, 없으면 size preset 사용
    const stylePadding = parsePadding(style);
    const hasInlinePadding = style?.padding || style?.paddingTop || style?.paddingRight ||
                             style?.paddingBottom || style?.paddingLeft;

    if (hasInlinePadding) {
      paddingLeft = stylePadding.left;
      paddingRight = stylePadding.right;
      paddingTop = stylePadding.top;
      paddingBottom = stylePadding.bottom;
    } else {
      paddingLeft = buttonSize.paddingX;
      paddingRight = buttonSize.paddingX;
      paddingTop = buttonSize.paddingY;
      paddingBottom = buttonSize.paddingY;
    }
  } else {
    // 일반 텍스트 요소: style에서 파싱
    const stylePadding = parsePadding(style);
    paddingLeft = stylePadding.left;
    paddingRight = stylePadding.right;
    paddingTop = stylePadding.top;
    paddingBottom = stylePadding.bottom;
  }

  const totalWidth = metrics.width + paddingLeft + paddingRight;
  const totalHeight = metrics.height + paddingTop + paddingBottom;

  return {
    width: Math.ceil(totalWidth),
    height: Math.ceil(totalHeight),
  };
}

/**
 * Checkbox 요소의 intrinsic size 측정
 * = boxSize + gap + textWidth (라벨이 있는 경우)
 *
 * 🚀 Phase 11 B2.4: PixiCheckbox와 동일한 크기 계산
 */
function measureCheckboxSize(
  element: Element,
  style: CSSStyle | undefined
): { width: number; height: number } | null {
  const props = element.props as Record<string, unknown> | undefined;

  // size prop에서 preset 가져오기
  const sizeKey = (props?.size as string) || 'md';
  const preset = CHECKBOX_RADIO_SIZE_PRESETS[sizeKey] || DEFAULT_CHECKBOX_RADIO_PRESET;
  const { boxSize, gap } = preset;

  // 라벨 텍스트
  const labelText = String(props?.children || props?.label || props?.text || '');

  // 텍스트가 없으면 box 크기만 반환
  if (!labelText) {
    return {
      width: boxSize,
      height: boxSize,
    };
  }

  // 폰트 크기 (style에서 가져오거나 기본값 14)
  const fontSize = parseCSSValue(style?.fontSize, 14);

  // PixiJS TextStyle 생성
  const textStyle = new TextStyle({
    fontFamily: (style?.fontFamily as string) || 'Pretendard, sans-serif',
    fontSize,
    fontWeight: ((style?.fontWeight as string) || 'normal') as TextStyleFontWeight,
    fontStyle: (style?.fontStyle as 'normal' | 'italic' | 'oblique') || 'normal',
    letterSpacing: parseCSSValue(style?.letterSpacing, 0),
  });

  // CanvasTextMetrics로 텍스트 크기 측정 (PixiJS v8)
  const metrics = CanvasTextMetrics.measureText(labelText, textStyle);

  // 전체 크기: boxSize + gap + textWidth
  const totalWidth = boxSize + gap + metrics.width;
  const totalHeight = Math.max(boxSize, metrics.height);

  return {
    width: Math.ceil(totalWidth),
    height: Math.ceil(totalHeight),
  };
}

/**
 * CheckboxGroup 요소의 intrinsic size 측정
 * = 라벨 높이 + 모든 옵션의 (checkboxSize + gap + textWidth)를 레이아웃 방향에 따라 계산
 *
 * 🚀 PixiCheckboxGroup과 동일한 크기 계산
 * 🚀 자식 Checkbox 요소들을 우선적으로 사용하여 크기 계산
 */
function measureCheckboxGroupSize(
  element: Element,
  style: CSSStyle | undefined,
  elements: Element[]
): { width: number; height: number } | null {
  const props = element.props as Record<string, unknown> | undefined;

  // size prop에서 preset 가져오기
  const sizeKey = (props?.size as string) || 'md';
  const preset = CHECKBOX_RADIO_SIZE_PRESETS[sizeKey] || DEFAULT_CHECKBOX_RADIO_PRESET;
  const { boxSize, gap } = preset;

  // 폰트 크기
  const fontSize = parseCSSValue(style?.fontSize, 14);

  // CheckboxGroup 라벨
  const groupLabel = String(props?.label || props?.children || props?.text || '');
  const labelHeight = groupLabel ? fontSize + 8 : 0;

  // 방향: props.orientation > style.flexDirection
  const orientation = props?.orientation;
  const isHorizontal =
    orientation === 'horizontal' ? true :
    orientation === 'vertical' ? false :
    style?.flexDirection === 'row';

  // 1. 자식 Checkbox 요소들 먼저 확인
  const childCheckboxes = elements
    .filter((el) => el.parent_id === element.id && (el.tag === 'Checkbox' || el.tag === 'CheckBox'))
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  // 옵션들: 자식 Checkbox > props.options > 기본값
  const defaultOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ];

  let options: Array<{ label?: string; name?: string; value?: string }>;
  if (childCheckboxes.length > 0) {
    // 자식 Checkbox 요소들에서 옵션 생성
    options = childCheckboxes.map((checkbox) => {
      const checkboxProps = checkbox.props as Record<string, unknown> | undefined;
      return {
        value: String(checkboxProps?.value || checkbox.id),
        label: String(checkboxProps?.children || checkboxProps?.label || checkboxProps?.text || ''),
      };
    });
  } else if (Array.isArray(props?.options) && props.options.length > 0) {
    options = props.options as Array<{ label?: string; name?: string; value?: string }>;
  } else {
    options = defaultOptions;
  }

  // 옵션 간 간격 (PixiCheckboxGroup.tsx와 동기화)
  const OPTION_GAP = 12;
  const HORIZONTAL_ITEM_WIDTH = 120;

  // PixiJS TextStyle 생성
  const textStyle = new TextStyle({
    fontFamily: (style?.fontFamily as string) || 'Pretendard, sans-serif',
    fontSize,
    fontWeight: ((style?.fontWeight as string) || 'normal') as TextStyleFontWeight,
    fontStyle: (style?.fontStyle as 'normal' | 'italic' | 'oblique') || 'normal',
    letterSpacing: parseCSSValue(style?.letterSpacing, 0),
  });

  // 라벨 너비 측정 (라벨이 있는 경우)
  let labelWidth = 0;
  if (groupLabel) {
    const labelMetrics = CanvasTextMetrics.measureText(groupLabel, textStyle);
    labelWidth = labelMetrics.width;
  }

  // 각 옵션 크기 측정
  const itemSizes = options.map((opt) => {
    const labelText = String(opt.label || opt.name || opt.value || '');
    if (!labelText) {
      return { width: boxSize, height: boxSize };
    }

    const metrics = CanvasTextMetrics.measureText(labelText, textStyle);
    return {
      width: boxSize + gap + metrics.width,
      height: Math.max(boxSize, metrics.height),
    };
  });

  if (isHorizontal) {
    // 가로 배치: 마지막 아이템 X + 마지막 아이템 너비
    const lastIndex = itemSizes.length - 1;
    const lastItemX = lastIndex * HORIZONTAL_ITEM_WIDTH;
    const lastItemWidth = itemSizes[lastIndex]?.width || boxSize;
    const optionsWidth = lastItemX + lastItemWidth;
    const totalWidth = Math.max(optionsWidth, labelWidth);
    const maxHeight = Math.max(...itemSizes.map((s) => s.height), boxSize);
    return {
      width: Math.ceil(totalWidth),
      height: Math.ceil(labelHeight + maxHeight),
    };
  } else {
    // 세로 배치
    const maxOptionWidth = Math.max(...itemSizes.map((s) => s.width), boxSize);
    const totalWidth = Math.max(maxOptionWidth, labelWidth);
    const optionsHeight = options.length * (boxSize + OPTION_GAP) - OPTION_GAP;
    return {
      width: Math.ceil(totalWidth),
      height: Math.ceil(labelHeight + optionsHeight),
    };
  }
}

/**
 * Radio(RadioGroup) 요소의 intrinsic size 측정
 * = 라벨 높이 + 모든 옵션의 (radioSize + gap + textWidth)를 레이아웃 방향에 따라 계산
 *
 * 🚀 Phase 11 B2.4: PixiRadio(RadioGroup)와 동일한 크기 계산
 * 🚀 자식 Radio 요소들을 우선적으로 사용하여 크기 계산
 */
function measureRadioSize(
  element: Element,
  style: CSSStyle | undefined,
  elements: Element[]
): { width: number; height: number } | null {
  const props = element.props as Record<string, unknown> | undefined;

  // size prop에서 preset 가져오기 (PixiRadio와 동일한 getRadioSizePreset 사용)
  const sizeKey = (props?.size as string) || 'md';
  const radioPreset = getRadioSizePreset(sizeKey);
  const boxSize = radioPreset.radioSize;
  const gap = radioPreset.gap;

  // 폰트 크기 (radioPreset에서 가져오기)
  const fontSize = parseCSSValue(style?.fontSize, radioPreset.fontSize);

  // RadioGroup 라벨
  const groupLabel = String(props?.label || props?.children || props?.text || '');
  const labelHeight = groupLabel ? fontSize + 8 : 0;

  // 방향: props.orientation > style.flexDirection
  const orientation = props?.orientation;
  const isHorizontal =
    orientation === 'horizontal' ? true :
    orientation === 'vertical' ? false :
    style?.flexDirection === 'row';

  // 1. 자식 Radio 요소들 먼저 확인
  const childRadios = elements
    .filter((el) => el.parent_id === element.id && el.tag === 'Radio')
    .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

  // 옵션들: 자식 Radio > props.options > 기본값
  const defaultOptions = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
  ];

  let options: Array<{ label?: string; name?: string; value?: string }>;
  if (childRadios.length > 0) {
    // 자식 Radio 요소들에서 옵션 생성
    options = childRadios.map((radio) => {
      const radioProps = radio.props as Record<string, unknown> | undefined;
      return {
        value: String(radioProps?.value || radio.id),
        label: String(radioProps?.children || radioProps?.label || radioProps?.text || ''),
      };
    });
  } else if (Array.isArray(props?.options) && props.options.length > 0) {
    options = props.options as Array<{ label?: string; name?: string; value?: string }>;
  } else {
    options = defaultOptions;
  }

  // 옵션 간 간격 (PixiRadio.tsx의 DEFAULT_GAP = 12, horizontal width = 120)
  const OPTION_GAP = 12;
  const HORIZONTAL_ITEM_WIDTH = 120;

  // PixiJS TextStyle 생성
  const textStyle = new TextStyle({
    fontFamily: (style?.fontFamily as string) || 'Pretendard, sans-serif',
    fontSize,
    fontWeight: ((style?.fontWeight as string) || 'normal') as TextStyleFontWeight,
    fontStyle: (style?.fontStyle as 'normal' | 'italic' | 'oblique') || 'normal',
    letterSpacing: parseCSSValue(style?.letterSpacing, 0),
  });

  // 라벨 너비 측정 (라벨이 있는 경우)
  let labelWidth = 0;
  if (groupLabel) {
    const labelMetrics = CanvasTextMetrics.measureText(groupLabel, textStyle);
    labelWidth = labelMetrics.width;
  }

  // 각 옵션 크기 측정
  const itemSizes = options.map((opt) => {
    const labelText = String(opt.label || opt.name || opt.value || '');
    if (!labelText) {
      return { width: boxSize, height: boxSize };
    }

    const metrics = CanvasTextMetrics.measureText(labelText, textStyle);
    return {
      width: boxSize + gap + metrics.width,
      height: Math.max(boxSize, metrics.height),
    };
  });

  if (isHorizontal) {
    // 가로 배치: 마지막 아이템 X + 마지막 아이템 너비
    const lastIndex = itemSizes.length - 1;
    const lastItemX = lastIndex * HORIZONTAL_ITEM_WIDTH;
    const lastItemWidth = itemSizes[lastIndex]?.width || boxSize;
    const optionsWidth = lastItemX + lastItemWidth;
    const totalWidth = Math.max(optionsWidth, labelWidth);
    const maxHeight = Math.max(...itemSizes.map((s) => s.height), boxSize);
    return {
      width: Math.ceil(totalWidth),
      height: Math.ceil(labelHeight + maxHeight),
    };
  } else {
    // 세로 배치: 최대 너비, 높이 합산
    const maxOptionWidth = Math.max(...itemSizes.map((s) => s.width), boxSize);
    const totalWidth = Math.max(maxOptionWidth, labelWidth);
    const optionsHeight = options.length * (boxSize + OPTION_GAP) - OPTION_GAP;
    return {
      width: Math.ceil(totalWidth),
      height: Math.ceil(labelHeight + optionsHeight),
    };
  }
}

/**
 * 요소가 Checkbox/RadioGroup인지 확인
 */
function isCheckboxRadioElement(element: Element): boolean {
  return CHECKBOX_RADIO_TAGS.has(element.tag);
}

/**
 * TextField 관련 태그들
 */
const TEXT_FIELD_TAGS = new Set(['TextField', 'TextInput']);

/**
 * 요소가 TextField인지 확인
 */
function isTextFieldElement(element: Element): boolean {
  return TEXT_FIELD_TAGS.has(element.tag);
}

/**
 * TextField의 intrinsic size 측정
 * = PixiTextField와 동일한 계산 로직
 * = width: props.width || 240
 * = height: labelHeight + inputHeight + descriptionHeight
 */
function measureTextFieldSize(
  element: Element,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _style: CSSStyle | undefined
): { width: number; height: number } | null {
  const props = element.props as Record<string, unknown> | undefined;

  // size prop에서 프리셋 가져오기
  const sizeKey = (props?.size as string) || 'md';
  const preset = getTextFieldSizePreset(sizeKey);

  // 너비: PixiTextField와 동일하게 props.width 우선, 없으면 240
  // (style.width는 무시 - PixiTextField 구현과 일치)
  const width = (props?.width as number) || 240;

  // 라벨 높이: 라벨이 있으면 labelFontSize + gap, 없으면 0
  const label = (props?.label as string) || '';
  const labelHeight = label ? preset.labelFontSize + preset.gap : 0;

  // 설명 높이: 설명 또는 에러메시지가 있으면 descriptionFontSize + gap, 없으면 0
  const description = (props?.description as string) || '';
  const errorMessage = (props?.errorMessage as string) || '';
  const isInvalid = (props?.isInvalid as boolean) || false;
  const hasDescription = description || (isInvalid && errorMessage);
  const descriptionHeight = hasDescription ? preset.descriptionFontSize + preset.gap : 0;

  // 전체 높이: 라벨 + 입력 필드 + 설명
  const totalHeight = labelHeight + preset.height + descriptionHeight;

  return { width, height: totalHeight };
}

/**
 * 요소가 Radio 아이템인지 확인
 */
function isRadioItemElement(element: Element): boolean {
  return element.tag === 'Radio';
}

/**
 * 요소가 Checkbox 아이템인지 확인 (CheckboxGroup의 자식)
 */
function isCheckboxItemElement(element: Element, elements: Element[]): boolean {
  if (element.tag !== 'Checkbox' && element.tag !== 'CheckBox') {
    return false;
  }
  // 부모가 CheckboxGroup인지 확인
  const parent = elements.find((el) => el.id === element.parent_id);
  return parent?.tag === 'CheckboxGroup';
}

/**
 * Checkbox 아이템의 intrinsic size 측정
 * = checkboxSize + gap + textWidth
 */
function measureCheckboxItemSize(
  element: Element,
  style: CSSStyle | undefined
): { width: number; height: number } {
  const props = element.props as Record<string, unknown> | undefined;

  const sizeKey = (props?.size as string) || 'md';
  const preset = CHECKBOX_RADIO_SIZE_PRESETS[sizeKey] || DEFAULT_CHECKBOX_RADIO_PRESET;
  const { boxSize, gap } = preset;

  const labelText = String(props?.children || props?.label || props?.text || '');

  if (!labelText) {
    return { width: boxSize, height: boxSize };
  }

  const fontSize = parseCSSValue(style?.fontSize, 14);

  const textStyle = new TextStyle({
    fontFamily: (style?.fontFamily as string) || 'Pretendard, sans-serif',
    fontSize,
  });

  const metrics = CanvasTextMetrics.measureText(labelText, textStyle);

  return {
    width: Math.ceil(boxSize + gap + metrics.width),
    height: Math.ceil(Math.max(boxSize, metrics.height)),
  };
}

/**
 * Radio 아이템의 intrinsic size 측정
 * = radioSize + gap + textWidth
 */
function measureRadioItemSize(
  element: Element,
  style: CSSStyle | undefined
): { width: number; height: number } {
  const props = element.props as Record<string, unknown> | undefined;

  const sizeKey = (props?.size as string) || 'md';
  const preset = CHECKBOX_RADIO_SIZE_PRESETS[sizeKey] || DEFAULT_CHECKBOX_RADIO_PRESET;
  const { boxSize, gap } = preset;

  const labelText = String(props?.children || props?.label || props?.text || '');

  if (!labelText) {
    return { width: boxSize, height: boxSize };
  }

  const fontSize = parseCSSValue(style?.fontSize, 14);

  const textStyle = new TextStyle({
    fontFamily: (style?.fontFamily as string) || 'Pretendard, sans-serif',
    fontSize,
  });

  const metrics = CanvasTextMetrics.measureText(labelText, textStyle);

  return {
    width: Math.ceil(boxSize + gap + metrics.width),
    height: Math.ceil(Math.max(boxSize, metrics.height)),
  };
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
  element: Element,
  elements: Element[]
): YogaNode {
  const node = yoga.Node.create();
  const style = element.props?.style as CSSStyle | undefined;

  // 크기 설정 (px 및 % 단위 지원)
  const hasExplicitWidth = style?.width !== undefined && style.width !== '' && style.width !== 'auto';
  const hasExplicitHeight = style?.height !== undefined && style.height !== '' && style.height !== 'auto';

  if (hasExplicitWidth) {
    setNodeSize(node, 'width', style?.width);
  }
  if (hasExplicitHeight) {
    setNodeSize(node, 'height', style?.height);
  }

  // P7.10: 텍스트 요소의 intrinsic size 측정
  // 명시적 크기가 없는 텍스트 요소는 콘텐츠 기반으로 크기 계산
  if (isTextElement(element) && (!hasExplicitWidth || !hasExplicitHeight)) {
    const measuredSize = measureTextSize(element, style);
    if (measuredSize) {
      if (!hasExplicitWidth) {
        node.setWidth(measuredSize.width);
      }
      if (!hasExplicitHeight) {
        node.setHeight(measuredSize.height);
      }
    }
  }

  // 🚀 Phase 11 B2.4: Checkbox/Radio 요소의 intrinsic size 측정
  // boxSize + gap + textWidth로 전체 컴포넌트 크기 계산
  if (isCheckboxRadioElement(element) && (!hasExplicitWidth || !hasExplicitHeight)) {
    // Checkbox, CheckboxGroup, RadioGroup 각각 다른 측정 함수 사용
    let measuredSize: { width: number; height: number } | null = null;

    if (element.tag === 'Checkbox') {
      // 개별 Checkbox
      measuredSize = measureCheckboxSize(element, style);
    } else if (element.tag === 'CheckboxGroup') {
      // CheckboxGroup (자식 Checkbox 요소들 고려)
      measuredSize = measureCheckboxGroupSize(element, style, elements);
    } else if (element.tag === 'RadioGroup') {
      // RadioGroup (자식 Radio 요소들 고려)
      measuredSize = measureRadioSize(element, style, elements);
    }

    if (measuredSize) {
      if (!hasExplicitWidth) {
        node.setWidth(measuredSize.width);
      }
      if (!hasExplicitHeight) {
        node.setHeight(measuredSize.height);
      }
    }
  }

  // 🚀 Phase 7: TextField 요소의 intrinsic size 측정
  // PixiTextField와 동일한 크기 계산 (label + input + description)
  if (isTextFieldElement(element) && (!hasExplicitWidth || !hasExplicitHeight)) {
    const measuredSize = measureTextFieldSize(element, style);
    if (measuredSize) {
      if (!hasExplicitWidth) {
        node.setWidth(measuredSize.width);
      }
      if (!hasExplicitHeight) {
        node.setHeight(measuredSize.height);
      }
    }
  }

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
    // align-content: CSS 기본값 stretch 명시 (Yoga 기본값은 flex-start)
    node.setAlignContent(toYogaAlignContent(style.alignContent || 'stretch'));

    // Gap
    if (style.gap) node.setGap(Gutter.All, parseCSSValue(style.gap));
    if (style.rowGap) node.setGap(Gutter.Row, parseCSSValue(style.rowGap));
    if (style.columnGap) node.setGap(Gutter.Column, parseCSSValue(style.columnGap));
  }

  // Flex Item 속성
  // CSS 기본값과 일치시키기 위해 flexShrink 기본값을 1로 설정
  // (Yoga 기본값은 0이지만, CSS 기본값은 1)
  node.setFlexShrink(style?.flexShrink !== undefined ? style.flexShrink : 1);

  if (style?.flex !== undefined) {
    node.setFlex(parseCSSValue(style.flex, 0));
  }
  if (style?.flexGrow !== undefined) {
    node.setFlexGrow(style.flexGrow);
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

  let insertIndex = 0;
  for (let i = 0; i < children.length; i++) {
    const child = children[i];

    if (visited.has(child.id)) {
      console.warn('[LayoutEngine] Cyclic reference detected:', child.id);
      continue;
    }

    // Radio 아이템은 Yoga 트리에서 제외 (RadioGroup에서 수동으로 위치 계산)
    if (isRadioItemElement(child)) {
      visited.add(child.id);
      continue;
    }

    // CheckboxGroup의 자식 Checkbox는 Yoga 트리에서 제외 (CheckboxGroup에서 렌더링)
    if (isCheckboxItemElement(child, elements)) {
      visited.add(child.id);
      continue;
    }

    visited.add(child.id);

    const childNode = createYogaNode(yoga, child, elements);
    parentNode.insertChild(childNode, insertIndex++);
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

/**
 * Radio 아이템 위치 계산 (RadioGroup 기준)
 *
 * RadioGroup의 위치를 기준으로 각 Radio 아이템의 위치를 계산합니다.
 * - 라벨 높이 고려
 * - 가로/세로 배치 고려
 * - 아이템 간격 고려
 */
function calculateRadioItemPositions(
  elements: Element[],
  positions: Map<string, LayoutPosition>
): void {
  // RadioGroup 요소들 찾기
  const radioGroups = elements.filter((el) => el.tag === 'RadioGroup');

  for (const radioGroup of radioGroups) {
    const groupPosition = positions.get(radioGroup.id);
    if (!groupPosition) continue;

    // RadioGroup의 자식 Radio 아이템들
    const radioItems = elements
      .filter((el) => el.parent_id === radioGroup.id && el.tag === 'Radio')
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    if (radioItems.length === 0) continue;

    // RadioGroup 스타일
    const groupStyle = radioGroup.props?.style as CSSStyle | undefined;
    const groupProps = radioGroup.props as Record<string, unknown> | undefined;
    const fontSize = parseCSSValue(groupStyle?.fontSize, 14);

    // 라벨 높이 계산
    const groupLabel = String(groupProps?.label || groupProps?.children || groupProps?.text || '');
    const labelHeight = groupLabel ? fontSize + 8 : 0;

    // 방향: props.orientation > style.flexDirection
    const orientation = groupProps?.orientation;
    const isHorizontal =
      orientation === 'horizontal' ? true :
      orientation === 'vertical' ? false :
      groupStyle?.flexDirection === 'row';

    // 아이템 크기/간격 (PixiRadio와 동일한 getRadioSizePreset 사용)
    const sizeKey = (groupProps?.size as string) || 'md';
    const radioPreset = getRadioSizePreset(sizeKey);
    const boxSize = radioPreset.radioSize;
    const OPTION_GAP = radioPreset.gap;
    const HORIZONTAL_ITEM_WIDTH = 120;

    // 각 Radio 아이템 위치 계산
    for (let i = 0; i < radioItems.length; i++) {
      const radioItem = radioItems[i];
      const itemStyle = radioItem.props?.style as CSSStyle | undefined;
      const itemSize = measureRadioItemSize(radioItem, itemStyle);

      // 위치 계산 (RadioGroup 기준 상대 위치)
      const itemX = isHorizontal ? i * HORIZONTAL_ITEM_WIDTH : 0;
      const itemY = labelHeight + (isHorizontal ? 0 : i * (boxSize + OPTION_GAP));

      // 절대 위치로 변환
      positions.set(radioItem.id, {
        x: groupPosition.x + itemX,
        y: groupPosition.y + itemY,
        width: itemSize.width,
        height: itemSize.height,
      });
    }
  }
}

/**
 * Checkbox 아이템 위치 계산 (CheckboxGroup 기준)
 *
 * CheckboxGroup의 위치를 기준으로 각 Checkbox 아이템의 위치를 계산합니다.
 * - 라벨 높이 고려
 * - 가로/세로 배치 고려
 * - 아이템 간격 고려
 */
function calculateCheckboxItemPositions(
  elements: Element[],
  positions: Map<string, LayoutPosition>
): void {
  // CheckboxGroup 요소들 찾기
  const checkboxGroups = elements.filter((el) => el.tag === 'CheckboxGroup');

  for (const checkboxGroup of checkboxGroups) {
    const groupPosition = positions.get(checkboxGroup.id);
    if (!groupPosition) continue;

    // CheckboxGroup의 자식 Checkbox 아이템들
    const checkboxItems = elements
      .filter((el) => el.parent_id === checkboxGroup.id && (el.tag === 'Checkbox' || el.tag === 'CheckBox'))
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

    if (checkboxItems.length === 0) continue;

    // CheckboxGroup 스타일
    const groupStyle = checkboxGroup.props?.style as CSSStyle | undefined;
    const groupProps = checkboxGroup.props as Record<string, unknown> | undefined;
    const fontSize = parseCSSValue(groupStyle?.fontSize, 14);

    // 라벨 높이 계산
    const groupLabel = String(groupProps?.label || groupProps?.children || groupProps?.text || '');
    const labelHeight = groupLabel ? fontSize + 8 : 0;

    // 방향: props.orientation > style.flexDirection
    const orientation = groupProps?.orientation;
    const isHorizontal =
      orientation === 'horizontal' ? true :
      orientation === 'vertical' ? false :
      groupStyle?.flexDirection === 'row';

    // 아이템 간격 (PixiCheckboxGroup.tsx와 동기화)
    const OPTION_GAP = 12;
    const HORIZONTAL_ITEM_WIDTH = 120;
    const boxSize = 20; // DEFAULT_CHECKBOX_SIZE

    // 각 Checkbox 아이템 위치 계산
    for (let i = 0; i < checkboxItems.length; i++) {
      const checkboxItem = checkboxItems[i];
      const itemStyle = checkboxItem.props?.style as CSSStyle | undefined;
      const itemSize = measureCheckboxItemSize(checkboxItem, itemStyle);

      // 위치 계산 (CheckboxGroup 기준 상대 위치)
      const itemX = isHorizontal ? i * HORIZONTAL_ITEM_WIDTH : 0;
      const itemY = labelHeight + (isHorizontal ? 0 : i * (boxSize + OPTION_GAP));

      // 절대 위치로 변환
      positions.set(checkboxItem.id, {
        x: groupPosition.x + itemX,
        y: groupPosition.y + itemY,
        width: itemSize.width,
        height: itemSize.height,
      });
    }
  }
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

  // Radio 아이템 위치 계산 (RadioGroup 기준 상대 위치)
  calculateRadioItemPositions(pageElements, positions);

  // Checkbox 아이템 위치 계산 (CheckboxGroup 기준 상대 위치)
  calculateCheckboxItemPositions(pageElements, positions);

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
