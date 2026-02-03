/**
 * CSS Variable Reader
 *
 * CSS 변수를 런타임에 읽어서 PixiJS에서 사용할 수 있는 hex 값으로 변환
 * 테마 변경 시 동적으로 색상 업데이트 지원
 *
 * 🚀 Phase 22: colord 기반 색상 파싱으로 통합
 * - cssColorToPixiHex 사용으로 더 많은 색상 형식 지원
 *
 * @since 2025-12-15
 */

import { cssColorToPixiHex } from '../../../../utils/color';

// ============================================
// Types
// ============================================

export interface M3ButtonColors {
  // Default (surface-container-high)
  defaultBg: number;
  defaultBgHover: number;
  defaultBgPressed: number;
  defaultText: number;
  defaultBorder: number;

  // Primary
  primaryBg: number;
  primaryBgHover: number;
  primaryBgPressed: number;
  primaryText: number;

  // Secondary
  secondaryBg: number;
  secondaryBgHover: number;
  secondaryBgPressed: number;
  secondaryText: number;

  // Tertiary
  tertiaryBg: number;
  tertiaryBgHover: number;
  tertiaryBgPressed: number;
  tertiaryText: number;

  // Error
  errorBg: number;
  errorBgHover: number;
  errorBgPressed: number;
  errorText: number;

  // Surface
  surfaceBg: number;
  surfaceBgHover: number;
  surfaceBgPressed: number;
  surfaceText: number;
  surfaceBorder: number;

  // Outline
  outlineBg: number;
  outlineBgHover: number;
  outlineBgPressed: number;
  outlineText: number;
  outlineBorder: number;

  // Ghost
  ghostBg: number;
  ghostBgHover: number;
  ghostBgPressed: number;
  ghostText: number;

  // Card (surface-container 기반)
  cardBg: number;
  cardBgHover: number;
  cardBorder: number;
}

// ============================================
// CSS Variable Reading
// ============================================

/**
 * CSS 변수 값을 읽어옴
 */
function getCSSVariable(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * CSS 색상 문자열을 hex 숫자로 변환
 *
 * 🚀 Phase 22: colord 기반으로 리팩토링
 * 지원: hex, rgb, rgba, hsl, hsla, named colors, color-mix 등
 */
function cssColorToHex(color: string, fallback: number): number {
  if (!color) return fallback;

  // color-mix() 처리 - 브라우저가 계산한 값을 canvas로 읽어옴
  if (color.startsWith('color-mix')) {
    return resolveColorMix(color, fallback);
  }

  // colord 기반 파싱 (hex, rgb, hsl, named colors 등 모두 지원)
  return cssColorToPixiHex(color, fallback);
}

/**
 * color-mix() 값을 실제 색상으로 변환
 * 임시 DOM 요소를 사용하여 브라우저가 계산한 값을 읽어옴
 */
function resolveColorMix(colorMix: string, fallback: number): number {
  try {
    const tempDiv = document.createElement('div');
    tempDiv.style.color = colorMix;
    tempDiv.style.display = 'none';
    document.body.appendChild(tempDiv);

    const computedColor = getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);

    return cssColorToHex(computedColor, fallback);
  } catch {
    return fallback;
  }
}

/**
 * 색상을 어둡게 (black과 mix)
 * @param color hex 색상
 * @param percent 원본 색상 비율 (92 = 92% 원본 + 8% black)
 */
function mixWithBlack(color: number, percent: number): number {
  const ratio = percent / 100;
  const r = Math.round(((color >> 16) & 0xff) * ratio);
  const g = Math.round(((color >> 8) & 0xff) * ratio);
  const b = Math.round((color & 0xff) * ratio);
  return (r << 16) | (g << 8) | b;
}

/**
 * 색상을 밝게 (white와 mix)
 * @param color hex 색상
 * @param percent primary 색상 비율 (8 = 8% primary + 92% white)
 */
function mixWithWhite(color: number, percent: number): number {
  const ratio = percent / 100;
  const whiteRatio = 1 - ratio;
  const r = Math.round(((color >> 16) & 0xff) * ratio + 255 * whiteRatio);
  const g = Math.round(((color >> 8) & 0xff) * ratio + 255 * whiteRatio);
  const b = Math.round((color & 0xff) * ratio + 255 * whiteRatio);
  return (r << 16) | (g << 8) | b;
}

// ============================================
// Fallback Colors (M3 Light Mode)
// ============================================

const FALLBACK_COLORS = {
  primary: 0x6750a4,
  onPrimary: 0xffffff,
  secondary: 0x625b71,
  onSecondary: 0xffffff,
  tertiary: 0x7d5260,
  onTertiary: 0xffffff,
  error: 0xb3261e,
  onError: 0xffffff,
  surfaceContainer: 0xf3edf7,       // --surface-container (Card 기본 배경)
  surfaceContainerHigh: 0xece6f0,
  surfaceContainerHighest: 0xe6e0e9,
  onSurface: 0x1d1b20,
  outline: 0x79747e,
  outlineVariant: 0xcac4d0,
};

// ============================================
// Main API
// ============================================

// ============================================
// Common Label Style (.react-aria-Label)
// ============================================

/**
 * Label 스타일 프리셋
 * 🚀 Phase 19: .react-aria-Label 클래스에서 공통 스타일 읽기
 */
export interface LabelStylePreset {
  fontSize: number;
  fontWeight: string;
  color: number;
  fontFamily: string;
}

const LABEL_STYLE_FALLBACKS: Record<string, LabelStylePreset> = {
  sm: { fontSize: 12, fontWeight: '500', color: 0x374151, fontFamily: 'Inter, system-ui, sans-serif' },
  md: { fontSize: 14, fontWeight: '500', color: 0x374151, fontFamily: 'Inter, system-ui, sans-serif' },
  lg: { fontSize: 16, fontWeight: '500', color: 0x374151, fontFamily: 'Inter, system-ui, sans-serif' },
};

/**
 * .react-aria-Label 클래스에서 스타일 읽기
 * 모든 Form 컴포넌트 (TextField, Input, RadioGroup, CheckboxGroup 등)에서 공통 사용
 */
export function getLabelStylePreset(size: string = 'md'): LabelStylePreset {
  const fallback = LABEL_STYLE_FALLBACKS[size] || LABEL_STYLE_FALLBACKS.md;

  try {
    // 임시 DOM 요소 생성 - .react-aria-Label 클래스 적용
    const label = document.createElement('label');
    label.className = 'react-aria-Label';
    label.style.position = 'absolute';
    label.style.visibility = 'hidden';
    label.style.pointerEvents = 'none';

    document.body.appendChild(label);

    const labelStyle = getComputedStyle(label);

    // 스타일 읽기
    const fontSize = parseFloat(labelStyle.fontSize) || fallback.fontSize;
    const fontWeight = labelStyle.fontWeight || fallback.fontWeight;
    const color = cssColorToHex(labelStyle.color, fallback.color);
    const fontFamily = labelStyle.fontFamily || fallback.fontFamily;

    document.body.removeChild(label);

    return {
      fontSize,
      fontWeight,
      color,
      fontFamily,
    };
  } catch {
    return fallback;
  }
}

/**
 * Description/FieldError 스타일 프리셋
 * 🚀 Phase 19: [slot="description"] / .react-aria-FieldError 클래스에서 스타일 읽기
 */
export interface DescriptionStylePreset {
  fontSize: number;
  color: number;
  errorColor: number;
  fontFamily: string;
}

const DESCRIPTION_STYLE_FALLBACKS: Record<string, DescriptionStylePreset> = {
  sm: { fontSize: 11, color: 0x6b7280, errorColor: 0xef4444, fontFamily: 'Inter, system-ui, sans-serif' },
  md: { fontSize: 12, color: 0x6b7280, errorColor: 0xef4444, fontFamily: 'Inter, system-ui, sans-serif' },
  lg: { fontSize: 14, color: 0x6b7280, errorColor: 0xef4444, fontFamily: 'Inter, system-ui, sans-serif' },
};

/**
 * Description / FieldError 스타일 읽기
 */
export function getDescriptionStylePreset(size: string = 'md'): DescriptionStylePreset {
  const fallback = DESCRIPTION_STYLE_FALLBACKS[size] || DESCRIPTION_STYLE_FALLBACKS.md;

  try {
    // TextField 컨테이너 내에서 description 스타일 읽기
    const textField = document.createElement('div');
    textField.className = 'react-aria-TextField';
    textField.style.position = 'absolute';
    textField.style.visibility = 'hidden';
    textField.style.pointerEvents = 'none';

    const description = document.createElement('div');
    description.slot = 'description';
    textField.appendChild(description);

    const fieldError = document.createElement('div');
    fieldError.className = 'react-aria-FieldError';
    textField.appendChild(fieldError);

    document.body.appendChild(textField);

    const descStyle = getComputedStyle(description);
    const errorStyle = getComputedStyle(fieldError);

    const fontSize = parseFloat(descStyle.fontSize) || fallback.fontSize;
    const color = cssColorToHex(descStyle.color, fallback.color);
    const errorColor = cssColorToHex(errorStyle.color, fallback.errorColor);
    const fontFamily = descStyle.fontFamily || fallback.fontFamily;

    document.body.removeChild(textField);

    return {
      fontSize,
      color,
      errorColor,
      fontFamily,
    };
  } catch {
    return fallback;
  }
}

// ============================================
// M3 Button Colors
// ============================================

/**
 * 현재 테마의 M3 버튼 색상을 읽어옴
 */
export function getM3ButtonColors(): M3ButtonColors {
  // CSS 변수에서 색상 읽기
  const primary = cssColorToHex(getCSSVariable('--primary'), FALLBACK_COLORS.primary);
  const onPrimary = cssColorToHex(getCSSVariable('--on-primary'), FALLBACK_COLORS.onPrimary);
  const secondary = cssColorToHex(getCSSVariable('--secondary'), FALLBACK_COLORS.secondary);
  const onSecondary = cssColorToHex(getCSSVariable('--on-secondary'), FALLBACK_COLORS.onSecondary);
  const tertiary = cssColorToHex(getCSSVariable('--tertiary'), FALLBACK_COLORS.tertiary);
  const onTertiary = cssColorToHex(getCSSVariable('--on-tertiary'), FALLBACK_COLORS.onTertiary);
  const error = cssColorToHex(getCSSVariable('--error'), FALLBACK_COLORS.error);
  const onError = cssColorToHex(getCSSVariable('--on-error'), FALLBACK_COLORS.onError);
  const surfaceContainer = cssColorToHex(getCSSVariable('--surface-container'), FALLBACK_COLORS.surfaceContainer);
  const surfaceContainerHigh = cssColorToHex(getCSSVariable('--surface-container-high'), FALLBACK_COLORS.surfaceContainerHigh);
  const surfaceContainerHighest = cssColorToHex(getCSSVariable('--surface-container-highest'), FALLBACK_COLORS.surfaceContainerHighest);
  const onSurface = cssColorToHex(getCSSVariable('--on-surface'), FALLBACK_COLORS.onSurface);
  const outline = cssColorToHex(getCSSVariable('--outline'), FALLBACK_COLORS.outline);
  const outlineVariant = cssColorToHex(getCSSVariable('--outline-variant'), FALLBACK_COLORS.outlineVariant);

  return {
    // Default
    defaultBg: surfaceContainerHigh,
    defaultBgHover: mixWithBlack(surfaceContainerHigh, 92),
    defaultBgPressed: mixWithBlack(surfaceContainerHigh, 88),
    defaultText: onSurface,
    defaultBorder: outlineVariant,

    // Primary
    primaryBg: primary,
    primaryBgHover: mixWithBlack(primary, 92),
    primaryBgPressed: mixWithBlack(primary, 88),
    primaryText: onPrimary,

    // Secondary
    secondaryBg: secondary,
    secondaryBgHover: mixWithBlack(secondary, 92),
    secondaryBgPressed: mixWithBlack(secondary, 88),
    secondaryText: onSecondary,

    // Tertiary
    tertiaryBg: tertiary,
    tertiaryBgHover: mixWithBlack(tertiary, 92),
    tertiaryBgPressed: mixWithBlack(tertiary, 88),
    tertiaryText: onTertiary,

    // Error
    errorBg: error,
    errorBgHover: mixWithBlack(error, 92),
    errorBgPressed: mixWithBlack(error, 88),
    errorText: onError,

    // Surface
    surfaceBg: surfaceContainerHighest,
    surfaceBgHover: mixWithBlack(surfaceContainerHighest, 92),
    surfaceBgPressed: mixWithBlack(surfaceContainerHighest, 88),
    surfaceText: onSurface,
    surfaceBorder: outlineVariant,

    // Outline (transparent bg, primary text)
    outlineBg: 0xffffff,
    outlineBgHover: mixWithWhite(primary, 8),
    outlineBgPressed: mixWithWhite(primary, 12),
    outlineText: primary,
    outlineBorder: outline,

    // Ghost (transparent bg, primary text)
    ghostBg: 0xffffff,
    ghostBgHover: mixWithWhite(primary, 8),
    ghostBgPressed: mixWithWhite(primary, 12),
    ghostText: primary,

    // Card (surface-container 기반 - .react-aria-Card 동기화)
    cardBg: surfaceContainer,
    cardBgHover: mixWithBlack(surfaceContainer, 92),
    cardBorder: outlineVariant,
  };
}

/**
 * --outline-variant 색상 가져오기 (캔버스 경계선 등)
 */
export function getOutlineVariantColor(): number {
  return cssColorToHex(getCSSVariable('--outline-variant'), FALLBACK_COLORS.outlineVariant);
}

/**
 * variant 이름으로 색상 가져오기
 */
export function getVariantColors(
  variant: string,
  colors: M3ButtonColors
): {
  bg: number;
  bgHover: number;
  bgPressed: number;
  text: number;
  border?: number;
  bgAlpha?: number;
} {
  switch (variant) {
    case 'primary':
      return {
        bg: colors.primaryBg,
        bgHover: colors.primaryBgHover,
        bgPressed: colors.primaryBgPressed,
        text: colors.primaryText,
      };
    case 'secondary':
      return {
        bg: colors.secondaryBg,
        bgHover: colors.secondaryBgHover,
        bgPressed: colors.secondaryBgPressed,
        text: colors.secondaryText,
      };
    case 'tertiary':
      return {
        bg: colors.tertiaryBg,
        bgHover: colors.tertiaryBgHover,
        bgPressed: colors.tertiaryBgPressed,
        text: colors.tertiaryText,
      };
    case 'error':
      return {
        bg: colors.errorBg,
        bgHover: colors.errorBgHover,
        bgPressed: colors.errorBgPressed,
        text: colors.errorText,
      };
    case 'surface':
      return {
        bg: colors.surfaceBg,
        bgHover: colors.surfaceBgHover,
        bgPressed: colors.surfaceBgPressed,
        text: colors.surfaceText,
        border: colors.surfaceBorder,
      };
    case 'outline':
      return {
        bg: colors.outlineBg,
        bgHover: colors.outlineBgHover,
        bgPressed: colors.outlineBgPressed,
        text: colors.outlineText,
        border: colors.outlineBorder,
        bgAlpha: 0,
      };
    case 'ghost':
      return {
        bg: colors.ghostBg,
        bgHover: colors.ghostBgHover,
        bgPressed: colors.ghostBgPressed,
        text: colors.ghostText,
        bgAlpha: 0,
      };
    case 'default':
    default:
      return {
        bg: colors.defaultBg,
        bgHover: colors.defaultBgHover,
        bgPressed: colors.defaultBgPressed,
        text: colors.defaultText,
        border: colors.defaultBorder,
      };
  }
}

// ============================================
// Size Preset Reading (Dynamic CSS Variables)
// ============================================

/**
 * Button/Component 사이즈 프리셋 타입
 */
export interface SizePreset {
  fontSize: number;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
}

/**
 * CSS 변수에서 px 값 파싱
 * rem → px 변환 (1rem = 16px 기준)
 */
function parseCSSValue(value: string, fallback: number): number {
  if (!value) return fallback;

  const trimmed = value.trim();

  // px 값
  if (trimmed.endsWith('px')) {
    return parseFloat(trimmed) || fallback;
  }

  // rem 값 → px 변환 (1rem = 16px)
  if (trimmed.endsWith('rem')) {
    const remValue = parseFloat(trimmed);
    return remValue ? remValue * 16 : fallback;
  }

  // 숫자만 있는 경우
  const num = parseFloat(trimmed);
  return isNaN(num) ? fallback : num;
}

/**
 * Button.css 사이즈별 CSS 변수 매핑
 *
 * CSS 정의:
 * - xs: font-size: var(--text-2xs), padding: var(--spacing-2xs) var(--spacing-sm)
 * - sm: font-size: var(--text-sm),  padding: var(--spacing) var(--spacing-md)
 * - md: font-size: var(--text-base), padding: var(--spacing-sm) var(--spacing-xl)
 * - lg: font-size: var(--text-lg),  padding: var(--spacing-md) var(--spacing-2xl)
 * - xl: font-size: var(--text-xl),  padding: var(--spacing-lg) var(--spacing-3xl)
 */
const SIZE_CSS_MAPPING: Record<string, { fontSize: string; paddingY: string; paddingX: string; borderRadius: string }> = {
  xs: { fontSize: '--text-2xs', paddingY: '--spacing-2xs', paddingX: '--spacing-sm', borderRadius: '--radius-sm' },
  sm: { fontSize: '--text-sm', paddingY: '--spacing', paddingX: '--spacing-md', borderRadius: '--radius-sm' },
  md: { fontSize: '--text-base', paddingY: '--spacing-sm', paddingX: '--spacing-xl', borderRadius: '--radius-md' },
  lg: { fontSize: '--text-lg', paddingY: '--spacing-md', paddingX: '--spacing-2xl', borderRadius: '--radius-lg' },
  xl: { fontSize: '--text-xl', paddingY: '--spacing-lg', paddingX: '--spacing-3xl', borderRadius: '--radius-lg' },
};

/**
 * Fallback 값 (CSS 변수 읽기 실패 시)
 * shared-tokens.css와 동기화
 */
const SIZE_FALLBACKS: Record<string, SizePreset> = {
  xs: { fontSize: 10, paddingX: 8, paddingY: 2, borderRadius: 4 },
  sm: { fontSize: 14, paddingX: 12, paddingY: 4, borderRadius: 4 },
  md: { fontSize: 16, paddingX: 24, paddingY: 8, borderRadius: 6 },
  lg: { fontSize: 18, paddingX: 32, paddingY: 12, borderRadius: 8 },
  xl: { fontSize: 20, paddingX: 40, paddingY: 16, borderRadius: 8 },
};

/**
 * 사이즈별 프리셋을 CSS 변수에서 동적으로 읽어옴
 *
 * CSS 스타일시트 값 변경 시 WebGL 컴포넌트에도 자동 반영
 *
 * @param size - 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @returns SizePreset with fontSize, paddingX, paddingY, borderRadius
 *
 * @example
 * const preset = getSizePreset('md');
 * // { fontSize: 16, paddingX: 24, paddingY: 8, borderRadius: 6 }
 */
export function getSizePreset(size: string): SizePreset {
  const mapping = SIZE_CSS_MAPPING[size];
  const fallback = SIZE_FALLBACKS[size] || SIZE_FALLBACKS.sm;

  if (!mapping) {
    return fallback;
  }

  // CSS 변수에서 값 읽기
  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const paddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.paddingX);
  const paddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.paddingY);
  const borderRadius = parseCSSValue(getCSSVariable(mapping.borderRadius), fallback.borderRadius);

  return { fontSize, paddingX, paddingY, borderRadius };
}

/**
 * 모든 사이즈 프리셋을 한번에 읽어옴
 * 컴포넌트 초기화 시 사용
 *
 * @returns Record<string, SizePreset>
 */
export function getAllSizePresets(): Record<string, SizePreset> {
  return {
    xs: getSizePreset('xs'),
    sm: getSizePreset('sm'),
    md: getSizePreset('md'),
    lg: getSizePreset('lg'),
    xl: getSizePreset('xl'),
  };
}

/**
 * Checkbox/Radio 등 컴포넌트용 사이즈 프리셋
 * 체크박스 박스 크기만 다름
 */
export interface CheckboxSizePreset {
  boxSize: number;
  fontSize: number;
  gap: number;
}

const CHECKBOX_SIZE_MAPPING: Record<string, { boxSize: string; fontSize: string }> = {
  sm: { boxSize: '--spacing-lg', fontSize: '--text-sm' },       // 16px box
  md: { boxSize: '--spacing-xl', fontSize: '--text-sm' },       // 24px box → 실제 20px 원함
  lg: { boxSize: '--spacing-xl', fontSize: '--text-base' },     // 24px box
};

const CHECKBOX_FALLBACKS: Record<string, CheckboxSizePreset> = {
  sm: { boxSize: 16, fontSize: 14, gap: 8 },
  md: { boxSize: 20, fontSize: 14, gap: 8 },
  lg: { boxSize: 24, fontSize: 16, gap: 8 },
};

/**
 * Checkbox/Radio 사이즈 프리셋 읽기
 */
export function getCheckboxSizePreset(size: string): CheckboxSizePreset {
  const mapping = CHECKBOX_SIZE_MAPPING[size];
  const fallback = CHECKBOX_FALLBACKS[size] || CHECKBOX_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  // CSS 변수에서 읽되, md의 경우 특수 처리 (20px 고정)
  const boxSize = size === 'md'
    ? 20
    : parseCSSValue(getCSSVariable(mapping.boxSize), fallback.boxSize);
  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const gap = parseCSSValue(getCSSVariable('--spacing-sm'), fallback.gap);

  return { boxSize, fontSize, gap };
}

// ============================================
// Slider Size Preset
// ============================================

/**
 * Slider 컴포넌트용 사이즈 프리셋
 *
 * CSS 정의 (Slider.css):
 * - sm: trackHeight: 24px, trackWidth: 1px, thumbSize: var(--text-xl)
 * - md: trackHeight: 30px, trackWidth: 2px, thumbSize: var(--text-2xl)
 * - lg: trackHeight: 36px, trackWidth: 3px, thumbSize: var(--text-3xl)
 */
export interface SliderSizePreset {
  trackHeight: number;
  trackWidth: number;
  thumbSize: number;
}

const SLIDER_SIZE_MAPPING: Record<string, { thumbSize: string }> = {
  sm: { thumbSize: '--text-xl' },   // 20px
  md: { thumbSize: '--text-2xl' },  // 24px
  lg: { thumbSize: '--text-3xl' },  // 30px
};

const SLIDER_FALLBACKS: Record<string, SliderSizePreset> = {
  sm: { trackHeight: 24, trackWidth: 1, thumbSize: 20 },
  md: { trackHeight: 30, trackWidth: 2, thumbSize: 24 },
  lg: { trackHeight: 36, trackWidth: 3, thumbSize: 30 },
};

/**
 * Slider 사이즈 프리셋 읽기
 */
export function getSliderSizePreset(size: string): SliderSizePreset {
  const mapping = SLIDER_SIZE_MAPPING[size];
  const fallback = SLIDER_FALLBACKS[size] || SLIDER_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const thumbSize = parseCSSValue(getCSSVariable(mapping.thumbSize), fallback.thumbSize);

  // trackHeight와 trackWidth는 CSS에서 하드코딩됨
  return {
    trackHeight: fallback.trackHeight,
    trackWidth: fallback.trackWidth,
    thumbSize,
  };
}

// ============================================
// Radio Size Preset
// ============================================

/**
 * Radio 컴포넌트용 사이즈 프리셋
 *
 * CSS 정의 (Radio.css):
 * - sm: radioSize: var(--text-lg), fontSize: var(--text-sm), selectedBorderWidth: 5px
 * - md: radioSize: var(--text-xl), fontSize: var(--text-base), selectedBorderWidth: ~10px
 * - lg: radioSize: var(--text-2xl), fontSize: var(--text-lg), selectedBorderWidth: 6px
 *
 * CSS 동기화 (RadioGroup.css):
 * - .react-aria-RadioGroup { display: flex; flex-direction: column; gap: var(--gap); }
 */
