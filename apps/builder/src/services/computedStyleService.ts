/**
 * Computed Style Service - 합성 computedStyle 생성
 *
 * WebGL/Skia 렌더링에서는 실제 DOM이 없어 getComputedStyle()을 사용할 수 없다.
 * 이 서비스는 컴포넌트의 tag + size/variant prop에서 Skia 렌더링과 동일한
 * CSS 속성 값을 계산하여 StylePanel에 전달한다.
 *
 * @since 2026-02-19 Wave 5 - StylePanel computedStyle 동기화
 */

import type { SelectedElement } from '../builder/inspector/types';
import {
  getSizePreset,
  getCheckboxSizePreset,
  getRadioSizePreset,
  getInputSizePreset,
  getSelectSizePreset,
  getProgressBarSizePreset,
  getToggleButtonSizePreset,
  getMeterSizePreset,
  getBadgeSizePreset,
  getSwitchSizePreset,
  getCardSizePreset,
  getSliderSizePreset,
  getLinkSizePreset,
  getBreadcrumbsSizePreset,
  getTextFieldSizePreset,
  getTextAreaSizePreset,
  getComboBoxSizePreset,
  getNumberFieldSizePreset,
  getSearchFieldSizePreset,
} from '../builder/workspace/canvas/utils/cssVariableReader';

// ============================================
// Types
// ============================================

/**
 * 합성 computedStyle — Skia 렌더링에서 실제 사용되는 해석 값
 * CSS property 형식 (string)으로 반환하여 styleAtoms와 호환
 */
export interface SyntheticComputedStyle {
  fontSize?: string;
  paddingTop?: string;
  paddingRight?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  borderRadius?: string;
  lineHeight?: string;
}

// ============================================
// Cache
// ============================================

/**
 * 캐시 키 생성: tag + size + variant 조합
 * SelectedElement는 매번 새 객체이므로 WeakMap 대신 string key 캐시 사용
 */
const styleCache = new Map<string, SyntheticComputedStyle>();
const MAX_CACHE_SIZE = 200;

function getCacheKey(type: string, size: string, variant: string): string {
  return `${type}:${size}:${variant}`;
}

function cacheGet(key: string): SyntheticComputedStyle | undefined {
  return styleCache.get(key);
}

function cacheSet(key: string, value: SyntheticComputedStyle): void {
  if (styleCache.size >= MAX_CACHE_SIZE) {
    // LRU 대신 간단한 전체 클리어 (빈도 낮음)
    styleCache.clear();
  }
  styleCache.set(key, value);
}

/**
 * 캐시 무효화 (CSS 변수 변경 시 호출)
 */
export function invalidateStyleCache(): void {
  styleCache.clear();
}

// ============================================
// Preset → SyntheticComputedStyle 변환
// ============================================

function px(value: number): string {
  return `${value}px`;
}

/**
 * Button/ToggleButton 계열: fontSize, paddingX, paddingY, borderRadius
 */
function fromButtonPreset(
  preset: { fontSize: number; paddingX: number; paddingY: number; borderRadius: number }
): SyntheticComputedStyle {
  return {
    fontSize: px(preset.fontSize),
    paddingTop: px(preset.paddingY),
    paddingRight: px(preset.paddingX),
    paddingBottom: px(preset.paddingY),
    paddingLeft: px(preset.paddingX),
    borderRadius: px(preset.borderRadius),
  };
}

/**
 * Checkbox/Radio/Switch 계열: fontSize만
 */
function fromCheckboxPreset(
  preset: { fontSize: number }
): SyntheticComputedStyle {
  return {
    fontSize: px(preset.fontSize),
  };
}

/**
 * Input/Select/ComboBox 계열: fontSize, paddingX, paddingY, borderRadius
 */
function fromInputPreset(
  preset: { fontSize: number; paddingX: number; paddingY: number; borderRadius: number }
): SyntheticComputedStyle {
  return {
    fontSize: px(preset.fontSize),
    paddingTop: px(preset.paddingY),
    paddingRight: px(preset.paddingX),
    paddingBottom: px(preset.paddingY),
    paddingLeft: px(preset.paddingX),
    borderRadius: px(preset.borderRadius),
  };
}

/**
 * ProgressBar/Meter 계열: fontSize, borderRadius
 */
function fromBarPreset(
  preset: { fontSize: number; borderRadius: number }
): SyntheticComputedStyle {
  return {
    fontSize: px(preset.fontSize),
    borderRadius: px(preset.borderRadius),
  };
}

// ============================================
// Tag → Preset 매핑
// ============================================

/**
 * 컴포넌트 tag에서 합성 computedStyle을 생성
 *
 * Skia 렌더링에서 사용하는 것과 동일한 getSizePreset() 계열 함수를 호출하여
 * StylePanel에 표시할 값을 생성한다.
 */