export interface RadioSizePreset {
  radioSize: number;
  fontSize: number;
  selectedBorderWidth: number;
  gap: number;
  labelGap: number;
}

const RADIO_SIZE_MAPPING: Record<string, { radioSize: string; fontSize: string; gap: string }> = {
  sm: { radioSize: '--text-lg', fontSize: '--text-sm', gap: '--gap' },
  md: { radioSize: '--text-xl', fontSize: '--text-base', gap: '--gap' },
  lg: { radioSize: '--text-2xl', fontSize: '--text-lg', gap: '--gap' },
};

const RADIO_FALLBACKS: Record<string, RadioSizePreset> = {
  sm: { radioSize: 18, fontSize: 14, selectedBorderWidth: 5, gap: 8, labelGap: 6 },
  md: { radioSize: 20, fontSize: 16, selectedBorderWidth: 6, gap: 12, labelGap: 8 },
  lg: { radioSize: 24, fontSize: 18, selectedBorderWidth: 7, gap: 16, labelGap: 10 },
};

/**
 * Radio 사이즈 프리셋 읽기
 */
export function getRadioSizePreset(size: string): RadioSizePreset {
  const mapping = RADIO_SIZE_MAPPING[size];
  const fallback = RADIO_FALLBACKS[size] || RADIO_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const radioSize = parseCSSValue(getCSSVariable(mapping.radioSize), fallback.radioSize);
  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const gap = parseCSSValue(getCSSVariable(mapping.gap), fallback.gap);

  return {
    radioSize,
    fontSize,
    selectedBorderWidth: fallback.selectedBorderWidth,
    gap,
    labelGap: fallback.labelGap,
  };
}

// ============================================
// ProgressBar Size Preset
// ============================================

/**
 * ProgressBar 컴포넌트용 사이즈 프리셋
 *
 * CSS 정의 (ProgressBar.css):
 * - sm: width: 200px, barHeight: 6px, fontSize: var(--text-sm), borderRadius: var(--radius-sm)
 * - md: width: 250px, barHeight: 10px, fontSize: var(--text-base), borderRadius: var(--radius-md)
 * - lg: width: 300px, barHeight: 14px, fontSize: var(--text-lg), borderRadius: var(--radius-lg)
 */
export interface ProgressBarSizePreset {
  width: number;
  barHeight: number;
  fontSize: number;
  borderRadius: number;
}

const PROGRESSBAR_SIZE_MAPPING: Record<string, { fontSize: string; borderRadius: string }> = {
  sm: { fontSize: '--text-sm', borderRadius: '--radius-sm' },
  md: { fontSize: '--text-base', borderRadius: '--radius-md' },
  lg: { fontSize: '--text-lg', borderRadius: '--radius-lg' },
};

const PROGRESSBAR_FALLBACKS: Record<string, ProgressBarSizePreset> = {
  sm: { width: 200, barHeight: 6, fontSize: 14, borderRadius: 4 },
  md: { width: 250, barHeight: 10, fontSize: 16, borderRadius: 6 },
  lg: { width: 300, barHeight: 14, fontSize: 18, borderRadius: 8 },
};

/**
 * ProgressBar 사이즈 프리셋 읽기
 */
export function getProgressBarSizePreset(size: string): ProgressBarSizePreset {
  const mapping = PROGRESSBAR_SIZE_MAPPING[size];
  const fallback = PROGRESSBAR_FALLBACKS[size] || PROGRESSBAR_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const borderRadius = parseCSSValue(getCSSVariable(mapping.borderRadius), fallback.borderRadius);

  return {
    width: fallback.width,
    barHeight: fallback.barHeight,
    fontSize,
    borderRadius,
  };
}

// ============================================
// Input (TextField) Size Preset
// ============================================

/**
 * Input/TextField 컴포넌트용 사이즈 프리셋
 *
 * CSS 정의 (TextField.css):
 * - sm: labelSize: var(--text-xs), paddingY: var(--spacing-sm), paddingX: var(--spacing), fontSize: var(--text-xs)
 * - md: labelSize: var(--text-sm), paddingY: var(--spacing), paddingX: var(--spacing-md), fontSize: var(--text-sm)
 * - lg: labelSize: var(--text-base), paddingY: var(--spacing-md), paddingX: var(--spacing-lg), fontSize: var(--text-base)
 */
export interface InputSizePreset {
  fontSize: number;
  labelSize: number;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
}

const INPUT_SIZE_MAPPING: Record<string, { labelSize: string; fontSize: string; paddingY: string; paddingX: string }> = {
  sm: { labelSize: '--text-xs', fontSize: '--text-xs', paddingY: '--spacing-sm', paddingX: '--spacing' },
  md: { labelSize: '--text-sm', fontSize: '--text-sm', paddingY: '--spacing', paddingX: '--spacing-md' },
  lg: { labelSize: '--text-base', fontSize: '--text-base', paddingY: '--spacing-md', paddingX: '--spacing-lg' },
};

const INPUT_FALLBACKS: Record<string, InputSizePreset> = {
  sm: { fontSize: 12, labelSize: 12, paddingX: 8, paddingY: 6, borderRadius: 6 },
  md: { fontSize: 14, labelSize: 14, paddingX: 12, paddingY: 8, borderRadius: 6 },
  lg: { fontSize: 16, labelSize: 16, paddingX: 16, paddingY: 12, borderRadius: 6 },
};

/**
 * Input 사이즈 프리셋 읽기
 */
export function getInputSizePreset(size: string): InputSizePreset {
  const mapping = INPUT_SIZE_MAPPING[size];
  const fallback = INPUT_FALLBACKS[size] || INPUT_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const labelSize = parseCSSValue(getCSSVariable(mapping.labelSize), fallback.labelSize);
  const paddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.paddingX);
  const paddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.paddingY);
  const borderRadius = parseCSSValue(getCSSVariable('--border-radius'), fallback.borderRadius);

  return { fontSize, labelSize, paddingX, paddingY, borderRadius };
}

// ============================================
// Select Size Preset
// ============================================

/**
 * Select 컴포넌트용 사이즈 프리셋
 *
 * CSS 정의 (Select.css):
 * - sm: labelSize: var(--text-xs), paddingY: var(--spacing-sm), paddingX: var(--spacing), fontSize: var(--text-xs), chevronSize: 20px
 * - md: labelSize: var(--text-sm), paddingY: var(--spacing), paddingX: var(--spacing-md), fontSize: var(--text-sm), chevronSize: 24px
 * - lg: labelSize: var(--text-base), paddingY: var(--spacing-md), paddingX: var(--spacing-lg), fontSize: var(--text-base), chevronSize: 28px
 */
export interface SelectSizePreset {
  fontSize: number;
  labelSize: number;
  paddingX: number;
  paddingY: number;
  chevronSize: number;
  borderRadius: number;
}

const SELECT_SIZE_MAPPING: Record<string, { labelSize: string; fontSize: string; paddingY: string; paddingX: string }> = {
  sm: { labelSize: '--text-xs', fontSize: '--text-xs', paddingY: '--spacing-sm', paddingX: '--spacing' },
  md: { labelSize: '--text-sm', fontSize: '--text-sm', paddingY: '--spacing', paddingX: '--spacing-md' },
  lg: { labelSize: '--text-base', fontSize: '--text-base', paddingY: '--spacing-md', paddingX: '--spacing-lg' },
};

const SELECT_FALLBACKS: Record<string, SelectSizePreset> = {
  sm: { fontSize: 12, labelSize: 12, paddingX: 8, paddingY: 6, chevronSize: 20, borderRadius: 6 },
  md: { fontSize: 14, labelSize: 14, paddingX: 12, paddingY: 8, chevronSize: 24, borderRadius: 6 },
  lg: { fontSize: 16, labelSize: 16, paddingX: 16, paddingY: 12, chevronSize: 28, borderRadius: 6 },
};

/**
 * Select 사이즈 프리셋 읽기
 */
export function getSelectSizePreset(size: string): SelectSizePreset {
  const mapping = SELECT_SIZE_MAPPING[size];
  const fallback = SELECT_FALLBACKS[size] || SELECT_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const labelSize = parseCSSValue(getCSSVariable(mapping.labelSize), fallback.labelSize);
  const paddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.paddingX);
  const paddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.paddingY);
  const borderRadius = parseCSSValue(getCSSVariable('--border-radius'), fallback.borderRadius);

  return {
    fontSize,
    labelSize,
    paddingX,
    paddingY,
    chevronSize: fallback.chevronSize,
    borderRadius,
  };
}

// ============================================
// ToggleButton Size Preset
// ============================================

/**
 * ToggleButton 사이즈 프리셋
 *
 * CSS에서 읽어오는 값:
 * - sm: fontSize: var(--text-sm), paddingY: var(--spacing), paddingX: var(--spacing-md)
 * - md: fontSize: var(--text-base), paddingY: var(--spacing-sm), paddingX: var(--spacing-xl)
 * - lg: fontSize: var(--text-lg), paddingY: var(--spacing-md), paddingX: var(--spacing-2xl)
 */
export interface ToggleButtonSizePreset {
  fontSize: number;
  paddingY: number;
  paddingX: number;
  borderRadius: number;
}

const TOGGLE_BUTTON_SIZE_MAPPING: Record<string, { fontSize: string; paddingY: string; paddingX: string }> = {
  sm: { fontSize: '--text-sm', paddingY: '--spacing', paddingX: '--spacing-md' },
  md: { fontSize: '--text-base', paddingY: '--spacing-sm', paddingX: '--spacing-xl' },
  lg: { fontSize: '--text-lg', paddingY: '--spacing-md', paddingX: '--spacing-2xl' },
};

const TOGGLE_BUTTON_FALLBACKS: Record<string, ToggleButtonSizePreset> = {
  // @sync ToggleButton.css [data-size] padding 값과 일치해야 함
  // Button.css와 동일한 padding 사용: sm=4/12, md=8/24, lg=12/32
  sm: { fontSize: 14, paddingY: 4, paddingX: 12, borderRadius: 6 },   // --spacing, --spacing-md
  md: { fontSize: 16, paddingY: 8, paddingX: 24, borderRadius: 8 },   // --spacing-sm, --spacing-xl
  lg: { fontSize: 18, paddingY: 12, paddingX: 32, borderRadius: 10 }, // --spacing-md, --spacing-2xl
};

/**
 * ToggleButton 사이즈 프리셋 읽기
 */
export function getToggleButtonSizePreset(size: string): ToggleButtonSizePreset {
  const mapping = TOGGLE_BUTTON_SIZE_MAPPING[size];
  const fallback = TOGGLE_BUTTON_FALLBACKS[size] || TOGGLE_BUTTON_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const paddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.paddingY);
  const paddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.paddingX);
  const borderRadius = parseCSSValue(getCSSVariable('--radius-md'), fallback.borderRadius);

  return {
    fontSize,
    paddingY,
    paddingX,
    borderRadius,
  };
}

// ============================================
// ToggleButton Color Preset
// ============================================

/**
 * ToggleButton 색상 프리셋
 *
 * CSS에서 읽어오는 값 (variant별):
 * - default/unselected: bg=transparent, border=--color-gray-300, text=--color-gray-700
 * - selected (per variant): bg/border/text from CSS variables
 */
export interface ToggleButtonColorPreset {
  background: number;
  border: number;
  text: number;
  selectedBackground: number;
  selectedBorder: number;
  selectedText: number;
  hoverBackground: number;
  pressedBackground: number;
}

const TOGGLE_BUTTON_COLOR_FALLBACKS: Record<string, ToggleButtonColorPreset> = {
  default: {
    background: 0xffffff,
    border: 0xd1d5db,
    text: 0x374151,
    selectedBackground: 0x3b82f6,
    selectedBorder: 0x3b82f6,
    selectedText: 0xffffff,
    hoverBackground: 0xf3f4f6,
    pressedBackground: 0xe5e7eb,
  },
  primary: {
    background: 0xffffff,
    border: 0xd1d5db,
    text: 0x374151,
    selectedBackground: 0x3b82f6,
    selectedBorder: 0x3b82f6,
    selectedText: 0xffffff,
    hoverBackground: 0xdbeafe,
    pressedBackground: 0xbfdbfe,
  },
  secondary: {
    background: 0xffffff,
    border: 0xd1d5db,
    text: 0x374151,
    selectedBackground: 0x6366f1,
    selectedBorder: 0x6366f1,
    selectedText: 0xffffff,
    hoverBackground: 0xe0e7ff,
    pressedBackground: 0xc7d2fe,
  },
  surface: {
    background: 0xffffff,
    border: 0xd1d5db,
    text: 0x374151,
    selectedBackground: 0x6b7280,
    selectedBorder: 0x6b7280,
    selectedText: 0xffffff,
    hoverBackground: 0xf3f4f6,
    pressedBackground: 0xe5e7eb,
  },
};

/**
 * ToggleButton 색상 프리셋 읽기
 */
export function getToggleButtonColorPreset(variant: string): ToggleButtonColorPreset {
  const fallback = TOGGLE_BUTTON_COLOR_FALLBACKS[variant] || TOGGLE_BUTTON_COLOR_FALLBACKS.default;

  // CSS 변수에서 색상 읽기 시도 (fallback 사용)
  // ToggleButton CSS에서는 --tb-selected-bg 등의 변수 사용
  return {
    background: cssColorToHex(getCSSVariable('--color-white'), fallback.background),
    border: cssColorToHex(getCSSVariable('--color-gray-300'), fallback.border),
    text: cssColorToHex(getCSSVariable('--color-gray-700'), fallback.text),
    selectedBackground: fallback.selectedBackground,
    selectedBorder: fallback.selectedBorder,
    selectedText: fallback.selectedText,
    hoverBackground: fallback.hoverBackground,
    pressedBackground: fallback.pressedBackground,
  };
}

// ============================================
// ListBox Size Preset
// ============================================

/**
 * ListBox 사이즈 프리셋
 *
 * CSS에서 읽어오는 값:
 * - sm: fontSize: var(--text-xs), itemPaddingY: var(--spacing-sm), itemPaddingX: var(--spacing), itemHeight: 32px
 * - md: fontSize: var(--text-sm), itemPaddingY: var(--spacing), itemPaddingX: var(--spacing-md), itemHeight: 40px
 * - lg: fontSize: var(--text-base), itemPaddingY: var(--spacing-md), itemPaddingX: var(--spacing-lg), itemHeight: 48px
 */
export interface ListBoxSizePreset {
  fontSize: number;
  itemPaddingY: number;
  itemPaddingX: number;
  itemHeight: number;
  borderRadius: number;
  containerPadding: number;
  gap: number;
}

const LISTBOX_SIZE_MAPPING: Record<string, { fontSize: string; paddingY: string; paddingX: string }> = {
  sm: { fontSize: '--text-xs', paddingY: '--spacing-sm', paddingX: '--spacing' },
  md: { fontSize: '--text-sm', paddingY: '--spacing', paddingX: '--spacing-md' },
  lg: { fontSize: '--text-base', paddingY: '--spacing-md', paddingX: '--spacing-lg' },
};

const LISTBOX_FALLBACKS: Record<string, ListBoxSizePreset> = {
  sm: { fontSize: 12, itemPaddingY: 8, itemPaddingX: 4, itemHeight: 32, borderRadius: 4, containerPadding: 2, gap: 2 },
  md: { fontSize: 14, itemPaddingY: 4, itemPaddingX: 12, itemHeight: 40, borderRadius: 8, containerPadding: 4, gap: 4 },
  lg: { fontSize: 16, itemPaddingY: 12, itemPaddingX: 16, itemHeight: 48, borderRadius: 8, containerPadding: 8, gap: 6 },
};

/**
 * ListBox 사이즈 프리셋 읽기
 */
export function getListBoxSizePreset(size: string): ListBoxSizePreset {
  const mapping = LISTBOX_SIZE_MAPPING[size];
  const fallback = LISTBOX_FALLBACKS[size] || LISTBOX_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const itemPaddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.itemPaddingY);
  const itemPaddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.itemPaddingX);
  const borderRadius = parseCSSValue(getCSSVariable('--radius-xs'), fallback.borderRadius);

  return {
    fontSize,
    itemPaddingY,
    itemPaddingX,
    itemHeight: fontSize + itemPaddingY * 2 + 4, // 계산된 높이
    borderRadius,
    containerPadding: fallback.containerPadding,
    gap: fallback.gap,
  };
}

// ============================================
// ListBox Color Preset
// ============================================

/**
 * ListBox 색상 프리셋
 */
export interface ListBoxColorPreset {
  containerBackground: number;
  containerBorder: number;
  itemBackground: number;
  itemHoverBackground: number;
  itemSelectedBackground: number;
  textColor: number;
  selectedTextColor: number;
}

const LISTBOX_COLOR_FALLBACKS: Record<string, ListBoxColorPreset> = {
  primary: {
    containerBackground: 0xffffff,
    containerBorder: 0xe5e7eb,
    itemBackground: 0xffffff,
    itemHoverBackground: 0xf3f4f6,
    itemSelectedBackground: 0xdbeafe,
    textColor: 0x374151,
    selectedTextColor: 0x1e40af,
  },
  secondary: {
    containerBackground: 0xffffff,
    containerBorder: 0xe5e7eb,
    itemBackground: 0xffffff,
    itemHoverBackground: 0xf3f4f6,
    itemSelectedBackground: 0xe0e7ff,
    textColor: 0x374151,
    selectedTextColor: 0x3730a3,
  },
  tertiary: {
    containerBackground: 0xffffff,
    containerBorder: 0xe5e7eb,
    itemBackground: 0xffffff,
    itemHoverBackground: 0xf3f4f6,
    itemSelectedBackground: 0xfce7f3,
    textColor: 0x374151,
    selectedTextColor: 0x9d174d,
  },
  error: {
    containerBackground: 0xffffff,
    containerBorder: 0xfca5a5,
    itemBackground: 0xffffff,
    itemHoverBackground: 0xfef2f2,
    itemSelectedBackground: 0xfee2e2,
    textColor: 0x374151,
    selectedTextColor: 0xb91c1c,
  },
  filled: {
    containerBackground: 0xf3f4f6,
    containerBorder: 0xf3f4f6,
    itemBackground: 0xf3f4f6,
    itemHoverBackground: 0xe5e7eb,
    itemSelectedBackground: 0xdbeafe,
    textColor: 0x374151,
    selectedTextColor: 0x1e40af,
  },
  surface: {
    containerBackground: 0xffffff,
    containerBorder: 0xe5e7eb,
    itemBackground: 0xffffff,
    itemHoverBackground: 0xf3f4f6,
    itemSelectedBackground: 0xf3f4f6,
    textColor: 0x374151,
    selectedTextColor: 0x111827,
  },
};

/**
 * ListBox 색상 프리셋 읽기
 */
export function getListBoxColorPreset(variant: string): ListBoxColorPreset {
  return LISTBOX_COLOR_FALLBACKS[variant] || LISTBOX_COLOR_FALLBACKS.primary;
}

// ============================================
// Badge Size Preset
// ============================================

/**
 * Badge 사이즈 프리셋
 *
 * CSS에서 읽어오는 값:
 * - sm: fontSize: var(--text-sm), paddingY: 2px, paddingX: var(--spacing-md), height: 20px
 * - md: fontSize: var(--text-base), paddingY: var(--spacing-sm), paddingX: var(--spacing-md), height: 24px
 * - lg: fontSize: var(--text-lg), paddingY: var(--spacing-sm), paddingX: var(--spacing-lg), height: 28px
 */
export interface BadgeSizePreset {
  fontSize: number;
  paddingY: number;
  paddingX: number;
  height: number;
  minWidth: number;
  dotSize: number;
}

const BADGE_SIZE_MAPPING: Record<string, { fontSize: string; paddingX: string }> = {
  sm: { fontSize: '--text-sm', paddingX: '--spacing-md' },
  md: { fontSize: '--text-base', paddingX: '--spacing-md' },
  lg: { fontSize: '--text-lg', paddingX: '--spacing-lg' },
};

const BADGE_FALLBACKS: Record<string, BadgeSizePreset> = {
  sm: { fontSize: 14, paddingY: 2, paddingX: 12, height: 20, minWidth: 20, dotSize: 8 },
  md: { fontSize: 16, paddingY: 8, paddingX: 12, height: 24, minWidth: 24, dotSize: 10 },
  lg: { fontSize: 18, paddingY: 8, paddingX: 16, height: 28, minWidth: 28, dotSize: 12 },
};

/**
 * Badge 사이즈 프리셋 읽기
 */
export function getBadgeSizePreset(size: string): BadgeSizePreset {
  const mapping = BADGE_SIZE_MAPPING[size];
  const fallback = BADGE_FALLBACKS[size] || BADGE_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const paddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.paddingX);

  return {
    fontSize,
    paddingY: fallback.paddingY,
    paddingX,
    height: fallback.height,
    minWidth: fallback.minWidth,
    dotSize: fallback.dotSize,
  };
}

// ============================================
// Badge Color Preset
// ============================================

/**
 * Badge 색상 프리셋
 */
export interface BadgeColorPreset {
  background: number;
  text: number;
}

const BADGE_COLOR_FALLBACKS: Record<string, BadgeColorPreset> = {
  default: { background: 0xe5e7eb, text: 0x6b7280 },
  primary: { background: 0x3b82f6, text: 0xffffff },
  secondary: { background: 0x6366f1, text: 0xffffff },
  tertiary: { background: 0xec4899, text: 0xffffff },
  error: { background: 0xef4444, text: 0xffffff },
  surface: { background: 0xf3f4f6, text: 0x374151 },
};

/**
 * Badge 색상 프리셋 읽기
 */
export function getBadgeColorPreset(variant: string): BadgeColorPreset {
  return BADGE_COLOR_FALLBACKS[variant] || BADGE_COLOR_FALLBACKS.default;
}

// ============================================
// Meter Size Preset
// ============================================

/**
 * Meter 사이즈 프리셋
 *
 * CSS에서 읽어오는 값:
 * - sm: width: 200px, barHeight: 6px, fontSize: var(--text-sm)
 * - md: width: 250px, barHeight: 10px, fontSize: var(--text-base)
 * - lg: width: 300px, barHeight: 14px, fontSize: var(--text-lg)
 */
export interface MeterSizePreset {
  width: number;
  barHeight: number;
  borderRadius: number;
  fontSize: number;
  gap: number;
}

const METER_SIZE_MAPPING: Record<string, { fontSize: string; borderRadius: string }> = {
  sm: { fontSize: '--text-sm', borderRadius: '--radius-sm' },
  md: { fontSize: '--text-base', borderRadius: '--radius-md' },
  lg: { fontSize: '--text-lg', borderRadius: '--radius-lg' },
};

const METER_FALLBACKS: Record<string, MeterSizePreset> = {
  sm: { width: 200, barHeight: 6, borderRadius: 4, fontSize: 14, gap: 4 },
  md: { width: 250, barHeight: 10, borderRadius: 8, fontSize: 16, gap: 4 },
  lg: { width: 300, barHeight: 14, borderRadius: 12, fontSize: 18, gap: 4 },
};

/**
 * Meter 사이즈 프리셋 읽기
 */
export function getMeterSizePreset(size: string): MeterSizePreset {
  const mapping = METER_SIZE_MAPPING[size];
  const fallback = METER_FALLBACKS[size] || METER_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const borderRadius = parseCSSValue(getCSSVariable(mapping.borderRadius), fallback.borderRadius);

  return {
    width: fallback.width,
    barHeight: fallback.barHeight,
    borderRadius,
    fontSize,
    gap: fallback.gap,
  };
}

// ============================================
// Meter Color Preset
// ============================================

/**
 * Meter 색상 프리셋
 */
export interface MeterColorPreset {
  trackColor: number;
  fillColor: number;
  labelColor: number;
  valueColor: number;
}