function computeFromTag(tag: string, size: string): SyntheticComputedStyle {
  switch (tag) {
    // Button 계열
    case 'Button':
      return fromButtonPreset(getSizePreset(size));
    case 'ToggleButton':
      return fromButtonPreset(getToggleButtonSizePreset(size));

    // Input 계열
    case 'TextField': {
      const p = getTextFieldSizePreset(size);
      return fromInputPreset({ fontSize: p.fontSize, paddingX: p.paddingX, paddingY: p.padding, borderRadius: p.borderRadius });
    }
    case 'TextArea': {
      const p = getTextAreaSizePreset(size);
      return fromInputPreset({ fontSize: p.fontSize, paddingX: p.paddingX, paddingY: p.padding, borderRadius: p.borderRadius });
    }
    case 'Select':
      return fromInputPreset(getSelectSizePreset(size));
    case 'ComboBox':
      return fromInputPreset(getComboBoxSizePreset(size));
    case 'NumberField':
      return fromInputPreset(getNumberFieldSizePreset(size));
    case 'SearchField':
      return fromInputPreset(getSearchFieldSizePreset(size));

    // Checkbox/Radio/Switch
    case 'Checkbox':
    case 'CheckboxGroup':
      return fromCheckboxPreset(getCheckboxSizePreset(size));
    case 'Radio':
    case 'RadioGroup':
      return fromCheckboxPreset(getRadioSizePreset(size));
    case 'Switch':
      return { fontSize: px(getSwitchSizePreset(size).thumbSize) };

    // Bar 계열
    case 'ProgressBar':
      return fromBarPreset(getProgressBarSizePreset(size));
    case 'Meter':
      return fromBarPreset(getMeterSizePreset(size));
    case 'Slider':
      return { fontSize: px(getSliderSizePreset(size).thumbSize) };

    // Badge
    case 'Badge': {
      const p = getBadgeSizePreset(size);
      return {
        fontSize: px(p.fontSize),
        paddingTop: px(p.paddingY),
        paddingRight: px(p.paddingX),
        paddingBottom: px(p.paddingY),
        paddingLeft: px(p.paddingX),
      };
    }

    // Card
    case 'Card': {
      const preset = getCardSizePreset(size);
      return {
        paddingTop: px(preset.padding),
        paddingRight: px(preset.padding),
        paddingBottom: px(preset.padding),
        paddingLeft: px(preset.padding),
        borderRadius: px(preset.borderRadius),
      };
    }

    // Navigation
    case 'Link':
      return { fontSize: px(getLinkSizePreset(size).fontSize) };
    case 'Breadcrumbs':
      return { fontSize: px(getBreadcrumbsSizePreset(size).fontSize) };

    // Input (legacy alias)
    case 'Input':
      return fromInputPreset(getInputSizePreset(size));

    default:
      return {};
  }
}

// ============================================
// Public API
// ============================================

/**
 * 합성 computedStyle 생성
 *
 * element의 tag + properties(size, variant)로부터 Skia 렌더링과 동일한
 * CSS 속성 값을 계산한다. StylePanel atom에서 fallback으로 사용.
 *
 * @param element - 선택된 요소
 * @returns SyntheticComputedStyle (빈 객체면 해당 태그에 preset 없음)
 *
 * @example
 * ```typescript
 * const synth = computeSyntheticStyle(element);
 * // Button size="sm" → { fontSize: '14px', paddingTop: '4px', ... }
 * ```
 */
export function computeSyntheticStyle(
  element: SelectedElement | null
): SyntheticComputedStyle {
  if (!element) return {};

  const tag = element.type;
  const size = (element.properties?.size as string) ?? 'md';
  const variant = (element.properties?.variant as string) ?? 'default';

  // 캐시 확인
  const cacheKey = getCacheKey(tag, size, variant);
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  // tag + size에서 합성 스타일 생성
  const synthetic = computeFromTag(tag, size);

  // 캐시 저장
  cacheSet(cacheKey, synthetic);

  return synthetic;
}

/**
 * inline style → synthetic computedStyle → default 순서로 값 결정
 *
 * StylePanel atom에서 직접 사용할 수 있는 헬퍼.
 * inline style이 있으면 그대로 사용하고, 없으면 synthetic에서 찾고,
 * 그것도 없으면 default 값을 반환한다.
 */
export function resolveStyleValue(
  inlineStyle: React.CSSProperties | null | undefined,
  syntheticStyle: SyntheticComputedStyle,
  property: keyof React.CSSProperties & keyof SyntheticComputedStyle,
  defaultValue: string
): string {
  // Priority 1: Inline style (사용자 직접 설정)
  const inlineValue = inlineStyle?.[property as keyof React.CSSProperties];
  if (inlineValue !== undefined && inlineValue !== null && inlineValue !== '') {
    return String(inlineValue);
  }

  // Priority 2: Synthetic computed style (preset에서 파생)
  const syntheticValue = syntheticStyle[property as keyof SyntheticComputedStyle];
  if (syntheticValue !== undefined) {
    return syntheticValue;
  }

  // Priority 3: Default value
  return defaultValue;
}