const METER_COLOR_FALLBACKS: Record<string, MeterColorPreset> = {
  default: { trackColor: 0xe5e7eb, fillColor: 0x3b82f6, labelColor: 0x374151, valueColor: 0x6b7280 },
  primary: { trackColor: 0xe5e7eb, fillColor: 0x3b82f6, labelColor: 0x374151, valueColor: 0x6b7280 },
  secondary: { trackColor: 0xe5e7eb, fillColor: 0x6366f1, labelColor: 0x374151, valueColor: 0x6b7280 },
  tertiary: { trackColor: 0xe5e7eb, fillColor: 0xec4899, labelColor: 0x374151, valueColor: 0x6b7280 },
  error: { trackColor: 0xe5e7eb, fillColor: 0xef4444, labelColor: 0x374151, valueColor: 0x6b7280 },
  surface: { trackColor: 0xe5e7eb, fillColor: 0x6b7280, labelColor: 0x374151, valueColor: 0x6b7280 },
};

/**
 * Meter 색상 프리셋 읽기
 */
export function getMeterColorPreset(variant: string): MeterColorPreset {
  return METER_COLOR_FALLBACKS[variant] || METER_COLOR_FALLBACKS.primary;
}

// ============================================
// Phase 2: Separator Size Preset
// ============================================

/**
 * Separator 사이즈 프리셋
 *
 * CSS에서 읽어오는 값:
 * - sm: thickness: 1px, margin: var(--spacing-2)
 * - md: thickness: 1px, margin: var(--spacing-4)
 * - lg: thickness: 2px, margin: var(--spacing-6)
 */
export interface SeparatorSizePreset {
  thickness: number;
  margin: number;
}

const SEPARATOR_SIZE_MAPPING: Record<string, { margin: string }> = {
  sm: { margin: '--spacing-2' },
  md: { margin: '--spacing-4' },
  lg: { margin: '--spacing-6' },
};

const SEPARATOR_FALLBACKS: Record<string, SeparatorSizePreset> = {
  sm: { thickness: 1, margin: 4 },
  md: { thickness: 1, margin: 8 },
  lg: { thickness: 2, margin: 12 },
};

/**
 * Separator 사이즈 프리셋 읽기
 */
export function getSeparatorSizePreset(size: string): SeparatorSizePreset {
  const mapping = SEPARATOR_SIZE_MAPPING[size];
  const fallback = SEPARATOR_FALLBACKS[size] || SEPARATOR_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const margin = parseCSSValue(getCSSVariable(mapping.margin), fallback.margin);

  return {
    thickness: fallback.thickness,
    margin,
  };
}

/**
 * Separator 색상 프리셋
 */
export interface SeparatorColorPreset {
  color: number;
}

const SEPARATOR_COLOR_FALLBACKS: Record<string, SeparatorColorPreset> = {
  default: { color: 0xcad3dc },
  primary: { color: 0x3b82f6 },
  secondary: { color: 0x6366f1 },
  surface: { color: 0x9ca3af },
};

/**
 * Separator 색상 프리셋 읽기
 */
export function getSeparatorColorPreset(variant: string): SeparatorColorPreset {
  return SEPARATOR_COLOR_FALLBACKS[variant] || SEPARATOR_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 2: Link Size Preset
// ============================================

/**
 * Link 사이즈 프리셋
 *
 * CSS에서 읽어오는 값:
 * - sm: fontSize: var(--text-sm)
 * - md: fontSize: var(--text-base)
 * - lg: fontSize: var(--text-lg)
 */
export interface LinkSizePreset {
  fontSize: number;
}

const LINK_SIZE_MAPPING: Record<string, { fontSize: string }> = {
  sm: { fontSize: '--text-sm' },
  md: { fontSize: '--text-base' },
  lg: { fontSize: '--text-lg' },
};

const LINK_FALLBACKS: Record<string, LinkSizePreset> = {
  sm: { fontSize: 14 },
  md: { fontSize: 16 },
  lg: { fontSize: 18 },
};

/**
 * Link 사이즈 프리셋 읽기
 */
export function getLinkSizePreset(size: string): LinkSizePreset {
  const mapping = LINK_SIZE_MAPPING[size];
  const fallback = LINK_FALLBACKS[size] || LINK_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);

  return {
    fontSize,
  };
}

/**
 * Link 색상 프리셋
 */
export interface LinkColorPreset {
  color: number;
  hoverColor: number;
  pressedColor: number;
}

const LINK_COLOR_FALLBACKS: Record<string, LinkColorPreset> = {
  default: { color: 0x3b82f6, hoverColor: 0x2563eb, pressedColor: 0x1d4ed8 },
  primary: { color: 0x3b82f6, hoverColor: 0x2563eb, pressedColor: 0x1d4ed8 },
  secondary: { color: 0x6366f1, hoverColor: 0x4f46e5, pressedColor: 0x4338ca },
};

/**
 * Link 색상 프리셋 읽기
 */
export function getLinkColorPreset(variant: string): LinkColorPreset {
  return LINK_COLOR_FALLBACKS[variant] || LINK_COLOR_FALLBACKS.primary;
}

// ============================================
// Phase 2: Breadcrumbs Size Preset
// ============================================

/**
 * Breadcrumbs 사이즈 프리셋
 */
export interface BreadcrumbsSizePreset {
  fontSize: number;
  gap: number;
  padding: number;
}

const BREADCRUMBS_SIZE_MAPPING: Record<string, { fontSize: string; gap: string }> = {
  sm: { fontSize: '--text-xs', gap: '--spacing-xs' },
  md: { fontSize: '--text-sm', gap: '--spacing' },
  lg: { fontSize: '--text-base', gap: '--spacing-sm' },
};

const BREADCRUMBS_FALLBACKS: Record<string, BreadcrumbsSizePreset> = {
  sm: { fontSize: 12, gap: 4, padding: 4 },
  md: { fontSize: 14, gap: 8, padding: 8 },
  lg: { fontSize: 16, gap: 10, padding: 12 },
};

/**
 * Breadcrumbs 사이즈 프리셋 읽기
 */
export function getBreadcrumbsSizePreset(size: string): BreadcrumbsSizePreset {
  const mapping = BREADCRUMBS_SIZE_MAPPING[size];
  const fallback = BREADCRUMBS_FALLBACKS[size] || BREADCRUMBS_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const gap = parseCSSValue(getCSSVariable(mapping.gap), fallback.gap);

  return {
    fontSize,
    gap,
    padding: fallback.padding,
  };
}

/**
 * Breadcrumbs 색상 프리셋
 */
export interface BreadcrumbsColorPreset {
  textColor: number;
  currentColor: number;
  separatorColor: number;
}

const BREADCRUMBS_COLOR_FALLBACKS: Record<string, BreadcrumbsColorPreset> = {
  default: { textColor: 0x6b7280, currentColor: 0x374151, separatorColor: 0x9ca3af },
  primary: { textColor: 0x6b7280, currentColor: 0x3b82f6, separatorColor: 0x9ca3af },
  secondary: { textColor: 0x6b7280, currentColor: 0x6366f1, separatorColor: 0x9ca3af },
  tertiary: { textColor: 0x6b7280, currentColor: 0xec4899, separatorColor: 0x9ca3af },
  error: { textColor: 0x6b7280, currentColor: 0xef4444, separatorColor: 0x9ca3af },
};

/**
 * Breadcrumbs 색상 프리셋 읽기
 */
export function getBreadcrumbsColorPreset(variant: string): BreadcrumbsColorPreset {
  return BREADCRUMBS_COLOR_FALLBACKS[variant] || BREADCRUMBS_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 2: Card Size Preset
// ============================================

/**
 * Card 사이즈 프리셋
 */
export interface CardSizePreset {
  padding: number;
  borderRadius: number;
}

const CARD_SIZE_MAPPING: Record<string, { padding: string; borderRadius: string }> = {
  sm: { padding: '--spacing-sm', borderRadius: '--radius-md' },
  md: { padding: '--spacing-md', borderRadius: '--radius-lg' },
  lg: { padding: '--spacing-lg', borderRadius: '--radius-xl' },
};

const CARD_FALLBACKS: Record<string, CardSizePreset> = {
  sm: { padding: 8, borderRadius: 8 },
  md: { padding: 12, borderRadius: 12 },
  lg: { padding: 16, borderRadius: 16 },
};

/**
 * Card 사이즈 프리셋 읽기
 */
export function getCardSizePreset(size: string): CardSizePreset {
  const mapping = CARD_SIZE_MAPPING[size];
  const fallback = CARD_FALLBACKS[size] || CARD_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const padding = parseCSSValue(getCSSVariable(mapping.padding), fallback.padding);
  const borderRadius = parseCSSValue(getCSSVariable(mapping.borderRadius), fallback.borderRadius);

  return {
    padding,
    borderRadius,
  };
}

/**
 * Card 색상 프리셋
 */
export interface CardColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  hoverBgColor: number;
}

const CARD_COLOR_FALLBACKS: Record<string, CardColorPreset> = {
  default: { backgroundColor: 0xf3f4f6, borderColor: 0xcad3dc, textColor: 0x374151, hoverBgColor: 0xe5e7eb },
  primary: { backgroundColor: 0x3b82f6, borderColor: 0x3b82f6, textColor: 0xffffff, hoverBgColor: 0x2563eb },
  secondary: { backgroundColor: 0x6366f1, borderColor: 0x6366f1, textColor: 0xffffff, hoverBgColor: 0x4f46e5 },
  surface: { backgroundColor: 0xf9fafb, borderColor: 0xcad3dc, textColor: 0x374151, hoverBgColor: 0xf3f4f6 },
  elevated: { backgroundColor: 0xffffff, borderColor: 0x00000000, textColor: 0x374151, hoverBgColor: 0xf9fafb },
  outlined: { backgroundColor: 0xffffff, borderColor: 0x9ca3af, textColor: 0x374151, hoverBgColor: 0xf9fafb },
};

/**
 * Card 색상 프리셋 읽기
 */
export function getCardColorPreset(variant: string): CardColorPreset {
  return CARD_COLOR_FALLBACKS[variant] || CARD_COLOR_FALLBACKS.default;
}

// ============================================
// Panel Size Preset
// ============================================

/**
 * Panel 사이즈 프리셋
 */
export interface PanelSizePreset {
  borderRadius: number;
  titleFontSize: number;
  titlePaddingX: number;
  titlePaddingY: number;
  contentFontSize: number;
  contentPadding: number;
  minHeight: number;
}

const PANEL_SIZE_MAPPING: Record<string, { borderRadius: string; spacing: string; fontSize: string }> = {
  sm: { borderRadius: '--radius-md', spacing: '--spacing-sm', fontSize: '--text-sm' },
  md: { borderRadius: '--radius-lg', spacing: '--spacing-md', fontSize: '--text-base' },
  lg: { borderRadius: '--radius-xl', spacing: '--spacing-lg', fontSize: '--text-lg' },
};

// CSS: .panel-content { min-height: 64px; } - 고정값
const PANEL_FALLBACKS: Record<string, PanelSizePreset> = {
  sm: { borderRadius: 8, titleFontSize: 13, titlePaddingX: 8, titlePaddingY: 6, contentFontSize: 13, contentPadding: 12, minHeight: 64 },
  md: { borderRadius: 12, titleFontSize: 14, titlePaddingX: 12, titlePaddingY: 8, contentFontSize: 14, contentPadding: 16, minHeight: 64 },
  lg: { borderRadius: 16, titleFontSize: 16, titlePaddingX: 16, titlePaddingY: 12, contentFontSize: 16, contentPadding: 20, minHeight: 64 },
};

/**
 * Panel 사이즈 프리셋 읽기
 */
export function getPanelSizePreset(size: string): PanelSizePreset {
  const mapping = PANEL_SIZE_MAPPING[size];
  const fallback = PANEL_FALLBACKS[size] || PANEL_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const borderRadius = parseCSSValue(getCSSVariable(mapping.borderRadius), fallback.borderRadius);
  const spacing = parseCSSValue(getCSSVariable(mapping.spacing), fallback.contentPadding);
  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.contentFontSize);

  return {
    borderRadius,
    titleFontSize: fontSize,
    titlePaddingX: spacing,
    titlePaddingY: Math.round(spacing * 0.75),
    contentFontSize: fontSize,
    contentPadding: spacing,
    minHeight: fallback.minHeight,
  };
}

/**
 * Panel 색상 프리셋
 */
export interface PanelColorPreset {
  backgroundColor: number;
  borderColor: number;
  titleColor: number;
  textColor: number;
}

const PANEL_COLOR_FALLBACKS: Record<string, PanelColorPreset> = {
  // CSS 동기화: .react-aria-Panel background-color
  default: { backgroundColor: 0xf3edf7, borderColor: 0xcad3dc, titleColor: 0x374151, textColor: 0x6b7280 },
  tab: { backgroundColor: 0xf3edf7, borderColor: 0xcad3dc, titleColor: 0x374151, textColor: 0x6b7280 },
  sidebar: { backgroundColor: 0xe5e7eb, borderColor: 0xcad3dc, titleColor: 0x374151, textColor: 0x6b7280 },
  card: { backgroundColor: 0xffffff, borderColor: 0xcad3dc, titleColor: 0x374151, textColor: 0x6b7280 },
  modal: { backgroundColor: 0xffffff, borderColor: 0xcad3dc, titleColor: 0x374151, textColor: 0x6b7280 },
};

/**
 * Panel 색상 프리셋 읽기
 */
export function getPanelColorPreset(variant: string): PanelColorPreset {
  return PANEL_COLOR_FALLBACKS[variant] || PANEL_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 2: Menu Size Preset
// ============================================

/**
 * Menu 사이즈 프리셋
 */
export interface MenuSizePreset {
  fontSize: number;
  itemPaddingX: number;
  itemPaddingY: number;
  containerPadding: number;
  minWidth: number;
  borderRadius: number;
}

const MENU_SIZE_MAPPING: Record<string, { fontSize: string; paddingX: string; paddingY: string }> = {
  sm: { fontSize: '--text-xs', paddingX: '--spacing', paddingY: '--spacing-sm' },
  md: { fontSize: '--text-sm', paddingX: '--spacing-md', paddingY: '--spacing' },
  lg: { fontSize: '--text-base', paddingX: '--spacing-lg', paddingY: '--spacing-md' },
};

const MENU_FALLBACKS: Record<string, MenuSizePreset> = {
  sm: { fontSize: 12, itemPaddingX: 8, itemPaddingY: 6, containerPadding: 6, minWidth: 120, borderRadius: 6 },
  md: { fontSize: 14, itemPaddingX: 12, itemPaddingY: 8, containerPadding: 8, minWidth: 150, borderRadius: 8 },
  lg: { fontSize: 16, itemPaddingX: 16, itemPaddingY: 12, containerPadding: 12, minWidth: 180, borderRadius: 10 },
};

/**
 * Menu 사이즈 프리셋 읽기
 */
export function getMenuSizePreset(size: string): MenuSizePreset {
  const mapping = MENU_SIZE_MAPPING[size];
  const fallback = MENU_FALLBACKS[size] || MENU_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const itemPaddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.itemPaddingX);
  const itemPaddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.itemPaddingY);

  return {
    fontSize,
    itemPaddingX,
    itemPaddingY,
    containerPadding: fallback.containerPadding,
    minWidth: fallback.minWidth,
    borderRadius: fallback.borderRadius,
  };
}

/**
 * Menu 색상 프리셋
 */
export interface MenuColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  hoverBgColor: number;
  hoverTextColor: number;
  separatorColor: number;
}

const MENU_COLOR_FALLBACKS: Record<string, MenuColorPreset> = {
  default: { backgroundColor: 0xf3f4f6, borderColor: 0xcad3dc, textColor: 0x374151, hoverBgColor: 0xdbeafe, hoverTextColor: 0x1e40af, separatorColor: 0xcad3dc },
  primary: { backgroundColor: 0xf3f4f6, borderColor: 0x3b82f6, textColor: 0x374151, hoverBgColor: 0xdbeafe, hoverTextColor: 0x1e40af, separatorColor: 0x3b82f6 },
  secondary: { backgroundColor: 0xf3f4f6, borderColor: 0x6366f1, textColor: 0x374151, hoverBgColor: 0xe0e7ff, hoverTextColor: 0x3730a3, separatorColor: 0x6366f1 },
  tertiary: { backgroundColor: 0xf3f4f6, borderColor: 0xec4899, textColor: 0x374151, hoverBgColor: 0xfce7f3, hoverTextColor: 0x9d174d, separatorColor: 0xec4899 },
  error: { backgroundColor: 0xf3f4f6, borderColor: 0xef4444, textColor: 0x374151, hoverBgColor: 0xfee2e2, hoverTextColor: 0x991b1b, separatorColor: 0xef4444 },
  filled: { backgroundColor: 0xf9fafb, borderColor: 0x00000000, textColor: 0x374151, hoverBgColor: 0xe5e7eb, hoverTextColor: 0x374151, separatorColor: 0x9ca3af },
};

/**
 * Menu 색상 프리셋 읽기
 */
export function getMenuColorPreset(variant: string): MenuColorPreset {
  return MENU_COLOR_FALLBACKS[variant] || MENU_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 2: Tabs Size Preset
// ============================================

/**
 * Tabs 사이즈 프리셋
 */
export interface TabsSizePreset {
  fontSize: number;
  tabPaddingX: number;
  tabPaddingY: number;
  indicatorHeight: number;
  panelPadding: number;
}

// 🚀 Phase 11: CSS .react-aria-Tab, .react-aria-TabPanel과 동기화
// CSS: .react-aria-Tab { padding: var(--spacing) var(--spacing-lg); font-size: var(--text-sm); }
// CSS: .react-aria-TabPanel { padding: var(--spacing-lg); }
const TABS_SIZE_MAPPING: Record<string, { fontSize: string; paddingX: string; paddingY: string; panelPadding: string }> = {
  sm: { fontSize: '--text-xs', paddingX: '--spacing-md', paddingY: '--spacing-sm', panelPadding: '--spacing-md' },
  md: { fontSize: '--text-sm', paddingX: '--spacing-lg', paddingY: '--spacing', panelPadding: '--spacing-lg' },
  lg: { fontSize: '--text-base', paddingX: '--spacing-xl', paddingY: '--spacing-md', panelPadding: '--spacing-xl' },
};

const TABS_FALLBACKS: Record<string, TabsSizePreset> = {
  sm: { fontSize: 12, tabPaddingX: 12, tabPaddingY: 6, indicatorHeight: 2, panelPadding: 12 },
  md: { fontSize: 14, tabPaddingX: 16, tabPaddingY: 8, indicatorHeight: 3, panelPadding: 16 },
  lg: { fontSize: 16, tabPaddingX: 20, tabPaddingY: 12, indicatorHeight: 4, panelPadding: 20 },
};

/**
 * Tabs 사이즈 프리셋 읽기
 */
export function getTabsSizePreset(size: string): TabsSizePreset {
  const mapping = TABS_SIZE_MAPPING[size];
  const fallback = TABS_FALLBACKS[size] || TABS_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const tabPaddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.tabPaddingX);
  const tabPaddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.tabPaddingY);
  const panelPadding = parseCSSValue(getCSSVariable(mapping.panelPadding), fallback.panelPadding);

  return {
    fontSize,
    tabPaddingX,
    tabPaddingY,
    indicatorHeight: fallback.indicatorHeight,
    panelPadding,
  };
}

/**
 * Tabs 색상 프리셋
 */
export interface TabsColorPreset {
  textColor: number;
  selectedTextColor: number;
  indicatorColor: number;
  hoverBgColor: number;
  borderColor: number;
}

const TABS_COLOR_FALLBACKS: Record<string, TabsColorPreset> = {
  default: { textColor: 0x6b7280, selectedTextColor: 0x374151, indicatorColor: 0x3b82f6, hoverBgColor: 0x00000014, borderColor: 0xcad3dc },
  primary: { textColor: 0x6b7280, selectedTextColor: 0x3b82f6, indicatorColor: 0x3b82f6, hoverBgColor: 0x3b82f614, borderColor: 0xcad3dc },
  secondary: { textColor: 0x6b7280, selectedTextColor: 0x6366f1, indicatorColor: 0x6366f1, hoverBgColor: 0x6366f114, borderColor: 0xcad3dc },
  tertiary: { textColor: 0x6b7280, selectedTextColor: 0xec4899, indicatorColor: 0xec4899, hoverBgColor: 0xec489914, borderColor: 0xcad3dc },
};

/**
 * Tabs 색상 프리셋 읽기
 */
export function getTabsColorPreset(variant: string): TabsColorPreset {
  return TABS_COLOR_FALLBACKS[variant] || TABS_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 3: NumberField Size Preset
// ============================================

/**
 * NumberField 사이즈 프리셋
 */
export interface NumberFieldSizePreset {
  fontSize: number;
  labelFontSize: number;
  buttonWidth: number;
  inputWidth: number;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
}

const NUMBERFIELD_SIZE_MAPPING: Record<string, { fontSize: string; labelSize: string; paddingY: string; paddingX: string }> = {
  sm: { fontSize: '--text-xs', labelSize: '--text-xs', paddingY: '--spacing-sm', paddingX: '--spacing' },
  md: { fontSize: '--text-sm', labelSize: '--text-sm', paddingY: '--spacing', paddingX: '--spacing-md' },
  lg: { fontSize: '--text-base', labelSize: '--text-base', paddingY: '--spacing-md', paddingX: '--spacing-lg' },
};

const NUMBERFIELD_FALLBACKS: Record<string, NumberFieldSizePreset> = {
  sm: { fontSize: 12, labelFontSize: 12, buttonWidth: 28, inputWidth: 80, paddingX: 8, paddingY: 6, borderRadius: 6 },
  md: { fontSize: 14, labelFontSize: 14, buttonWidth: 32, inputWidth: 120, paddingX: 12, paddingY: 8, borderRadius: 6 },
  lg: { fontSize: 16, labelFontSize: 16, buttonWidth: 40, inputWidth: 160, paddingX: 16, paddingY: 12, borderRadius: 8 },
};

/**
 * NumberField 사이즈 프리셋 읽기
 */
export function getNumberFieldSizePreset(size: string): NumberFieldSizePreset {
  const mapping = NUMBERFIELD_SIZE_MAPPING[size];
  const fallback = NUMBERFIELD_FALLBACKS[size] || NUMBERFIELD_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const labelFontSize = parseCSSValue(getCSSVariable(mapping.labelSize), fallback.labelFontSize);
  const paddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.paddingX);
  const paddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.paddingY);

  return {
    fontSize,
    labelFontSize,
    buttonWidth: fallback.buttonWidth,
    inputWidth: fallback.inputWidth,
    paddingX,
    paddingY,
    borderRadius: fallback.borderRadius,
  };
}

/**
 * NumberField 색상 프리셋
 */
export interface NumberFieldColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  labelColor: number;
  buttonBgColor: number;
  buttonHoverBgColor: number;
  focusColor: number;
}

const NUMBERFIELD_COLOR_FALLBACKS: Record<string, NumberFieldColorPreset> = {
  default: { backgroundColor: 0xf3f4f6, borderColor: 0xcad3dc, textColor: 0x374151, labelColor: 0x374151, buttonBgColor: 0xe5e7eb, buttonHoverBgColor: 0xd1d5db, focusColor: 0x3b82f6 },
  primary: { backgroundColor: 0xf3f4f6, borderColor: 0x3b82f6, textColor: 0x374151, labelColor: 0x3b82f6, buttonBgColor: 0xdbeafe, buttonHoverBgColor: 0xbfdbfe, focusColor: 0x3b82f6 },
  secondary: { backgroundColor: 0xf3f4f6, borderColor: 0x6366f1, textColor: 0x374151, labelColor: 0x6366f1, buttonBgColor: 0xe0e7ff, buttonHoverBgColor: 0xc7d2fe, focusColor: 0x6366f1 },
  tertiary: { backgroundColor: 0xf3f4f6, borderColor: 0xec4899, textColor: 0x374151, labelColor: 0xec4899, buttonBgColor: 0xfce7f3, buttonHoverBgColor: 0xfbcfe8, focusColor: 0xec4899 },
  error: { backgroundColor: 0xf3f4f6, borderColor: 0xef4444, textColor: 0x374151, labelColor: 0xef4444, buttonBgColor: 0xfee2e2, buttonHoverBgColor: 0xfecaca, focusColor: 0xef4444 },
  filled: { backgroundColor: 0xf9fafb, borderColor: 0xcad3dc, textColor: 0x374151, labelColor: 0x374151, buttonBgColor: 0xe5e7eb, buttonHoverBgColor: 0xd1d5db, focusColor: 0x3b82f6 },
};

/**
 * NumberField 색상 프리셋 읽기
 */
export function getNumberFieldColorPreset(variant: string): NumberFieldColorPreset {
  return NUMBERFIELD_COLOR_FALLBACKS[variant] || NUMBERFIELD_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 3: SearchField Size Preset
// ============================================

/**
 * SearchField 사이즈 프리셋
 */
export interface SearchFieldSizePreset {
  fontSize: number;
  labelFontSize: number;
  inputWidth: number;
  paddingX: number;
  paddingY: number;
  clearButtonSize: number;
  borderRadius: number;
}

const SEARCHFIELD_SIZE_MAPPING: Record<string, { fontSize: string; labelSize: string; paddingY: string; paddingX: string }> = {
  sm: { fontSize: '--text-xs', labelSize: '--text-xs', paddingY: '--spacing-sm', paddingX: '--spacing' },
  md: { fontSize: '--text-sm', labelSize: '--text-sm', paddingY: '--spacing', paddingX: '--spacing-md' },
  lg: { fontSize: '--text-base', labelSize: '--text-base', paddingY: '--spacing-md', paddingX: '--spacing-lg' },
};

const SEARCHFIELD_FALLBACKS: Record<string, SearchFieldSizePreset> = {
  sm: { fontSize: 12, labelFontSize: 12, inputWidth: 160, paddingX: 8, paddingY: 6, clearButtonSize: 20, borderRadius: 6 },
  md: { fontSize: 14, labelFontSize: 14, inputWidth: 200, paddingX: 12, paddingY: 8, clearButtonSize: 24, borderRadius: 6 },
  lg: { fontSize: 16, labelFontSize: 16, inputWidth: 240, paddingX: 16, paddingY: 12, clearButtonSize: 28, borderRadius: 8 },
};

/**
 * SearchField 사이즈 프리셋 읽기
 */
export function getSearchFieldSizePreset(size: string): SearchFieldSizePreset {
  const mapping = SEARCHFIELD_SIZE_MAPPING[size];
  const fallback = SEARCHFIELD_FALLBACKS[size] || SEARCHFIELD_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const labelFontSize = parseCSSValue(getCSSVariable(mapping.labelSize), fallback.labelFontSize);
  const paddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.paddingX);
  const paddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.paddingY);

  return {
    fontSize,
    labelFontSize,
    inputWidth: fallback.inputWidth,
    paddingX,
    paddingY,
    clearButtonSize: fallback.clearButtonSize,
    borderRadius: fallback.borderRadius,
  };
}

/**
 * SearchField 색상 프리셋
 */
export interface SearchFieldColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  labelColor: number;
  placeholderColor: number;
  clearButtonBgColor: number;
  clearButtonHoverBgColor: number;
  focusColor: number;
}

const SEARCHFIELD_COLOR_FALLBACKS: Record<string, SearchFieldColorPreset> = {
  default: { backgroundColor: 0xf3f4f6, borderColor: 0xcad3dc, textColor: 0x374151, labelColor: 0x374151, placeholderColor: 0x9ca3af, clearButtonBgColor: 0xe5e7eb, clearButtonHoverBgColor: 0xd1d5db, focusColor: 0x3b82f6 },
  primary: { backgroundColor: 0xf3f4f6, borderColor: 0x3b82f6, textColor: 0x374151, labelColor: 0x3b82f6, placeholderColor: 0x9ca3af, clearButtonBgColor: 0xdbeafe, clearButtonHoverBgColor: 0xbfdbfe, focusColor: 0x3b82f6 },
  secondary: { backgroundColor: 0xf3f4f6, borderColor: 0x6366f1, textColor: 0x374151, labelColor: 0x6366f1, placeholderColor: 0x9ca3af, clearButtonBgColor: 0xe0e7ff, clearButtonHoverBgColor: 0xc7d2fe, focusColor: 0x6366f1 },
  tertiary: { backgroundColor: 0xf3f4f6, borderColor: 0xec4899, textColor: 0x374151, labelColor: 0xec4899, placeholderColor: 0x9ca3af, clearButtonBgColor: 0xfce7f3, clearButtonHoverBgColor: 0xfbcfe8, focusColor: 0xec4899 },
  error: { backgroundColor: 0xf3f4f6, borderColor: 0xef4444, textColor: 0x374151, labelColor: 0xef4444, placeholderColor: 0x9ca3af, clearButtonBgColor: 0xfee2e2, clearButtonHoverBgColor: 0xfecaca, focusColor: 0xef4444 },
  filled: { backgroundColor: 0xf9fafb, borderColor: 0xcad3dc, textColor: 0x374151, labelColor: 0x374151, placeholderColor: 0x9ca3af, clearButtonBgColor: 0xe5e7eb, clearButtonHoverBgColor: 0xd1d5db, focusColor: 0x3b82f6 },
};

/**
 * SearchField 색상 프리셋 읽기
 */
export function getSearchFieldColorPreset(variant: string): SearchFieldColorPreset {
  return SEARCHFIELD_COLOR_FALLBACKS[variant] || SEARCHFIELD_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 3: ComboBox Size Preset
// ============================================

/**
 * ComboBox 사이즈 프리셋
 */
export interface ComboBoxSizePreset {
  fontSize: number;
  labelFontSize: number;
  inputWidth: number;
  paddingX: number;
  paddingY: number;
  buttonSize: number;
  itemPaddingX: number;
  itemPaddingY: number;
  borderRadius: number;
}

const COMBOBOX_SIZE_MAPPING: Record<string, { fontSize: string; labelSize: string; paddingY: string; paddingX: string; itemPaddingY: string; itemPaddingX: string }> = {
  sm: { fontSize: '--text-xs', labelSize: '--text-xs', paddingY: '--spacing-sm', paddingX: '--spacing', itemPaddingY: '--spacing-sm', itemPaddingX: '--spacing' },
  md: { fontSize: '--text-sm', labelSize: '--text-sm', paddingY: '--spacing', paddingX: '--spacing-md', itemPaddingY: '--spacing', itemPaddingX: '--spacing-md' },
  lg: { fontSize: '--text-base', labelSize: '--text-base', paddingY: '--spacing-md', paddingX: '--spacing-lg', itemPaddingY: '--spacing-md', itemPaddingX: '--spacing-lg' },
};

const COMBOBOX_FALLBACKS: Record<string, ComboBoxSizePreset> = {
  sm: { fontSize: 12, labelFontSize: 12, inputWidth: 160, paddingX: 8, paddingY: 6, buttonSize: 20, itemPaddingX: 8, itemPaddingY: 6, borderRadius: 6 },
  md: { fontSize: 14, labelFontSize: 14, inputWidth: 200, paddingX: 12, paddingY: 8, buttonSize: 24, itemPaddingX: 12, itemPaddingY: 8, borderRadius: 6 },
  lg: { fontSize: 16, labelFontSize: 16, inputWidth: 240, paddingX: 16, paddingY: 12, buttonSize: 28, itemPaddingX: 16, itemPaddingY: 12, borderRadius: 8 },
};

/**
 * ComboBox 사이즈 프리셋 읽기
 */
export function getComboBoxSizePreset(size: string): ComboBoxSizePreset {
  const mapping = COMBOBOX_SIZE_MAPPING[size];
  const fallback = COMBOBOX_FALLBACKS[size] || COMBOBOX_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const labelFontSize = parseCSSValue(getCSSVariable(mapping.labelSize), fallback.labelFontSize);
  const paddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.paddingX);
  const paddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.paddingY);
  const itemPaddingX = parseCSSValue(getCSSVariable(mapping.itemPaddingX), fallback.itemPaddingX);
  const itemPaddingY = parseCSSValue(getCSSVariable(mapping.itemPaddingY), fallback.itemPaddingY);

  return {
    fontSize,
    labelFontSize,
    inputWidth: fallback.inputWidth,
    paddingX,
    paddingY,
    buttonSize: fallback.buttonSize,
    itemPaddingX,
    itemPaddingY,
    borderRadius: fallback.borderRadius,
  };
}

/**
 * ComboBox 색상 프리셋
 */
export interface ComboBoxColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  labelColor: number;
  placeholderColor: number;
  buttonBgColor: number;
  buttonHoverBgColor: number;
  dropdownBgColor: number;
  itemHoverBgColor: number;
  itemSelectedBgColor: number;
  itemSelectedTextColor: number;
  focusColor: number;
}

const COMBOBOX_COLOR_FALLBACKS: Record<string, ComboBoxColorPreset> = {
  default: { backgroundColor: 0xf3f4f6, borderColor: 0xcad3dc, textColor: 0x374151, labelColor: 0x374151, placeholderColor: 0x9ca3af, buttonBgColor: 0xe5e7eb, buttonHoverBgColor: 0xd1d5db, dropdownBgColor: 0xf3f4f6, itemHoverBgColor: 0xe5e7eb, itemSelectedBgColor: 0xdbeafe, itemSelectedTextColor: 0x1e40af, focusColor: 0x3b82f6 },
  primary: { backgroundColor: 0xf3f4f6, borderColor: 0x3b82f6, textColor: 0x374151, labelColor: 0x3b82f6, placeholderColor: 0x9ca3af, buttonBgColor: 0xdbeafe, buttonHoverBgColor: 0xbfdbfe, dropdownBgColor: 0xf3f4f6, itemHoverBgColor: 0xdbeafe, itemSelectedBgColor: 0xbfdbfe, itemSelectedTextColor: 0x1e40af, focusColor: 0x3b82f6 },
  secondary: { backgroundColor: 0xf3f4f6, borderColor: 0x6366f1, textColor: 0x374151, labelColor: 0x6366f1, placeholderColor: 0x9ca3af, buttonBgColor: 0xe0e7ff, buttonHoverBgColor: 0xc7d2fe, dropdownBgColor: 0xf3f4f6, itemHoverBgColor: 0xe0e7ff, itemSelectedBgColor: 0xc7d2fe, itemSelectedTextColor: 0x3730a3, focusColor: 0x6366f1 },
  tertiary: { backgroundColor: 0xf3f4f6, borderColor: 0xec4899, textColor: 0x374151, labelColor: 0xec4899, placeholderColor: 0x9ca3af, buttonBgColor: 0xfce7f3, buttonHoverBgColor: 0xfbcfe8, dropdownBgColor: 0xf3f4f6, itemHoverBgColor: 0xfce7f3, itemSelectedBgColor: 0xfbcfe8, itemSelectedTextColor: 0x9d174d, focusColor: 0xec4899 },
  error: { backgroundColor: 0xf3f4f6, borderColor: 0xef4444, textColor: 0x374151, labelColor: 0xef4444, placeholderColor: 0x9ca3af, buttonBgColor: 0xfee2e2, buttonHoverBgColor: 0xfecaca, dropdownBgColor: 0xf3f4f6, itemHoverBgColor: 0xfee2e2, itemSelectedBgColor: 0xfecaca, itemSelectedTextColor: 0x991b1b, focusColor: 0xef4444 },
  filled: { backgroundColor: 0xf9fafb, borderColor: 0xcad3dc, textColor: 0x374151, labelColor: 0x374151, placeholderColor: 0x9ca3af, buttonBgColor: 0xe5e7eb, buttonHoverBgColor: 0xd1d5db, dropdownBgColor: 0xf9fafb, itemHoverBgColor: 0xe5e7eb, itemSelectedBgColor: 0xdbeafe, itemSelectedTextColor: 0x1e40af, focusColor: 0x3b82f6 },
};

/**
 * ComboBox 색상 프리셋 읽기
 */
export function getComboBoxColorPreset(variant: string): ComboBoxColorPreset {
  return COMBOBOX_COLOR_FALLBACKS[variant] || COMBOBOX_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 4: GridList Size Preset
// ============================================

/**
 * GridList 사이즈 프리셋
 */
export interface GridListSizePreset {
  fontSize: number;
  itemMinHeight: number;
  itemPaddingX: number;
  itemPaddingY: number;
  listPadding: number;
  listGap: number;
  borderRadius: number;
}

const GRIDLIST_SIZE_MAPPING: Record<string, { fontSize: string; itemPaddingY: string; itemPaddingX: string; listPadding: string; listGap: string }> = {
  sm: { fontSize: '--text-xs', itemPaddingY: '--spacing-sm', itemPaddingX: '--spacing', listPadding: '--spacing-2xs', listGap: '--spacing-3xs' },
  md: { fontSize: '--text-sm', itemPaddingY: '--spacing', itemPaddingX: '--spacing-md', listPadding: '--spacing-xs', listGap: '--spacing-2xs' },
  lg: { fontSize: '--text-base', itemPaddingY: '--spacing-md', itemPaddingX: '--spacing-lg', listPadding: '--spacing-sm', listGap: '--spacing-xs' },
};

const GRIDLIST_FALLBACKS: Record<string, GridListSizePreset> = {
  sm: { fontSize: 12, itemMinHeight: 32, itemPaddingX: 8, itemPaddingY: 6, listPadding: 4, listGap: 2, borderRadius: 6 },
  md: { fontSize: 14, itemMinHeight: 40, itemPaddingX: 12, itemPaddingY: 8, listPadding: 6, listGap: 4, borderRadius: 6 },
  lg: { fontSize: 16, itemMinHeight: 48, itemPaddingX: 16, itemPaddingY: 12, listPadding: 8, listGap: 6, borderRadius: 8 },
};

/**
 * GridList 사이즈 프리셋 읽기
 */
export function getGridListSizePreset(size: string): GridListSizePreset {
  const mapping = GRIDLIST_SIZE_MAPPING[size];
  const fallback = GRIDLIST_FALLBACKS[size] || GRIDLIST_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const itemPaddingX = parseCSSValue(getCSSVariable(mapping.itemPaddingX), fallback.itemPaddingX);
  const itemPaddingY = parseCSSValue(getCSSVariable(mapping.itemPaddingY), fallback.itemPaddingY);
  const listPadding = parseCSSValue(getCSSVariable(mapping.listPadding), fallback.listPadding);
  const listGap = parseCSSValue(getCSSVariable(mapping.listGap), fallback.listGap);

  return {
    fontSize,
    itemMinHeight: fallback.itemMinHeight,
    itemPaddingX,
    itemPaddingY,
    listPadding,
    listGap,
    borderRadius: fallback.borderRadius,
  };
}

/**
 * GridList 색상 프리셋
 */
export interface GridListColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  itemHoverBgColor: number;
  itemSelectedBgColor: number;
  itemSelectedTextColor: number;
  focusColor: number;
}

const GRIDLIST_COLOR_FALLBACKS: Record<string, GridListColorPreset> = {
  default: { backgroundColor: 0xf3f4f6, borderColor: 0xcad3dc, textColor: 0x374151, itemHoverBgColor: 0xe5e7eb, itemSelectedBgColor: 0xdbeafe, itemSelectedTextColor: 0x1e40af, focusColor: 0x3b82f6 },
  primary: { backgroundColor: 0xf3f4f6, borderColor: 0x3b82f6, textColor: 0x374151, itemHoverBgColor: 0xdbeafe, itemSelectedBgColor: 0xbfdbfe, itemSelectedTextColor: 0x1e40af, focusColor: 0x3b82f6 },
  secondary: { backgroundColor: 0xf3f4f6, borderColor: 0x6366f1, textColor: 0x374151, itemHoverBgColor: 0xe0e7ff, itemSelectedBgColor: 0xc7d2fe, itemSelectedTextColor: 0x3730a3, focusColor: 0x6366f1 },
  tertiary: { backgroundColor: 0xf3f4f6, borderColor: 0xec4899, textColor: 0x374151, itemHoverBgColor: 0xfce7f3, itemSelectedBgColor: 0xfbcfe8, itemSelectedTextColor: 0x9d174d, focusColor: 0xec4899 },
  error: { backgroundColor: 0xf3f4f6, borderColor: 0xef4444, textColor: 0x374151, itemHoverBgColor: 0xfee2e2, itemSelectedBgColor: 0xfecaca, itemSelectedTextColor: 0x991b1b, focusColor: 0xef4444 },
  filled: { backgroundColor: 0xf9fafb, borderColor: 0x00000000, textColor: 0x374151, itemHoverBgColor: 0xe5e7eb, itemSelectedBgColor: 0xdbeafe, itemSelectedTextColor: 0x1e40af, focusColor: 0x3b82f6 },
};

/**
 * GridList 색상 프리셋 읽기
 */
export function getGridListColorPreset(variant: string): GridListColorPreset {
  return GRIDLIST_COLOR_FALLBACKS[variant] || GRIDLIST_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 4: TagGroup Size Preset
// ============================================

/**
 * TagGroup 사이즈 프리셋
 */
export interface TagGroupSizePreset {
  fontSize: number;
  tagPaddingX: number;
  tagPaddingY: number;
  tagGap: number;
  borderRadius: number;
}

const TAGGROUP_SIZE_MAPPING: Record<string, { fontSize: string; paddingY: string; paddingX: string }> = {
  sm: { fontSize: '--text-sm', paddingY: '--spacing-2xs', paddingX: '--spacing-sm' },
  md: { fontSize: '--text-base', paddingY: '--spacing-xs', paddingX: '--spacing-md' },
  lg: { fontSize: '--text-lg', paddingY: '--spacing-sm', paddingX: '--spacing-lg' },
};

const TAGGROUP_FALLBACKS: Record<string, TagGroupSizePreset> = {
  sm: { fontSize: 14, tagPaddingX: 8, tagPaddingY: 4, tagGap: 4, borderRadius: 4 },
  md: { fontSize: 16, tagPaddingX: 12, tagPaddingY: 6, tagGap: 4, borderRadius: 6 },
  lg: { fontSize: 18, tagPaddingX: 16, tagPaddingY: 8, tagGap: 6, borderRadius: 8 },
};

/**
 * TagGroup 사이즈 프리셋 읽기
 */
export function getTagGroupSizePreset(size: string): TagGroupSizePreset {
  const mapping = TAGGROUP_SIZE_MAPPING[size];
  const fallback = TAGGROUP_FALLBACKS[size] || TAGGROUP_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const tagPaddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.tagPaddingX);
  const tagPaddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.tagPaddingY);

  return {
    fontSize,
    tagPaddingX,
    tagPaddingY,
    tagGap: fallback.tagGap,
    borderRadius: fallback.borderRadius,
  };
}

/**
 * TagGroup 색상 프리셋
 */
export interface TagGroupColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  hoverBgColor: number;
  selectedBgColor: number;
  selectedTextColor: number;
  removeButtonColor: number;
}

const TAGGROUP_COLOR_FALLBACKS: Record<string, TagGroupColorPreset> = {
  default: { backgroundColor: 0xe5e7eb, borderColor: 0xcad3dc, textColor: 0x374151, hoverBgColor: 0xd1d5db, selectedBgColor: 0x3b82f6, selectedTextColor: 0xffffff, removeButtonColor: 0x6b7280 },
  primary: { backgroundColor: 0x3b82f6, borderColor: 0x3b82f6, textColor: 0xffffff, hoverBgColor: 0x2563eb, selectedBgColor: 0x1d4ed8, selectedTextColor: 0xffffff, removeButtonColor: 0xffffff },
  secondary: { backgroundColor: 0x6366f1, borderColor: 0x6366f1, textColor: 0xffffff, hoverBgColor: 0x4f46e5, selectedBgColor: 0x4338ca, selectedTextColor: 0xffffff, removeButtonColor: 0xffffff },
  tertiary: { backgroundColor: 0xec4899, borderColor: 0xec4899, textColor: 0xffffff, hoverBgColor: 0xdb2777, selectedBgColor: 0xbe185d, selectedTextColor: 0xffffff, removeButtonColor: 0xffffff },
  error: { backgroundColor: 0xef4444, borderColor: 0xef4444, textColor: 0xffffff, hoverBgColor: 0xdc2626, selectedBgColor: 0xb91c1c, selectedTextColor: 0xffffff, removeButtonColor: 0xffffff },
  surface: { backgroundColor: 0xf9fafb, borderColor: 0xcad3dc, textColor: 0x374151, hoverBgColor: 0xe5e7eb, selectedBgColor: 0xd1d5db, selectedTextColor: 0x374151, removeButtonColor: 0x6b7280 },
};

/**
 * TagGroup 색상 프리셋 읽기
 */
export function getTagGroupColorPreset(variant: string): TagGroupColorPreset {
  return TAGGROUP_COLOR_FALLBACKS[variant] || TAGGROUP_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 4: Tree Size Preset
// ============================================

/**
 * Tree 사이즈 프리셋
 */
export interface TreeSizePreset {
  fontSize: number;
  itemMinHeight: number;
  itemPaddingX: number;
  itemPaddingY: number;
  treePadding: number;
  treeGap: number;
  chevronSize: number;
  indentSize: number;
  borderRadius: number;
}

const TREE_SIZE_MAPPING: Record<string, { fontSize: string; itemPaddingY: string; itemPaddingX: string; treePadding: string }> = {
  sm: { fontSize: '--text-xs', itemPaddingY: '--spacing-2xs', itemPaddingX: '--spacing-xs', treePadding: '--spacing-sm' },
  md: { fontSize: '--text-sm', itemPaddingY: '--spacing-xs', itemPaddingX: '--spacing-sm', treePadding: '--spacing' },
  lg: { fontSize: '--text-base', itemPaddingY: '--spacing-sm', itemPaddingX: '--spacing', treePadding: '--spacing-md' },
};

const TREE_FALLBACKS: Record<string, TreeSizePreset> = {
  sm: { fontSize: 12, itemMinHeight: 28, itemPaddingX: 6, itemPaddingY: 4, treePadding: 8, treeGap: 1, chevronSize: 12, indentSize: 16, borderRadius: 4 },
  md: { fontSize: 14, itemMinHeight: 32, itemPaddingX: 8, itemPaddingY: 6, treePadding: 8, treeGap: 4, chevronSize: 16, indentSize: 20, borderRadius: 4 },
  lg: { fontSize: 16, itemMinHeight: 40, itemPaddingX: 12, itemPaddingY: 8, treePadding: 12, treeGap: 6, chevronSize: 20, indentSize: 24, borderRadius: 6 },
};

/**
 * Tree 사이즈 프리셋 읽기
 */
export function getTreeSizePreset(size: string): TreeSizePreset {
  const mapping = TREE_SIZE_MAPPING[size];
  const fallback = TREE_FALLBACKS[size] || TREE_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const itemPaddingX = parseCSSValue(getCSSVariable(mapping.itemPaddingX), fallback.itemPaddingX);
  const itemPaddingY = parseCSSValue(getCSSVariable(mapping.itemPaddingY), fallback.itemPaddingY);
  const treePadding = parseCSSValue(getCSSVariable(mapping.treePadding), fallback.treePadding);

  return {
    fontSize,
    itemMinHeight: fallback.itemMinHeight,
    itemPaddingX,
    itemPaddingY,
    treePadding,
    treeGap: fallback.treeGap,
    chevronSize: fallback.chevronSize,
    indentSize: fallback.indentSize,
    borderRadius: fallback.borderRadius,
  };
}

/**
 * Tree 색상 프리셋
 */
export interface TreeColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  itemHoverBgColor: number;
  itemSelectedBgColor: number;
  itemSelectedTextColor: number;
  chevronColor: number;
  focusColor: number;
}

const TREE_COLOR_FALLBACKS: Record<string, TreeColorPreset> = {
  default: { backgroundColor: 0xf3f4f6, borderColor: 0xcad3dc, textColor: 0x374151, itemHoverBgColor: 0x00000014, itemSelectedBgColor: 0xdbeafe, itemSelectedTextColor: 0x1e40af, chevronColor: 0x6b7280, focusColor: 0x3b82f6 },
  primary: { backgroundColor: 0xf3f4f6, borderColor: 0xcad3dc, textColor: 0x374151, itemHoverBgColor: 0x00000014, itemSelectedBgColor: 0xdbeafe, itemSelectedTextColor: 0x1e40af, chevronColor: 0x6b7280, focusColor: 0x3b82f6 },
  secondary: { backgroundColor: 0xf3f4f6, borderColor: 0xcad3dc, textColor: 0x374151, itemHoverBgColor: 0x00000014, itemSelectedBgColor: 0xe0e7ff, itemSelectedTextColor: 0x3730a3, chevronColor: 0x6b7280, focusColor: 0x6366f1 },
  tertiary: { backgroundColor: 0xf3f4f6, borderColor: 0xcad3dc, textColor: 0x374151, itemHoverBgColor: 0x00000014, itemSelectedBgColor: 0xfce7f3, itemSelectedTextColor: 0x9d174d, chevronColor: 0x6b7280, focusColor: 0xec4899 },
};

/**
 * Tree 색상 프리셋 읽기
 */
export function getTreeColorPreset(variant: string): TreeColorPreset {
  return TREE_COLOR_FALLBACKS[variant] || TREE_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 4: Table Size Preset
// ============================================

/**
 * Table 사이즈 프리셋
 */
export interface TableSizePreset {
  fontSize: number;
  headerFontSize: number;
  cellPaddingX: number;
  cellPaddingY: number;
  rowMinHeight: number;
  borderRadius: number;
}

const TABLE_SIZE_MAPPING: Record<string, { fontSize: string; cellPaddingY: string; cellPaddingX: string }> = {
  sm: { fontSize: '--text-xs', cellPaddingY: '--spacing-sm', cellPaddingX: '--spacing' },
  md: { fontSize: '--text-sm', cellPaddingY: '--spacing', cellPaddingX: '--spacing-md' },
  lg: { fontSize: '--text-base', cellPaddingY: '--spacing-md', cellPaddingX: '--spacing-lg' },
};

const TABLE_FALLBACKS: Record<string, TableSizePreset> = {
  sm: { fontSize: 12, headerFontSize: 12, cellPaddingX: 8, cellPaddingY: 6, rowMinHeight: 32, borderRadius: 6 },
  md: { fontSize: 14, headerFontSize: 14, cellPaddingX: 12, cellPaddingY: 8, rowMinHeight: 40, borderRadius: 6 },
  lg: { fontSize: 16, headerFontSize: 16, cellPaddingX: 16, cellPaddingY: 12, rowMinHeight: 48, borderRadius: 8 },
};

/**
 * Table 사이즈 프리셋 읽기
 */
export function getTableSizePreset(size: string): TableSizePreset {
  const mapping = TABLE_SIZE_MAPPING[size];
  const fallback = TABLE_FALLBACKS[size] || TABLE_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const cellPaddingX = parseCSSValue(getCSSVariable(mapping.cellPaddingX), fallback.cellPaddingX);
  const cellPaddingY = parseCSSValue(getCSSVariable(mapping.cellPaddingY), fallback.cellPaddingY);

  return {
    fontSize,
    headerFontSize: fontSize,
    cellPaddingX,
    cellPaddingY,
    rowMinHeight: fallback.rowMinHeight,
    borderRadius: fallback.borderRadius,
  };
}

/**
 * Table 색상 프리셋
 */
export interface TableColorPreset {
  backgroundColor: number;
  borderColor: number;
  headerBgColor: number;
  headerTextColor: number;
  textColor: number;
  rowHoverBgColor: number;
  rowSelectedBgColor: number;
  rowSelectedTextColor: number;
  focusColor: number;
}

const TABLE_COLOR_FALLBACKS: Record<string, TableColorPreset> = {
  default: { backgroundColor: 0xf3f4f6, borderColor: 0xcad3dc, headerBgColor: 0xf3f4f6, headerTextColor: 0x6b7280, textColor: 0x374151, rowHoverBgColor: 0xe5e7eb, rowSelectedBgColor: 0xdbeafe, rowSelectedTextColor: 0x1e40af, focusColor: 0x3b82f6 },
  primary: { backgroundColor: 0xf3f4f6, borderColor: 0x3b82f6, headerBgColor: 0xf3f4f6, headerTextColor: 0x6b7280, textColor: 0x374151, rowHoverBgColor: 0xe5e7eb, rowSelectedBgColor: 0xdbeafe, rowSelectedTextColor: 0x1e40af, focusColor: 0x3b82f6 },
  secondary: { backgroundColor: 0xf3f4f6, borderColor: 0x6366f1, headerBgColor: 0xf3f4f6, headerTextColor: 0x6b7280, textColor: 0x374151, rowHoverBgColor: 0xe5e7eb, rowSelectedBgColor: 0xe0e7ff, rowSelectedTextColor: 0x3730a3, focusColor: 0x6366f1 },
  tertiary: { backgroundColor: 0xf3f4f6, borderColor: 0xec4899, headerBgColor: 0xf3f4f6, headerTextColor: 0x6b7280, textColor: 0x374151, rowHoverBgColor: 0xe5e7eb, rowSelectedBgColor: 0xfce7f3, rowSelectedTextColor: 0x9d174d, focusColor: 0xec4899 },
  error: { backgroundColor: 0xf3f4f6, borderColor: 0xef4444, headerBgColor: 0xf3f4f6, headerTextColor: 0x6b7280, textColor: 0x374151, rowHoverBgColor: 0xe5e7eb, rowSelectedBgColor: 0xfee2e2, rowSelectedTextColor: 0x991b1b, focusColor: 0xef4444 },
  filled: { backgroundColor: 0xf9fafb, borderColor: 0x00000000, headerBgColor: 0xf9fafb, headerTextColor: 0x6b7280, textColor: 0x374151, rowHoverBgColor: 0xe5e7eb, rowSelectedBgColor: 0xdbeafe, rowSelectedTextColor: 0x1e40af, focusColor: 0x3b82f6 },
};

/**
 * Table 색상 프리셋 읽기
 */
export function getTableColorPreset(variant: string): TableColorPreset {
  return TABLE_COLOR_FALLBACKS[variant] || TABLE_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 5: Disclosure Size Preset
// ============================================

/**
 * Disclosure 사이즈 프리셋
 */
export interface DisclosureSizePreset {
  fontSize: number;
  padding: number;
  gap: number;
  chevronSize: number;
  panelIndent: number;
  borderRadius: number;
}

const DISCLOSURE_SIZE_MAPPING: Record<string, { fontSize: string; padding: string; gap: string }> = {
  sm: { fontSize: '--text-sm', padding: '--spacing-xs', gap: '--spacing-xs' },
  md: { fontSize: '--text-base', padding: '--spacing-sm', gap: '--spacing-sm' },
  lg: { fontSize: '--text-lg', padding: '--spacing', gap: '--spacing' },
};

const DISCLOSURE_FALLBACKS: Record<string, DisclosureSizePreset> = {
  sm: { fontSize: 14, padding: 4, gap: 4, chevronSize: 12, panelIndent: 20, borderRadius: 4 },
  md: { fontSize: 16, padding: 8, gap: 8, chevronSize: 16, panelIndent: 32, borderRadius: 6 },
  lg: { fontSize: 18, padding: 8, gap: 8, chevronSize: 20, panelIndent: 44, borderRadius: 8 },
};

/**
 * Disclosure 사이즈 프리셋 읽기
 */
export function getDisclosureSizePreset(size: string): DisclosureSizePreset {
  const mapping = DISCLOSURE_SIZE_MAPPING[size];
  const fallback = DISCLOSURE_FALLBACKS[size] || DISCLOSURE_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  return {
    fontSize: parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize),
    padding: parseCSSValue(getCSSVariable(mapping.padding), fallback.padding),
    gap: parseCSSValue(getCSSVariable(mapping.gap), fallback.gap),
    chevronSize: fallback.chevronSize,
    panelIndent: fallback.panelIndent,
    borderRadius: fallback.borderRadius,
  };
}

/**
 * Disclosure 색상 프리셋
 */
export interface DisclosureColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  triggerHoverBgColor: number;
  expandedBgColor: number;
  panelTextColor: number;
  focusColor: number;
}

const DISCLOSURE_COLOR_FALLBACKS: Record<string, DisclosureColorPreset> = {
  default: { backgroundColor: 0xf3f4f6, borderColor: 0xcad3dc, textColor: 0x374151, triggerHoverBgColor: 0x00000014, expandedBgColor: 0xf3f4f6, panelTextColor: 0x6b7280, focusColor: 0x3b82f6 },
  primary: { backgroundColor: 0xf3f4f6, borderColor: 0x3b82f6, textColor: 0x3b82f6, triggerHoverBgColor: 0x3b82f614, expandedBgColor: 0x3b82f60a, panelTextColor: 0x6b7280, focusColor: 0x3b82f6 },
  secondary: { backgroundColor: 0xf3f4f6, borderColor: 0x6366f1, textColor: 0x6366f1, triggerHoverBgColor: 0x6366f114, expandedBgColor: 0x6366f10a, panelTextColor: 0x6b7280, focusColor: 0x6366f1 },
};

/**
 * Disclosure 색상 프리셋 읽기
 */
export function getDisclosureColorPreset(variant: string): DisclosureColorPreset {
  return DISCLOSURE_COLOR_FALLBACKS[variant] || DISCLOSURE_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 5: Tooltip Size Preset
// ============================================

/**
 * Tooltip 사이즈 프리셋
 */
export interface TooltipSizePreset {
  fontSize: number;
  paddingX: number;
  paddingY: number;
  maxWidth: number;
  borderRadius: number;
}

const TOOLTIP_SIZE_MAPPING: Record<string, { fontSize: string; paddingX: string; paddingY: string }> = {
  sm: { fontSize: '--text-2xs', paddingX: '--spacing-xs', paddingY: '--spacing-2xs' },
  md: { fontSize: '--text-xs', paddingX: '--spacing', paddingY: '--spacing-xs' },
  lg: { fontSize: '--text-sm', paddingX: '--spacing-sm', paddingY: '--spacing-xs' },
};

const TOOLTIP_FALLBACKS: Record<string, TooltipSizePreset> = {
  sm: { fontSize: 10, paddingX: 4, paddingY: 2, maxWidth: 120, borderRadius: 4 },
  md: { fontSize: 12, paddingX: 8, paddingY: 4, maxWidth: 150, borderRadius: 4 },
  lg: { fontSize: 14, paddingX: 8, paddingY: 4, maxWidth: 200, borderRadius: 4 },
};

/**
 * Tooltip 사이즈 프리셋 읽기
 */
export function getTooltipSizePreset(size: string): TooltipSizePreset {
  const mapping = TOOLTIP_SIZE_MAPPING[size];
  const fallback = TOOLTIP_FALLBACKS[size] || TOOLTIP_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  return {
    fontSize: parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize),
    paddingX: parseCSSValue(getCSSVariable(mapping.paddingX), fallback.paddingX),
    paddingY: parseCSSValue(getCSSVariable(mapping.paddingY), fallback.paddingY),
    maxWidth: fallback.maxWidth,
    borderRadius: fallback.borderRadius,
  };
}

/**
 * Tooltip 색상 프리셋
 */
export interface TooltipColorPreset {
  backgroundColor: number;
  textColor: number;
  arrowColor: number;
}

const TOOLTIP_COLOR_FALLBACKS: Record<string, TooltipColorPreset> = {
  default: { backgroundColor: 0x374151, textColor: 0xffffff, arrowColor: 0x374151 },
  primary: { backgroundColor: 0x3b82f6, textColor: 0xffffff, arrowColor: 0x3b82f6 },
  secondary: { backgroundColor: 0x6366f1, textColor: 0xffffff, arrowColor: 0x6366f1 },
  tertiary: { backgroundColor: 0xec4899, textColor: 0xffffff, arrowColor: 0xec4899 },
  error: { backgroundColor: 0xef4444, textColor: 0xffffff, arrowColor: 0xef4444 },
  filled: { backgroundColor: 0xf9fafb, textColor: 0x374151, arrowColor: 0xf9fafb },
};

/**
 * Tooltip 색상 프리셋 읽기
 */
export function getTooltipColorPreset(variant: string): TooltipColorPreset {
  return TOOLTIP_COLOR_FALLBACKS[variant] || TOOLTIP_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 5: Popover Size Preset
// ============================================

/**
 * Popover 사이즈 프리셋
 */
export interface PopoverSizePreset {
  fontSize: number;
  maxWidth: number;
  borderRadius: number;
  padding: number;
}

const POPOVER_SIZE_MAPPING: Record<string, { fontSize: string }> = {
  sm: { fontSize: '--text-sm' },
  md: { fontSize: '--text-base' },
  lg: { fontSize: '--text-lg' },
};

const POPOVER_FALLBACKS: Record<string, PopoverSizePreset> = {
  sm: { fontSize: 14, maxWidth: 200, borderRadius: 8, padding: 12 },
  md: { fontSize: 16, maxWidth: 250, borderRadius: 12, padding: 16 },
  lg: { fontSize: 18, maxWidth: 320, borderRadius: 16, padding: 20 },
};

/**
 * Popover 사이즈 프리셋 읽기
 */
export function getPopoverSizePreset(size: string): PopoverSizePreset {
  const mapping = POPOVER_SIZE_MAPPING[size];
  const fallback = POPOVER_FALLBACKS[size] || POPOVER_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  return {
    fontSize: parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize),
    maxWidth: fallback.maxWidth,
    borderRadius: fallback.borderRadius,
    padding: fallback.padding,
  };
}

/**
 * Popover 색상 프리셋
 */
export interface PopoverColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  arrowFillColor: number;
  arrowStrokeColor: number;
  shadowColor: number;
}

const POPOVER_COLOR_FALLBACKS: Record<string, PopoverColorPreset> = {
  default: { backgroundColor: 0xf3f4f6, borderColor: 0xcad3dc, textColor: 0x374151, arrowFillColor: 0xf3f4f6, arrowStrokeColor: 0xcad3dc, shadowColor: 0x00000026 },
  primary: { backgroundColor: 0xf3f4f6, borderColor: 0x3b82f6, textColor: 0x374151, arrowFillColor: 0xf3f4f6, arrowStrokeColor: 0x3b82f6, shadowColor: 0x00000026 },
  secondary: { backgroundColor: 0xf3f4f6, borderColor: 0x6366f1, textColor: 0x374151, arrowFillColor: 0xf3f4f6, arrowStrokeColor: 0x6366f1, shadowColor: 0x00000026 },
  tertiary: { backgroundColor: 0xf3f4f6, borderColor: 0xec4899, textColor: 0x374151, arrowFillColor: 0xf3f4f6, arrowStrokeColor: 0xec4899, shadowColor: 0x00000026 },
  error: { backgroundColor: 0xf3f4f6, borderColor: 0xef4444, textColor: 0x374151, arrowFillColor: 0xf3f4f6, arrowStrokeColor: 0xef4444, shadowColor: 0x00000026 },
  filled: { backgroundColor: 0xf9fafb, borderColor: 0x00000000, textColor: 0x374151, arrowFillColor: 0xf9fafb, arrowStrokeColor: 0x00000000, shadowColor: 0x00000026 },
};

/**
 * Popover 색상 프리셋 읽기
 */
export function getPopoverColorPreset(variant: string): PopoverColorPreset {
  return POPOVER_COLOR_FALLBACKS[variant] || POPOVER_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 5: Dialog Size Preset
// ============================================

/**
 * Dialog 사이즈 프리셋
 */
export interface DialogSizePreset {
  fontSize: number;
  titleFontSize: number;
  padding: number;
  borderRadius: number;
  minWidth: number;
}

const DIALOG_SIZE_MAPPING: Record<string, { fontSize: string; titleFontSize: string; padding: string }> = {
  sm: { fontSize: '--text-sm', titleFontSize: '--text-lg', padding: '--spacing-md' },
  md: { fontSize: '--text-base', titleFontSize: '--text-xl', padding: '--spacing-lg' },
  lg: { fontSize: '--text-lg', titleFontSize: '--text-2xl', padding: '--spacing-xl' },
};

const DIALOG_FALLBACKS: Record<string, DialogSizePreset> = {
  sm: { fontSize: 14, titleFontSize: 18, padding: 12, borderRadius: 12, minWidth: 280 },
  md: { fontSize: 16, titleFontSize: 20, padding: 16, borderRadius: 16, minWidth: 320 },
  lg: { fontSize: 18, titleFontSize: 24, padding: 24, borderRadius: 20, minWidth: 400 },
};

/**
 * Dialog 사이즈 프리셋 읽기
 */
export function getDialogSizePreset(size: string): DialogSizePreset {
  const mapping = DIALOG_SIZE_MAPPING[size];
  const fallback = DIALOG_FALLBACKS[size] || DIALOG_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  return {
    fontSize: parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize),
    titleFontSize: parseCSSValue(getCSSVariable(mapping.titleFontSize), fallback.titleFontSize),
    padding: parseCSSValue(getCSSVariable(mapping.padding), fallback.padding),
    borderRadius: fallback.borderRadius,
    minWidth: fallback.minWidth,
  };
}

/**
 * Dialog 색상 프리셋
 */
export interface DialogColorPreset {
  backgroundColor: number;
  borderColor: number;
  titleColor: number;
  textColor: number;
  backdropColor: number;
}

const DIALOG_COLOR_FALLBACKS: Record<string, DialogColorPreset> = {
  default: { backgroundColor: 0xf3f4f6, borderColor: 0x00000000, titleColor: 0x374151, textColor: 0x374151, backdropColor: 0x00000080 },
  primary: { backgroundColor: 0xf3f4f6, borderColor: 0x3b82f6, titleColor: 0x3b82f6, textColor: 0x374151, backdropColor: 0x00000080 },
  secondary: { backgroundColor: 0xf3f4f6, borderColor: 0x6366f1, titleColor: 0x6366f1, textColor: 0x374151, backdropColor: 0x00000080 },
  tertiary: { backgroundColor: 0xf3f4f6, borderColor: 0xec4899, titleColor: 0xec4899, textColor: 0x374151, backdropColor: 0x00000080 },
  error: { backgroundColor: 0xf3f4f6, borderColor: 0xef4444, titleColor: 0xef4444, textColor: 0x374151, backdropColor: 0x00000080 },
  filled: { backgroundColor: 0xf9fafb, borderColor: 0x00000000, titleColor: 0x374151, textColor: 0x374151, backdropColor: 0x00000080 },
};

/**
 * Dialog 색상 프리셋 읽기
 */
export function getDialogColorPreset(variant: string): DialogColorPreset {
  return DIALOG_COLOR_FALLBACKS[variant] || DIALOG_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 6: Date/Color Components
// ============================================

// ============================================
// Phase 6: ColorSwatch Size/Color Preset
// ============================================

/**
 * ColorSwatch 사이즈 프리셋
 */
export interface ColorSwatchSizePreset {
  width: number;
  height: number;
  borderRadius: number;
  borderWidth: number;
}

const COLOR_SWATCH_SIZE_MAPPING: Record<string, { size: string }> = {
  sm: { size: '--text-sm' },
  md: { size: '--text-lg' },
  lg: { size: '--text-2xl' },
};

const COLOR_SWATCH_FALLBACKS: Record<string, ColorSwatchSizePreset> = {
  sm: { width: 14, height: 14, borderRadius: 4, borderWidth: 1 },
  md: { width: 18, height: 18, borderRadius: 6, borderWidth: 1 },
  lg: { width: 24, height: 24, borderRadius: 8, borderWidth: 2 },
};

/**
 * ColorSwatch 사이즈 프리셋 읽기
 */
export function getColorSwatchSizePreset(size: string): ColorSwatchSizePreset {
  const mapping = COLOR_SWATCH_SIZE_MAPPING[size];
  const fallback = COLOR_SWATCH_FALLBACKS[size] || COLOR_SWATCH_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const dimension = parseCSSValue(getCSSVariable(mapping.size), fallback.width);
  return {
    width: dimension,
    height: dimension,
    borderRadius: fallback.borderRadius,
    borderWidth: fallback.borderWidth,
  };
}

/**
 * ColorSwatch 색상 프리셋
 */
export interface ColorSwatchColorPreset {
  borderColor: number;
  checkerColor: number;
  selectedBorderColor: number;
}

const COLOR_SWATCH_COLOR_FALLBACKS: Record<string, ColorSwatchColorPreset> = {
  default: { borderColor: 0xcad3dc, checkerColor: 0xe5e7eb, selectedBorderColor: 0x3b82f6 },
  primary: { borderColor: 0x3b82f6, checkerColor: 0xe5e7eb, selectedBorderColor: 0x3b82f6 },
  secondary: { borderColor: 0x6366f1, checkerColor: 0xe5e7eb, selectedBorderColor: 0x6366f1 },
  tertiary: { borderColor: 0xec4899, checkerColor: 0xe5e7eb, selectedBorderColor: 0xec4899 },
  error: { borderColor: 0xef4444, checkerColor: 0xe5e7eb, selectedBorderColor: 0xef4444 },
};

/**
 * ColorSwatch 색상 프리셋 읽기
 */
export function getColorSwatchColorPreset(variant: string): ColorSwatchColorPreset {
  return COLOR_SWATCH_COLOR_FALLBACKS[variant] || COLOR_SWATCH_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 6: ColorSlider Size/Color Preset
// ============================================

/**
 * ColorSlider 사이즈 프리셋
 */
export interface ColorSliderSizePreset {
  trackWidth: number;
  trackHeight: number;
  thumbSize: number;
  thumbBorderWidth: number;
  borderRadius: number;
}

const COLOR_SLIDER_FALLBACKS: Record<string, ColorSliderSizePreset> = {
  sm: { trackWidth: 160, trackHeight: 20, thumbSize: 16, thumbBorderWidth: 2, borderRadius: 10 },
  md: { trackWidth: 192, trackHeight: 28, thumbSize: 20, thumbBorderWidth: 2, borderRadius: 14 },
  lg: { trackWidth: 240, trackHeight: 36, thumbSize: 24, thumbBorderWidth: 3, borderRadius: 18 },
};

/**
 * ColorSlider 사이즈 프리셋 읽기
 */
export function getColorSliderSizePreset(size: string): ColorSliderSizePreset {
  return COLOR_SLIDER_FALLBACKS[size] || COLOR_SLIDER_FALLBACKS.md;
}

/**
 * ColorSlider 색상 프리셋
 */
export interface ColorSliderColorPreset {
  thumbBorderColor: number;
  thumbInnerBorderColor: number;
  focusRingColor: number;
}

const COLOR_SLIDER_COLOR_FALLBACKS: Record<string, ColorSliderColorPreset> = {
  default: { thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0x00000033, focusRingColor: 0x3b82f6 },
  primary: { thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0x3b82f633, focusRingColor: 0x3b82f6 },
  secondary: { thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0x6366f133, focusRingColor: 0x6366f1 },
  tertiary: { thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0xec489933, focusRingColor: 0xec4899 },
  error: { thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0xef444433, focusRingColor: 0xef4444 },
};

/**
 * ColorSlider 색상 프리셋 읽기
 */
export function getColorSliderColorPreset(variant: string): ColorSliderColorPreset {
  return COLOR_SLIDER_COLOR_FALLBACKS[variant] || COLOR_SLIDER_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 6: TimeField Size/Color Preset
// ============================================

/**
 * TimeField 사이즈 프리셋
 */
export interface TimeFieldSizePreset {
  fontSize: number;
  height: number;
  padding: number;
  gap: number;
  borderRadius: number;
  segmentPadding: number;
}

const TIME_FIELD_SIZE_MAPPING: Record<string, { fontSize: string; height: string; padding: string }> = {
  sm: { fontSize: '--text-sm', height: '--spacing-xl', padding: '--spacing-xs' },
  md: { fontSize: '--text-base', height: '--spacing-2xl', padding: '--spacing-sm' },
  lg: { fontSize: '--text-lg', height: '--spacing-3xl', padding: '--spacing-md' },
};

const TIME_FIELD_FALLBACKS: Record<string, TimeFieldSizePreset> = {
  sm: { fontSize: 14, height: 32, padding: 4, gap: 2, borderRadius: 6, segmentPadding: 2 },
  md: { fontSize: 16, height: 40, padding: 8, gap: 4, borderRadius: 8, segmentPadding: 4 },
  lg: { fontSize: 18, height: 48, padding: 12, gap: 6, borderRadius: 10, segmentPadding: 6 },
};

/**
 * TimeField 사이즈 프리셋 읽기
 */
export function getTimeFieldSizePreset(size: string): TimeFieldSizePreset {
  const mapping = TIME_FIELD_SIZE_MAPPING[size];
  const fallback = TIME_FIELD_FALLBACKS[size] || TIME_FIELD_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  return {
    fontSize: parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize),
    height: parseCSSValue(getCSSVariable(mapping.height), fallback.height),
    padding: parseCSSValue(getCSSVariable(mapping.padding), fallback.padding),
    gap: fallback.gap,
    borderRadius: fallback.borderRadius,
    segmentPadding: fallback.segmentPadding,
  };
}

/**
 * TimeField 색상 프리셋
 */
export interface TimeFieldColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  placeholderColor: number;
  focusBorderColor: number;
  segmentSelectedBg: number;
  segmentSelectedText: number;
}

const TIME_FIELD_COLOR_FALLBACKS: Record<string, TimeFieldColorPreset> = {
  default: { backgroundColor: 0xffffff, borderColor: 0xcad3dc, textColor: 0x374151, placeholderColor: 0x9ca3af, focusBorderColor: 0x3b82f6, segmentSelectedBg: 0x3b82f6, segmentSelectedText: 0xffffff },
  primary: { backgroundColor: 0xffffff, borderColor: 0x3b82f6, textColor: 0x374151, placeholderColor: 0x9ca3af, focusBorderColor: 0x3b82f6, segmentSelectedBg: 0x3b82f6, segmentSelectedText: 0xffffff },
  secondary: { backgroundColor: 0xffffff, borderColor: 0x6366f1, textColor: 0x374151, placeholderColor: 0x9ca3af, focusBorderColor: 0x6366f1, segmentSelectedBg: 0x6366f1, segmentSelectedText: 0xffffff },
  tertiary: { backgroundColor: 0xffffff, borderColor: 0xec4899, textColor: 0x374151, placeholderColor: 0x9ca3af, focusBorderColor: 0xec4899, segmentSelectedBg: 0xec4899, segmentSelectedText: 0xffffff },
  error: { backgroundColor: 0xffffff, borderColor: 0xef4444, textColor: 0x374151, placeholderColor: 0x9ca3af, focusBorderColor: 0xef4444, segmentSelectedBg: 0xef4444, segmentSelectedText: 0xffffff },
  filled: { backgroundColor: 0xf3f4f6, borderColor: 0x00000000, textColor: 0x374151, placeholderColor: 0x9ca3af, focusBorderColor: 0x3b82f6, segmentSelectedBg: 0x3b82f6, segmentSelectedText: 0xffffff },
};

/**
 * TimeField 색상 프리셋 읽기
 */
export function getTimeFieldColorPreset(variant: string): TimeFieldColorPreset {
  return TIME_FIELD_COLOR_FALLBACKS[variant] || TIME_FIELD_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 6: DateField Size/Color Preset
// ============================================

/**
 * DateField 사이즈 프리셋
 */
export interface DateFieldSizePreset {
  fontSize: number;
  height: number;
  padding: number;
  gap: number;
  borderRadius: number;
  segmentPadding: number;
}

const DATE_FIELD_SIZE_MAPPING: Record<string, { fontSize: string; height: string; padding: string }> = {
  sm: { fontSize: '--text-sm', height: '--spacing-xl', padding: '--spacing-xs' },
  md: { fontSize: '--text-base', height: '--spacing-2xl', padding: '--spacing-sm' },
  lg: { fontSize: '--text-lg', height: '--spacing-3xl', padding: '--spacing-md' },
};

const DATE_FIELD_FALLBACKS: Record<string, DateFieldSizePreset> = {
  sm: { fontSize: 14, height: 32, padding: 4, gap: 2, borderRadius: 6, segmentPadding: 2 },
  md: { fontSize: 16, height: 40, padding: 8, gap: 4, borderRadius: 8, segmentPadding: 4 },
  lg: { fontSize: 18, height: 48, padding: 12, gap: 6, borderRadius: 10, segmentPadding: 6 },
};

/**
 * DateField 사이즈 프리셋 읽기
 */
export function getDateFieldSizePreset(size: string): DateFieldSizePreset {
  const mapping = DATE_FIELD_SIZE_MAPPING[size];
  const fallback = DATE_FIELD_FALLBACKS[size] || DATE_FIELD_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  return {
    fontSize: parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize),
    height: parseCSSValue(getCSSVariable(mapping.height), fallback.height),
    padding: parseCSSValue(getCSSVariable(mapping.padding), fallback.padding),
    gap: fallback.gap,
    borderRadius: fallback.borderRadius,
    segmentPadding: fallback.segmentPadding,
  };
}

/**
 * DateField 색상 프리셋
 */
export interface DateFieldColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  placeholderColor: number;
  focusBorderColor: number;
  segmentSelectedBg: number;
  segmentSelectedText: number;
}

const DATE_FIELD_COLOR_FALLBACKS: Record<string, DateFieldColorPreset> = {
  default: { backgroundColor: 0xffffff, borderColor: 0xcad3dc, textColor: 0x374151, placeholderColor: 0x9ca3af, focusBorderColor: 0x3b82f6, segmentSelectedBg: 0x3b82f6, segmentSelectedText: 0xffffff },
  primary: { backgroundColor: 0xffffff, borderColor: 0x3b82f6, textColor: 0x374151, placeholderColor: 0x9ca3af, focusBorderColor: 0x3b82f6, segmentSelectedBg: 0x3b82f6, segmentSelectedText: 0xffffff },
  secondary: { backgroundColor: 0xffffff, borderColor: 0x6366f1, textColor: 0x374151, placeholderColor: 0x9ca3af, focusBorderColor: 0x6366f1, segmentSelectedBg: 0x6366f1, segmentSelectedText: 0xffffff },
  tertiary: { backgroundColor: 0xffffff, borderColor: 0xec4899, textColor: 0x374151, placeholderColor: 0x9ca3af, focusBorderColor: 0xec4899, segmentSelectedBg: 0xec4899, segmentSelectedText: 0xffffff },
  error: { backgroundColor: 0xffffff, borderColor: 0xef4444, textColor: 0x374151, placeholderColor: 0x9ca3af, focusBorderColor: 0xef4444, segmentSelectedBg: 0xef4444, segmentSelectedText: 0xffffff },
  filled: { backgroundColor: 0xf3f4f6, borderColor: 0x00000000, textColor: 0x374151, placeholderColor: 0x9ca3af, focusBorderColor: 0x3b82f6, segmentSelectedBg: 0x3b82f6, segmentSelectedText: 0xffffff },
};

/**
 * DateField 색상 프리셋 읽기
 */
export function getDateFieldColorPreset(variant: string): DateFieldColorPreset {
  return DATE_FIELD_COLOR_FALLBACKS[variant] || DATE_FIELD_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 6: ColorArea Size/Color Preset
// ============================================

/**
 * ColorArea 사이즈 프리셋
 */
export interface ColorAreaSizePreset {
  width: number;
  height: number;
  thumbSize: number;
  thumbBorderWidth: number;
  borderRadius: number;
}

const COLOR_AREA_FALLBACKS: Record<string, ColorAreaSizePreset> = {
  sm: { width: 144, height: 144, thumbSize: 16, thumbBorderWidth: 2, borderRadius: 8 },
  md: { width: 192, height: 192, thumbSize: 20, thumbBorderWidth: 2, borderRadius: 10 },
  lg: { width: 256, height: 256, thumbSize: 24, thumbBorderWidth: 3, borderRadius: 12 },
};

/**
 * ColorArea 사이즈 프리셋 읽기
 */
export function getColorAreaSizePreset(size: string): ColorAreaSizePreset {
  return COLOR_AREA_FALLBACKS[size] || COLOR_AREA_FALLBACKS.md;
}

/**
 * ColorArea 색상 프리셋
 */
export interface ColorAreaColorPreset {
  borderColor: number;
  thumbBorderColor: number;
  thumbInnerBorderColor: number;
  focusRingColor: number;
}

const COLOR_AREA_COLOR_FALLBACKS: Record<string, ColorAreaColorPreset> = {
  default: { borderColor: 0xcad3dc, thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0x00000033, focusRingColor: 0x3b82f6 },
  primary: { borderColor: 0x3b82f6, thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0x3b82f633, focusRingColor: 0x3b82f6 },
  secondary: { borderColor: 0x6366f1, thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0x6366f133, focusRingColor: 0x6366f1 },
  tertiary: { borderColor: 0xec4899, thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0xec489933, focusRingColor: 0xec4899 },
  error: { borderColor: 0xef4444, thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0xef444433, focusRingColor: 0xef4444 },
};

/**
 * ColorArea 색상 프리셋 읽기
 */
export function getColorAreaColorPreset(variant: string): ColorAreaColorPreset {
  return COLOR_AREA_COLOR_FALLBACKS[variant] || COLOR_AREA_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 6: Calendar Size/Color Preset
// ============================================

/**
 * Calendar 사이즈 프리셋
 */
export interface CalendarSizePreset {
  fontSize: number;
  headerFontSize: number;
  cellSize: number;
  padding: number;
  gap: number;
  borderRadius: number;
  buttonSize: number;
}

const CALENDAR_SIZE_MAPPING: Record<string, { fontSize: string; headerFontSize: string }> = {
  sm: { fontSize: '--text-sm', headerFontSize: '--text-base' },
  md: { fontSize: '--text-base', headerFontSize: '--text-lg' },
  lg: { fontSize: '--text-lg', headerFontSize: '--text-xl' },
};

const CALENDAR_FALLBACKS: Record<string, CalendarSizePreset> = {
  sm: { fontSize: 14, headerFontSize: 16, cellSize: 28, padding: 8, gap: 2, borderRadius: 8, buttonSize: 24 },
  md: { fontSize: 16, headerFontSize: 18, cellSize: 36, padding: 12, gap: 4, borderRadius: 10, buttonSize: 28 },
  lg: { fontSize: 18, headerFontSize: 20, cellSize: 44, padding: 16, gap: 6, borderRadius: 12, buttonSize: 32 },
};

/**
 * Calendar 사이즈 프리셋 읽기
 */
export function getCalendarSizePreset(size: string): CalendarSizePreset {
  const mapping = CALENDAR_SIZE_MAPPING[size];
  const fallback = CALENDAR_FALLBACKS[size] || CALENDAR_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  return {
    fontSize: parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize),
    headerFontSize: parseCSSValue(getCSSVariable(mapping.headerFontSize), fallback.headerFontSize),
    cellSize: fallback.cellSize,
    padding: fallback.padding,
    gap: fallback.gap,
    borderRadius: fallback.borderRadius,
    buttonSize: fallback.buttonSize,
  };
}

/**
 * Calendar 색상 프리셋
 */
export interface CalendarColorPreset {
  backgroundColor: number;
  borderColor: number;
  headerColor: number;
  textColor: number;
  weekdayColor: number;
  disabledColor: number;
  todayBorderColor: number;
  selectedBgColor: number;
  selectedTextColor: number;
  hoverBgColor: number;
  outsideMonthColor: number;
}

const CALENDAR_COLOR_FALLBACKS: Record<string, CalendarColorPreset> = {
  default: {
    backgroundColor: 0xffffff, borderColor: 0xcad3dc, headerColor: 0x374151, textColor: 0x374151,
    weekdayColor: 0x6b7280, disabledColor: 0xd1d5db, todayBorderColor: 0x3b82f6,
    selectedBgColor: 0x3b82f6, selectedTextColor: 0xffffff, hoverBgColor: 0xf3f4f6, outsideMonthColor: 0x9ca3af
  },
  primary: {
    backgroundColor: 0xffffff, borderColor: 0x3b82f6, headerColor: 0x3b82f6, textColor: 0x374151,
    weekdayColor: 0x6b7280, disabledColor: 0xd1d5db, todayBorderColor: 0x3b82f6,
    selectedBgColor: 0x3b82f6, selectedTextColor: 0xffffff, hoverBgColor: 0xeff6ff, outsideMonthColor: 0x9ca3af
  },
  secondary: {
    backgroundColor: 0xffffff, borderColor: 0x6366f1, headerColor: 0x6366f1, textColor: 0x374151,
    weekdayColor: 0x6b7280, disabledColor: 0xd1d5db, todayBorderColor: 0x6366f1,
    selectedBgColor: 0x6366f1, selectedTextColor: 0xffffff, hoverBgColor: 0xeef2ff, outsideMonthColor: 0x9ca3af
  },
  tertiary: {
    backgroundColor: 0xffffff, borderColor: 0xec4899, headerColor: 0xec4899, textColor: 0x374151,
    weekdayColor: 0x6b7280, disabledColor: 0xd1d5db, todayBorderColor: 0xec4899,
    selectedBgColor: 0xec4899, selectedTextColor: 0xffffff, hoverBgColor: 0xfdf2f8, outsideMonthColor: 0x9ca3af
  },
  error: {
    backgroundColor: 0xffffff, borderColor: 0xef4444, headerColor: 0xef4444, textColor: 0x374151,
    weekdayColor: 0x6b7280, disabledColor: 0xd1d5db, todayBorderColor: 0xef4444,
    selectedBgColor: 0xef4444, selectedTextColor: 0xffffff, hoverBgColor: 0xfef2f2, outsideMonthColor: 0x9ca3af
  },
  filled: {
    backgroundColor: 0xf9fafb, borderColor: 0x00000000, headerColor: 0x374151, textColor: 0x374151,
    weekdayColor: 0x6b7280, disabledColor: 0xd1d5db, todayBorderColor: 0x3b82f6,
    selectedBgColor: 0x3b82f6, selectedTextColor: 0xffffff, hoverBgColor: 0xf3f4f6, outsideMonthColor: 0x9ca3af
  },
};

/**
 * Calendar 색상 프리셋 읽기
 */
export function getCalendarColorPreset(variant: string): CalendarColorPreset {
  return CALENDAR_COLOR_FALLBACKS[variant] || CALENDAR_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 6: ColorWheel Size/Color Preset
// ============================================

/**
 * ColorWheel 사이즈 프리셋
 */
export interface ColorWheelSizePreset {
  outerRadius: number;
  innerRadius: number;
  thumbSize: number;
  thumbBorderWidth: number;
}

const COLOR_WHEEL_FALLBACKS: Record<string, ColorWheelSizePreset> = {
  sm: { outerRadius: 72, innerRadius: 56, thumbSize: 16, thumbBorderWidth: 2 },
  md: { outerRadius: 96, innerRadius: 72, thumbSize: 20, thumbBorderWidth: 2 },
  lg: { outerRadius: 128, innerRadius: 96, thumbSize: 24, thumbBorderWidth: 3 },
};

/**
 * ColorWheel 사이즈 프리셋 읽기
 */
export function getColorWheelSizePreset(size: string): ColorWheelSizePreset {
  return COLOR_WHEEL_FALLBACKS[size] || COLOR_WHEEL_FALLBACKS.md;
}

/**
 * ColorWheel 색상 프리셋
 */
export interface ColorWheelColorPreset {
  thumbBorderColor: number;
  thumbInnerBorderColor: number;
  focusRingColor: number;
}

const COLOR_WHEEL_COLOR_FALLBACKS: Record<string, ColorWheelColorPreset> = {
  default: { thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0x00000033, focusRingColor: 0x3b82f6 },
  primary: { thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0x3b82f633, focusRingColor: 0x3b82f6 },
  secondary: { thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0x6366f133, focusRingColor: 0x6366f1 },
  tertiary: { thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0xec489933, focusRingColor: 0xec4899 },
  error: { thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0xef444433, focusRingColor: 0xef4444 },
};

/**
 * ColorWheel 색상 프리셋 읽기
 */
export function getColorWheelColorPreset(variant: string): ColorWheelColorPreset {
  return COLOR_WHEEL_COLOR_FALLBACKS[variant] || COLOR_WHEEL_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 6: DatePicker Size/Color Preset
// ============================================

/**
 * DatePicker 사이즈 프리셋 (DateField + Calendar 조합)
 */
export interface DatePickerSizePreset {
  fieldHeight: number;
  fieldPadding: number;
  fieldFontSize: number;
  fieldBorderRadius: number;
  buttonSize: number;
  calendarWidth: number;
  calendarCellSize: number;
  gap: number;
}

const DATE_PICKER_SIZE_MAPPING: Record<string, { fontSize: string }> = {
  sm: { fontSize: '--text-sm' },
  md: { fontSize: '--text-base' },
  lg: { fontSize: '--text-lg' },
};

const DATE_PICKER_FALLBACKS: Record<string, DatePickerSizePreset> = {
  sm: { fieldHeight: 32, fieldPadding: 8, fieldFontSize: 14, fieldBorderRadius: 6, buttonSize: 28, calendarWidth: 260, calendarCellSize: 28, gap: 8 },
  md: { fieldHeight: 40, fieldPadding: 12, fieldFontSize: 16, fieldBorderRadius: 8, buttonSize: 32, calendarWidth: 300, calendarCellSize: 36, gap: 12 },
  lg: { fieldHeight: 48, fieldPadding: 16, fieldFontSize: 18, fieldBorderRadius: 10, buttonSize: 40, calendarWidth: 360, calendarCellSize: 44, gap: 16 },
};

/**
 * DatePicker 사이즈 프리셋 읽기
 */
export function getDatePickerSizePreset(size: string): DatePickerSizePreset {
  const mapping = DATE_PICKER_SIZE_MAPPING[size];
  const fallback = DATE_PICKER_FALLBACKS[size] || DATE_PICKER_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  return {
    ...fallback,
    fieldFontSize: parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fieldFontSize),
  };
}

/**
 * DatePicker 색상 프리셋
 */
export interface DatePickerColorPreset {
  fieldBackgroundColor: number;
  fieldBorderColor: number;
  fieldTextColor: number;
  fieldPlaceholderColor: number;
  buttonBackgroundColor: number;
  buttonIconColor: number;
  focusBorderColor: number;
  popoverBackgroundColor: number;
  popoverBorderColor: number;
}

const DATE_PICKER_COLOR_FALLBACKS: Record<string, DatePickerColorPreset> = {
  default: {
    fieldBackgroundColor: 0xffffff, fieldBorderColor: 0xcad3dc, fieldTextColor: 0x374151,
    fieldPlaceholderColor: 0x9ca3af, buttonBackgroundColor: 0xf3f4f6, buttonIconColor: 0x374151,
    focusBorderColor: 0x3b82f6, popoverBackgroundColor: 0xffffff, popoverBorderColor: 0xcad3dc
  },
  primary: {
    fieldBackgroundColor: 0xffffff, fieldBorderColor: 0x3b82f6, fieldTextColor: 0x374151,
    fieldPlaceholderColor: 0x9ca3af, buttonBackgroundColor: 0xeff6ff, buttonIconColor: 0x3b82f6,
    focusBorderColor: 0x3b82f6, popoverBackgroundColor: 0xffffff, popoverBorderColor: 0x3b82f6
  },
  secondary: {
    fieldBackgroundColor: 0xffffff, fieldBorderColor: 0x6366f1, fieldTextColor: 0x374151,
    fieldPlaceholderColor: 0x9ca3af, buttonBackgroundColor: 0xeef2ff, buttonIconColor: 0x6366f1,
    focusBorderColor: 0x6366f1, popoverBackgroundColor: 0xffffff, popoverBorderColor: 0x6366f1
  },
  tertiary: {
    fieldBackgroundColor: 0xffffff, fieldBorderColor: 0xec4899, fieldTextColor: 0x374151,
    fieldPlaceholderColor: 0x9ca3af, buttonBackgroundColor: 0xfdf2f8, buttonIconColor: 0xec4899,
    focusBorderColor: 0xec4899, popoverBackgroundColor: 0xffffff, popoverBorderColor: 0xec4899
  },
  error: {
    fieldBackgroundColor: 0xffffff, fieldBorderColor: 0xef4444, fieldTextColor: 0x374151,
    fieldPlaceholderColor: 0x9ca3af, buttonBackgroundColor: 0xfef2f2, buttonIconColor: 0xef4444,
    focusBorderColor: 0xef4444, popoverBackgroundColor: 0xffffff, popoverBorderColor: 0xef4444
  },
  filled: {
    fieldBackgroundColor: 0xf3f4f6, fieldBorderColor: 0x00000000, fieldTextColor: 0x374151,
    fieldPlaceholderColor: 0x9ca3af, buttonBackgroundColor: 0xe5e7eb, buttonIconColor: 0x374151,
    focusBorderColor: 0x3b82f6, popoverBackgroundColor: 0xffffff, popoverBorderColor: 0xcad3dc
  },
};

/**
 * DatePicker 색상 프리셋 읽기
 */
export function getDatePickerColorPreset(variant: string): DatePickerColorPreset {
  return DATE_PICKER_COLOR_FALLBACKS[variant] || DATE_PICKER_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 6: ColorPicker Size/Color Preset
// ============================================

/**
 * ColorPicker 사이즈 프리셋 (ColorArea + ColorSlider + ColorSwatch 조합)
 */
export interface ColorPickerSizePreset {
  areaSize: number;
  sliderWidth: number;
  sliderHeight: number;
  swatchSize: number;
  thumbSize: number;
  padding: number;
  gap: number;
  borderRadius: number;
}

const COLOR_PICKER_FALLBACKS: Record<string, ColorPickerSizePreset> = {
  sm: { areaSize: 144, sliderWidth: 144, sliderHeight: 20, swatchSize: 20, thumbSize: 16, padding: 8, gap: 8, borderRadius: 8 },
  md: { areaSize: 192, sliderWidth: 192, sliderHeight: 28, swatchSize: 24, thumbSize: 20, padding: 12, gap: 12, borderRadius: 10 },
  lg: { areaSize: 256, sliderWidth: 256, sliderHeight: 36, swatchSize: 32, thumbSize: 24, padding: 16, gap: 16, borderRadius: 12 },
};

/**
 * ColorPicker 사이즈 프리셋 읽기
 */
export function getColorPickerSizePreset(size: string): ColorPickerSizePreset {
  return COLOR_PICKER_FALLBACKS[size] || COLOR_PICKER_FALLBACKS.md;
}

/**
 * ColorPicker 색상 프리셋
 */
export interface ColorPickerColorPreset {
  backgroundColor: number;
  borderColor: number;
  thumbBorderColor: number;
  thumbInnerBorderColor: number;
  focusRingColor: number;
  labelColor: number;
}

const COLOR_PICKER_COLOR_FALLBACKS: Record<string, ColorPickerColorPreset> = {
  default: { backgroundColor: 0xffffff, borderColor: 0xcad3dc, thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0x00000033, focusRingColor: 0x3b82f6, labelColor: 0x374151 },
  primary: { backgroundColor: 0xffffff, borderColor: 0x3b82f6, thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0x3b82f633, focusRingColor: 0x3b82f6, labelColor: 0x374151 },
  secondary: { backgroundColor: 0xffffff, borderColor: 0x6366f1, thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0x6366f133, focusRingColor: 0x6366f1, labelColor: 0x374151 },
  tertiary: { backgroundColor: 0xffffff, borderColor: 0xec4899, thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0xec489933, focusRingColor: 0xec4899, labelColor: 0x374151 },
  error: { backgroundColor: 0xffffff, borderColor: 0xef4444, thumbBorderColor: 0xffffff, thumbInnerBorderColor: 0xef444433, focusRingColor: 0xef4444, labelColor: 0x374151 },
};

/**
 * ColorPicker 색상 프리셋 읽기
 */
export function getColorPickerColorPreset(variant: string): ColorPickerColorPreset {
  return COLOR_PICKER_COLOR_FALLBACKS[variant] || COLOR_PICKER_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 6: DateRangePicker Size/Color Preset
// ============================================

/**
 * DateRangePicker 사이즈 프리셋 (DateField x 2 + Calendar 조합)
 */
export interface DateRangePickerSizePreset {
  fieldHeight: number;
  fieldPadding: number;
  fieldFontSize: number;
  fieldBorderRadius: number;
  buttonSize: number;
  calendarWidth: number;
  calendarCellSize: number;
  gap: number;
  separatorWidth: number;
}

const DATE_RANGE_PICKER_SIZE_MAPPING: Record<string, { fontSize: string }> = {
  sm: { fontSize: '--text-sm' },
  md: { fontSize: '--text-base' },
  lg: { fontSize: '--text-lg' },
};

const DATE_RANGE_PICKER_FALLBACKS: Record<string, DateRangePickerSizePreset> = {
  sm: { fieldHeight: 32, fieldPadding: 8, fieldFontSize: 14, fieldBorderRadius: 6, buttonSize: 28, calendarWidth: 520, calendarCellSize: 28, gap: 8, separatorWidth: 16 },
  md: { fieldHeight: 40, fieldPadding: 12, fieldFontSize: 16, fieldBorderRadius: 8, buttonSize: 32, calendarWidth: 600, calendarCellSize: 36, gap: 12, separatorWidth: 24 },
  lg: { fieldHeight: 48, fieldPadding: 16, fieldFontSize: 18, fieldBorderRadius: 10, buttonSize: 40, calendarWidth: 720, calendarCellSize: 44, gap: 16, separatorWidth: 32 },
};

/**
 * DateRangePicker 사이즈 프리셋 읽기
 */
export function getDateRangePickerSizePreset(size: string): DateRangePickerSizePreset {
  const mapping = DATE_RANGE_PICKER_SIZE_MAPPING[size];
  const fallback = DATE_RANGE_PICKER_FALLBACKS[size] || DATE_RANGE_PICKER_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  return {
    ...fallback,
    fieldFontSize: parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fieldFontSize),
  };
}

/**
 * DateRangePicker 색상 프리셋
 */
export interface DateRangePickerColorPreset {
  fieldBackgroundColor: number;
  fieldBorderColor: number;
  fieldTextColor: number;
  fieldPlaceholderColor: number;
  buttonBackgroundColor: number;
  buttonIconColor: number;
  focusBorderColor: number;
  popoverBackgroundColor: number;
  popoverBorderColor: number;
  rangeBgColor: number;
  rangeTextColor: number;
  separatorColor: number;
}

const DATE_RANGE_PICKER_COLOR_FALLBACKS: Record<string, DateRangePickerColorPreset> = {
  default: {
    fieldBackgroundColor: 0xffffff, fieldBorderColor: 0xcad3dc, fieldTextColor: 0x374151,
    fieldPlaceholderColor: 0x9ca3af, buttonBackgroundColor: 0xf3f4f6, buttonIconColor: 0x374151,
    focusBorderColor: 0x3b82f6, popoverBackgroundColor: 0xffffff, popoverBorderColor: 0xcad3dc,
    rangeBgColor: 0xeff6ff, rangeTextColor: 0x374151, separatorColor: 0x9ca3af
  },
  primary: {
    fieldBackgroundColor: 0xffffff, fieldBorderColor: 0x3b82f6, fieldTextColor: 0x374151,
    fieldPlaceholderColor: 0x9ca3af, buttonBackgroundColor: 0xeff6ff, buttonIconColor: 0x3b82f6,
    focusBorderColor: 0x3b82f6, popoverBackgroundColor: 0xffffff, popoverBorderColor: 0x3b82f6,
    rangeBgColor: 0xeff6ff, rangeTextColor: 0x374151, separatorColor: 0x3b82f6
  },
  secondary: {
    fieldBackgroundColor: 0xffffff, fieldBorderColor: 0x6366f1, fieldTextColor: 0x374151,
    fieldPlaceholderColor: 0x9ca3af, buttonBackgroundColor: 0xeef2ff, buttonIconColor: 0x6366f1,
    focusBorderColor: 0x6366f1, popoverBackgroundColor: 0xffffff, popoverBorderColor: 0x6366f1,
    rangeBgColor: 0xeef2ff, rangeTextColor: 0x374151, separatorColor: 0x6366f1
  },
  tertiary: {
    fieldBackgroundColor: 0xffffff, fieldBorderColor: 0xec4899, fieldTextColor: 0x374151,
    fieldPlaceholderColor: 0x9ca3af, buttonBackgroundColor: 0xfdf2f8, buttonIconColor: 0xec4899,
    focusBorderColor: 0xec4899, popoverBackgroundColor: 0xffffff, popoverBorderColor: 0xec4899,
    rangeBgColor: 0xfdf2f8, rangeTextColor: 0x374151, separatorColor: 0xec4899
  },
  error: {
    fieldBackgroundColor: 0xffffff, fieldBorderColor: 0xef4444, fieldTextColor: 0x374151,
    fieldPlaceholderColor: 0x9ca3af, buttonBackgroundColor: 0xfef2f2, buttonIconColor: 0xef4444,
    focusBorderColor: 0xef4444, popoverBackgroundColor: 0xffffff, popoverBorderColor: 0xef4444,
    rangeBgColor: 0xfef2f2, rangeTextColor: 0x374151, separatorColor: 0xef4444
  },
  filled: {
    fieldBackgroundColor: 0xf3f4f6, fieldBorderColor: 0x00000000, fieldTextColor: 0x374151,
    fieldPlaceholderColor: 0x9ca3af, buttonBackgroundColor: 0xe5e7eb, buttonIconColor: 0x374151,
    focusBorderColor: 0x3b82f6, popoverBackgroundColor: 0xffffff, popoverBorderColor: 0xcad3dc,
    rangeBgColor: 0xeff6ff, rangeTextColor: 0x374151, separatorColor: 0x9ca3af
  },
};

/**
 * DateRangePicker 색상 프리셋 읽기
 */
export function getDateRangePickerColorPreset(variant: string): DateRangePickerColorPreset {
  return DATE_RANGE_PICKER_COLOR_FALLBACKS[variant] || DATE_RANGE_PICKER_COLOR_FALLBACKS.default;
}

// ============================================================================
// Phase 7: Form & Utility Components
// ============================================================================

/**
 * TextField 사이즈 프리셋
 * 🚀 Phase 19: .react-aria-TextField / .react-aria-Input 클래스에서 스타일 읽기
 */
export interface TextFieldSizePreset {
  fontSize: number;
  height: number;
  padding: number;
  paddingX: number;
  borderRadius: number;
  labelFontSize: number;
  descriptionFontSize: number;
  gap: number;
}

const TEXT_FIELD_SIZE_FALLBACKS: Record<string, TextFieldSizePreset> = {
  sm: { fontSize: 12, height: 32, padding: 6, paddingX: 10, borderRadius: 6, labelFontSize: 12, descriptionFontSize: 11, gap: 4 },
  md: { fontSize: 14, height: 40, padding: 8, paddingX: 12, borderRadius: 8, labelFontSize: 14, descriptionFontSize: 12, gap: 6 },
  lg: { fontSize: 16, height: 48, padding: 10, paddingX: 14, borderRadius: 10, labelFontSize: 16, descriptionFontSize: 14, gap: 8 },
};

/**
 * .react-aria-TextField / .react-aria-Input 클래스에서 사이즈 스타일 읽기
 */
export function getTextFieldSizePreset(size: string): TextFieldSizePreset {
  const fallback = TEXT_FIELD_SIZE_FALLBACKS[size] || TEXT_FIELD_SIZE_FALLBACKS.md;

  try {
    // 임시 DOM 요소 생성
    const textField = document.createElement('div');
    textField.className = `react-aria-TextField ${size}`;
    textField.style.position = 'absolute';
    textField.style.visibility = 'hidden';
    textField.style.pointerEvents = 'none';

    const label = document.createElement('label');
    label.className = 'react-aria-Label';
    textField.appendChild(label);

    const input = document.createElement('input');
    input.className = 'react-aria-Input';
    textField.appendChild(input);

    const description = document.createElement('div');
    description.slot = 'description';
    textField.appendChild(description);

    document.body.appendChild(textField);

    const textFieldStyle = getComputedStyle(textField);
    const labelStyle = getComputedStyle(label);
    const inputStyle = getComputedStyle(input);
    const descStyle = getComputedStyle(description);

    // 값 파싱
    const fontSize = parseFloat(inputStyle.fontSize) || fallback.fontSize;
    const labelFontSize = parseFloat(labelStyle.fontSize) || fallback.labelFontSize;
    const descriptionFontSize = parseFloat(descStyle.fontSize) || fallback.descriptionFontSize;
    const paddingTop = parseFloat(inputStyle.paddingTop) || fallback.padding;
    const paddingLeft = parseFloat(inputStyle.paddingLeft) || fallback.paddingX;
    const borderRadius = parseFloat(inputStyle.borderRadius) || fallback.borderRadius;
    const gap = parseFloat(textFieldStyle.gap) || fallback.gap;

    // Input 높이 계산 (padding + lineHeight)
    const lineHeight = parseFloat(inputStyle.lineHeight) || fontSize * 1.5;
    const height = paddingTop * 2 + lineHeight;

    document.body.removeChild(textField);

    return {
      fontSize,
      height: Math.round(height),
      padding: Math.round(paddingTop),
      paddingX: Math.round(paddingLeft),
      borderRadius: Math.round(borderRadius),
      labelFontSize,
      descriptionFontSize,
      gap: Math.round(gap),
    };
  } catch {
    return fallback;
  }
}

/**
 * TextField 색상 프리셋
 * 🚀 Phase 19: .react-aria-TextField / .react-aria-Input 클래스에서 색상 읽기
 */
export interface TextFieldColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  placeholderColor: number;
  labelColor: number;
  descriptionColor: number;
  focusBorderColor: number;
  errorBorderColor: number;
  errorTextColor: number;
  disabledBackgroundColor: number;
  disabledTextColor: number;
}

const TEXT_FIELD_COLOR_FALLBACKS: Record<string, TextFieldColorPreset> = {
  default: {
    backgroundColor: 0xffffff, borderColor: 0xcad3dc, textColor: 0x374151,
    placeholderColor: 0x9ca3af, labelColor: 0x374151, descriptionColor: 0x6b7280,
    focusBorderColor: 0x3b82f6, errorBorderColor: 0xef4444, errorTextColor: 0xef4444,
    disabledBackgroundColor: 0xf3f4f6, disabledTextColor: 0x9ca3af
  },
  primary: {
    backgroundColor: 0xffffff, borderColor: 0x3b82f6, textColor: 0x374151,
    placeholderColor: 0x9ca3af, labelColor: 0x3b82f6, descriptionColor: 0x6b7280,
    focusBorderColor: 0x2563eb, errorBorderColor: 0xef4444, errorTextColor: 0xef4444,
    disabledBackgroundColor: 0xf3f4f6, disabledTextColor: 0x9ca3af
  },
  secondary: {
    backgroundColor: 0xffffff, borderColor: 0x6366f1, textColor: 0x374151,
    placeholderColor: 0x9ca3af, labelColor: 0x6366f1, descriptionColor: 0x6b7280,
    focusBorderColor: 0x4f46e5, errorBorderColor: 0xef4444, errorTextColor: 0xef4444,
    disabledBackgroundColor: 0xf3f4f6, disabledTextColor: 0x9ca3af
  },
  filled: {
    backgroundColor: 0xf3f4f6, borderColor: 0x00000000, textColor: 0x374151,
    placeholderColor: 0x9ca3af, labelColor: 0x374151, descriptionColor: 0x6b7280,
    focusBorderColor: 0x3b82f6, errorBorderColor: 0xef4444, errorTextColor: 0xef4444,
    disabledBackgroundColor: 0xe5e7eb, disabledTextColor: 0x9ca3af
  },
};

/**
 * .react-aria-TextField / .react-aria-Input 클래스에서 색상 스타일 읽기
 */
export function getTextFieldColorPreset(variant: string): TextFieldColorPreset {
  const fallback = TEXT_FIELD_COLOR_FALLBACKS[variant] || TEXT_FIELD_COLOR_FALLBACKS.default;

  try {
    // 임시 DOM 요소 생성
    const textField = document.createElement('div');
    textField.className = `react-aria-TextField ${variant}`;
    textField.style.position = 'absolute';
    textField.style.visibility = 'hidden';
    textField.style.pointerEvents = 'none';

    const label = document.createElement('label');
    label.className = 'react-aria-Label';
    textField.appendChild(label);

    const input = document.createElement('input');
    input.className = 'react-aria-Input';
    textField.appendChild(input);

    const description = document.createElement('div');
    description.slot = 'description';
    textField.appendChild(description);

    const fieldError = document.createElement('div');
    fieldError.className = 'react-aria-FieldError';
    textField.appendChild(fieldError);

    document.body.appendChild(textField);

    const labelStyle = getComputedStyle(label);
    const inputStyle = getComputedStyle(input);
    const descStyle = getComputedStyle(description);
    const errorStyle = getComputedStyle(fieldError);

    // 색상 읽기
    const backgroundColor = cssColorToHex(inputStyle.backgroundColor, fallback.backgroundColor);
    const borderColor = cssColorToHex(inputStyle.borderColor, fallback.borderColor);
    const textColor = cssColorToHex(inputStyle.color, fallback.textColor);
    const labelColor = cssColorToHex(labelStyle.color, fallback.labelColor);
    const descriptionColor = cssColorToHex(descStyle.color, fallback.descriptionColor);
    const errorTextColor = cssColorToHex(errorStyle.color, fallback.errorTextColor);

    // Focus 상태 색상 (CSS 변수에서 직접 읽기)
    const focusBorderColor = cssColorToHex(
      getCSSVariable('--primary') || getCSSVariable('--tf-accent'),
      fallback.focusBorderColor
    );
    const errorBorderColor = cssColorToHex(getCSSVariable('--error'), fallback.errorBorderColor);

    // Placeholder 색상 (CSS 변수에서 읽기)
    const placeholderColor = cssColorToHex(
      getCSSVariable('--on-surface-variant'),
      fallback.placeholderColor
    );

    // Disabled 상태 색상 (opacity 38%로 계산)
    const disabledBackgroundColor = mixWithWhite(backgroundColor, 4);
    const disabledTextColor = mixWithWhite(textColor, 38);

    document.body.removeChild(textField);

    return {
      backgroundColor,
      borderColor,
      textColor,
      placeholderColor,
      labelColor,
      descriptionColor,
      focusBorderColor,
      errorBorderColor,
      errorTextColor,
      disabledBackgroundColor,
      disabledTextColor,
    };
  } catch {
    return fallback;
  }
}

/**
 * Switch 사이즈 프리셋
 */
export interface SwitchSizePreset {
  trackWidth: number;
  trackHeight: number;
  thumbSize: number;
  thumbOffset: number;
  borderRadius: number;
  labelFontSize: number;
  gap: number;
}

const SWITCH_FALLBACKS: Record<string, SwitchSizePreset> = {
  sm: { trackWidth: 36, trackHeight: 20, thumbSize: 16, thumbOffset: 2, borderRadius: 10, labelFontSize: 12, gap: 8 },
  md: { trackWidth: 44, trackHeight: 24, thumbSize: 20, thumbOffset: 2, borderRadius: 12, labelFontSize: 14, gap: 10 },
  lg: { trackWidth: 52, trackHeight: 28, thumbSize: 24, thumbOffset: 2, borderRadius: 14, labelFontSize: 16, gap: 12 },
};

export function getSwitchSizePreset(size: string): SwitchSizePreset {
  return SWITCH_FALLBACKS[size] || SWITCH_FALLBACKS.md;
}

/**
 * Switch 색상 프리셋
 */
export interface SwitchColorPreset {
  trackColor: number;
  trackSelectedColor: number;
  thumbColor: number;
  thumbBorderColor: number;
  labelColor: number;
  focusRingColor: number;
  disabledTrackColor: number;
  disabledThumbColor: number;
}

const SWITCH_COLOR_FALLBACKS: Record<string, SwitchColorPreset> = {
  default: {
    trackColor: 0xe5e7eb, trackSelectedColor: 0x3b82f6, thumbColor: 0xffffff,
    thumbBorderColor: 0xcad3dc, labelColor: 0x374151, focusRingColor: 0x3b82f6,
    disabledTrackColor: 0xf3f4f6, disabledThumbColor: 0xe5e7eb
  },
  primary: {
    trackColor: 0xe5e7eb, trackSelectedColor: 0x3b82f6, thumbColor: 0xffffff,
    thumbBorderColor: 0xcad3dc, labelColor: 0x374151, focusRingColor: 0x3b82f6,
    disabledTrackColor: 0xf3f4f6, disabledThumbColor: 0xe5e7eb
  },
  secondary: {
    trackColor: 0xe5e7eb, trackSelectedColor: 0x6366f1, thumbColor: 0xffffff,
    thumbBorderColor: 0xcad3dc, labelColor: 0x374151, focusRingColor: 0x6366f1,
    disabledTrackColor: 0xf3f4f6, disabledThumbColor: 0xe5e7eb
  },
  tertiary: {
    trackColor: 0xe5e7eb, trackSelectedColor: 0xec4899, thumbColor: 0xffffff,
    thumbBorderColor: 0xcad3dc, labelColor: 0x374151, focusRingColor: 0xec4899,
    disabledTrackColor: 0xf3f4f6, disabledThumbColor: 0xe5e7eb
  },
  error: {
    trackColor: 0xe5e7eb, trackSelectedColor: 0xef4444, thumbColor: 0xffffff,
    thumbBorderColor: 0xcad3dc, labelColor: 0x374151, focusRingColor: 0xef4444,
    disabledTrackColor: 0xf3f4f6, disabledThumbColor: 0xe5e7eb
  },
};

export function getSwitchColorPreset(variant: string): SwitchColorPreset {
  return SWITCH_COLOR_FALLBACKS[variant] || SWITCH_COLOR_FALLBACKS.default;
}

/**
 * TextArea 사이즈 프리셋
 */
export interface TextAreaSizePreset {
  fontSize: number;
  minHeight: number;
  padding: number;
  paddingX: number;
  borderRadius: number;
  labelFontSize: number;
  descriptionFontSize: number;
  gap: number;
  lineHeight: number;
}

const TEXT_AREA_FALLBACKS: Record<string, TextAreaSizePreset> = {
  sm: { fontSize: 12, minHeight: 64, padding: 8, paddingX: 10, borderRadius: 6, labelFontSize: 12, descriptionFontSize: 11, gap: 4, lineHeight: 1.4 },
  md: { fontSize: 14, minHeight: 80, padding: 10, paddingX: 12, borderRadius: 8, labelFontSize: 14, descriptionFontSize: 12, gap: 6, lineHeight: 1.5 },
  lg: { fontSize: 16, minHeight: 96, padding: 12, paddingX: 14, borderRadius: 10, labelFontSize: 16, descriptionFontSize: 14, gap: 8, lineHeight: 1.6 },
};

export function getTextAreaSizePreset(size: string): TextAreaSizePreset {
  return TEXT_AREA_FALLBACKS[size] || TEXT_AREA_FALLBACKS.md;
}

/**
 * TextArea 색상 프리셋 (TextField와 동일한 구조)
 */
export function getTextAreaColorPreset(variant: string): TextFieldColorPreset {
  return TEXT_FIELD_COLOR_FALLBACKS[variant] || TEXT_FIELD_COLOR_FALLBACKS.default;
}

/**
 * Form 사이즈 프리셋
 */
export interface FormSizePreset {
  padding: number;
  gap: number;
  borderRadius: number;
  labelFontSize: number;
  sectionGap: number;
}

const FORM_FALLBACKS: Record<string, FormSizePreset> = {
  sm: { padding: 12, gap: 12, borderRadius: 8, labelFontSize: 12, sectionGap: 16 },
  md: { padding: 16, gap: 16, borderRadius: 10, labelFontSize: 14, sectionGap: 24 },
  lg: { padding: 20, gap: 20, borderRadius: 12, labelFontSize: 16, sectionGap: 32 },
};

export function getFormSizePreset(size: string): FormSizePreset {
  return FORM_FALLBACKS[size] || FORM_FALLBACKS.md;
}

/**
 * Form 색상 프리셋
 */
export interface FormColorPreset {
  backgroundColor: number;
  borderColor: number;
  labelColor: number;
  separatorColor: number;
}

const FORM_COLOR_FALLBACKS: Record<string, FormColorPreset> = {
  default: { backgroundColor: 0xffffff, borderColor: 0xcad3dc, labelColor: 0x374151, separatorColor: 0xe5e7eb },
  primary: { backgroundColor: 0xffffff, borderColor: 0x3b82f6, labelColor: 0x3b82f6, separatorColor: 0xeff6ff },
  secondary: { backgroundColor: 0xffffff, borderColor: 0x6366f1, labelColor: 0x6366f1, separatorColor: 0xeef2ff },
  filled: { backgroundColor: 0xf9fafb, borderColor: 0x00000000, labelColor: 0x374151, separatorColor: 0xe5e7eb },
};

export function getFormColorPreset(variant: string): FormColorPreset {
  return FORM_COLOR_FALLBACKS[variant] || FORM_COLOR_FALLBACKS.default;
}

/**
 * Toolbar 사이즈 프리셋
 */
export interface ToolbarSizePreset {
  height: number;
  padding: number;
  gap: number;
  borderRadius: number;
  separatorWidth: number;
  separatorHeight: number;
}

const TOOLBAR_FALLBACKS: Record<string, ToolbarSizePreset> = {
  sm: { height: 36, padding: 6, gap: 4, borderRadius: 6, separatorWidth: 1, separatorHeight: 20 },
  md: { height: 44, padding: 8, gap: 6, borderRadius: 8, separatorWidth: 1, separatorHeight: 24 },
  lg: { height: 52, padding: 10, gap: 8, borderRadius: 10, separatorWidth: 1, separatorHeight: 28 },
};

export function getToolbarSizePreset(size: string): ToolbarSizePreset {
  return TOOLBAR_FALLBACKS[size] || TOOLBAR_FALLBACKS.md;
}

/**
 * Toolbar 색상 프리셋
 */
export interface ToolbarColorPreset {
  backgroundColor: number;
  borderColor: number;
  separatorColor: number;
  iconColor: number;
  hoverBackgroundColor: number;
}

const TOOLBAR_COLOR_FALLBACKS: Record<string, ToolbarColorPreset> = {
  default: { backgroundColor: 0xffffff, borderColor: 0xcad3dc, separatorColor: 0xe5e7eb, iconColor: 0x374151, hoverBackgroundColor: 0xf3f4f6 },
  primary: { backgroundColor: 0xeff6ff, borderColor: 0x3b82f6, separatorColor: 0xbfdbfe, iconColor: 0x3b82f6, hoverBackgroundColor: 0xdbeafe },
  secondary: { backgroundColor: 0xeef2ff, borderColor: 0x6366f1, separatorColor: 0xc7d2fe, iconColor: 0x6366f1, hoverBackgroundColor: 0xe0e7ff },
  filled: { backgroundColor: 0xf3f4f6, borderColor: 0x00000000, separatorColor: 0xe5e7eb, iconColor: 0x374151, hoverBackgroundColor: 0xe5e7eb },
};

export function getToolbarColorPreset(variant: string): ToolbarColorPreset {
  return TOOLBAR_COLOR_FALLBACKS[variant] || TOOLBAR_COLOR_FALLBACKS.default;
}

/**
 * FileTrigger 사이즈 프리셋
 */
export interface FileTriggerSizePreset {
  fontSize: number;
  height: number;
  padding: number;
  paddingX: number;
  borderRadius: number;
  iconSize: number;
  gap: number;
}

const FILE_TRIGGER_FALLBACKS: Record<string, FileTriggerSizePreset> = {
  sm: { fontSize: 12, height: 32, padding: 6, paddingX: 12, borderRadius: 6, iconSize: 14, gap: 6 },
  md: { fontSize: 14, height: 40, padding: 8, paddingX: 16, borderRadius: 8, iconSize: 16, gap: 8 },
  lg: { fontSize: 16, height: 48, padding: 10, paddingX: 20, borderRadius: 10, iconSize: 18, gap: 10 },
};

export function getFileTriggerSizePreset(size: string): FileTriggerSizePreset {
  return FILE_TRIGGER_FALLBACKS[size] || FILE_TRIGGER_FALLBACKS.md;
}

/**
 * FileTrigger 색상 프리셋
 */
export interface FileTriggerColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  iconColor: number;
  hoverBackgroundColor: number;
  focusRingColor: number;
}

const FILE_TRIGGER_COLOR_FALLBACKS: Record<string, FileTriggerColorPreset> = {
  default: { backgroundColor: 0xffffff, borderColor: 0xcad3dc, textColor: 0x374151, iconColor: 0x6b7280, hoverBackgroundColor: 0xf3f4f6, focusRingColor: 0x3b82f6 },
  primary: { backgroundColor: 0x3b82f6, borderColor: 0x3b82f6, textColor: 0xffffff, iconColor: 0xffffff, hoverBackgroundColor: 0x2563eb, focusRingColor: 0x3b82f6 },
  secondary: { backgroundColor: 0x6366f1, borderColor: 0x6366f1, textColor: 0xffffff, iconColor: 0xffffff, hoverBackgroundColor: 0x4f46e5, focusRingColor: 0x6366f1 },
  surface: { backgroundColor: 0xf3f4f6, borderColor: 0x00000000, textColor: 0x374151, iconColor: 0x6b7280, hoverBackgroundColor: 0xe5e7eb, focusRingColor: 0x3b82f6 },
};

export function getFileTriggerColorPreset(variant: string): FileTriggerColorPreset {
  return FILE_TRIGGER_COLOR_FALLBACKS[variant] || FILE_TRIGGER_COLOR_FALLBACKS.default;
}

/**
 * DropZone 사이즈 프리셋
 */
export interface DropZoneSizePreset {
  minHeight: number;
  padding: number;
  borderRadius: number;
  borderWidth: number;
  iconSize: number;
  fontSize: number;
  labelFontSize: number;
  gap: number;
}

const DROP_ZONE_FALLBACKS: Record<string, DropZoneSizePreset> = {
  sm: { minHeight: 80, padding: 16, borderRadius: 8, borderWidth: 2, iconSize: 24, fontSize: 12, labelFontSize: 14, gap: 8 },
  md: { minHeight: 120, padding: 24, borderRadius: 10, borderWidth: 2, iconSize: 32, fontSize: 14, labelFontSize: 16, gap: 12 },
  lg: { minHeight: 160, padding: 32, borderRadius: 12, borderWidth: 2, iconSize: 40, fontSize: 16, labelFontSize: 18, gap: 16 },
};

export function getDropZoneSizePreset(size: string): DropZoneSizePreset {
  return DROP_ZONE_FALLBACKS[size] || DROP_ZONE_FALLBACKS.md;
}

/**
 * DropZone 색상 프리셋
 */
export interface DropZoneColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  labelColor: number;
  iconColor: number;
  hoverBackgroundColor: number;
  hoverBorderColor: number;
  dropTargetBackgroundColor: number;
  dropTargetBorderColor: number;
}

const DROP_ZONE_COLOR_FALLBACKS: Record<string, DropZoneColorPreset> = {
  default: {
    backgroundColor: 0xfafafa, borderColor: 0xcad3dc, textColor: 0x6b7280, labelColor: 0x374151,
    iconColor: 0x9ca3af, hoverBackgroundColor: 0xf3f4f6, hoverBorderColor: 0x9ca3af,
    dropTargetBackgroundColor: 0xeff6ff, dropTargetBorderColor: 0x3b82f6
  },
  primary: {
    backgroundColor: 0xeff6ff, borderColor: 0x93c5fd, textColor: 0x3b82f6, labelColor: 0x1d4ed8,
    iconColor: 0x60a5fa, hoverBackgroundColor: 0xdbeafe, hoverBorderColor: 0x3b82f6,
    dropTargetBackgroundColor: 0xdbeafe, dropTargetBorderColor: 0x2563eb
  },
  secondary: {
    backgroundColor: 0xeef2ff, borderColor: 0xa5b4fc, textColor: 0x6366f1, labelColor: 0x4338ca,
    iconColor: 0x818cf8, hoverBackgroundColor: 0xe0e7ff, hoverBorderColor: 0x6366f1,
    dropTargetBackgroundColor: 0xe0e7ff, dropTargetBorderColor: 0x4f46e5
  },
};

export function getDropZoneColorPreset(variant: string): DropZoneColorPreset {
  return DROP_ZONE_COLOR_FALLBACKS[variant] || DROP_ZONE_COLOR_FALLBACKS.default;
}

/**
 * Skeleton 사이즈 프리셋
 */
export interface SkeletonSizePreset {
  height: number;
  borderRadius: number;
  avatarSize: number;
  lineHeight: number;
  lineGap: number;
}

const SKELETON_FALLBACKS: Record<string, SkeletonSizePreset> = {
  sm: { height: 16, borderRadius: 4, avatarSize: 32, lineHeight: 12, lineGap: 8 },
  md: { height: 20, borderRadius: 6, avatarSize: 40, lineHeight: 16, lineGap: 10 },
  lg: { height: 24, borderRadius: 8, avatarSize: 48, lineHeight: 20, lineGap: 12 },
};

export function getSkeletonSizePreset(size: string): SkeletonSizePreset {
  return SKELETON_FALLBACKS[size] || SKELETON_FALLBACKS.md;
}

/**
 * Skeleton 색상 프리셋
 */
export interface SkeletonColorPreset {
  baseColor: number;
  shimmerColor: number;
  borderRadius: number;
}

const SKELETON_COLOR_FALLBACKS: Record<string, SkeletonColorPreset> = {
  default: { baseColor: 0xe5e7eb, shimmerColor: 0xf3f4f6, borderRadius: 6 },
  primary: { baseColor: 0xdbeafe, shimmerColor: 0xeff6ff, borderRadius: 6 },
  secondary: { baseColor: 0xe0e7ff, shimmerColor: 0xeef2ff, borderRadius: 6 },
};

export function getSkeletonColorPreset(variant: string): SkeletonColorPreset {
  return SKELETON_COLOR_FALLBACKS[variant] || SKELETON_COLOR_FALLBACKS.default;
}

// ============================================================================
// Phase 8: Notification & Color Utility Components
// ============================================================================

/**
 * Toast 사이즈 프리셋
 */
export interface ToastSizePreset {
  fontSize: number;
  padding: number;
  paddingX: number;
  borderRadius: number;
  iconSize: number;
  gap: number;
  maxWidth: number;
  dismissButtonSize: number;
}

const TOAST_FALLBACKS: Record<string, ToastSizePreset> = {
  sm: { fontSize: 12, padding: 8, paddingX: 12, borderRadius: 6, iconSize: 16, gap: 8, maxWidth: 320, dismissButtonSize: 20 },
  md: { fontSize: 14, padding: 10, paddingX: 14, borderRadius: 8, iconSize: 18, gap: 10, maxWidth: 400, dismissButtonSize: 24 },
  lg: { fontSize: 16, padding: 12, paddingX: 16, borderRadius: 10, iconSize: 20, gap: 12, maxWidth: 480, dismissButtonSize: 28 },
};

export function getToastSizePreset(size: string): ToastSizePreset {
  return TOAST_FALLBACKS[size] || TOAST_FALLBACKS.md;
}

/**
 * Toast 색상 프리셋
 */
export interface ToastColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  accentColor: number;
  iconColor: number;
  dismissButtonColor: number;
  shadowColor: number;
}

const TOAST_COLOR_FALLBACKS: Record<string, ToastColorPreset> = {
  info: { backgroundColor: 0xffffff, borderColor: 0x3b82f6, textColor: 0x374151, accentColor: 0x3b82f6, iconColor: 0x3b82f6, dismissButtonColor: 0x6b7280, shadowColor: 0x000000 },
  success: { backgroundColor: 0xffffff, borderColor: 0x22c55e, textColor: 0x374151, accentColor: 0x22c55e, iconColor: 0x22c55e, dismissButtonColor: 0x6b7280, shadowColor: 0x000000 },
  warning: { backgroundColor: 0xffffff, borderColor: 0xeab308, textColor: 0x374151, accentColor: 0xeab308, iconColor: 0xeab308, dismissButtonColor: 0x6b7280, shadowColor: 0x000000 },
  error: { backgroundColor: 0xffffff, borderColor: 0xef4444, textColor: 0x374151, accentColor: 0xef4444, iconColor: 0xef4444, dismissButtonColor: 0x6b7280, shadowColor: 0x000000 },
};

export function getToastColorPreset(type: string): ToastColorPreset {
  return TOAST_COLOR_FALLBACKS[type] || TOAST_COLOR_FALLBACKS.info;
}

/**
 * Pagination 사이즈 프리셋
 */
export interface PaginationSizePreset {
  fontSize: number;
  buttonSize: number;
  padding: number;
  gap: number;
  borderRadius: number;
}

const PAGINATION_FALLBACKS: Record<string, PaginationSizePreset> = {
  sm: { fontSize: 12, buttonSize: 28, padding: 4, gap: 4, borderRadius: 4 },
  md: { fontSize: 14, buttonSize: 32, padding: 6, gap: 6, borderRadius: 6 },
  lg: { fontSize: 16, buttonSize: 40, padding: 8, gap: 8, borderRadius: 8 },
};

export function getPaginationSizePreset(size: string): PaginationSizePreset {
  return PAGINATION_FALLBACKS[size] || PAGINATION_FALLBACKS.md;
}

/**
 * Pagination 색상 프리셋
 */
export interface PaginationColorPreset {
  backgroundColor: number;
  textColor: number;
  currentBackgroundColor: number;
  currentTextColor: number;
  hoverBackgroundColor: number;
  disabledTextColor: number;
  borderColor: number;
  ellipsisColor: number;
}

const PAGINATION_COLOR_FALLBACKS: Record<string, PaginationColorPreset> = {
  default: {
    backgroundColor: 0xf3f4f6, textColor: 0x374151, currentBackgroundColor: 0x3b82f6,
    currentTextColor: 0xffffff, hoverBackgroundColor: 0xe5e7eb, disabledTextColor: 0x9ca3af,
    borderColor: 0xcad3dc, ellipsisColor: 0x6b7280
  },
  primary: {
    backgroundColor: 0xeff6ff, textColor: 0x374151, currentBackgroundColor: 0x3b82f6,
    currentTextColor: 0xffffff, hoverBackgroundColor: 0xdbeafe, disabledTextColor: 0x9ca3af,
    borderColor: 0x93c5fd, ellipsisColor: 0x3b82f6
  },
  secondary: {
    backgroundColor: 0xeef2ff, textColor: 0x374151, currentBackgroundColor: 0x6366f1,
    currentTextColor: 0xffffff, hoverBackgroundColor: 0xe0e7ff, disabledTextColor: 0x9ca3af,
    borderColor: 0xa5b4fc, ellipsisColor: 0x6366f1
  },
};

export function getPaginationColorPreset(variant: string): PaginationColorPreset {
  return PAGINATION_COLOR_FALLBACKS[variant] || PAGINATION_COLOR_FALLBACKS.default;
}

/**
 * ColorField 사이즈 프리셋
 */
export interface ColorFieldSizePreset {
  fontSize: number;
  height: number;
  padding: number;
  borderRadius: number;
  maxWidth: number;
  labelFontSize: number;
  gap: number;
}

const COLOR_FIELD_FALLBACKS: Record<string, ColorFieldSizePreset> = {
  sm: { fontSize: 12, height: 28, padding: 6, borderRadius: 4, maxWidth: 100, labelFontSize: 11, gap: 4 },
  md: { fontSize: 14, height: 32, padding: 8, borderRadius: 6, maxWidth: 120, labelFontSize: 12, gap: 6 },
  lg: { fontSize: 16, height: 40, padding: 10, borderRadius: 8, maxWidth: 140, labelFontSize: 14, gap: 8 },
};

export function getColorFieldSizePreset(size: string): ColorFieldSizePreset {
  return COLOR_FIELD_FALLBACKS[size] || COLOR_FIELD_FALLBACKS.md;
}

/**
 * ColorField 색상 프리셋
 */
export interface ColorFieldColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  labelColor: number;
  focusBorderColor: number;
  errorBorderColor: number;
  disabledBackgroundColor: number;
}

const COLOR_FIELD_COLOR_FALLBACKS: Record<string, ColorFieldColorPreset> = {
  default: { backgroundColor: 0xffffff, borderColor: 0xcad3dc, textColor: 0x374151, labelColor: 0x374151, focusBorderColor: 0x3b82f6, errorBorderColor: 0xef4444, disabledBackgroundColor: 0xf3f4f6 },
  primary: { backgroundColor: 0xffffff, borderColor: 0x3b82f6, textColor: 0x374151, labelColor: 0x3b82f6, focusBorderColor: 0x2563eb, errorBorderColor: 0xef4444, disabledBackgroundColor: 0xf3f4f6 },
  secondary: { backgroundColor: 0xffffff, borderColor: 0x6366f1, textColor: 0x374151, labelColor: 0x6366f1, focusBorderColor: 0x4f46e5, errorBorderColor: 0xef4444, disabledBackgroundColor: 0xf3f4f6 },
  filled: { backgroundColor: 0xf3f4f6, borderColor: 0x00000000, textColor: 0x374151, labelColor: 0x374151, focusBorderColor: 0x3b82f6, errorBorderColor: 0xef4444, disabledBackgroundColor: 0xe5e7eb },
};

export function getColorFieldColorPreset(variant: string): ColorFieldColorPreset {
  return COLOR_FIELD_COLOR_FALLBACKS[variant] || COLOR_FIELD_COLOR_FALLBACKS.default;
}

/**
 * ColorSwatchPicker 사이즈 프리셋
 */
export interface ColorSwatchPickerSizePreset {
  swatchSize: number;
  gap: number;
  borderRadius: number;
  selectionBorderWidth: number;
}

const COLOR_SWATCH_PICKER_FALLBACKS: Record<string, ColorSwatchPickerSizePreset> = {
  sm: { swatchSize: 24, gap: 6, borderRadius: 4, selectionBorderWidth: 2 },
  md: { swatchSize: 32, gap: 8, borderRadius: 4, selectionBorderWidth: 2 },
  lg: { swatchSize: 40, gap: 10, borderRadius: 6, selectionBorderWidth: 3 },
};

export function getColorSwatchPickerSizePreset(size: string): ColorSwatchPickerSizePreset {
  return COLOR_SWATCH_PICKER_FALLBACKS[size] || COLOR_SWATCH_PICKER_FALLBACKS.md;
}

/**
 * ColorSwatchPicker 색상 프리셋
 */
export interface ColorSwatchPickerColorPreset {
  selectionOuterColor: number;
  selectionInnerColor: number;
  focusRingColor: number;
  disabledOpacity: number;
}

const COLOR_SWATCH_PICKER_COLOR_FALLBACKS: Record<string, ColorSwatchPickerColorPreset> = {
  default: { selectionOuterColor: 0x000000, selectionInnerColor: 0xffffff, focusRingColor: 0x3b82f6, disabledOpacity: 0.2 },
  primary: { selectionOuterColor: 0x3b82f6, selectionInnerColor: 0xffffff, focusRingColor: 0x3b82f6, disabledOpacity: 0.2 },
  secondary: { selectionOuterColor: 0x6366f1, selectionInnerColor: 0xffffff, focusRingColor: 0x6366f1, disabledOpacity: 0.2 },
};

export function getColorSwatchPickerColorPreset(variant: string): ColorSwatchPickerColorPreset {
  return COLOR_SWATCH_PICKER_COLOR_FALLBACKS[variant] || COLOR_SWATCH_PICKER_COLOR_FALLBACKS.default;
}

/**
 * Group 사이즈 프리셋
 */
export interface GroupSizePreset {
  padding: number;
  gap: number;
  borderRadius: number;
  labelFontSize: number;
  labelPadding: number;
}

const GROUP_FALLBACKS: Record<string, GroupSizePreset> = {
  sm: { padding: 8, gap: 6, borderRadius: 4, labelFontSize: 10, labelPadding: 4 },
  md: { padding: 12, gap: 8, borderRadius: 6, labelFontSize: 12, labelPadding: 6 },
  lg: { padding: 16, gap: 10, borderRadius: 8, labelFontSize: 14, labelPadding: 8 },
};

export function getGroupSizePreset(size: string): GroupSizePreset {
  return GROUP_FALLBACKS[size] || GROUP_FALLBACKS.md;
}

/**
 * Group 색상 프리셋
 */
export interface GroupColorPreset {
  borderColor: number;
  hoverBorderColor: number;
  focusBorderColor: number;
  labelBackgroundColor: number;
  labelTextColor: number;
  disabledOpacity: number;
}

const GROUP_COLOR_FALLBACKS: Record<string, GroupColorPreset> = {
  default: { borderColor: 0xcad3dc, hoverBorderColor: 0x3b82f680, focusBorderColor: 0x3b82f6, labelBackgroundColor: 0xffffff, labelTextColor: 0x6b7280, disabledOpacity: 0.5 },
  primary: { borderColor: 0x93c5fd, hoverBorderColor: 0x3b82f6, focusBorderColor: 0x2563eb, labelBackgroundColor: 0xffffff, labelTextColor: 0x3b82f6, disabledOpacity: 0.5 },
  secondary: { borderColor: 0xa5b4fc, hoverBorderColor: 0x6366f1, focusBorderColor: 0x4f46e5, labelBackgroundColor: 0xffffff, labelTextColor: 0x6366f1, disabledOpacity: 0.5 },
};

export function getGroupColorPreset(variant: string): GroupColorPreset {
  return GROUP_COLOR_FALLBACKS[variant] || GROUP_COLOR_FALLBACKS.default;
}

/**
 * Slot 사이즈 프리셋
 */
export interface SlotSizePreset {
  minHeight: number;
  padding: number;
  borderWidth: number;
  borderRadius: number;
  iconSize: number;
  labelFontSize: number;
  descriptionFontSize: number;
  gap: number;
}

const SLOT_FALLBACKS: Record<string, SlotSizePreset> = {
  sm: { minHeight: 60, padding: 12, borderWidth: 2, borderRadius: 6, iconSize: 32, labelFontSize: 12, descriptionFontSize: 10, gap: 8 },
  md: { minHeight: 80, padding: 16, borderWidth: 2, borderRadius: 8, iconSize: 48, labelFontSize: 14, descriptionFontSize: 12, gap: 10 },
  lg: { minHeight: 100, padding: 20, borderWidth: 2, borderRadius: 10, iconSize: 56, labelFontSize: 16, descriptionFontSize: 14, gap: 12 },
};

export function getSlotSizePreset(size: string): SlotSizePreset {
  return SLOT_FALLBACKS[size] || SLOT_FALLBACKS.md;
}

/**
 * Slot 색상 프리셋
 */
export interface SlotColorPreset {
  backgroundColor: number;
  borderColor: number;
  emptyBorderColor: number;
  textColor: number;
  iconBackgroundColor: number;
  iconColor: number;
  hoverBorderColor: number;
  selectedBorderColor: number;
  requiredBorderColor: number;
  requiredBadgeBackgroundColor: number;
  requiredBadgeTextColor: number;
}

const SLOT_COLOR_FALLBACKS: Record<string, SlotColorPreset> = {
  default: {
    backgroundColor: 0xfafafa, borderColor: 0xcad3dc, emptyBorderColor: 0x9ca3af,
    textColor: 0x6b7280, iconBackgroundColor: 0xe5e7eb, iconColor: 0x9ca3af,
    hoverBorderColor: 0x3b82f6, selectedBorderColor: 0x3b82f6,
    requiredBorderColor: 0xeab308, requiredBadgeBackgroundColor: 0xfef3c7, requiredBadgeTextColor: 0xb45309
  },
  primary: {
    backgroundColor: 0xeff6ff, borderColor: 0x93c5fd, emptyBorderColor: 0x60a5fa,
    textColor: 0x3b82f6, iconBackgroundColor: 0xdbeafe, iconColor: 0x60a5fa,
    hoverBorderColor: 0x3b82f6, selectedBorderColor: 0x2563eb,
    requiredBorderColor: 0xeab308, requiredBadgeBackgroundColor: 0xfef3c7, requiredBadgeTextColor: 0xb45309
  },
  secondary: {
    backgroundColor: 0xeef2ff, borderColor: 0xa5b4fc, emptyBorderColor: 0x818cf8,
    textColor: 0x6366f1, iconBackgroundColor: 0xe0e7ff, iconColor: 0x818cf8,
    hoverBorderColor: 0x6366f1, selectedBorderColor: 0x4f46e5,
    requiredBorderColor: 0xeab308, requiredBadgeBackgroundColor: 0xfef3c7, requiredBadgeTextColor: 0xb45309
  },
};

export function getSlotColorPreset(variant: string): SlotColorPreset {
  return SLOT_COLOR_FALLBACKS[variant] || SLOT_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 11: CheckboxGroup Size Preset
// ============================================

/**
 * CheckboxGroup 사이즈 프리셋
 *
 * CSS 동기화:
 * - .react-aria-CheckboxGroup { gap: var(--gap); }
 * - [data-checkbox-size="sm"] { --cb-font-size: var(--text-sm); --cb-box-size: var(--text-lg); }
 * - [data-checkbox-size="md"] { --cb-font-size: var(--text-base); --cb-box-size: var(--text-xl); }
 * - [data-checkbox-size="lg"] { --cb-font-size: var(--text-lg); --cb-box-size: var(--text-2xl); }
 */
export interface CheckboxGroupSizePreset {
  fontSize: number;
  boxSize: number;
  gap: number;
  labelGap: number;
}

const CHECKBOX_GROUP_SIZE_MAPPING: Record<string, { fontSize: string; boxSize: string; gap: string }> = {
  sm: { fontSize: '--text-sm', boxSize: '--text-lg', gap: '--gap' },
  md: { fontSize: '--text-base', boxSize: '--text-xl', gap: '--gap' },
  lg: { fontSize: '--text-lg', boxSize: '--text-2xl', gap: '--gap' },
};

const CHECKBOX_GROUP_FALLBACKS: Record<string, CheckboxGroupSizePreset> = {
  sm: { fontSize: 14, boxSize: 18, gap: 8, labelGap: 6 },
  md: { fontSize: 16, boxSize: 20, gap: 12, labelGap: 8 },
  lg: { fontSize: 18, boxSize: 24, gap: 16, labelGap: 10 },
};

/**
 * CheckboxGroup 사이즈 프리셋 읽기
 */
export function getCheckboxGroupSizePreset(size: string): CheckboxGroupSizePreset {
  const mapping = CHECKBOX_GROUP_SIZE_MAPPING[size];
  const fallback = CHECKBOX_GROUP_FALLBACKS[size] || CHECKBOX_GROUP_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const boxSize = parseCSSValue(getCSSVariable(mapping.boxSize), fallback.boxSize);
  const gap = parseCSSValue(getCSSVariable(mapping.gap), fallback.gap);

  return {
    fontSize,
    boxSize,
    gap,
    labelGap: fallback.labelGap,
  };
}
